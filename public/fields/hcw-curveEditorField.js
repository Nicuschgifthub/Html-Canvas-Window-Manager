/**
 * HCWCurveEditorField — phaser curve editor. One effect cycle left → right,
 * the effect's range bottom → top.
 *
 *   field.setCurves([{
 *       label: 'Pan', color: '#3d7cc9',
 *       effect: { wave, points, duty, phase, spread, wings, fids, bpm, rate },
 *       rangeTop: '+10%', rangeBottom: '−10%'
 *   }], activeIndex);
 *   field.setToolbar([{ key: 'template', label: 'Template ▾' }, …]);
 *   field.setCyclesSource(() => elapsedCycles | null);   // running dots, null = still
 *
 * Touch:
 *   drag a point          move it (first point stays at the cycle start); snaps to 1/48 and 1 %
 *   tap a point           select it (toolbar acts on it)
 *   tap empty graph       add a point there
 *
 * Emits (via onAction):
 *   CURVE_EDITOR_UPDATES.CHANGE { curveIndex, points, final }   final = drag ended
 *   CURVE_EDITOR_UPDATES.BUTTON { key, curveIndex, selected }
 *
 * Only shapes are edited here — FGMEffectEngine turns them into effects.
 */
class HCWCurveEditorField extends HCWBaseField {
    constructor(label = 'Phaser') {
        super(label);
        this.className = 'HCWCurveEditorField';
        this._insertClassKeyword();

        this.titleHeight = 28;
        this.toolbarHeight = 44;
        this.infoHeight = 24;
        this.pad = { left: 52, right: 16, top: 14, bottom: 34 };

        this.curves = [];
        this.active = 0;
        this.selected = null;     // selected point index of the active curve
        this.toolbar = [];
        this.subtitle = '';
        this.message = '';

        this._drag = null;
        this._cyclesSource = null;
        this._anim = null;

        this.renderProps = { graph: null, buttons: [], sx: 0, sy: 0 };
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.CURVE_EDITOR;
    }

    getExcludedJSONKeys() {
        return [...super.getExcludedJSONKeys(), '_drag', '_cyclesSource', '_anim', 'renderProps'];
    }

    // ── setup ────────────────────────────────────────────────────────────

    /** redraw = false when called while rendering (updateFrame draws synchronously). */
    setCurves(curves, active = this.active, redraw = true) {
        this.curves = curves || [];
        this.active = Math.max(0, Math.min(this.curves.length - 1, active));
        const pts = this._points();
        if (this.selected !== null && (!pts || this.selected >= pts.length)) this.selected = null;
        if (redraw) this.updateFrame();
        return this;
    }

    setToolbar(buttons) {
        this.toolbar = buttons || [];
        this.updateFrame();
        return this;
    }

    setSubtitle(text) {
        this.subtitle = text || '';
        this.updateFrame();
        return this;
    }

    setMessage(text) {
        this.message = text || '';
        this.updateFrame();
        return this;
    }

    /**
     * fn() → elapsed cycles of the effect, or null. With `animate` the field
     * redraws at ~25 fps itself; embedded editors leave that to their host.
     */
    setCyclesSource(fn, animate = true) {
        this._cyclesSource = fn;
        if (this._anim) clearInterval(this._anim);
        this._anim = fn && animate ? setInterval(() => this.updateFrame(), 40) : null;
        return this;
    }

    /** True while a point is being dragged (hosts must not rebuild the curves then). */
    get dragging() {
        return !!(this._drag && this._drag.point !== undefined && this._drag.point !== -1 && this._drag.moved);
    }

    destroy() {
        this.setCyclesSource(null);
    }

    _curve() {
        return this.curves[this.active] || null;
    }

    /** Editable points of the active curve (null for random — nothing to drag). */
    _points() {
        const c = this._curve();
        if (!c || c.effect.wave === 'random') return null;
        if (!c._points) c._points = EffectCurve.pointsForWave(c.effect, EffectCurve.slotCount(c.effect));
        return c._points;
    }

