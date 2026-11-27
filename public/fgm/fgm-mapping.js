/**
 * FGMMapping — what each control on the surface does.
 *
 * Assignments are stored per location id in the show file
 * (memory.mapping.controls["1.003"] = { type, ... }):
 *
 *   attribute       Fader / Encoder → one attribute (e.g. Dimmer, Pan, Zoom)
 *                   on the selection, or on fixed fixtures when `fids` is set
 *   position        Pan/Tilt pad → Pan + Tilt of the selection
 *   color           Color picker → RGB(W/A/UV) mixing, CMY or nearest wheel slot
 *   wheel           Gobo / Color wheel → a wheel attribute (Gobo1, Color1 …) of the
 *                   selection; shows the GDTF slots (gobo images, colours, split colours)
 *   fixtures        Preset group → one button per patched fixture (selects it)
 *   programmerKeys  Preset group → Select all / Clear / Highlight / Next …
 *   pool            Preset group → a pool (Groups, Dimmer, Position, Color, Gobo,
 *                   Beam, Focus, All) — tap recalls, Store/Delete/Label + tap edits
 *   channelSets     Preset group → the named channel sets of an attribute
 *                   (gobos, colours, strobe modes …) for the selection
 *
 * Input:    keyword executors call FGMMapping.applyFromField(field) on user actions.
 * Feedback: programmer / patch changes update faders, encoders and preset groups
 *           (without emitting actions, so nothing loops back).
 */
class FGMMapping {

    static get TYPES() {
        return {
            NONE: 'none',
            ATTRIBUTE: 'attribute',
            POSITION: 'position',
            COLOR: 'color',
            WHEEL: 'wheel',
            FIXTURES: 'fixtures',
            PROGRAMMER_KEYS: 'programmerKeys',
            POOL: 'pool',
            CHANNEL_SETS: 'channelSets'
        };
    }

    static get PROGRAMMER_KEYS() {
        return [
            { key: 'store', label: 'Store', color: '#6b1a1a' },
            { key: 'make', label: 'Make', color: '#352a5a' },
            { key: 'delete', label: 'Delete', color: '#3d2a2a' },
            { key: 'label', label: 'Label', color: '#2a2a3d' },
            { key: 'selectAll', label: 'Select All' },
            { key: 'clearSelection', label: 'Clear Selection' },
            { key: 'clear', label: 'Clear Programmer' },
            { key: 'highlight', label: 'Highlight' },
            { key: 'prev', label: '< Prev' },
            { key: 'next', label: 'Next >' }
        ];
    }

    static _source = null;

    /** HCW render scripts load asynchronously — they may not exist yet at startup. */
    static _redraw() {
        if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
    }
    static _feedbackQueued = false;
    static _rebuildPresets = false;

    // ─────────────────────────────────────────────────────────────────────
    //  Store
    // ─────────────────────────────────────────────────────────────────────

    static _controls() {
        const show = FGMShowHandler.getShowFile();
        show.memory = show.memory || {};
        const mapping = show.memory.mapping = show.memory.mapping || {};
        if (!mapping.controls) mapping.controls = {};
        return mapping.controls;
    }

    static get(locationId) {
        if (!locationId) return null;
        const a = this._controls()[String(locationId)];
        return a && a.type !== this.TYPES.NONE ? a : null;
    }

    static set(locationId, assignment) {
        const controls = this._controls();
        const field = HCWDB.getContextFieldByLocationId(locationId);
        const before = controls[String(locationId)];

        if (!assignment || assignment.type === this.TYPES.NONE) delete controls[String(locationId)];
        else controls[String(locationId)] = assignment;

        // a preset group that stops being generated gets plain presets back
        if (field && field.getType() === GLOBAL_TYPES.CONTEXT_FIELDS.PRESETS && before && !this.get(locationId)) {
            this._restoreGenericPresets(field);
        }

        if (field) this.refreshField(field, true);
        FGMMapping._redraw();
    }

    /** Move an assignment when a control's location id changes. */
    static moveLocation(oldId, newId) {
        const controls = this._controls();
        if (controls[oldId] && oldId !== newId) {
            controls[newId] = controls[oldId];
            delete controls[oldId];
        }
    }

    static remove(locationId) {
        delete this._controls()[String(locationId)];
    }

