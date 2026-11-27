/**
 * HCWEffectEngineField — the Effect Engine window.
 *
 *   ┌ Effect Engine ─────────────────────────────── 4 selected · server ● ┐
 *   │ [Select][Move] [All] [None] [Arrange] │ Effects                 [+ New] │
 *   │ ┌───┐┌───┐┌───┐┌───┐                  │ ▶ Circle Pan   Pan   8   →      │
 *   │ │101││102││103││104│   fixture grid    │ ■ Dimmer Wave  Dim   4   ◎      │
 *   │ └───┘└───┘└───┘└───┘                  │ [Attribute][Range][BPM][Spread]… │
 *   │                                       │ ┌ curve editor (HCWCurveEditor) ┐│
 *
 * Grid: Select mode — tap toggles a fixture, drag draws a box (adds).
 *       Move mode   — drag a fixture (or the whole selection) to another cell,
 *                     drag empty space to scroll.
 * Tiles show the selected effect's phase slot and its live value.
 *
 * This field only draws and reports what was touched; FGMEffectEngine does the
 * work (programmer, effects, dialogs). It reads PatchManager / Programmer /
 * FixtureGrid / Effects directly when drawing.
 */
class HCWEffectEngineField extends HCWBaseField {
    constructor(label = 'Effect Engine') {
        super(label);
        this.className = 'HCWEffectEngineField';
        this._insertClassKeyword();

        // persisted with the window
        this.selectedEffectId = null;
        this.gridMode = 'select';
        this.gridScrollX = 0;
        this.gridScrollY = 0;

        // runtime
        this.modal = false;
        this.message = '';
        this._messageUntil = 0;
        this._drag = null;
        this._listScroll = 0;
        this._curve = null;
        this._curveSig = null;

        this.titleHeight = 28;
        this.barHeight = 40;
        this.rowHeight = 32;

        this.renderProps = { zones: {}, buttons: [], tiles: [], rows: [], cell: 48, gridOrigin: null };
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.EFFECT_ENGINE;
    }

    getExcludedJSONKeys() {
        return [...super.getExcludedJSONKeys(), 'modal', 'message', '_messageUntil', '_drag', '_listScroll', '_curve', '_curveSig', 'renderProps'];
    }

    static get EFFECT_COLORS() {
        return ['#4aa3ff', '#ff9f3d', '#c86bff', '#5fd07a', '#ff5f7a', '#e6d04a', '#3fd0c9', '#b08a5f'];
    }

    static effectColor(index) {
        return HCWEffectEngineField.EFFECT_COLORS[index % HCWEffectEngineField.EFFECT_COLORS.length];
    }

    flash(message, ms = 3500) {
        this.message = message || '';
        this._messageUntil = performance.now() + ms;
        this.updateFrame();
        if (message) setTimeout(() => this.updateFrame(), ms + 20);
    }

    /** The embedded curve editor (created on demand, routed to FGMEffectEngine). */
    get curveEditor() {
        if (!this._curve) {
            this._curve = new HCWCurveEditorField('Phaser');
            this._curve.onAction((type, data) => this._report('curve', { type, ...data }));
        }
        return this._curve;
    }

    _report(intent, data = {}) {
        if (typeof FGMEffectEngine !== 'undefined') FGMEffectEngine.handle(this, intent, data);
    }

    // ── interaction ──────────────────────────────────────────────────────

    _zoneAt(x, y) {
        const z = this.renderProps.zones;
        const inside = (r) => r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
        if (inside(z.curve)) return 'curve';
        if (inside(z.grid)) return 'grid';
        if (inside(z.list)) return 'list';
        return 'other';
    }

    _buttonAt(x, y) {
        return this.renderProps.buttons.find(b => !b.disabled && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) || null;
    }

    _tileAt(x, y) {
        return this.renderProps.tiles.find(t => x >= t.x && x <= t.x + t.w && y >= t.y && y <= t.y + t.h) || null;
    }

    _cellAt(x, y) {
        const o = this.renderProps.gridOrigin;
        const c = this.renderProps.cell;
        if (!o) return null;
        return { cx: Math.floor((x - o.x) / c), cy: Math.floor((y - o.y) / c) };
    }

