/**
 * FixturePatchManager — the fixture type library + the patch.
 *
 *   PatchManager.addType(gdtfModel)                 → typeKey
 *   PatchManager.patch({ typeKey, modeName, count, fid, universe, address })
 *   PatchManager.getFixture(fid) / getAllFixtures()
 *
 * Everything is persisted in the show file (`fixtureTypes` + `patch`).
 * Listeners get ('patchChanged' | 'typesChanged', data).
 */
class FixturePatchManager {
    constructor() {
        this._types = {};        // typeKey → parsed GDTF model
        this._fixtures = new Map(); // fid → FixturePatch
        this._listeners = [];
    }

    // ── fixture type library ─────────────────────────────────────────────

    static typeKeyFor(type) {
        return `${type.manufacturer}_${type.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    }

    /** Add (or replace) a parsed fixture type. Same manufacturer+name → same key. */
    addType(type) {
        const key = FixturePatchManager.typeKeyFor(type);
        const replacing = !!this._types[key];
        this._types[key] = type;

        if (replacing) {
            // re-bind patched fixtures of that type to the new definition
            this._fixtures.forEach((f, fid) => {
                if (f.typeKey === key) this._fixtures.set(fid, this._createPatch({ ...f.toJSON() }));
            });
        }

        this._emit('typesChanged', { key });
        if (replacing) this._emit('patchChanged', {});
        return key;
    }

    getType(key) {
        return this._types[key] || null;
    }

    getTypes() {
        return Object.entries(this._types).map(([key, type]) => ({ key, type }));
    }

    removeType(key) {
        if ([...this._fixtures.values()].some(f => f.typeKey === key)) return false;
        delete this._types[key];
        this._emit('typesChanged', { key });
        return true;
    }

    isTypeUsed(key) {
        return [...this._fixtures.values()].some(f => f.typeKey === key);
    }

    // ── patch ─────────────────────────────────────────────────────────────

    _createPatch({ fid, name, typeKey, modeName, universe, address }) {
        const type = this._types[typeKey];
        if (!type) throw new Error(`Unknown fixture type "${typeKey}"`);
        return new FixturePatch({ fid, name, typeKey, type, modeName, universe, address });
    }

    /**
     * Patch one or more fixtures of a type.
     * FIDs count up from `fid`, addresses follow each other (wrapping to the next universe).
     * Returns { fixtures, errors }.
     */
    patch({ typeKey, modeName, count = 1, fid = null, universe = null, address = null, name = null }) {
        const type = this._types[typeKey];
        if (!type) return { fixtures: [], errors: [`Unknown fixture type "${typeKey}"`] };
        const mode = type.modes.find(m => m.name === modeName) || type.modes[0];
        if (!mode) return { fixtures: [], errors: ['Fixture type has no DMX modes'] };

        const footprint = Math.max(1, mode.footprint);
        let nextFid = fid ?? this.nextFreeFid();
        let pos = (universe && address) ? { universe, address } : this.nextFreeAddress(footprint);

        const fixtures = [];
        const errors = [];

        for (let i = 0; i < count; i++) {
            while (this._fixtures.has(nextFid)) nextFid++;
            if (pos.address + footprint - 1 > 512) pos = { universe: pos.universe + 1, address: 1 };

            const patch = this._createPatch({
                fid: nextFid,
                name: name ? (count > 1 ? `${name} ${i + 1}` : name) : `${type.shortName || type.name} ${i + 1}`,
                typeKey,
                modeName: mode.name,
                universe: pos.universe,
                address: pos.address
            });

            const clash = this.findCollisions(patch);
            if (clash.length) errors.push(`FID ${nextFid} @ ${patch.addressString} overlaps ${clash.map(c => c.fid).join(', ')}`);

            this._fixtures.set(nextFid, patch);
            fixtures.push(patch);

            nextFid++;
            pos = { universe: pos.universe, address: pos.address + footprint };
        }

        this._emit('patchChanged', { added: fixtures.map(f => f.fid) });
        return { fixtures, errors };
    }

    /** Change fid / name / mode / address of a patched fixture. */
    updateFixture(fid, changes) {
        const current = this._fixtures.get(fid);
        if (!current) return null;
        const next = { ...current.toJSON(), ...changes };

        if (next.fid !== fid && this._fixtures.has(next.fid)) throw new Error(`FID ${next.fid} is already used`);

        const patch = this._createPatch(next);
        this._fixtures.delete(fid);
        this._fixtures.set(patch.fid, patch);
        this._sort();

        this._emit('patchChanged', { updated: patch.fid, previousFid: fid });
        return patch;
    }

    removeFixture(fid) {
        if (!this._fixtures.delete(fid)) return;
        this._emit('patchChanged', { removed: fid });
    }

    clearPatch() {
        this._fixtures.clear();
        this._emit('patchChanged', {});
    }

    getFixture(fid) {
        return this._fixtures.get(Number(fid)) || null;
    }

    getAllFixtures() {
        return [...this._fixtures.values()];
    }

    get count() {
        return this._fixtures.size;
    }

    _sort() {
        this._fixtures = new Map([...this._fixtures.entries()].sort((a, b) => a[0] - b[0]));
    }

    nextFreeFid() {
        let fid = 1;
        this._fixtures.forEach((_, k) => { if (k >= fid) fid = k + 1; });
        return fid;
    }

    /** First address after the highest used one that fits `footprint` channels. */
    nextFreeAddress(footprint = 1) {
        let universe = 1;
        let address = 1;
        this._fixtures.forEach(f => {
            f.getOccupiedAddresses().forEach(a => {
                if (a.universe > universe || (a.universe === universe && a.address + 1 > address)) {
                    universe = a.universe;
                    address = a.address + 1;
                }
            });
        });
        if (address + footprint - 1 > 512) return { universe: universe + 1, address: 1 };
        return { universe, address };
    }

    /** Other fixtures that share at least one DMX address with `patch`. */
    findCollisions(patch) {
        const mine = new Set(patch.getOccupiedAddresses().map(a => `${a.universe}.${a.address}`));
        return this.getAllFixtures().filter(f => f.fid !== patch.fid &&
            f.getOccupiedAddresses().some(a => mine.has(`${a.universe}.${a.address}`)));
    }

    // ── show file persistence ────────────────────────────────────────────

    typesToJSON() {
        return JSON.parse(JSON.stringify(this._types));
    }

    toJSON() {
        return this.getAllFixtures().map(f => f.toJSON());
    }

    loadFromShow(showFile) {
        this._types = {};
        this._fixtures = new Map();

        Object.entries(showFile.fixtureTypes || {}).forEach(([key, type]) => {
            if (type && type.modelVersion === GDTFParser.MODEL_VERSION) this._types[key] = type;
            else console.warn(`PatchManager: fixture type "${key}" was saved by an older parser — re-import the .gdtf`);
        });

        (showFile.patch || []).forEach(entry => {
            try {
                const p = this._createPatch(entry);
                this._fixtures.set(p.fid, p);
            } catch (e) {
                console.warn(`PatchManager: could not restore FID ${entry.fid}: ${e.message}`);
            }
        });
        this._sort();

        this._emit('typesChanged', {});
        this._emit('patchChanged', {});
    }

    // ── events ───────────────────────────────────────────────────────────

    on(callback) {
        this._listeners.push(callback);
        return () => { this._listeners = this._listeners.filter(l => l !== callback); };
    }

    _emit(event, data) {
        this._listeners.forEach(cb => {
            try { cb(event, data); } catch (e) { console.error('PatchManager listener error:', e); }
        });
    }
}

const PatchManager = new FixturePatchManager();
globalThis.PatchManager = PatchManager;
globalThis.FixturePatchManager = FixturePatchManager;
