/**
 * FGMEffectEngine — logic behind every HCWEffectEngineField (the Effect Engine
 * window). The field draws and reports touches; this class changes the
 * programmer selection, the fixture grid and the effects, and opens dialogs.
 *
 *   Add Window → Effect Engine    a window on a page (saved with the show)
 *   Menu → Effects                the same view, full screen (openModal)
 *
 * Effects are evaluated on the console server; nothing here computes output.
 * The window animates (live values in the grid, dots on the curve) only while
 * it is visible and an effect is running.
 */
class FGMEffectEngine {
    static _queued = false;
    static _timer = null;

    static get MODAL() { return { ID: 1013, LOCATION_ID: '0.013' }; }
    static get CURVE_COLORS() { return ['#4aa3ff', '#ff9f3d', '#c86bff', '#5fd07a']; }

    static init() {
        const queue = () => this.queueRedraw();
        Programmer.on(queue);
        PatchManager.on(queue);
        Effects.on(queue);
        // Effects pool tiles: rebuild only when what they show changed (not on every curve drag)
        let poolSig = null;
        Effects.on(() => {
            const sig = JSON.stringify(Effects.list().map(e => [e.preset, e.name, e.running, e.fids.length]));
            if (sig === poolSig) return;
            poolSig = sig;
            Promise.resolve().then(() => FGMMapping.refreshEffectPools());
        });
        FixtureGrid.on(queue);
        ConsoleLink.on(queue);
        // live values: 20 fps, only while an engine window is visible and something runs
        this._timer = setInterval(() => {
            if (this.visibleFields().some(f => Effects.list().some(e => e.running))) HCWRender.updateFrame();
        }, 50);
    }

    static queueRedraw() {
        if (this._queued) return;
        this._queued = true;
        Promise.resolve().then(() => {
            this._queued = false;
            if (this.visibleFields().length) HCWRender.updateFrame();
        });
    }

    static fields() {
        if (typeof HCWDB === 'undefined') return [];
        return HCWDB.getWindows()
            .map(w => ({ w, f: w.getContextField && w.getContextField() }))
            .filter(({ f }) => f instanceof HCWEffectEngineField);
    }

    static visibleFields() {
        return this.fields().filter(({ w }) => !w.getHiddenStatus()).map(({ f }) => f);
    }

    /** Elapsed cycles of a running effect, extrapolated from the last server status. */
    static cyclesOf(effect) {
        const st = DMXOutput.status;
        if (!effect || !effect.running || !st || !st.effectCycles || st.effectCycles[effect.id] === undefined) return null;
        const dt = performance.now() - (DMXOutput._statusAt || performance.now());
        return st.effectCycles[effect.id] + dt * effect.bpm * (effect.rate || 1) / 60000;
    }

    // ── labels ───────────────────────────────────────────────────────────

    static _num(v) {
        return String(Math.round(Number(v) * 100) / 100);
    }

    static waveLabel(e) {
        if (e.wave === 'custom') return `curve ${(e.points || []).length}pt`;
        if (e.wave === 'square' && !(e.duty > 0)) return 'chase';
        return e.wave;
    }

    static rangeLabel(e) {
        if (e.mode === 'relative') return `± ${Math.round((e.size ?? 0) * 50)}%`;
        return `${Math.round((e.low ?? 0) * 100)}–${Math.round((e.high ?? 1) * 100)}%`;
    }

    static prettyAttribute(attribute) {
        const f = PatchManager.getAllFixtures().find(x => x.type.attributes[attribute]);
        const pretty = f && f.type.attributes[attribute].pretty;
        return typeof FGMFixtureSheet !== 'undefined' ? FGMFixtureSheet.columnLabel(attribute, pretty) : attribute;
    }

    static verifyNumber(min, max) {
        return (v) => {
            const n = Number(String(v).trim().replace(',', '.'));
            if (String(v).trim() === '' || !Number.isFinite(n)) return { valid: false, infoText: 'Number' };
            if (n < min || n > max) return { valid: false, infoText: `${min} … ${max}` };
            return { valid: true, infoText: '' };
        };
    }