    _interaction(interaction) {
        const { type } = interaction;
        if (type === 'scroll') {
            const z = this._zoneAt(this._lastX ?? 0, this._lastY ?? 0);
            if (z === 'list') this._listScroll = Math.max(0, this._listScroll + interaction.deltaY / 2);
            else if (z === 'grid') this.gridScrollY = Math.min(0, this.gridScrollY - interaction.deltaY / 2);
            this.updateFrame();
            return;
        }

        // mouseup carries no coordinates
        if (interaction.mouseX !== undefined) { this._lastX = interaction.mouseX; this._lastY = interaction.mouseY; }
        const x = interaction.mouseX ?? this._lastX;
        const y = interaction.mouseY ?? this._lastY;

        if (type === 'mousedown') {
            const zone = this._zoneAt(x, y);
            if (zone === 'curve') {
                this._drag = { zone };
                this.curveEditor._interaction(interaction);
                return;
            }
            const btn = this._buttonAt(x, y);
            if (btn) {
                this._drag = { zone: 'button', key: btn.key };
                this.updateFrame();
                return;
            }
            if (zone === 'list') {
                const row = this.renderProps.rows.find(r => y >= r.y && y <= r.y + r.h);
                this._drag = { zone, row, x, y, moved: false };
                return;
            }
            if (zone === 'grid') {
                const tile = this._tileAt(x, y);
                this._drag = { zone, tile, x, y, moved: false, scrollX: this.gridScrollX, scrollY: this.gridScrollY };
            }
            return;
        }

        const d = this._drag;
        if (!d) return;

        if (type === 'mousemove') {
            if (d.zone === 'curve') { this.curveEditor._interaction(interaction); return; }
            if (d.zone === 'grid' || d.zone === 'list') {
                if (!d.moved && Math.abs(x - d.x) < 6 && Math.abs(y - d.y) < 6) return;
                d.moved = true;
                d.toX = x;
                d.toY = y;
                if (d.zone === 'grid' && this.gridMode === 'move' && !d.tile) {
                    this.gridScrollX = Math.min(0, d.scrollX + (x - d.x));
                    this.gridScrollY = Math.min(0, d.scrollY + (y - d.y));
                }
                if (d.zone === 'list') this._listScroll = Math.max(0, this._listScroll - (y - (d.lastY ?? d.y)));
                d.lastY = y;
                this.updateFrame();
            }
            return;
        }

        if (type === 'mouseup') {
            this._drag = null;
            if (d.zone === 'curve') { this.curveEditor._interaction(interaction); return; }

            if (d.zone === 'button') {
                const btn = this._buttonAt(x, y);
                if (btn && btn.key === d.key) this._report('button', { key: btn.key });
                this.updateFrame();
                return;
            }

            if (d.zone === 'list') {
                if (!d.moved && d.row) {
                    if (d.row.toggle && d.x <= d.row.toggle.x + d.row.toggle.w) this._report('effect-toggle', { id: d.row.id });
                    else this._report('effect-select', { id: d.row.id });
                }
                this.updateFrame();
                return;
            }

            if (d.zone === 'grid') {
                if (!d.moved) {
                    if (d.tile) this._report('select-toggle', { fid: d.tile.fid });
                } else if (this.gridMode === 'select') {
                    const x0 = Math.min(d.x, x), x1 = Math.max(d.x, x), y0 = Math.min(d.y, y), y1 = Math.max(d.y, y);
                    const fids = this.renderProps.tiles
                        .filter(t => t.x + t.w >= x0 && t.x <= x1 && t.y + t.h >= y0 && t.y <= y1)
                        .map(t => t.fid);
                    if (fids.length) this._report('select-box', { fids });
                } else if (d.tile) {
                    const from = this._cellAt(d.x, d.y);
                    const to = this._cellAt(x, y);
                    if (from && to) this._report('grid-move', { fid: d.tile.fid, dx: to.cx - from.cx, dy: to.cy - from.cy, cx: to.cx, cy: to.cy });
                }
                this.updateFrame();
            }
        }
    }

    // ── rendering helpers ────────────────────────────────────────────────