    /** Assignment types a field can take. */
    static typesFor(field) {
        const T = this.TYPES;
        const CF = GLOBAL_TYPES.CONTEXT_FIELDS;
        switch (field.getType()) {
            case CF.FADER:
            case CF.ENCODER:
                return [T.ATTRIBUTE];
            case CF.XY_PAD:
                return [T.POSITION];
            case CF.COLOR_MAP_INPUT:
                return [T.COLOR];
            case CF.CUSTOM_WHEEL_ENCODER:
                return [T.WHEEL];
            case CF.PRESETS:
                return [T.POOL, T.FIXTURES, T.PROGRAMMER_KEYS, T.CHANNEL_SETS];
            default:
                return [];
        }
    }

    static isAssignable(field) {
        if (!field || typeof field.getLocationId !== 'function') return false;
        const loc = field.getLocationId();
        if (!loc || String(loc).startsWith('0.')) return false; // system windows
        return this.typesFor(field).length > 0;
    }

    static typeLabel(type) {
        return {
            none: 'Nothing',
            attribute: 'Attribute',
            position: 'Pan / Tilt',
            color: 'Color Mix',
            wheel: 'Wheel',
            fixtures: 'Fixture Select',
            programmerKeys: 'Programmer Keys',
            pool: 'Pool (Groups / Presets)',
            channelSets: 'Channel Sets'
        }[type] || type;
    }

    /** Human readable description, e.g. "Dimmer · Selection". */
    static describe(a) {
        if (!a || a.type === this.TYPES.NONE) return '—';
        switch (a.type) {
            case this.TYPES.ATTRIBUTE:
                return `${this.attributeLabel(a.attribute)} · ${a.fids && a.fids.length ? `FID ${this._fidList(a.fids)}` : 'Selection'}`;
            case this.TYPES.POSITION:
                return 'Pan / Tilt · Selection';
            case this.TYPES.COLOR:
                return 'Color Mix · Selection';
            case this.TYPES.WHEEL:
                return `${this.attributeLabel(a.attribute)} Wheel · Selection`;
            case this.TYPES.FIXTURES:
                return 'Fixture Select';
            case this.TYPES.PROGRAMMER_KEYS:
                return 'Programmer Keys';
            case this.TYPES.POOL:
                return `${FGMPools.getType(a.pool)?.label || a.pool} Pool`;
            case this.TYPES.CHANNEL_SETS:
                return `${this.attributeLabel(a.attribute)} Sets`;
            default:
                return a.type;
        }
    }

    static _fidList(fids) {
        if (fids.length <= 3) return fids.join(',');
        return `${fids[0]}…${fids[fids.length - 1]} (${fids.length})`;
    }