    static _parse(v) {
        return Number(String(v).trim().replace(',', '.'));
    }

    // ── settings buttons of the selected effect (two rows) ───────────────

    static settingsButtons(e) {
        const off = !e;
        return [
            [
                { key: 'attribute', label: e ? this.prettyAttribute(e.attribute) : 'Attribute', weight: 1.2, disabled: off },
                { key: 'range', label: e ? `Range ${this.rangeLabel(e)}` : 'Range', weight: 1.2, disabled: off },
                { key: 'bpm', label: e ? `${this._num(e.bpm)} BPM` : 'BPM', disabled: off },
                { key: 'spread', label: e ? `Spread ${Math.round((e.spread ?? 1) * 100)}%` : 'Spread', disabled: off },
                { key: 'wings', label: e ? `Wings ${e.wings || 1}` : 'Wings', disabled: off }
            ],
            [
                { key: 'direction', label: e ? `Order ${FixtureGridStore.directionIcon(e.direction)}` : 'Order', disabled: off },
                { key: 'use-selection', label: 'Fixtures ← selection', weight: 1.4, disabled: off },
                { key: 'rename', label: 'Name', disabled: off },
                { key: 'run', label: e && e.running ? '■ Stop' : '▶ Run', active: !!(e && e.running), disabled: off },
                { key: 'delete', label: 'Delete', bg: '#4a1c1c', disabled: off }
            ]
        ];
    }

    // ── curve editor sync ────────────────────────────────────────────────

    static curvesFor(group) {
        return group.map((e, i) => {
            const idx = Effects.list().indexOf(e);
            return {
                id: e.id,
                label: this.prettyAttribute(e.attribute),
                color: group.length > 1 ? this.CURVE_COLORS[i % 4] : HCWEffectEngineField.effectColor(Math.max(0, idx)),
                effect: { ...e, points: e.points ? e.points.map(p => ({ ...p })) : null },
                rangeTop: e.mode === 'relative' ? `+${Math.round((e.size ?? 0.2) * 50)}%` : `${Math.round((e.high ?? 1) * 100)}%`,
                rangeBottom: e.mode === 'relative' ? `−${Math.round((e.size ?? 0.2) * 50)}%` : `${Math.round((e.low ?? 0) * 100)}%`
            };
        });
    }

    /**
     * Keep the embedded curve editor on the selected effect (and its group as tabs).
     * Called while rendering — must not call anything that redraws (updateFrame is synchronous).
     */
    static syncCurve(field, selected) {
        const editor = field.curveEditor;
        if (editor.dragging) return;
        const group = Effects.groupOf(selected);
        const active = Math.max(0, group.indexOf(selected));
        const sig = JSON.stringify(group.map(e => [e.id, e.wave, e.points, e.duty, e.fids, e.slots, e.spread, e.wings, e.phase, e.mode, e.size, e.low, e.high, e.bpm, e.rate, e.running, e.attribute]));
        if (sig !== field._curveSig) {
            field._curveSig = sig;
            editor.setCurves(this.curvesFor(group), active, false);
            editor.setCyclesSource(() => this.cyclesOf(Effects.get(selected.id)), false);
        }
        const pts = editor._points();
        const sel = pts && editor.selected !== null ? pts[editor.selected] : null;
        const transition = sel ? sel.curve : (pts && pts.every(p => p.curve === pts[0].curve) ? pts[0].curve : 'mixed');
        editor.label = `Curve — ${selected.name}`;
        editor.subtitle = `${this.prettyAttribute(selected.attribute)} · ${selected.fids.length} fixtures · ${EffectCurve.slotCount(selected)} phase steps`;
        editor.toolbar = [
            ...(group.length > 1 ? group.map((g, i) => ({ key: `tab:${g.id}`, label: this.prettyAttribute(g.attribute), active: g.id === selected.id, color: this.CURVE_COLORS[i % 4] })) : []),
            { key: 'template', label: 'Template ▾' },
            { key: 'remove', label: '− Point', disabled: !pts || pts.length <= 1 },
            { key: 'add', label: '+ Point', disabled: !pts },
            { key: 'even', label: 'Even', disabled: !pts || pts.length < 2 },
            { key: 'transition', label: `Curve: ${transition}${sel ? '' : ' (all)'}`, disabled: !pts }
        ];
    }

