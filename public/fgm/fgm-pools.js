/**
 * FGMPools — Groups and attribute preset pools, plus Store / Delete / Label.
 *
 * Show file: memory.pools[poolType][slot] (slot = 1-based number)
 *
 *   pool_type_group      { name, fids: [101, 102, …] }               selection, in order
 *   pool_type_dimmer …   { name, values: [{ fid, channelKey, attribute, fnIndex, raw }],
 *                          types: { typeKey|mode: fid } }            programmer values
 *
 * Attribute pools only take programmer values whose attribute belongs to the
 * pool's GDTF feature groups (Color pool → "Color", Beam → "Beam" + "Shapers" …).
 * "All" takes everything.
 *
 * Workflow (MA style): press STORE (programmer keys) → tap a pool slot.
 * Same for DELETE and LABEL. Tapping the background cancels.
 * Without an armed action a tap recalls the slot:
 *   group  → selects its fixtures
 *   preset → loads its values into the programmer for the selected fixtures
 *            only — with nothing selected nothing changes. A selected fixture
 *            that is not in the preset gets the values of a stored fixture of
 *            the same type + mode, so a preset stored on one fixture works for
 *            every fixture of that type.
 */
class FGMPools {

    static get TYPES() {
        const T = GLOBAL_TYPES.POOLS.TYPES;
        return [
            { key: T.GROUP, label: 'Groups', short: 'Group', color: '#24465f', featureGroups: null, isGroup: true },
            { key: T.DIMMER, label: 'Dimmer', short: 'Dimmer', color: '#5a4800', featureGroups: ['Dimmer'] },
            { key: T.POSITION, label: 'Position', short: 'Position', color: '#1d3a63', featureGroups: ['Position'] },
            { key: T.COLOR, label: 'Color', short: 'Color', color: '#5b1f4f', featureGroups: ['Color'] },
            { key: T.GOBO, label: 'Gobo', short: 'Gobo', color: '#2d4a22', featureGroups: ['Gobo'] },
            { key: T.BEAM, label: 'Beam', short: 'Beam', color: '#3d2b56', featureGroups: ['Beam', 'Shapers'] },
            { key: T.FOCUS, label: 'Focus', short: 'Focus', color: '#21453f', featureGroups: ['Focus'] },
            { key: T.ALL, label: 'All', short: 'Preset', color: '#4a3a2a', featureGroups: null }
        ];
    }

    static getType(key) {
        return this.TYPES.find(t => t.key === key) || null;
    }

    static armed = null;           // { action: 'store' | 'delete' | 'label' }
    static lastRecalled = {};      // poolType → slot (feedback)
    static _flashTimer = null;
    static _message = null;

    static init() {
        // keep pools valid when a fixture gets a new FID
        PatchManager.on((event, data) => {
            if (event === 'patchChanged' && data.previousFid !== undefined && data.updated !== undefined && data.previousFid !== data.updated) {
                this.renameFid(data.previousFid, data.updated);
            }
        });
        Programmer.on((event, data) => {
            if (event === 'values' && data.cleared) this.lastRecalled = {};
        });
    }

    // ── storage ──────────────────────────────────────────────────────────

    static _pools() {
        const show = FGMShowHandler.getShowFile();
        show.memory = show.memory || {};
        const pools = show.memory.pools = show.memory.pools || {};
        this.TYPES.forEach(t => { if (!pools[t.key]) pools[t.key] = {}; });
        return pools;
    }

    static getPool(poolType) {
        return this._pools()[poolType] || {};
    }

    static getSlot(poolType, slot) {
        return this.getPool(poolType)[String(slot)] || null;
    }

    static highestSlot(poolType) {
        return Object.keys(this.getPool(poolType)).reduce((n, k) => Math.max(n, Number(k) || 0), 0);
    }

    static renameFid(oldFid, newFid) {
        Object.values(this._pools()).forEach(pool => {
            Object.values(pool).forEach(item => {
                if (item.fids) item.fids = item.fids.map(f => f === oldFid ? newFid : f);
                if (item.values) item.values.forEach(v => { if (v.fid === oldFid) v.fid = newFid; });
                if (item.types) Object.keys(item.types).forEach(k => { if (item.types[k] === oldFid) item.types[k] = newFid; });
            });
        });
    }

    // ── arming (Store / Delete / Label) ──────────────────────────────────

