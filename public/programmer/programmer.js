/**
 * FixtureProgrammer — fixture selection + programmer values.
 *
 * Values are stored per fixture and channel as the raw DMX value at the
 * channel's resolution, together with the attribute / channel function that
 * produced it. That keeps 16 bit channels exact and lets one DMX channel carry
 * different attributes (e.g. Color1 vs Color1WheelSpin on the same channel).
 *
 *   Programmer.select([101, 102])
 *   Programmer.setAttribute('Dimmer', 0.75)          // 0..1 inside the channel function
 *   Programmer.setAttributePhysical('Pan', -90)      // physical unit (degrees here)
 *   Programmer.setChannelSet('Gobo1', 'Gobo 3')
 *   Programmer.getAttributeState('Dimmer')            // consensus of the selection
 *
 * Events (Programmer.on(cb)): 'selection', 'values', 'highlight'.
 */
class FixtureProgrammer {
    constructor(patchManager) {
        this.patch = patchManager;
        this.selection = [];          // ordered list of FIDs
        this._values = new Map();     // fid → Map(channelKey → { attribute, fnIndex, raw })
        this.highlight = false;
        this._listeners = [];

        this.patch.on((event, data) => {
            if (event !== 'patchChanged') return;
            this._dropMissingFixtures(data);
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Selection
    // ─────────────────────────────────────────────────────────────────────

    /** mode: 'replace' | 'add' | 'toggle' | 'remove' */
    select(fids, mode = 'replace') {
        const list = (Array.isArray(fids) ? fids : [fids]).map(Number).filter(fid => this.patch.getFixture(fid));
        let next = mode === 'replace' ? [] : [...this.selection];

        list.forEach(fid => {
            const idx = next.indexOf(fid);
            if (mode === 'remove' || (mode === 'toggle' && idx > -1)) {
                if (idx > -1) next.splice(idx, 1);
            } else if (idx === -1) {
                next.push(fid);
            }
        });

        this._setSelection(next);
    }

    toggle(fid) {
        this.select([fid], 'toggle');
    }

    selectAll() {
        this._setSelection(this.patch.getAllFixtures().map(f => f.fid));
    }

    clearSelection() {
        this._setSelection([]);
    }

    /** Step the selection to the next / previous fixture in the patch. */
    step(direction = 1) {
        const all = this.patch.getAllFixtures().map(f => f.fid);
        if (!all.length) return;
        const current = this.selection.length ? all.indexOf(this.selection[this.selection.length - 1]) : -1;
        const next = (current + direction + all.length) % all.length;
        this._setSelection([all[next]]);
    }

    isSelected(fid) {
        return this.selection.includes(Number(fid));
    }

    getSelectedFixtures() {
        return this.selection.map(fid => this.patch.getFixture(fid)).filter(Boolean);
    }

    _setSelection(list) {
        const changed = list.length !== this.selection.length || list.some((v, i) => v !== this.selection[i]);
        if (!changed) return;
        this.selection = list;
        this._emit('selection', { selection: [...list] });
        if (this.highlight) this._emit('values', { reason: 'highlight' });
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Values
    // ─────────────────────────────────────────────────────────────────────

    _targets(fids) {
        if (fids === undefined || fids === null) return this.getSelectedFixtures();
        return fids.map(fid => this.patch.getFixture(fid)).filter(Boolean);
    }

    /** Raw value a channel currently outputs from programmer or default. */
    resolveRaw(fixture, channel) {
        const entry = this._values.get(fixture.fid)?.get(channel.key);
        return entry ? entry.raw : channel.default;
    }

    _reader(fixture) {
        return (ch) => this.resolveRaw(fixture, ch);
    }

    _store(fixture, channel, fn, raw) {
        let map = this._values.get(fixture.fid);
        if (!map) { map = new Map(); this._values.set(fixture.fid, map); }
        map.set(channel.key, { attribute: fn.attribute, fnIndex: fn.index, raw });
    }

    /**
     * Generic setter. `compute(fixture, channel, fn)` returns the raw value to store
     * (or null to skip). Returns the number of channels touched.
     */
    _apply(attribute, fids, compute, meta = {}) {
        let touched = 0;
        this._targets(fids).forEach(fixture => {
            const read = this._reader(fixture);
            fixture.getChannelsForAttribute(attribute).forEach(channel => {
                const fn = fixture.pickFunction(channel, attribute, read);
                if (!fn) return;
                const raw = compute(fixture, channel, fn);
                if (raw === null || raw === undefined) return;
                this._activateModeMaster(fixture, fn, read);
                this._store(fixture, channel, fn, raw);
                touched++;
            });
        });
        if (touched) this._emit('values', { attribute, ...meta });
        return touched;
    }

    /**
     * A function that depends on another channel (ModeMaster) only works while
     * that channel is inside ModeFrom..ModeTo — move the master there if needed.
     */
    _activateModeMaster(fixture, fn, read) {
        if (!fn.modeMaster || fixture.isFunctionActive(fn, read)) return;
        const master = fixture.getChannelByName(fn.modeMaster.split('.')[0]);
        if (!master) return;
        const from = GDTFParser.parseDMXValue(fn.modeFrom, master.bytes);
        const { fn: masterFn } = fixture.decodeValue(master, from);
        if (masterFn) this._store(fixture, master, masterFn, from);
    }

    /** norm: 0..1 inside the attribute's channel function. */
    setAttribute(attribute, norm, fids = null, meta = {}) {
        return this._apply(attribute, fids, (f, ch, fn) => FixturePatch.normToRaw(fn, norm), meta);
    }

    /** Value in the attribute's physical unit (degrees, %, Hz …) as described by the GDTF. */
    setAttributePhysical(attribute, physical, fids = null, meta = {}) {
        return this._apply(attribute, fids, (f, ch, fn) => FixturePatch.physicalToRaw(fn, physical), meta);
    }

    /** Relative change (in 0..1 function space) — keeps differences between fixtures. */
    nudgeAttribute(attribute, delta, fids = null, meta = {}) {
        return this._apply(attribute, fids, (f, ch, fn) => {
            const raw = this.resolveRaw(f, ch);
            const base = (raw >= fn.dmxFrom && raw <= fn.dmxTo) ? FixturePatch.rawToNorm(fn, raw) : 0;
            return FixturePatch.normToRaw(fn, base + delta);
        }, meta);
    }

    /** Jump to a named channel set (e.g. a gobo or colour slot). */
    setChannelSet(attribute, setName, fids = null, meta = {}) {
        let touched = 0;
        this._targets(fids).forEach(fixture => {
            fixture.getChannelsForAttribute(attribute).forEach(channel => {
                const fn = channel.functions.find(f => f.attribute === attribute && f.sets.some(s => s.name === setName));
                if (!fn) return;
                this._store(fixture, channel, fn, fn.sets.find(s => s.name === setName).dmxFrom);
                touched++;
            });
        });
        if (touched) this._emit('values', { attribute, ...meta });
        return touched;
    }

    /** Remove an attribute from the programmer (fixtures fall back to default). */
    clearAttribute(attribute, fids = null) {
        let removed = 0;
        this._targets(fids).forEach(f => {
            const map = this._values.get(f.fid);
            if (!map) return;
            f.getChannelsForAttribute(attribute).forEach(ch => { if (map.delete(ch.key)) removed++; });
        });
        if (removed) this._emit('values', { attribute, cleared: true });
        return removed;
    }

    clearFixtures(fids = null) {
        this._targets(fids).forEach(f => this._values.delete(f.fid));
        this._emit('values', { cleared: true });
    }

    /** Clear everything: values, then (MA style) selection on a second call. */
    clear() {
        if (this._values.size === 0) {
            this.clearSelection();
            return;
        }
        this._values.clear();
        this._emit('values', { cleared: true });
    }

    hasValues(fid = null) {
        if (fid === null) return this._values.size > 0;
        return (this._values.get(Number(fid))?.size || 0) > 0;
    }

    /**
     * Programmer content as a flat list:
     * [{ fid, channelKey, attribute, fnIndex, raw }]
     * filter(fixture, channel, entry) → keep?
     */
    getEntries(filter = null) {
        const out = [];
        this._values.forEach((map, fid) => {
            const fixture = this.patch.getFixture(fid);
            if (!fixture) return;
            map.forEach((entry, channelKey) => {
                const channel = fixture.getChannel(channelKey);
                if (!channel) return;
                if (filter && !filter(fixture, channel, entry)) return;
                out.push({ fid, channelKey, ...entry });
            });
        });
        return out;
    }

    /** Load entries (as returned by getEntries) into the programmer — one 'values' event. */
    applyEntries(entries, meta = {}) {
        let touched = 0;
        entries.forEach(e => {
            const fixture = this.patch.getFixture(e.fid);
            const channel = fixture && fixture.getChannel(e.channelKey);
            if (!channel) return;
            const max = GDTFParser.maxValue(channel.bytes);
            let map = this._values.get(fixture.fid);
            if (!map) { map = new Map(); this._values.set(fixture.fid, map); }
            map.set(channel.key, { attribute: e.attribute, fnIndex: e.fnIndex, raw: Math.max(0, Math.min(max, e.raw)) });
            touched++;
        });
        if (touched) this._emit('values', { reason: 'apply', ...meta });
        return touched;
    }

    isChannelProgrammed(fid, channelKey) {
        return !!this._values.get(Number(fid))?.has(channelKey);
    }

    /** Is any channel of this attribute in the programmer for the given fixtures? */
    isAttributeProgrammed(attribute, fids = null) {
        return this._targets(fids).some(f => {
            const map = this._values.get(f.fid);
            return map && f.getChannelsForAttribute(attribute).some(ch => map.get(ch.key)?.attribute === attribute);
        });
    }

    /**
     * Consensus state of an attribute over fixtures (default: selection).
     * norm is the average position inside the active channel function.
     */
    getAttributeState(attribute, fids = null) {
        const targets = this._targets(fids).filter(f => f.hasAttribute(attribute));
        if (!targets.length) return null;

        let sum = 0, count = 0, programmed = false;
        let first = null;

        targets.forEach(f => {
            const read = this._reader(f);
            f.getChannelsForAttribute(attribute).forEach(ch => {
                const fn = f.pickFunction(ch, attribute, read);
                const raw = read(ch);
                const entry = this._values.get(f.fid)?.get(ch.key);
                if (entry && entry.attribute === attribute) programmed = true;
                const inside = raw >= fn.dmxFrom && raw <= fn.dmxTo;
                sum += inside ? FixturePatch.rawToNorm(fn, raw) : 0;
                count++;
                if (!first) first = { fixture: f, channel: ch, fn, raw };
            });
        });

        const norm = count ? sum / count : 0;
        const decoded = first ? first.fixture.decodeValue(first.channel, first.raw, this._reader(first.fixture)) : null;

        return {
            attribute,
            norm,
            programmed,
            fixtures: targets.length,
            channels: count,
            physical: first ? FixturePatch.rawToPhysical(first.fn, first.raw) : null,
            unit: first ? (first.fixture.type.attributes[attribute]?.physicalUnit || 'None') : 'None',
            functionName: decoded?.fn?.name || null,
            setName: decoded?.set?.name || null
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Highlight
    // ─────────────────────────────────────────────────────────────────────

    setHighlight(on) {
        this.highlight = !!on;
        this._emit('highlight', { highlight: this.highlight });
        this._emit('values', { reason: 'highlight' });
    }

    toggleHighlight() {
        this.setHighlight(!this.highlight);
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Housekeeping / events
    // ─────────────────────────────────────────────────────────────────────

    _dropMissingFixtures(data = {}) {
        // carry programmer values / selection over when a fixture only changed its FID
        if (data.previousFid !== undefined && data.updated !== undefined && data.previousFid !== data.updated) {
            const vals = this._values.get(data.previousFid);
            this._values.delete(data.previousFid);
            if (vals) this._values.set(data.updated, vals);
            this.selection = this.selection.map(fid => fid === data.previousFid ? data.updated : fid);
        }

        let changed = false;
        [...this._values.keys()].forEach(fid => {
            const f = this.patch.getFixture(fid);
            if (!f) { this._values.delete(fid); changed = true; return; }
            const map = this._values.get(fid);
            [...map.keys()].forEach(key => { if (!f.getChannel(key)) { map.delete(key); changed = true; } });
        });
        const sel = this.selection.filter(fid => this.patch.getFixture(fid));
        if (sel.length !== this.selection.length) this._setSelection(sel);
        if (changed) this._emit('values', { reason: 'patch' });
    }

    on(callback) {
        this._listeners.push(callback);
        return () => { this._listeners = this._listeners.filter(l => l !== callback); };
    }

    _emit(event, data) {
        this._listeners.forEach(cb => {
            try { cb(event, data); } catch (e) { console.error('Programmer listener error:', e); }
        });
    }
}

const Programmer = new FixtureProgrammer(PatchManager);
globalThis.Programmer = Programmer;
globalThis.FixtureProgrammer = FixtureProgrammer;