    // ── touches from a field ─────────────────────────────────────────────

    static async handle(field, intent, data) {
        try {
            switch (intent) {
                case 'select-toggle': Programmer.toggle(data.fid); return;
                case 'select-box': Programmer.select(data.fids, 'add'); return;
                case 'grid-move': return this._gridMove(field, data);
                case 'effect-select':
                    field.selectedEffectId = data.id;
                    field.curveEditor.selected = null;
                    field._curveSig = null;
                    field.updateFrame();
                    return;
                case 'effect-toggle': Effects.toggle(data.id); return;
                case 'button': return await this._button(field, data.key);
                case 'curve': return await this._curve(field, data);
            }
        } catch (e) {
            console.error('Effect engine:', e);
            field.flash(`⚠ ${e.message}`);
        }
    }

    static _gridMove(field, { fid, dx, dy, cx, cy }) {
        const sel = Programmer.selection;
        if (sel.includes(fid) && sel.length > 1) {
            FixtureGrid.moveGroup(sel, dx, dy);
        } else if (cx >= 0 && cy >= 0) {
            FixtureGrid.move(fid, cx, cy);
        }
    }

    static _selected(field) {
        const e = Effects.get(field.selectedEffectId);
        if (!e && field.selectedEffectId) field.selectedEffectId = null;
        return e;
    }

    /** Run a sub dialog (choose / keyboard) and bring the engine back afterwards. */
    static async _sub(field, fn) {
        field._sub = true;
        try {
            return await fn();
        } finally {
            setTimeout(() => { field._sub = false; }, 0);
            const win = this.fields().find(({ f }) => f === field)?.w;
            if (field.modal && win) FGMModal.showOnly(win);
            else { FGMShowHandler.setPageCursor(); HCWRender.updateFrame(); }
        }
    }