    _fit(ctx, text, maxWidth) {
        text = String(text ?? '');
        if (maxWidth <= 4) return '';
        if (ctx.measureText(text).width <= maxWidth) return text;
        while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) text = text.slice(0, -1);
        return text + '…';
    }

    _button(ctx, b) {
        const pressed = this._drag && this._drag.zone === 'button' && this._drag.key === b.key;
        ctx.fillStyle = pressed ? '#00773d' : b.active ? (b.activeBg || '#1f4d33') : (b.bg || '#262626');
        ctx.fillRect(b.x, b.y, b.w, b.h);
        if (b.active) {
            ctx.fillStyle = b.accent || GS.PALETTE.ACCENT_GREEN;
            ctx.fillRect(b.x, b.y + b.h - 3, b.w, 3);
        }
        ctx.font = GS.FONTS.SMALL_BOLD;
        ctx.textAlign = 'center';
        ctx.fillStyle = b.disabled ? '#555555' : '#e8e8e8';
        ctx.fillText(this._fit(ctx, b.label, b.w - 8), b.x + b.w / 2, b.y + b.h / 2 + 1);
        this.renderProps.buttons.push(b);
    }

    /** Lay out a row of buttons over `w`, each { key, label, weight? }. */
    _buttonRow(ctx, x, y, w, h, list) {
        const gap = 4;
        const total = list.reduce((n, b) => n + (b.weight || 1), 0);
        const free = w - gap * (list.length - 1);
        let bx = x;
        list.forEach(b => {
            const bw = free * (b.weight || 1) / total;
            this._button(ctx, { ...b, x: bx, y, w: bw, h });
            bx += bw + gap;
        });
    }

    // ── render ───────────────────────────────────────────────────────────

    render(w) {
        const ctx = HCW.ctx;
        if (!ctx) return;
        const { x, y, sx, sy } = w;
        this.renderProps.buttons = [];
        this.renderProps.zones = {};

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, sx, sy);
        ctx.clip();
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0c0c0c';
        ctx.fillRect(x, y, sx, sy);

        const ctl = typeof FGMEffectEngine !== 'undefined' ? FGMEffectEngine : null;
        const effects = typeof Effects !== 'undefined' ? Effects.list() : [];
        const selected = effects.find(e => e.id === this.selectedEffectId) || null;

        this._renderTitle(ctx, x, y, sx);

        const bodyY = y + this.titleHeight;
        const bodyH = sy - this.titleHeight;
        const leftW = Math.max(240, Math.min(sx - 320, Math.round(sx * 0.42)));
        this._renderGridPanel(ctx, x, bodyY, leftW, bodyH, effects, selected);

        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x + leftW, bodyY, 2, bodyH);

        this._renderEffectPanel(ctx, x + leftW + 2, bodyY, sx - leftW - 2, bodyH, effects, selected, ctl);

        ctx.restore();
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
    }

    _renderTitle(ctx, x, y, sx) {
        ctx.fillStyle = '#141414';
        ctx.fillRect(x, y, sx, this.titleHeight);
        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
        ctx.fillRect(x, y + this.titleHeight - 2, sx, 2);
        ctx.font = GS.FONTS.TITLE;
        ctx.textAlign = 'left';
        ctx.fillStyle = GS.PALETTE.TEXT_PRIMARY;
        ctx.fillText(this._fit(ctx, this.getLabel(), sx * 0.4), x + 8, y + this.titleHeight / 2);

        let right = this.modal ? 86 : 8;
        if (this.modal) this._button(ctx, { key: 'close', label: '✕ Close', x: x + sx - 80, y: y + 3, w: 76, h: this.titleHeight - 7, bg: '#5a1d1d' });

        const showMessage = this.message && performance.now() < this._messageUntil;
        const sel = typeof Programmer !== 'undefined' ? Programmer.selection.length : 0;
        const connected = typeof DMXOutput !== 'undefined' && DMXOutput.connected;
        const text = showMessage ? this.message : `${sel} selected  ·  ${connected ? 'server ●' : '⚠ server not connected'}`;
        ctx.font = GS.FONTS.SMALL;
        ctx.textAlign = 'right';
        ctx.fillStyle = showMessage ? '#ffd24a' : (connected ? GS.PALETTE.TEXT_SECONDARY : '#ff8a5c');
        ctx.fillText(this._fit(ctx, text, sx * 0.55), x + sx - right, y + this.titleHeight / 2);
    }

    // ── fixture grid ─────────────────────────────────────────────────────

    _renderGridPanel(ctx, x, y, w, h, effects, selected) {
        const pad = 6;
        this._buttonRow(ctx, x + pad, y + pad, w - pad * 2, this.barHeight - pad, [
            { key: 'mode-select', label: 'Select', active: this.gridMode === 'select' },
            { key: 'mode-move', label: 'Move', active: this.gridMode === 'move' },
            { key: 'select-all', label: 'All' },
            { key: 'select-none', label: 'None' },
            { key: 'select-effect', label: 'FX fixtures', disabled: !selected },
            { key: 'arrange', label: 'Arrange ▾' }
        ]);

        const gx = x + pad;
        const gy = y + this.barHeight + pad;
        const gw = w - pad * 2;
        const gh = h - this.barHeight - pad * 2 - 18;
        this.renderProps.zones.grid = { x: gx, y: gy, w: gw, h: gh };
        ctx.fillStyle = '#111111';
        ctx.fillRect(gx, gy, gw, gh);

        this.renderProps.tiles = [];
        if (typeof FixtureGrid === 'undefined' || typeof PatchManager === 'undefined') return;
        const fixtures = PatchManager.getAllFixtures();
        if (!fixtures.length) {
            ctx.font = GS.FONTS.SMALL;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#6a6a6a';
            ctx.fillText('No fixtures patched — Menu → Patch', gx + gw / 2, gy + 30);
            return;
        }

        const pos = FixtureGrid.positions();
        const b = FixtureGrid.bounds();
        const cols = b.maxX + 2, rows = b.maxY + 2;
        const cell = Math.max(38, Math.min(84, Math.floor(Math.min(gw / cols, gh / rows))));
        this.renderProps.cell = cell;
        const ox = gx + 4 + this.gridScrollX;
        const oy = gy + 4 + this.gridScrollY;
        this.renderProps.gridOrigin = { x: ox, y: oy };

        ctx.save();
        ctx.beginPath();
        ctx.rect(gx, gy, gw, gh);
        ctx.clip();

        // cells
        ctx.strokeStyle = '#1c1c1c';
        ctx.lineWidth = 1;
        const vCols = Math.ceil((gw - this.gridScrollX) / cell) + 1;
        const vRows = Math.ceil((gh - this.gridScrollY) / cell) + 1;
        for (let cx = 0; cx < vCols; cx++) for (let cy = 0; cy < vRows; cy++) {
            ctx.strokeRect(ox + cx * cell + 0.5, oy + cy * cell + 0.5, cell - 1, cell - 1);
        }

        // selected effect: membership, slot and live value
        const fxIndex = selected ? Effects.list().indexOf(selected) : -1;
        const fxColor = fxIndex >= 0 ? HCWEffectEngineField.effectColor(fxIndex) : null;
        const cycles = selected && typeof FGMEffectEngine !== 'undefined' ? FGMEffectEngine.cyclesOf(selected) : null;
        const sel = new Set(typeof Programmer !== 'undefined' ? Programmer.selection : []);
        const selOrder = typeof Programmer !== 'undefined' ? Programmer.selection : [];
        const running = new Map(); // fid → colour of the first running effect on it
        effects.forEach((e, i) => { if (e.running) e.fids.forEach(fid => { if (!running.has(fid)) running.set(fid, HCWEffectEngineField.effectColor(i)); }); });

        const d = this._drag;
        const dragging = d && d.zone === 'grid' && d.moved && this.gridMode === 'move' && d.tile;
        const dragSet = dragging ? (sel.has(d.tile.fid) ? sel : new Set([d.tile.fid])) : null;

        fixtures.forEach(f => {
            const p = pos[f.fid];
            if (!p) return;
            let tx = ox + p.x * cell + 2, ty = oy + p.y * cell + 2;
            const ts = cell - 4;
            if (dragSet && dragSet.has(f.fid)) { tx += d.toX - d.x; ty += d.toY - d.y; }
            this.renderProps.tiles.push({ fid: f.fid, x: ox + p.x * cell + 2, y: oy + p.y * cell + 2, w: ts, h: ts });

            const isSel = sel.has(f.fid);
            const fxIdx = selected ? selected.fids.indexOf(f.fid) : -1;

            ctx.globalAlpha = dragSet && dragSet.has(f.fid) ? 0.75 : 1;
            ctx.fillStyle = isSel ? '#17573a' : '#1d1d1d';
            ctx.fillRect(tx, ty, ts, ts);

            // live value of the selected effect as a fill from the bottom
            if (fxIdx !== -1 && cycles !== null && selected.wave !== 'random') {
                const v = EffectCurve.valueAt(selected, fxIdx, cycles);
                ctx.fillStyle = fxColor;
                ctx.globalAlpha *= 0.35;
                ctx.fillRect(tx, ty + ts * (1 - v), ts, ts * v);
                ctx.globalAlpha = dragSet && dragSet.has(f.fid) ? 0.75 : 1;
            }

            ctx.lineWidth = fxIdx !== -1 ? 2 : 1;
            ctx.strokeStyle = fxIdx !== -1 ? fxColor : (isSel ? GS.PALETTE.ACCENT_GREEN : '#333333');
            ctx.strokeRect(tx + 0.5, ty + 0.5, ts - 1, ts - 1);

            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffffff';
            ctx.font = cell >= 52 ? GS.FONTS.LABEL : GS.FONTS.SMALL_BOLD;
            ctx.fillText(String(f.fid), tx + ts / 2, ty + ts / 2 - (cell >= 52 ? 6 : 0));
            if (cell >= 52) {
                ctx.font = GS.FONTS.SMALL;
                ctx.fillStyle = '#9a9a9a';
                ctx.fillText(this._fit(ctx, f.name, ts - 6), tx + ts / 2, ty + ts / 2 + 10);
            }

            // corner marks: selection order (top-left), phase slot (top-right), running dot (bottom-left)
            ctx.font = GS.FONTS.SMALL;
            if (isSel) {
                ctx.textAlign = 'left';
                ctx.fillStyle = '#7fe0ad';
                ctx.fillText(String(selOrder.indexOf(f.fid) + 1), tx + 3, ty + 8);
            }
            if (fxIdx !== -1) {
                ctx.textAlign = 'right';
                ctx.fillStyle = fxColor;
                ctx.fillText(String(EffectCurve.slotOf(selected, fxIdx) + 1), tx + ts - 3, ty + 8);
            }
            if (running.has(f.fid)) {
                ctx.beginPath();
                ctx.arc(tx + 6, ty + ts - 6, 3, 0, Math.PI * 2);
                ctx.fillStyle = running.get(f.fid);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        });

        // drop target
        if (dragging) {
            const c = this._cellAt(d.toX, d.toY);
            if (c && c.cx >= 0 && c.cy >= 0) {
                ctx.strokeStyle = '#ffffff';
                ctx.setLineDash([4, 3]);
                ctx.strokeRect(ox + c.cx * cell + 1.5, oy + c.cy * cell + 1.5, cell - 3, cell - 3);
                ctx.setLineDash([]);
            }
        }
        // selection box
        if (d && d.zone === 'grid' && d.moved && this.gridMode === 'select') {
            ctx.fillStyle = 'rgba(0, 255, 149, 0.12)';
            ctx.strokeStyle = GS.PALETTE.ACCENT_GREEN;
            const bx = Math.min(d.x, d.toX), by = Math.min(d.y, d.toY);
            ctx.fillRect(bx, by, Math.abs(d.toX - d.x), Math.abs(d.toY - d.y));
            ctx.strokeRect(bx + 0.5, by + 0.5, Math.abs(d.toX - d.x), Math.abs(d.toY - d.y));
        }
        ctx.restore();

        ctx.font = GS.FONTS.SMALL;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#6a6a6a';
        ctx.fillText(this.gridMode === 'select'
            ? 'Tap = select · drag = box select'
            : 'Drag a fixture (or the selection) to another cell · drag empty space to scroll',
        x + pad, y + h - 11);
    }

    // ── effects ──────────────────────────────────────────────────────────

    _renderEffectPanel(ctx, x, y, w, h, effects, selected, ctl) {
        const pad = 6;
        // header
        ctx.font = GS.FONTS.LABEL;
        ctx.textAlign = 'left';
        ctx.fillStyle = GS.PALETTE.TEXT_PRIMARY;
        ctx.fillText(`Effects (${effects.filter(e => e.running).length}/${effects.length} running)`, x + pad + 2, y + pad + (this.barHeight - pad) / 2);
        const addW = Math.min(150, w * 0.3);
        this._button(ctx, { key: 'new', label: '+ New effect', x: x + w - pad - addW, y: y + pad, w: addW, h: this.barHeight - pad, bg: '#14532d' });
        const stopW = Math.min(90, w * 0.18);
        this._button(ctx, { key: 'stop-all', label: 'Stop all', x: x + w - pad * 2 - addW - stopW, y: y + pad, w: stopW, h: this.barHeight - pad, disabled: !effects.some(e => e.running) });

        // list
        const listY = y + this.barHeight + pad;
        const listH = Math.max(this.rowHeight * 2, Math.min(effects.length || 2, Math.floor((h * 0.32) / this.rowHeight)) * this.rowHeight);
        this.renderProps.zones.list = { x: x + pad, y: listY, w: w - pad * 2, h: listH };
        ctx.fillStyle = '#111111';
        ctx.fillRect(x + pad, listY, w - pad * 2, listH);
        this.renderProps.rows = [];

        const maxScroll = Math.max(0, effects.length * this.rowHeight - listH);
        this._listScroll = Math.min(this._listScroll, maxScroll);

        ctx.save();
        ctx.beginPath();
        ctx.rect(x + pad, listY, w - pad * 2, listH);
        ctx.clip();
        if (!effects.length) {
            ctx.font = GS.FONTS.SMALL;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#7a7a7a';
            ctx.fillText('No effects yet — MAKE + tap an Effects pool slot, or + New effect', x + w / 2, listY + listH / 2);
        }
        effects.forEach((e, i) => {
            const ry = listY + i * this.rowHeight - this._listScroll;
            if (ry + this.rowHeight < listY || ry > listY + listH) return;
            const rx = x + pad, rw = w - pad * 2;
            const color = HCWEffectEngineField.effectColor(i);
            const isSel = selected && e.id === selected.id;
            ctx.fillStyle = isSel ? '#1f2a36' : (i % 2 ? '#151515' : '#121212');
            ctx.fillRect(rx, ry, rw, this.rowHeight);
            ctx.fillStyle = color;
            ctx.fillRect(rx, ry, 4, this.rowHeight);

            // run toggle
            const tw = 46;
            ctx.fillStyle = e.running ? '#14532d' : '#262626';
            ctx.fillRect(rx + 8, ry + 4, tw, this.rowHeight - 8);
            ctx.font = GS.FONTS.SMALL_BOLD;
            ctx.textAlign = 'center';
            ctx.fillStyle = e.running ? '#7fe0ad' : '#9a9a9a';
            ctx.fillText(e.running ? '▶ ON' : 'off', rx + 8 + tw / 2, ry + this.rowHeight / 2 + 1);

            const cols = [
                { text: `${e.preset ? e.preset + '  ' : ''}${e.name}`, w: 0.36, color: '#ffffff', font: GS.FONTS.LABEL },
                { text: ctl ? ctl.prettyAttribute(e.attribute) : e.attribute, w: 0.2 },
                { text: ctl ? ctl.waveLabel(e) : e.wave, w: 0.2 },
                { text: `${e.fids.length} fx`, w: 0.12 },
                { text: FixtureGridStore.directionIcon(e.direction), w: 0.12, color: color }
            ];
            let cx = rx + 8 + tw + 8;
            const cw = rw - (cx - rx) - 4;
            ctx.textAlign = 'left';
            cols.forEach(c => {
                ctx.font = c.font || GS.FONTS.SMALL;
                ctx.fillStyle = c.color || '#b0b0b0';
                ctx.fillText(this._fit(ctx, c.text, cw * c.w - 6), cx, ry + this.rowHeight / 2 + 1);
                cx += cw * c.w;
            });
            if (isSel) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.strokeRect(rx + 0.5, ry + 0.5, rw - 1, this.rowHeight - 1);
            }
            this.renderProps.rows.push({ id: e.id, y: ry, h: this.rowHeight, toggle: { x: rx + 8, w: tw } });
        });
        ctx.restore();

        // settings of the selected effect
        let sy = listY + listH + pad;
        const settings = ctl ? ctl.settingsButtons(selected) : [];
        settings.forEach(row => {
            this._buttonRow(ctx, x + pad, sy, w - pad * 2, this.barHeight - pad, row);
            sy += this.barHeight;
        });

        // curve editor
        const cy = sy + 2;
        const ch = y + h - cy - pad;
        if (!selected || ch < 120) {
            this.renderProps.zones.curve = null;
            if (!selected && effects.length) {
                ctx.font = GS.FONTS.SMALL;
                ctx.textAlign = 'center';
                ctx.fillStyle = '#7a7a7a';
                ctx.fillText('Tap an effect to edit its curve', x + w / 2, cy + Math.max(20, ch / 2));
            }
            return;
        }
        if (ctl) ctl.syncCurve(this, selected);
        const rect = { x: x + pad, y: cy, sx: w - pad * 2, sy: ch };
        this.renderProps.zones.curve = { x: rect.x, y: rect.y, w: rect.sx, h: rect.sy };
        this.curveEditor.render(rect);
    }
}

globalThis.HCWEffectEngineField = HCWEffectEngineField;