    _setPoints(points, final) {
        const c = this._curve();
        if (!c) return;
        c._points = points;
        c.effect = { ...c.effect, wave: 'custom', points: points.map(p => ({ ...p })) };
        this.emitAction(GLOBAL_TYPES.ACTIONS.CURVE_EDITOR_UPDATES.CHANGE, {
            curveIndex: this.active,
            points: points.map(p => ({ ...p })),
            final
        });
        this.updateFrame();
    }

    // ── geometry ─────────────────────────────────────────────────────────

    _toX(pos) {
        const g = this.renderProps.graph;
        return g.x + pos * g.w;
    }

    _toY(value) {
        const g = this.renderProps.graph;
        return g.y + (1 - value) * g.h;
    }

    _fromXY(x, y) {
        const g = this.renderProps.graph;
        return {
            pos: Math.min(1, Math.max(0, (x - g.x) / g.w)),
            value: Math.min(1, Math.max(0, 1 - (y - g.y) / g.h))
        };
    }

    static snap(v, step) {
        return Math.round(v / step) * step;
    }

    _hitPoint(x, y) {
        const pts = this._points();
        if (!pts || !this.renderProps.graph) return -1;
        let best = -1, bestD = 18 * 18;
        pts.forEach((p, i) => {
            const dx = this._toX(p.pos) - x;
            const dy = this._toY(p.value) - y;
            const d = dx * dx + dy * dy;
            if (d < bestD) { bestD = d; best = i; }
        });
        return best;
    }

    _inGraph(x, y) {
        const g = this.renderProps.graph;
        return g && x >= g.x - 10 && x <= g.x + g.w + 10 && y >= g.y - 10 && y <= g.y + g.h + 10;
    }

    // ── interaction ──────────────────────────────────────────────────────

    _interaction(interaction) {
        const { type } = interaction;
        // mouseup carries no coordinates — use where the pointer was last seen
        if (this._drag && interaction.mouseX !== undefined) {
            this._drag.lastX = interaction.mouseX;
            this._drag.lastY = interaction.mouseY;
        }
        const x = interaction.mouseX ?? this._drag?.lastX;
        const y = interaction.mouseY ?? this._drag?.lastY;

        if (type === 'mousedown') {
            const btn = this._hitButton(x, y);
            if (btn) {
                this._drag = { button: btn.key, lastX: x, lastY: y };
                this._pressedKey = btn.key;
                this.updateFrame();
                return;
            }
            if (!this._inGraph(x, y)) return;
            const hit = this._hitPoint(x, y);
            this._drag = { point: hit, x, y, lastX: x, lastY: y, moved: false };
            if (hit !== -1) { this.selected = hit; this.updateFrame(); }

        } else if (type === 'mousemove' && this._drag && this._drag.point !== undefined) {
            const d = this._drag;
            if (!d.moved && Math.abs(x - d.x) < 4 && Math.abs(y - d.y) < 4) return;
            d.moved = true;
            if (d.point === -1) return;
            this._movePoint(d.point, x, y, false);

        } else if (type === 'mouseup') {
            const d = this._drag;
            this._drag = null;
            this._pressedKey = null;
            if (!d) return;

            if (d.button) {
                const btn = this._hitButton(d.lastX, d.lastY);
                if (btn && btn.key === d.button) {
                    this.emitAction(GLOBAL_TYPES.ACTIONS.CURVE_EDITOR_UPDATES.BUTTON, { key: btn.key, curveIndex: this.active, selected: this.selected });
                }
                this.updateFrame();
                return;
            }

            if (d.point !== -1 && d.moved) {
                this._movePoint(d.point, d.lastX, d.lastY, true);
            } else if (d.point === -1 && !d.moved) {
                this._addPointAt(d.x, d.y);
            }
            this.updateFrame();
        }
    }