    static arm(action) {
        if (this.armed && this.armed.action === action) { this.disarm(); return; }
        this.armed = { action };
        this._message = null;
        if (!this._flashTimer) {
            this._flashTimer = setInterval(() => { if (typeof HCWRender !== 'undefined') HCWRender.updateFrame(); }, 150);
        }
        FGMMapping.refreshAll(false);
    }

    static disarm() {
        this.armed = null;
        if (this._flashTimer) { clearInterval(this._flashTimer); this._flashTimer = null; }
        FGMMapping.refreshAll(false);
    }

    // ── slot press ───────────────────────────────────────────────────────

    static async slotPressed({ pool, slot }) {
        const armed = this.armed;
        if (armed) {
            this.disarm();
            if (armed.action === 'store') this.store(pool, slot);
            else if (armed.action === 'delete') this.remove(pool, slot);
            else if (armed.action === 'label') await this.label(pool, slot);
            FGMMapping.refreshAll(true);
            return;
        }
        this.recall(pool, slot);
    }

    // ── store ────────────────────────────────────────────────────────────

    /** Programmer entries that belong into a pool type. */
    static entriesFor(poolType) {
        const def = this.getType(poolType);
        return Programmer.getEntries((fixture, channel, entry) => {
            if (!def.featureGroups) return true;
            const group = fixture.type.attributes[entry.attribute]?.featureGroup;
            return def.featureGroups.includes(group);
        });
    }

    static store(poolType, slot) {
        const def = this.getType(poolType);
        if (!def) return false;
        const pool = this._pools()[poolType];
        const existing = pool[String(slot)];

        if (def.isGroup) {
            if (!Programmer.selection.length) return this._fail('Store group: nothing selected');
            pool[String(slot)] = {
                name: existing?.name || this._groupName(Programmer.selection),
                fids: [...Programmer.selection]
            };
            this.lastRecalled[poolType] = slot;
            return true;
        }

        const values = this.entriesFor(poolType);
        if (!values.length) return this._fail(`Store ${def.label}: no ${def.label.toLowerCase()} values in the programmer`);

        // one reference fixture per type + mode (for applying to other fixtures of that type)
        const types = {};
        values.forEach(v => {
            const f = PatchManager.getFixture(v.fid);
            const k = `${f.typeKey}|${f.modeName}`;
            if (types[k] === undefined) types[k] = v.fid;
        });

        pool[String(slot)] = {
            name: existing?.name || this._autoName(def, values, slot),
            values: values.map(v => ({ fid: v.fid, channelKey: v.channelKey, attribute: v.attribute, fnIndex: v.fnIndex, raw: v.raw })),
            types
        };
        this.lastRecalled[poolType] = slot;
        return true;
    }

    static remove(poolType, slot) {
        delete this._pools()[poolType][String(slot)];
        if (this.lastRecalled[poolType] === slot) delete this.lastRecalled[poolType];
    }

    static async label(poolType, slot) {
        const item = this.getSlot(poolType, slot);
        if (!item) return this._fail('Label: slot is empty');
        const name = await FGMModal.input({
            label: `Name of ${this.getType(poolType).short} ${slot}`,
            initial: item.name,
            verify: (v) => String(v).trim() ? { valid: true, infoText: '' } : { valid: false, infoText: 'Empty' }
        });
        if (name !== null) item.name = String(name).trim();
        FGMShowHandler.setPageCursor();
    }

    // ── recall ───────────────────────────────────────────────────────────

    static recall(poolType, slot) {
        const item = this.getSlot(poolType, slot);
        if (!item) return false;

        if (item.fids) {
            Programmer.select(item.fids, 'replace');
            this.lastRecalled[poolType] = slot;
            return true;
        }

        // presets only act on selected fixtures
        if (!Programmer.selection.length) return this._fail(`${item.name}: select fixtures first`);

        const entries = this.resolveValues(item, Programmer.selection);
        if (!entries.length) return this._fail(`${item.name}: not stored for the selected fixtures`);
        this.lastRecalled[poolType] = slot;
        Programmer.applyEntries(entries, { pool: poolType, slot });
        return true;
    }

    /**
     * Values of a preset for the given fixtures (null = the stored fixtures).
     * Fixtures without own values borrow them from a stored fixture of the same type + mode.
     */
    static resolveValues(item, fids) {
        if (!fids) return item.values.map(v => ({ ...v }));

        const byFid = new Map();
        item.values.forEach(v => {
            if (!byFid.has(v.fid)) byFid.set(v.fid, []);
            byFid.get(v.fid).push(v);
        });

        const out = [];
        fids.forEach(fid => {
            let own = byFid.get(fid);
            if (!own) {
                const f = PatchManager.getFixture(fid);
                const ref = f && item.types ? item.types[`${f.typeKey}|${f.modeName}`] : undefined;
                own = ref !== undefined ? byFid.get(ref) : null;
            }
            if (own) own.forEach(v => out.push({ ...v, fid }));
        });
        return out;
    }