    /** Pretty name of an attribute from the first fixture type that defines it. */
    static attributeLabel(attribute) {
        for (const { type } of PatchManager.getTypes()) {
            const def = type.attributes[attribute];
            // GDTF pretty names are often terse ("C1", "P") — same rule as the fixture sheet
            if (def) return FGMFixtureSheet.columnLabel(attribute, def.pretty);
        }
        return attribute;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Input (control → programmer)
    // ─────────────────────────────────────────────────────────────────────

    /** Called by the keyword executors for user actions. Returns true when handled. */
    static applyFromField(field) {
        if (!field) return false;
        const a = this.get(field.getLocationId());
        if (!a) return false;

        this._source = field;
        try {
            switch (a.type) {
                case this.TYPES.ATTRIBUTE: {
                    const norm = this._readFieldNorm(field);
                    if (norm === null) return false;
                    Programmer.setAttribute(a.attribute, norm, a.fids && a.fids.length ? a.fids : null, { source: field });
                    return true;
                }
                case this.TYPES.POSITION:
                    Programmer.setAttribute('Pan', field.pan, null, { source: field });
                    Programmer.setAttribute('Tilt', field.tilt, null, { source: field });
                    return true;
                case this.TYPES.COLOR:
                    this._applyColor(field.getColors());
                    return true;
                case this.TYPES.WHEEL: {
                    const norm = this._readFieldNorm(field);
                    Programmer.setAttribute(a.attribute, norm, null, { source: field });
                    return true;
                }
                default:
                    return false;
            }
        } finally {
            this._source = null;
        }
    }

    /** Fader → 0..1, Encoder → coarse (outer) + fine (inner) for ~16 bit resolution. */
    static _readFieldNorm(field) {
        const CF = GLOBAL_TYPES.CONTEXT_FIELDS;
        switch (field.getType()) {
            case CF.FADER:
                return field.getFloat();
            case CF.ENCODER:
            case CF.CUSTOM_WHEEL_ENCODER:
                return Math.max(0, Math.min(1, field.value + field.value2 / 255));
            default:
                return null;
        }
    }

    static _writeFieldNorm(field, norm) {
        const CF = GLOBAL_TYPES.CONTEXT_FIELDS;
        const n = Math.max(0, Math.min(1, norm));
        switch (field.getType()) {
            case CF.FADER:
                field.value = n;
                break;
            case CF.ENCODER:
            case CF.CUSTOM_WHEEL_ENCODER: {
                const coarse = Math.floor(n * 255) / 255;
                field.value = coarse;
                field.value2 = Math.max(0, Math.min(1, (n - coarse) * 255));
                break;
            }
        }
    }

    /**
     * Colour from the picker (0-255 r,g,b,white,amber,uv) onto every selected
     * fixture using whatever it has: additive mixing, CMY, or the closest colour
     * wheel slot.
     */
    static _applyColor(c) {
        const meta = { source: this._source };
        const norm = (v) => Math.max(0, Math.min(255, v || 0)) / 255;

        Programmer.getSelectedFixtures().forEach(f => {
            const fids = [f.fid];
            if (f.hasAttribute('ColorAdd_R') || f.hasAttribute('ColorAdd_G') || f.hasAttribute('ColorAdd_B')) {
                Programmer.setAttribute('ColorAdd_R', norm(c.r), fids, meta);
                Programmer.setAttribute('ColorAdd_G', norm(c.g), fids, meta);
                Programmer.setAttribute('ColorAdd_B', norm(c.b), fids, meta);
                Programmer.setAttribute('ColorAdd_W', norm(c.white), fids, meta);
                Programmer.setAttribute('ColorAdd_A', norm(c.amber), fids, meta);
                Programmer.setAttribute('ColorAdd_UV', norm(c.uv), fids, meta);
                return;
            }
            if (f.hasAttribute('ColorSub_C') || f.hasAttribute('ColorSub_M') || f.hasAttribute('ColorSub_Y')) {
                Programmer.setAttribute('ColorSub_C', 1 - norm(c.r), fids, meta);
                Programmer.setAttribute('ColorSub_M', 1 - norm(c.g), fids, meta);
                Programmer.setAttribute('ColorSub_Y', 1 - norm(c.b), fids, meta);
                return;
            }
            const wheelPick = this._nearestWheelSet(f, c);
            if (wheelPick) Programmer.setChannelSet(wheelPick.attribute, wheelPick.set, fids, meta);
        });
    }

    static _nearestWheelSet(fixture, c) {
        const hexToRgb = (hex) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
        let best = null;
        ['Color1', 'Color2', 'Color3'].forEach(attribute => {
            fixture.getChannelsForAttribute(attribute).forEach(ch => {
                ch.functions.filter(fn => fn.attribute === attribute && fn.wheel).forEach(fn => {
                    const wheel = fixture.type.wheels[fn.wheel];
                    fn.sets.forEach(set => {
                        const slot = set.wheelSlotIndex ? wheel?.slots[set.wheelSlotIndex - 1] : null;
                        if (!set.name || !slot || !slot.hex) return;
                        // only "pure" slot positions (physicalFrom 0 means not between two slots)
                        if (set.physicalFrom && set.physicalFrom !== 0) return;
                        const [r, g, b] = hexToRgb(slot.hex);
                        const d = (r - c.r) ** 2 + (g - c.g) ** 2 + (b - c.b) ** 2;
                        if (!best || d < best.d) best = { d, attribute, set: set.name };
                    });
                });
            });
        });
        return best;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Preset groups (generated content)
    // ─────────────────────────────────────────────────────────────────────

    static presetFunction(name, data) {
        const { thisFunctionData } = data;
        switch (name) {
            case '_fixtureSelect':
                Programmer.toggle(thisFunctionData);
                return;
            case '_programmerKey':
                this.programmerKey(thisFunctionData);
                return;
            case '_channelSet':
                // only the selection — with nothing selected nothing changes
                if (!Programmer.selection.length) {
                    FGMPools._fail(`${thisFunctionData.set}: select fixtures first`);
                    return;
                }
                Programmer.setChannelSet(thisFunctionData.attribute, thisFunctionData.set);
                return;
        }
    }

    static programmerKey(key) {
        switch (key) {
            case 'selectAll': Programmer.selectAll(); break;
            case 'clearSelection': Programmer.clearSelection(); break;
            case 'clear': {
                // MA style: the first press clears values and releases applied effects,
                // a press with nothing left clears the selection
                const released = Effects.releaseAll();
                if (released && !Programmer.hasValues()) break;
                Programmer.clear();
                break;
            }
            case 'highlight': Programmer.toggleHighlight(); break;
            case 'next': Programmer.step(1); break;
            case 'prev': Programmer.step(-1); break;
            case 'store':
            case 'make':
            case 'delete':
            case 'label':
                FGMPools.arm(key);
                break;
        }
    }

    static _restoreGenericPresets(field) {
        field.clearAllPresets();
        field.addPresets(...Array.from({ length: 50 }, (_, i) =>
            new HCWPreset().setLabel(`Preset ${i + 1}`).setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _presetNumber: i })
        ));
    }