    static async _button(field, key) {
        const e = this._selected(field);
        switch (key) {
            case 'close': GlobalInterrupter.resolveEvent('ACTION_EFFECT_ENGINE_CLOSE', {}); return;
            case 'mode-select': field.gridMode = 'select'; field.updateFrame(); return;
            case 'mode-move': field.gridMode = 'move'; field.updateFrame(); return;
            case 'select-all': Programmer.selectAll(); return;
            case 'select-none': Programmer.clearSelection(); return;
            case 'select-effect': if (e) Programmer.select(e.fids); return;
            case 'stop-all': Effects.stopAll(); return;
            case 'arrange': {
                const cols = await this._sub(field, () => FGMModal.choose({
                    title: 'Arrange the grid in patch order',
                    options: [4, 6, 8, 10, 12, 16].map(n => ({ label: `${n} per row`, value: n }))
                }));
                if (cols) { FixtureGrid.arrange(cols); field.gridScrollX = 0; field.gridScrollY = 0; }
                return;
            }
            case 'new': return this._newEffect(field);
        }
        if (!e) return;
        switch (key) {
            case 'run': Effects.toggle(e.id); return;
            case 'attribute': {
                const a = await this._sub(field, () => this.chooseAttribute(e.fids, e.attribute));
                if (a) Effects.update(e.id, { attribute: a });
                return;
            }
            case 'range': {
                const mode = await this._sub(field, () => FGMModal.choose({
                    title: 'Range',
                    options: [
                        { label: 'Absolute — between low and high', value: 'absolute', selected: e.mode !== 'relative' },
                        { label: 'Relative — around the programmed value', value: 'relative', selected: e.mode === 'relative' }
                    ]
                }));
                if (!mode) return;
                if (mode === 'relative') {
                    const v = await this._sub(field, () => FGMModal.input({ label: 'Size ± % around the programmed value', initial: Math.round((e.size ?? 0.2) * 50), verify: this.verifyNumber(0, 50) }));
                    if (v !== null) Effects.update(e.id, { mode, size: this._parse(v) / 50 });
                } else {
                    const lo = await this._sub(field, () => FGMModal.input({ label: 'Low %', initial: Math.round((e.low ?? 0) * 100), verify: this.verifyNumber(0, 100) }));
                    if (lo === null) return;
                    const hi = await this._sub(field, () => FGMModal.input({ label: 'High %', initial: Math.round((e.high ?? 1) * 100), verify: this.verifyNumber(0, 100) }));
                    if (hi === null) return;
                    Effects.update(e.id, { mode, low: this._parse(lo) / 100, high: this._parse(hi) / 100 });
                }
                return;
            }
            case 'bpm': {
                const v = await this._sub(field, () => FGMModal.input({ label: 'Speed in BPM (cycles per minute)', initial: e.bpm, verify: this.verifyNumber(0, 6000) }));
                if (v !== null) Effects.update(e.id, { bpm: this._parse(v) });
                return;
            }
            case 'spread': {
                const v = await this._sub(field, () => FGMModal.input({ label: 'Spread over the phase steps in % of a cycle (0 = all together, 100 = evenly)', initial: Math.round((e.spread ?? 1) * 100), verify: this.verifyNumber(0, 100) }));
                if (v !== null) Effects.update(e.id, { spread: this._parse(v) / 100 });
                return;
            }
            case 'wings': {
                const v = await this._sub(field, () => FGMModal.input({ label: 'Wings (1 = off, 2 = mirrored from the middle …)', initial: e.wings || 1, verify: FGMModal.verifyInt(1, 64) }));
                if (v !== null) Effects.update(e.id, { wings: Number(v) });
                return;
            }
            case 'direction': {
                const dir = await this._sub(field, () => FGMModal.choose({
                    title: 'Phase order — from the grid (same column / row / ring = same phase)',
                    options: FixtureGridStore.DIRECTIONS.map(d => ({ label: d.label, value: d.key, selected: d.key === (e.direction || 'selection') }))
                }));
                if (dir) Effects.setFixtures(e.id, e.fids, dir);
                return;
            }
            case 'use-selection': {
                const sel = [...Programmer.selection];
                if (!sel.length) { field.flash('⚠ select fixtures in the grid first'); return; }
                Effects.setFixtures(e.id, sel);
                field.flash(`✓ ${e.name} now runs on ${sel.length} fixtures`);
                return;
            }
            case 'rename': {
                const v = await this._sub(field, () => FGMModal.input({ label: 'Effect name', initial: e.name }));
                if (v !== null && String(v).trim()) Effects.update(e.id, { name: String(v).trim() });
                return;
            }
            case 'delete': {
                const ok = await this._sub(field, () => FGMModal.choose({
                    title: `Delete ${e.name}${Effects.groupOf(e).length > 1 ? ' (and the other parts of this effect)' : ''}?`,
                    options: [{ label: 'Delete', value: 'yes', color: '#5a1d1d' }, { label: 'Keep', value: 'no' }]
                }));
                if (ok === 'yes') { Effects.remove(e.id); field.selectedEffectId = null; }
                return;
            }
        }
    }

    /** "+ New effect" in the engine: next free effect preset, on the current selection. */
    static async _newEffect(field) {
        const fids = [...Programmer.selection];
        const slot = Effects.nextFreePreset();
        const created = await this._sub(field, () => this.makePreset(slot, fids));
        if (!created) return;
        field.selectedEffectId = created.id;
        field._curveSig = null;
        field.flash(fids.length
            ? `✓ Effect ${slot} "${created.name}" running on ${fids.length} fixtures`
            : `✓ Effect ${slot} "${created.name}" made — select fixtures and tap it in the Effects pool`);
    }