    _hitButton(x, y) {
        if (x === undefined || y === undefined) return null;
        return this.renderProps.buttons.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) || null;
    }

    _movePoint(index, x, y, final) {
        const pts = this._points();
        if (!pts || !pts[index] || !Number.isFinite(x) || !Number.isFinite(y)) return;
        const at = this._fromXY(x, y);
        const gap = EffectCurve.MIN_GAP;
        const next = pts.map(p => ({ ...p }));
        const p = next[index];
        p.value = HCWCurveEditorField.snap(at.value, 0.01);
        if (index > 0) {
            const min = next[index - 1].pos + gap;
            const max = (index + 1 < next.length ? next[index + 1].pos : 1) - gap;
            p.pos = Math.min(max, Math.max(min, HCWCurveEditorField.snap(at.pos, 1 / 48)));
        }
        this.selected = index;
        this._setPoints(next, final);
    }

    _addPointAt(x, y) {
        const pts = this._points();
        if (!pts) return;
        const at = this._fromXY(x, y);
        const pos = Math.min(1 - EffectCurve.MIN_GAP, HCWCurveEditorField.snap(at.pos, 1 / 48));
        if (pts.some(p => Math.abs(p.pos - pos) < EffectCurve.MIN_GAP * 2)) return;
        const prev = [...pts].reverse().find(p => p.pos < pos) || pts[pts.length - 1];
        const next = [...pts.map(p => ({ ...p })), { pos, value: HCWCurveEditorField.snap(at.value, 0.01), curve: prev.curve }]
            .sort((a, b) => a.pos - b.pos);
        this.selected = next.findIndex(p => p.pos === pos);
        this._setPoints(next, true);
    }

    // ── rendering ────────────────────────────────────────────────────────

    _fit(ctx, text, maxWidth) {
        text = String(text ?? '');
        if (maxWidth <= 4) return '';
        if (ctx.measureText(text).width <= maxWidth) return text;
        while (text.length > 1 && ctx.measureText(text + '…').width > maxWidth) text = text.slice(0, -1);
        return text + '…';
    }

    render(w) {
        const ctx = HCW.ctx;
        if (!ctx) return;
        const { x, y, sx, sy } = w;

        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, sx, sy);
        ctx.clip();
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#0e0e0e';
        ctx.fillRect(x, y, sx, sy);

        // title
        ctx.fillStyle = '#141414';
        ctx.fillRect(x, y, sx, this.titleHeight);
        ctx.fillStyle = GS.PALETTE.ACCENT_GREEN;
        ctx.fillRect(x, y + this.titleHeight - 2, sx, 2);
        ctx.font = GS.FONTS.TITLE;
        ctx.textAlign = 'left';
        ctx.fillStyle = GS.PALETTE.TEXT_PRIMARY;
        ctx.fillText(this._fit(ctx, this.getLabel(), sx * 0.45), x + 8, y + this.titleHeight / 2);
        if (this.subtitle) {
            ctx.font = GS.FONTS.SMALL;
            ctx.fillStyle = GS.PALETTE.TEXT_SECONDARY;
            ctx.textAlign = 'right';
            ctx.fillText(this._fit(ctx, this.subtitle, sx * 0.55 - 16), x + sx - 8, y + this.titleHeight / 2);
        }

        this._renderToolbar(ctx, x, y + this.titleHeight, sx);

        const gTop = y + this.titleHeight + this.toolbarHeight;
        const g = {
            x: x + this.pad.left,
            y: gTop + this.pad.top,
            w: Math.max(10, sx - this.pad.left - this.pad.right),
            h: Math.max(10, sy - (gTop - y) - this.pad.top - this.pad.bottom - this.infoHeight)
        };
        this.renderProps.graph = g;
        this._renderGraph(ctx, g);
        this._renderInfo(ctx, x, y + sy - this.infoHeight, sx);

        ctx.restore();
        ctx.textAlign = 'start';
        ctx.textBaseline = 'alphabetic';
    }

    _renderToolbar(ctx, x, y, sx) {
        this.renderProps.buttons = [];
        const gap = 4;
        const n = this.toolbar.length;
        if (!n) return;
        const bw = Math.max(40, (sx - 8 - gap * (n - 1)) / n);
        ctx.font = GS.FONTS.SMALL_BOLD;
        ctx.textAlign = 'center';
        this.toolbar.forEach((b, i) => {
            const bx = x + 4 + i * (bw + gap);
            const by = y + 5;
            const bh = this.toolbarHeight - 10;
            const pressed = this._pressedKey === b.key;
            ctx.fillStyle = pressed ? '#00773d' : (b.active ? (b.color || '#1f4d33') : (b.bg || '#262626'));
            ctx.fillRect(bx, by, bw, bh);
            if (b.active) {
                ctx.fillStyle = b.color ? '#ffffff' : GS.PALETTE.ACCENT_GREEN;
                ctx.fillRect(bx, by + bh - 3, bw, 3);
            }
            ctx.fillStyle = b.disabled ? '#5a5a5a' : '#e8e8e8';
            ctx.fillText(this._fit(ctx, b.label, bw - 8), bx + bw / 2, by + bh / 2);
            if (!b.disabled) this.renderProps.buttons.push({ key: b.key, x: bx, y: by, w: bw, h: bh });
        });
    }

    _renderGraph(ctx, g) {
        // background + grid
        ctx.fillStyle = '#121212';
        ctx.fillRect(g.x, g.y, g.w, g.h);
        ctx.lineWidth = 1;
        for (let i = 0; i <= 8; i++) {
            const gx = Math.round(g.x + (i / 8) * g.w) + 0.5;
            ctx.strokeStyle = i % 2 === 0 ? '#2c2c2c' : '#1d1d1d';
            ctx.beginPath(); ctx.moveTo(gx, g.y); ctx.lineTo(gx, g.y + g.h); ctx.stroke();
        }
        for (let i = 0; i <= 4; i++) {
            const gy = Math.round(g.y + (i / 4) * g.h) + 0.5;
            ctx.strokeStyle = i === 2 ? '#2c2c2c' : '#1d1d1d';
            ctx.beginPath(); ctx.moveTo(g.x, gy); ctx.lineTo(g.x + g.w, gy); ctx.stroke();
        }

        const active = this._curve();

        // axis labels
        ctx.font = GS.FONTS.SMALL;
        ctx.fillStyle = '#8a8a8a';
        ctx.textAlign = 'right';
        ctx.fillText(active ? (active.rangeTop || '100%') : '100%', g.x - 6, g.y);
        ctx.fillText(active ? (active.rangeBottom || '0%') : '0%', g.x - 6, g.y + g.h);
        ctx.textAlign = 'center';
        ['0', '¼', '½', '¾', '1'].forEach((t, i) => ctx.fillText(t, g.x + (i / 4) * g.w, g.y + g.h + 10));

        // other curves of the group, dimmed
        this.curves.forEach((c, i) => {
            if (i !== this.active) this._renderCurve(ctx, g, c, true);
        });
        if (!active) return;

        if (active.effect.wave === 'random') {
            ctx.font = GS.FONTS.LABEL;
            ctx.fillStyle = '#9a9a9a';
            ctx.textAlign = 'center';
            ctx.fillText('Random — a new value every cycle for every fixture.', g.x + g.w / 2, g.y + g.h / 2 - 10);
            ctx.font = GS.FONTS.SMALL;
            ctx.fillText('Pick a template to draw your own curve.', g.x + g.w / 2, g.y + g.h / 2 + 10);
        } else {
            this._renderCurve(ctx, g, active, false);
            this._renderPoints(ctx, g, active);
        }

        this._renderFixtures(ctx, g, active);
    }

    _sample(c, p) {
        // the active curve is drawn from its (editable) points, the others from their effect
        const pts = c === this._curve() ? this._points() : null;
        if (pts) return EffectCurve.evalPoints(pts, p);
        const e = c.effect;
        return EffectCurve.value(e, p, EffectCurve.slotCount(e));
    }

    _renderCurve(ctx, g, c, dim) {
        if (c.effect.wave === 'random') return;
        const steps = Math.max(64, Math.min(600, Math.round(g.w)));
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
            const p = i / steps;
            const px = g.x + p * g.w;
            const py = this._toY(this._sample(c, Math.min(p, 0.999999)));
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        if (!dim) {
            ctx.save();
            ctx.lineTo(g.x + g.w, g.y + g.h);
            ctx.lineTo(g.x, g.y + g.h);
            ctx.closePath();
            ctx.globalAlpha = 0.14;
            ctx.fillStyle = c.color || GS.PALETTE.ACCENT_GREEN;
            ctx.fill();
            ctx.restore();
            // re-trace for the stroke
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const p = i / steps;
                const py = this._toY(this._sample(c, Math.min(p, 0.999999)));
                if (i === 0) ctx.moveTo(g.x, py); else ctx.lineTo(g.x + p * g.w, py);
            }
        }
        ctx.save();
        ctx.globalAlpha = dim ? 0.35 : 1;
        ctx.strokeStyle = c.color || GS.PALETTE.ACCENT_GREEN;
        ctx.lineWidth = dim ? 1.5 : 2.5;
        ctx.stroke();
        ctx.restore();
    }

    _renderPoints(ctx, g, c) {
        const pts = this._points();
        if (!pts) return;
        pts.forEach((p, i) => {
            const px = this._toX(p.pos);
            const py = this._toY(p.value);
            const sel = i === this.selected;
            ctx.beginPath();
            ctx.arc(px, py, sel ? 9 : 7, 0, Math.PI * 2);
            ctx.fillStyle = sel ? '#ffffff' : (c.color || GS.PALETTE.ACCENT_GREEN);
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#0e0e0e';
            ctx.stroke();
            ctx.font = GS.FONTS.SMALL_BOLD;
            ctx.fillStyle = sel ? '#000000' : '#0e0e0e';
            ctx.textAlign = 'center';
            ctx.fillText(String(i + 1), px, py + 1);
        });
    }

    /** Where every fixture is in the cycle right now (moving) or at the start (still). */
    _renderFixtures(ctx, g, c) {
        const e = c.effect;
        const fids = e.fids || [];
        if (!fids.length) return;
        const cycles = this._cyclesSource ? this._cyclesSource() : null;
        const t = cycles === null || cycles === undefined ? 0 : cycles;

        // fixtures sharing a phase sit on the same spot — one tick + label "101+2" per spot,
        // labels that would overlap the previous one are skipped
        const spots = new Map(); // rounded px → [fid…]
        const phases = fids.map((fid, i) => {
            let p = EffectCurve.phaseOf(e, i, t);
            p = p - Math.floor(p);
            const key = Math.round(p * g.w);
            if (!spots.has(key)) spots.set(key, []);
            spots.get(key).push(fid);
            return p;
        });
        ctx.font = GS.FONTS.SMALL;
        ctx.textAlign = 'center';
        let lastLabelRight = -Infinity;
        [...spots.entries()].sort((a, b) => a[0] - b[0]).forEach(([key, list]) => {
            const px = g.x + key;
            ctx.fillStyle = '#d8d8d8';
            ctx.beginPath();
            ctx.moveTo(px, g.y + g.h + 16);
            ctx.lineTo(px - 4, g.y + g.h + 24);
            ctx.lineTo(px + 4, g.y + g.h + 24);
            ctx.closePath();
            ctx.fill();
            const label = list.length > 1 ? `${list[0]}+${list.length - 1}` : String(list[0]);
            const lw = ctx.measureText(label).width;
            if (px - lw / 2 > lastLabelRight + 4) {
                ctx.fillStyle = '#9a9a9a';
                ctx.fillText(label, px, g.y + g.h + 30);
                lastLabelRight = px + lw / 2;
            }
        });

        fids.forEach((fid, i) => {
            const p = phases[i];
            const px = g.x + p * g.w;
            // dot on the curve while running
            if (cycles !== null && cycles !== undefined && e.wave !== 'random') {
                const v = this._sample(c, p);
                ctx.beginPath();
                ctx.arc(px, this._toY(v), 4, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
            }
        });
    }

    _renderInfo(ctx, x, y, sx) {
        ctx.fillStyle = '#141414';
        ctx.fillRect(x, y, sx, this.infoHeight);
        ctx.font = GS.FONTS.SMALL;
        ctx.textAlign = 'left';
        let text = this.message;
        if (!text) {
            const pts = this._points();
            const p = pts && this.selected !== null ? pts[this.selected] : null;
            text = p
                ? `Point ${this.selected + 1} of ${pts.length}  ·  at ${Math.round(p.pos * 1000) / 10}% of the cycle  ·  value ${Math.round(p.value * 100)}%  ·  then ${p.curve}`
                : 'Drag points · tap a point to select it · tap empty space to add a point';
        }
        ctx.fillStyle = this.message ? '#ffd24a' : '#9a9a9a';
        ctx.fillText(this._fit(ctx, text, sx - 16), x + 8, y + this.infoHeight / 2);
    }
}

globalThis.HCWCurveEditorField = HCWCurveEditorField;