    static _buildPresets(field, a) {
        field.clearAllPresets();
        field.scrollY = 0;

        switch (a.type) {
            case this.TYPES.FIXTURES:
                PatchManager.getAllFixtures().forEach(f => {
                    field.addPresets(new HCWPreset(`${f.fid} ${f.name}`)
                        .setDefaultColor('#1f2a44')
                        .setData({ _fixtureSelect: f.fid }));
                });
                break;

            case this.TYPES.PROGRAMMER_KEYS:
                this.PROGRAMMER_KEYS.forEach(k => {
                    field.addPresets(new HCWPreset(k.label)
                        .setDefaultColor(k.color || (k.key === 'clear' ? '#5a1d1d' : '#2b2b2b'))
                        .setData({ _programmerKey: k.key }));
                });
                break;

            case this.TYPES.POOL: {
                // 1-based slots; always some empty ones after the last used slot
                const count = Math.max(30, Math.ceil((FGMPools.highestSlot(a.pool) + 10) / 10) * 10);
                for (let slot = 1; slot <= count; slot++) {
                    const item = FGMPools.getSlot(a.pool, slot);
                    field.addPresets(new HCWPreset(item ? item.name : '')
                        .setId(slot)
                        .setDefaultColor(FGMPools.tileColor(a.pool, item))
                        .setData({ _poolSlot: { pool: a.pool, slot } }));
                }
                break;
            }

            case this.TYPES.CHANNEL_SETS:
                this.collectChannelSets(a.attribute).forEach(s => {
                    field.addPresets(new HCWPreset(s.name)
                        .setDefaultColor(s.color || '#2b2b2b')
                        .setData({ _channelSet: { attribute: a.attribute, set: s.name, fids: s.fids } }));
                });
                break;
        }
    }