    /**
     * Create the effect preset of a pool slot from a template (MAKE + empty slot).
     * fids: fixtures to start it on right away (none = just the preset).
     * Returns the (lead) effect or null when cancelled.
     */
    static async makePreset(slot, fids = []) {
        const scope = fids.length ? fids : PatchManager.getAllFixtures().map(f => f.fid);
        const templates = EffectsStore.TEMPLATES.filter(t => {
            if (!t.build) return true;
            return t.build().every(d => scope.some(fid => PatchManager.getFixture(fid)?.hasAttribute(d.attribute)));
        });
        const key = await FGMModal.choose({
            title: `Make effect ${slot} — template`,
            options: templates.map(t => ({ label: t.label, value: t.key }))
        });
        if (!key) return null;

        let drafts;
        if (key === 'custom') {
            const attribute = await this.chooseAttribute(scope);
            if (!attribute) return null;
            drafts = [{ name: `${this.prettyAttribute(attribute)} Wave`, attribute, wave: 'sine', mode: 'absolute', low: 0, high: 1, bpm: 30, spread: 1 }];
        } else {
            drafts = EffectsStore.TEMPLATES.find(t => t.key === key).build();
        }
        // a group (Pan + Tilt) is one preset — it gets the template's name
        const label = EffectsStore.TEMPLATES.find(t => t.key === key)?.label;
        if (drafts.length > 1 && label) drafts = drafts.map(d => ({ ...d, name: label }));
        const created = Effects.create(drafts, fids, { direction: 'right', preset: slot, running: fids.length > 0 });
        return created[0];
    }

    static async chooseAttribute(fids, current = null) {
        const seen = new Map();
        fids.forEach(fid => {
            const f = PatchManager.getFixture(fid);
            if (!f) return;
            f.attributes.forEach(a => {
                if (a === 'NoFeature' || seen.has(a)) return;
                seen.set(a, f.type.attributes[a]?.featureGroup || 'Other');
            });
        });
        if (!seen.size) return null;
        const order = FGMFixtureSheet.GROUP_ORDER;
        const rank = (g) => { const i = order.indexOf(g); return i === -1 ? order.length : i; };
        const list = [...seen.entries()].sort((a, b) => rank(a[1]) - rank(b[1]));
        return FGMModal.choose({
            title: 'Attribute',
            options: list.map(([a, g]) => ({
                label: `${this.prettyAttribute(a)}  (${g})`,
                value: a,
                selected: a === current,
                color: FGMMapping._darken(FGMFixtureSheet.GROUP_COLORS[g] || '#555555', 0.6)
            }))
        });
    }

    // ── curve editor ─────────────────────────────────────────────────────

