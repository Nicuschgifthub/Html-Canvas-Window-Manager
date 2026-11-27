/**
 * Effects — the webpage side of the effect engine.
 *
 * Effects are created / edited here and stored in the show file
 * (memory.effects). The console server evaluates them every frame
 * (server/effect-engine.js documents every field). This class never computes
 * a wave — it only edits the list and sends it.
 *
 * Every effect is an effect preset: `preset` is its slot in the Effects pool
 * (FGMPools). The pool slot IS the effect — editing it changes it live on every
 * fixture it runs on. Tapping the slot with fixtures selected adds them
 * (applyToSelection), MAKE + slot creates / edits it.
 *
 * Effects with the same `group` (e.g. the Pan + Tilt halves of a circle) run,
 * stop and change speed / spread / fixtures together. `rate` multiplies the
 * group speed for one effect (the Tilt of a figure 8 runs at 2×).
 */
class EffectsStore {
    constructor() {
        this._listeners = [];
        this._counter = 0;
    }

    static get WAVES() {
        return ['sine', 'triangle', 'ramp', 'saw', 'square', 'random'];
    }

    /** Fields that are shared by every effect of a group. */
    static get GROUP_FIELDS() {
        return ['bpm', 'spread', 'wings', 'fids', 'slots', 'direction', 'running', 'preset', 'name'];
    }

    /**
     * Templates: build(fids) → list of effect drafts.
     * relative = around the programmed value, absolute = between low and high.
     */
    static get TEMPLATES() {
        return [
            {
                key: 'dimmer-sine', label: 'Dimmer Wave',
                build: () => [{ name: 'Dimmer Wave', attribute: 'Dimmer', wave: 'sine', mode: 'absolute', low: 0, high: 1, bpm: 30, spread: 1 }]
            },
            {
                key: 'dimmer-chase', label: 'Dimmer Chase',
                build: () => [{ name: 'Dimmer Chase', attribute: 'Dimmer', wave: 'square', mode: 'absolute', low: 0, high: 1, bpm: 30, spread: 1, duty: 0 }]
            },
            {
                key: 'dimmer-random', label: 'Dimmer Random',
                build: () => [{ name: 'Dimmer Random', attribute: 'Dimmer', wave: 'random', mode: 'absolute', low: 0, high: 1, bpm: 120, spread: 1 }]
            },
            {
                key: 'circle', label: 'Position Circle',
                build: () => [
                    { name: 'Circle Pan', attribute: 'Pan', wave: 'sine', mode: 'relative', size: 0.2, bpm: 20, spread: 0, phase: 0 },
                    { name: 'Circle Tilt', attribute: 'Tilt', wave: 'sine', mode: 'relative', size: 0.2, bpm: 20, spread: 0, phase: 0.25 }
                ]
            },
            {
                key: 'figure8', label: 'Position Figure 8',
                build: () => [
                    { name: 'Figure 8 Pan', attribute: 'Pan', wave: 'sine', mode: 'relative', size: 0.25, bpm: 15, spread: 0, phase: 0 },
                    // tilt at twice the speed → 1:2 Lissajous = figure 8
                    { name: 'Figure 8 Tilt', attribute: 'Tilt', wave: 'sine', mode: 'relative', size: 0.15, bpm: 15, rate: 2, spread: 0, phase: 0.25 }
                ]
            },
            {
                key: 'pan-wave', label: 'Pan Wave',
                build: () => [{ name: 'Pan Wave', attribute: 'Pan', wave: 'sine', mode: 'relative', size: 0.3, bpm: 20, spread: 1 }]
            },
            {
                key: 'tilt-wave', label: 'Tilt Wave',
                build: () => [{ name: 'Tilt Wave', attribute: 'Tilt', wave: 'sine', mode: 'relative', size: 0.3, bpm: 20, spread: 1 }]
            },
            { key: 'custom', label: 'Custom attribute…', build: null }
        ];
    }

    // ── list ─────────────────────────────────────────────────────────────

    list() {
        const show = (typeof FGMShowHandler !== 'undefined' && FGMShowHandler) ? FGMShowHandler.getShowFile() : null;
        if (!show) return [];
        show.memory = show.memory || {};
        if (!Array.isArray(show.memory.effects)) show.memory.effects = [];
        const list = show.memory.effects;
        // effects from before effect presets get a pool slot
        if (list.some(e => !e.preset)) this._assignPresets(list);
        return list;
    }

    _assignPresets(list) {
        const used = new Set(list.filter(e => e.preset).map(e => e.preset));
        let next = 1;
        list.forEach(e => {
            if (e.preset) return;
            const mate = e.group && list.find(o => o.group === e.group && o.preset);
            if (mate) { e.preset = mate.preset; return; }
            while (used.has(next)) next++;
            e.preset = next;
            used.add(next);
        });
    }

    // ── effect presets (pool slots) ──────────────────────────────────────

    /** The effects of a pool slot (one, or several for a group like Pan + Tilt). */
    presetEffects(slot) {
        return this.list().filter(e => e.preset === Number(slot));
    }

    preset(slot) {
        return this.presetEffects(slot)[0] || null;
    }

    highestPreset() {
        return this.list().reduce((n, e) => Math.max(n, e.preset || 0), 0);
    }

    nextFreePreset() {
        const used = new Set(this.list().map(e => e.preset));
        let n = 1;
        while (used.has(n)) n++;
        return n;
    }