    /**
     * Named channel sets for an attribute over the selection (or every fixture
     * that has it when nothing is selected). Unnamed GDTF ranges are skipped.
     */
    static collectChannelSets(attribute) {
        const fixtures = (Programmer.selection.length ? Programmer.getSelectedFixtures() : PatchManager.getAllFixtures())
            .filter(f => f.hasAttribute(attribute));
        const out = new Map();

        fixtures.forEach(f => {
            f.getChannelsForAttribute(attribute).forEach(ch => {
                ch.functions.filter(fn => fn.attribute === attribute).forEach(fn => {
                    const wheel = fn.wheel ? f.type.wheels[fn.wheel] : null;
                    fn.sets.forEach(set => {
                        if (!set.name) return;
                        if (!out.has(set.name)) {
                            const slot = wheel && set.wheelSlotIndex ? wheel.slots[set.wheelSlotIndex - 1] : null;
                            out.set(set.name, { name: set.name, color: slot && slot.hex ? this._darken(slot.hex) : null, fids: [] });
                        }
                        const entry = out.get(set.name);
                        if (!entry.fids.includes(f.fid)) entry.fids.push(f.fid);
                    });
                });
            });
        });
        return [...out.values()];
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Wheels (gobo / colour wheel window)
    // ─────────────────────────────────────────────────────────────────────

    /** The wheel function for an attribute on a fixture: same choice the programmer makes. */
    static _wheelFunction(fixture, attribute) {
        for (const ch of fixture.getChannelsForAttribute(attribute)) {
            const fn = fixture.pickFunction(ch, attribute, (c) => Programmer.resolveRaw(fixture, c));
            if (fn && fn.wheel && fn.sets.some(s => s.wheelSlotIndex)) return fn;
        }
        return null;
    }

    /** Does any patched fixture have a wheel behind this attribute? */
    static isWheelAttribute(fixture, attribute) {
        return !!this._wheelFunction(fixture, attribute);
    }

    /**
     * Wheel data for HCWCustomEncoderField from the GDTF of the first selected
     * fixture with that wheel (or the first patched one).
     * The function's DMX range is spread over the wheel's 0-255 outer ring.
     *
     * Split colours: a set's physical value is the position relative to its
     * slot (0 = centred, ±0.5 = half way to the neighbour). Beyond ±0.25 both
     * slots show — covers Robe style (-0.5…0.5 per slot) and explicit
     * "Red / Green" sets at 0.5.
     */
    static buildWheelData(attribute) {
        const pool = Programmer.selection.length ? Programmer.getSelectedFixtures() : PatchManager.getAllFixtures();
        const fixture = pool.find(f => this._wheelFunction(f, attribute))
            || PatchManager.getAllFixtures().find(f => this._wheelFunction(f, attribute));
        if (!fixture) return [];

        const fn = this._wheelFunction(fixture, attribute);
        const wheel = fixture.type.wheels[fn.wheel];
        if (!wheel || !wheel.slots.length) return [];

        const count = wheel.slots.length;
        const wrap = (i) => ((i - 1 + count) % count) + 1;
        const keyFor = (index) => {
            const slot = wheel.slots[index - 1];
            if (!slot) return '#444444';
            if (slot.media && fixture.type.images[slot.media]) return fixture.type.images[slot.media];
            return slot.hex || '#dddddd';
        };
        const nameFor = (index) => wheel.slots[index - 1]?.name || `Slot ${index}`;

        const span = Math.max(1, fn.dmxTo - fn.dmxFrom + 1);
        const to255 = (raw) => Math.round(((raw - fn.dmxFrom) / span) * 256);

        const pieces = [];
        fn.sets.forEach(set => {
            if (!set.wheelSlotIndex) return;
            const pf = set.physicalFrom ?? 0;
            const pt = set.physicalTo ?? pf;
            const len = set.dmxTo - set.dmxFrom + 1;

            // split the set where the physical position crosses ±0.25
            const cuts = [0, 1];
            [-0.25, 0.25].forEach(edge => {
                if (pf !== pt) {
                    const t = (edge - pf) / (pt - pf);
                    if (t > 0 && t < 1) cuts.push(t);
                }
            });
            cuts.sort((a, b) => a - b);

            for (let i = 0; i < cuts.length - 1; i++) {
                const mid = pf + (pt - pf) * ((cuts[i] + cuts[i + 1]) / 2);
                const slot = set.wheelSlotIndex;
                const slots = mid > 0.25 ? [slot, wrap(slot + 1)] : mid < -0.25 ? [wrap(slot - 1), slot] : [slot];
                pieces.push({
                    from: set.dmxFrom + Math.round(cuts[i] * len),
                    to: set.dmxFrom + Math.round(cuts[i + 1] * len) - 1,
                    slots,
                    label: set.name || slots.map(nameFor).join(' / ')
                });
            }
        });

        // to the ring's 0-255 space without overlaps (an overlap would look like a split)
        const out = [];
        let lastEnd = -1;
        pieces.sort((a, b) => a.from - b.from).forEach(p => {
            const a = Math.max(to255(p.from), lastEnd + 1);
            const b = Math.min(255, to255(p.to + 1) - 1);
            if (a > b) return;
            lastEnd = b;
            const keys = p.slots.map(keyFor);
            out.push({ range: [a, b], data: keys.length === 1 ? keys[0] : keys, label: p.label });
        });
        return out;
    }

    /** Wheel colours make bright tiles — darken so white text stays readable. */
    static _darken(hex, factor = 0.55) {
        const c = [1, 3, 5].map(i => Math.round(parseInt(hex.slice(i, i + 2), 16) * factor));
        return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Feedback (programmer / patch → controls)
    // ─────────────────────────────────────────────────────────────────────

    static init() {
        Programmer.on((event) => {
            if (event === 'selection') this._rebuildPresets = true;
            this.queueFeedback();
        });
        PatchManager.on(() => {
            this._rebuildPresets = true;
            this.queueFeedback();
        });
    }

    static queueFeedback() {
        if (this._feedbackQueued) return;
        this._feedbackQueued = true;
        const source = this._source;
        Promise.resolve().then(() => {
            this._feedbackQueued = false;
            const rebuild = this._rebuildPresets;
            this._rebuildPresets = false;
            this.refreshAll(rebuild, source);
        });
    }

    static refreshAll(rebuildPresets = true, skipField = null) {
        HCWDB.getWindows().forEach(win => {
            const field = win.getContextField && win.getContextField();
            if (!field || field === skipField || !this.isAssignable(field)) return;
            this.refreshField(field, rebuildPresets);
        });
        FGMMapping._redraw();
    }

    /** Only the windows showing an Effects pool (effect names / running state changed). */
    static refreshEffectPools() {
        HCWDB.getWindows().forEach(win => {
            const field = win.getContextField && win.getContextField();
            if (!field || !this.isAssignable(field)) return;
            const a = this.get(field.getLocationId());
            if (a && a.type === this.TYPES.POOL && FGMPools.isEffectPool(a.pool)) this.refreshField(field, true);
        });
        FGMMapping._redraw();
    }

    static refreshField(field, rebuildPresets = false) {
        const a = this.get(field.getLocationId());
        if (typeof field.setTag === 'function') field.setTag(a ? this.describe(a) : null);
        if (!a) return;

        switch (a.type) {
            case this.TYPES.ATTRIBUTE: {
                const state = Programmer.getAttributeState(a.attribute, a.fids && a.fids.length ? a.fids : null);
                if (state) this._writeFieldNorm(field, state.norm);
                break;
            }
            case this.TYPES.POSITION: {
                const pan = Programmer.getAttributeState('Pan');
                const tilt = Programmer.getAttributeState('Tilt');
                if (pan) field.pan = pan.norm;
                if (tilt) field.tilt = tilt.norm;
                break;
            }
            case this.TYPES.COLOR: {
                const r = Programmer.getAttributeState('ColorAdd_R');
                const g = Programmer.getAttributeState('ColorAdd_G');
                const b = Programmer.getAttributeState('ColorAdd_B');
                if (r && g && b && typeof field.setColor === 'function') {
                    field.setColor({ r: Math.round(r.norm * 255), g: Math.round(g.norm * 255), b: Math.round(b.norm * 255) });
                }
                break;
            }
            case this.TYPES.WHEEL: {
                if (rebuildPresets || !field.wheelData || !field.wheelData.length) {
                    field.setWheelData(this.buildWheelData(a.attribute), true);
                }
                const state = Programmer.getAttributeState(a.attribute);
                if (state) this._writeFieldNorm(field, state.norm);
                break;
            }
            case this.TYPES.FIXTURES:
            case this.TYPES.PROGRAMMER_KEYS:
            case this.TYPES.CHANNEL_SETS:
            case this.TYPES.POOL:
                if (a.type === this.TYPES.PROGRAMMER_KEYS || a.type === this.TYPES.POOL || a.type === this.TYPES.CHANNEL_SETS) {
                    const note = FGMPools.armedText() || FGMPools.currentMessage();
                    if (note) field.setTag(note, FGMPools.armed ? '#7a1f1f' : '#5a4a00');
                }
                if (rebuildPresets || field.presets.length === 0) this._buildPresets(field, a);
                this._updatePresetStates(field, a);
                break;
        }
    }

    static _updatePresetStates(field, a) {
        field.presets.forEach(p => {
            const d = p.getData() || {};
            let on = false;
            p.setFlashing(false);
            if (d._fixtureSelect !== undefined) on = Programmer.isSelected(d._fixtureSelect);
            else if (d._poolSlot) on = FGMPools.isActive(d._poolSlot.pool, d._poolSlot.slot);
            else if (d._programmerKey === 'highlight') on = Programmer.highlight;
            else if (['store', 'make', 'delete', 'label'].includes(d._programmerKey)) {
                on = !!FGMPools.armed && FGMPools.armed.action === d._programmerKey;
                p.setFlashing(on);
            }
            else if (d._channelSet) {
                const state = Programmer.getAttributeState(a.attribute, Programmer.selection.length ? null : d._channelSet.fids);
                on = !!state && state.programmed && state.setName === d._channelSet.set;
            }
            p.setSelected(on);
        });
    }
}

globalThis.FGMMapping = FGMMapping;