    // ── feedback helpers for the preset tiles ────────────────────────────

    static isActive(poolType, slot) {
        const item = this.getSlot(poolType, slot);
        if (!item) return false;
        if (item.fids) {
            const sel = Programmer.selection;
            return sel.length === item.fids.length && item.fids.every((f, i) => sel[i] === f);
        }
        return this.lastRecalled[poolType] === slot && Programmer.hasValues();
    }

    /** Tile colour: Color presets show the stored colour, others the pool colour. */
    static tileColor(poolType, item) {
        const def = this.getType(poolType);
        if (!item) return '#202020';
        if (poolType === GLOBAL_TYPES.POOLS.TYPES.COLOR) {
            const hex = this._presetColor(item);
            if (hex) return FGMMapping._darken(hex, 0.6);
        }
        return def.color;
    }

    static _presetColor(item) {
        const v = (attr) => item.values.find(e => e.attribute === attr);
        const r = v('ColorAdd_R'), g = v('ColorAdd_G'), b = v('ColorAdd_B');
        if (r || g || b) {
            const norm = (e) => {
                if (!e) return 0;
                const f = PatchManager.getFixture(e.fid);
                const ch = f?.getChannel(e.channelKey);
                return ch ? e.raw / GDTFParser.maxValue(ch.bytes) : 0;
            };
            const max = Math.max(norm(r), norm(g), norm(b)) || 1;
            return '#' + [r, g, b].map(e => Math.round(norm(e) / max * 255).toString(16).padStart(2, '0')).join('');
        }
        // colour wheel → slot colour
        for (const e of item.values) {
            const f = PatchManager.getFixture(e.fid);
            const ch = f?.getChannel(e.channelKey);
            if (!ch) continue;
            const { fn, set } = f.decodeValue(ch, e.raw);
            if (fn && fn.wheel && set && set.wheelSlotIndex) {
                const slot = f.type.wheels[fn.wheel]?.slots[set.wheelSlotIndex - 1];
                if (slot && slot.hex) return slot.hex;
            }
        }
        return null;
    }

    // ── naming ───────────────────────────────────────────────────────────

    static _groupName(fids) {
        const fixtures = fids.map(fid => PatchManager.getFixture(fid)).filter(Boolean);
        const types = [...new Set(fixtures.map(f => f.type.shortName || f.type.name))];
        const range = fids.length > 1 ? `${fids[0]}-${fids[fids.length - 1]}` : String(fids[0]);
        return types.length === 1 ? `${types[0]} ${range}` : `Mixed ${range}`;
    }

    /** Use a channel set name when the preset is a single named position (e.g. "Deep Red", "Gobo 3"). */
    static _autoName(def, values, slot) {
        const names = new Set();
        values.forEach(e => {
            const f = PatchManager.getFixture(e.fid);
            const ch = f?.getChannel(e.channelKey);
            if (!ch) return;
            const { set } = f.decodeValue(ch, e.raw);
            if (set && set.name) names.add(set.name.replace(/\s*-\s*Positioning$/i, ''));
        });
        if (names.size === 1 && (def.key === GLOBAL_TYPES.POOLS.TYPES.COLOR || def.key === GLOBAL_TYPES.POOLS.TYPES.GOBO)) {
            return [...names][0];
        }
        return `${def.short} ${slot}`;
    }

    /** Show a short message on the programmer keys / pool windows for a few seconds. */
    static _fail(message) {
        this._message = { text: message, until: Date.now() + 4000 };
        console.warn(`Pools: ${message}`);
        FGMMapping.refreshAll(false);
        setTimeout(() => FGMMapping.refreshAll(false), 4100);
        return false;
    }

    static currentMessage() {
        return this._message && Date.now() < this._message.until ? this._message.text : null;
    }

    /** Tag text while Store / Delete / Label waits for a slot. */
    static armedText() {
        if (!this.armed) return null;
        return `${this.armed.action.toUpperCase()} → tap a pool slot (background = cancel)`;
    }
}

globalThis.FGMPools = FGMPools;