    static async _curve(field, data) {
        const editor = field.curveEditor;
        const e = this._selected(field);
        if (!e) return;

        if (data.type === GLOBAL_TYPES.ACTIONS.CURVE_EDITOR_UPDATES.CHANGE) {
            // dragging sends at most every 40 ms, the final position always
            field._pendingPoints = data.points;
            const send = () => {
                field._sendTimer = null;
                if (field._pendingPoints) Effects.update(field.selectedEffectId, { wave: 'custom', points: field._pendingPoints });
                field._pendingPoints = null;
            };
            if (data.final) { clearTimeout(field._sendTimer); send(); }
            else if (!field._sendTimer) field._sendTimer = setTimeout(send, 40);
            return;
        }
        if (data.type !== GLOBAL_TYPES.ACTIONS.CURVE_EDITOR_UPDATES.BUTTON) return;

        const key = data.key;
        const pts = editor._points();
        if (key.startsWith('tab:')) {
            field.selectedEffectId = key.slice(4);
            editor.selected = null;
            field._curveSig = null;
            field.updateFrame();
            return;
        }
        switch (key) {
            case 'template': {
                const n = EffectCurve.slotCount(e);
                const choice = await this._sub(field, () => FGMModal.choose({
                    title: `Curve template for ${e.name}`,
                    options: [
                        ...EffectCurve.TEMPLATES.filter(t => t.key !== 'chase').map(t => ({ label: t.label, value: t.key })),
                        { label: 'Chase — one phase step at a time (follows the fixture count)', value: 'chase' },
                        { label: 'Random — new value every cycle', value: 'random' }
                    ]
                }));
                if (!choice) return;
                if (choice === 'chase') Effects.update(e.id, { wave: 'square', duty: 0, points: null });
                else if (choice === 'random') Effects.update(e.id, { wave: 'random', points: null });
                else Effects.update(e.id, { wave: 'custom', points: EffectCurve.TEMPLATES.find(t => t.key === choice).build(n) });
                editor.selected = null;
                field._curveSig = null;
                return;
            }
            case 'remove': {
                if (!pts || pts.length <= 1) return;
                const idx = editor.selected !== null ? editor.selected : pts.length - 1;
                const next = pts.filter((_, i) => i !== idx).map(p => ({ ...p }));
                if (idx === 0) next[0].pos = 0; // the cycle always starts with a point
                editor.selected = null;
                editor._setPoints(next, true);
                return;
            }
            case 'add': {
                if (!pts) return;
                // into the middle of the longest gap, on the curve — the shape does not change
                let best = 0, bestLen = -1;
                pts.forEach((p, i) => {
                    const nextPos = i + 1 < pts.length ? pts[i + 1].pos : 1 + pts[0].pos;
                    if (nextPos - p.pos > bestLen) { bestLen = nextPos - p.pos; best = i; }
                });
                let pos = pts[best].pos + bestLen / 2;
                pos = Math.min(1 - EffectCurve.MIN_GAP, HCWCurveEditorField.snap(pos - Math.floor(pos), 1 / 96));
                const value = Math.round(EffectCurve.evalPoints(pts, pos) * 100) / 100;
                const next = [...pts.map(p => ({ ...p })), { pos, value, curve: pts[best].curve }].sort((a, b) => a.pos - b.pos);
                editor.selected = next.findIndex(p => p.pos === pos);
                editor._setPoints(next, true);
                return;
            }
            case 'even':
                if (pts && pts.length >= 2) editor._setPoints(pts.map((p, i) => ({ ...p, pos: i / pts.length })), true);
                return;
            case 'transition': {
                if (!pts) return;
                const list = EffectCurve.TRANSITIONS;
                if (editor.selected !== null) {
                    const next = pts.map(p => ({ ...p }));
                    next[editor.selected].curve = list[(list.indexOf(next[editor.selected].curve) + 1) % list.length];
                    editor._setPoints(next, true);
                } else {
                    const cur = pts.every(p => p.curve === pts[0].curve) ? pts[0].curve : list[list.length - 1];
                    const to = list[(list.indexOf(cur) + 1) % list.length];
                    editor._setPoints(pts.map(p => ({ ...p, curve: to })), true);
                }
                return;
            }
        }
    }

    // ── full screen (Menu → Effects) ─────────────────────────────────────

    /** effectId: open with this effect selected (MAKE + slot). */
    static async openModal({ effectId = null } = {}) {
        const open = HCWDB.getWindowById(this.MODAL.ID);
        if (open) {
            if (effectId) { open.getContextField().selectedEffectId = effectId; open.getContextField()._curveSig = null; HCWRender.updateFrame(); }
            return;
        }
        const field = new HCWEffectEngineField('Effect Engine').setLocationId(this.MODAL.LOCATION_ID);
        field.modal = true;
        const last = this.fields()[0]?.f;
        field.selectedEffectId = effectId || (last ? last.selectedEffectId : null);
        if (effectId) {
            const e = Effects.get(effectId);
            if (e) field.setLabel(`Effect Engine — Effect ${e.preset}: ${e.name}`);
        }

        const { x, y, sx, sy } = FGMModal._focusRect();
        const win = new HCWWindow()
            .setTouchZoneColor(GLOBAL_STYLES.FIELDS_GLOBAL.TEMP_TOUCH_ZONE_COLOR)
            .setPosition(x, y)
            .setSize(sx, sy)
            .setContextField(field)
            .setPageId(GLOBAL_CORE.DEFS.PAGES.EMPTY)
            .setId(this.MODAL.ID);

        FGMShowHandler.setPageEmpty();
        HCWDB.addWindows([win]);
        win.setHidden(false);
        HCWRender.updateFrame();

        while (true) {
            const { GlobalActionType } = await GlobalInterrupter.waitForSome(
                GLOBAL_TYPES.ACTIONS.BACKGROUND_CLICKED,
                'ACTION_EFFECT_ENGINE_CLOSE'
            );
            if (GlobalActionType === GLOBAL_TYPES.ACTIONS.BACKGROUND_CLICKED && field._sub) continue;
            break;
        }
        FGMModal.close(win);
    }
}

globalThis.FGMEffectEngine = FGMEffectEngine;