    /**
     * Tap on an effect preset with fixtures selected: adds them (and starts it).
     * When every selected fixture already runs it, they are taken out instead.
     * Returns 'added' | 'removed' | null.
     */
    applyToSelection(slot, selection) {
        const lead = this.preset(slot);
        if (!lead || !selection.length) return null;
        const inside = selection.every(fid => lead.fids.includes(fid));
        let fids;
        if (inside) {
            const out = new Set(selection);
            fids = lead.fids.filter(fid => !out.has(fid));
        } else {
            fids = [...lead.fids, ...selection.filter(fid => !lead.fids.includes(fid))];
        }
        this.setFixtures(lead.id, fids);
        this.update(lead.id, { running: fids.length > 0 });
        return inside ? 'removed' : 'added';
    }

    renameFid(oldFid, newFid) {
        let changed = false;
        this.list().forEach(e => {
            if (!e.fids.includes(oldFid)) return;
            e.fids = e.fids.map(f => f === oldFid ? newFid : f);
            changed = true;
        });
        if (changed) this._changed();
    }

    get(id) {
        return this.list().find(e => e.id === id) || null;
    }

    groupOf(effect) {
        return effect.group ? this.list().filter(e => e.group === effect.group) : [effect];
    }

    _newId() {
        return `fx${Date.now().toString(36)}${(this._counter++).toString(36)}`;
    }

    /**
     * Create the effects of a template on `fids`. Returns the new effects.
     * direction: a FixtureGrid direction ('right', 'down', 'out' …) or 'selection'
     * (phase order = fids order).
     */
    create(drafts, fids, { running = true, direction = 'selection', preset = null } = {}) {
        const group = drafts.length > 1 ? this._newId() : null;
        const slot = preset || this.nextFreePreset();
        const { fids: ordered, slots } = this._order(fids, direction);
        const created = drafts.map(draft => ({
            id: this._newId(),
            group,
            low: 0, high: 1, size: 0.2, phase: 0, spread: 1, duty: 0.5, wings: 1, bpm: 60, rate: 1,
            ...draft,
            fids: ordered,
            slots,
            direction,
            preset: slot,
            running: running && ordered.length > 0
        }));
        this.list().push(...created);
        this._changed();
        return created;
    }

    /** Change fields; group fields (speed, spread, fixtures, run) go to the whole group. */
    update(id, changes) {
        const effect = this.get(id);
        if (!effect) return;
        const groupChanges = {};
        const own = {};
        Object.entries(changes).forEach(([k, v]) => {
            if (EffectsStore.GROUP_FIELDS.includes(k)) groupChanges[k] = v; else own[k] = v;
        });
        Object.assign(effect, own);
        if (Object.keys(groupChanges).length) {
            this.groupOf(effect).forEach(e => {
                Object.entries(groupChanges).forEach(([k, v]) => { e[k] = Array.isArray(v) ? [...v] : v; });
            });
        }
        this._changed();
    }

    _order(fids, direction) {
        if (typeof FixtureGrid === 'undefined') return { fids: [...fids], slots: null };
        return FixtureGrid.order(fids, direction);
    }

    /** New fixtures and / or direction — recomputes the phase order from the grid. */
    setFixtures(id, fids, direction = null) {
        const effect = this.get(id);
        if (!effect) return;
        const dir = direction || effect.direction || 'selection';
        const { fids: ordered, slots } = this._order(fids, dir);
        this.update(id, { fids: ordered, slots, direction: dir });
    }

    /** The grid changed — effects that follow a grid direction get their new order. */
    reorderFromGrid() {
        let changed = false;
        const seen = new Set();
        this.list().forEach(e => {
            if (!e.direction || e.direction === 'selection') return;
            const key = e.group || e.id;
            if (seen.has(key)) return;
            seen.add(key);
            const { fids, slots } = this._order(e.fids, e.direction);
            this.groupOf(e).forEach(g => { g.fids = [...fids]; g.slots = slots ? [...slots] : null; });
            changed = true;
        });
        if (changed) this._changed();
    }

    remove(id) {
        const effect = this.get(id);
        if (!effect) return;
        const ids = new Set(this.groupOf(effect).map(e => e.id));
        const list = this.list();
        for (let i = list.length - 1; i >= 0; i--) if (ids.has(list[i].id)) list.splice(i, 1);
        this._changed();
    }

    toggle(id) {
        const effect = this.get(id);
        if (effect) this.update(id, { running: !effect.running });
    }

    /**
     * Clear Programmer: applied effects are programmer content — they stop and
     * lose their fixtures. The presets (pool slots) stay.
     * Later, effects stored in a cue run from the playback and are not touched here.
     * Returns how many effects were released.
     */
    releaseAll() {
        let released = 0;
        this.list().forEach(e => {
            if (!e.running && !e.fids.length) return;
            e.running = false;
            e.fids = [];
            e.slots = null;
            released++;
        });
        if (released) this._changed();
        return released;
    }

    /** Is anything applied (an effect with fixtures)? */
    hasApplied() {
        return this.list().some(e => e.fids.length > 0);
    }

    stopAll() {
        this.list().forEach(e => { e.running = false; });
        this._changed();
    }

    isRunningOn(fid, attribute = null) {
        return this.list().some(e => e.running && e.fids.includes(fid) && (!attribute || e.attribute === attribute));
    }

    // ── server ───────────────────────────────────────────────────────────

    push() {
        if (typeof ConsoleLink !== 'undefined') ConsoleLink.send({ type: 'effects', effects: this.list() });
    }

    _changed() {
        this.push();
        this._emit('effects', {});
    }

    on(callback) {
        this._listeners.push(callback);
        return () => { this._listeners = this._listeners.filter(l => l !== callback); };
    }

    _emit(event, data) {
        this._listeners.forEach(cb => {
            try { cb(event, data); } catch (e) { console.error('Effects listener error:', e); }
        });
    }
}

const Effects = new EffectsStore();
if (typeof FixtureGrid !== 'undefined') FixtureGrid.on(() => Effects.reorderFromGrid());
globalThis.Effects = Effects;
globalThis.EffectsStore = EffectsStore;
