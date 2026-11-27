/**
 * FixturePatch — one patched fixture: a fixture type (from GDTFParser), a DMX
 * mode, a fixture id (FID) and a DMX address.
 *
 * It knows *where* its channels are and *which channel functions* exist on them.
 * It does not store values — the Programmer does that, DMXOutput renders them.
 */
class FixturePatch {

    /**
     * @param {object} opts
     * @param {number} opts.fid        user facing fixture id (e.g. 101)
     * @param {string} opts.name
     * @param {string} opts.typeKey    key into PatchManager's fixture type library
     * @param {object} opts.type       parsed GDTF fixture type model
     * @param {string} opts.modeName
     * @param {number} opts.universe   1-based
     * @param {number} opts.address    1-based start address of DMX break 1
     * @param {boolean} opts.invertPan   mirror Pan at the output (fixture hung the other way)
     * @param {boolean} opts.invertTilt  mirror Tilt at the output
     */
    constructor({ fid, name, typeKey, type, modeName, universe, address, invertPan = false, invertTilt = false }) {
        this.fid = fid;
        this.name = name;
        this.typeKey = typeKey;
        this.type = type;

        this.mode = type.modes.find(m => m.name === modeName) || type.modes[0] || null;
        this.modeName = this.mode ? this.mode.name : 'Unknown';

        this.universe = universe;
        this.address = address;

        this.invertPan = !!invertPan;
        this.invertTilt = !!invertTilt;

        this._buildIndex();
    }

    _buildIndex() {
        this.channels = this.mode ? this.mode.channels : [];
        this._channelByKey = {};
        this._channelByName = {};
        this._byAttribute = {};

        this.channels.forEach(ch => {
            this._channelByKey[ch.key] = ch;
            if (!this._channelByName[ch.name]) this._channelByName[ch.name] = ch;
            const seen = new Set();
            ch.functions.forEach(fn => {
                if (seen.has(fn.attribute)) return;
                seen.add(fn.attribute);
                (this._byAttribute[fn.attribute] = this._byAttribute[fn.attribute] || []).push(ch);
            });
        });
    }

    // ── identity ─────────────────────────────────────────────────────────

    get label() {
        return `${this.fid} ${this.name}`;
    }

    get footprint() {
        return this.mode ? this.mode.footprint : 0;
    }

    get typeName() {
        return `${this.type.manufacturer} ${this.type.name}`;
    }

    /** "1.001" style address of break 1 */
    get addressString() {
        return `${this.universe}.${String(this.address).padStart(3, '0')}`;
    }

    // ── addressing ───────────────────────────────────────────────────────

    /**
     * Start of a DMX break. Break 1 is the patched address; further breaks
     * follow on directly after the previous break (overflowing to the next universe).
     */
    getBreakStart(dmxBreak = 1) {
        let universe = this.universe;
        let address = this.address;
        const breaks = this.mode ? this.mode.breaks : {};
        for (let b = 1; b < dmxBreak; b++) {
            address += breaks[b] || 0;
            const nextSize = breaks[b + 1] || 0;
            if (address + nextSize - 1 > 512) { universe++; address = 1; }
        }
        return { universe, address };
    }

    /** Absolute { universe, address } for every byte of a channel, coarse first. */
    getChannelAddresses(channel) {
        const start = this.getBreakStart(channel.dmxBreak);
        return channel.offsets.map(o => ({ universe: start.universe, address: start.address + o - 1 }));
    }

    /** Every universe/address this fixture occupies (for collision checks). */
    getOccupiedAddresses() {
        const out = [];
        this.channels.forEach(ch => out.push(...this.getChannelAddresses(ch)));
        return out;
    }

    // ── channel / function lookup ────────────────────────────────────────

    getChannel(key) {
        return this._channelByKey[key] || null;
    }

    getChannelByName(name) {
        return this._channelByName[name] || null;
    }

    hasAttribute(attribute) {
        return !!this._byAttribute[attribute];
    }

    /** Attributes of every channel function in this mode. */
    get attributes() {
        return Object.keys(this._byAttribute);
    }

    /** Channels that have at least one function with this attribute. */
    getChannelsForAttribute(attribute) {
        return this._byAttribute[attribute] || [];
    }

    /**
     * Pick the channel function for `attribute` on `channel`.
     * When a channel has several functions with the same attribute (mode
     * dependent functions, or e.g. "Open" appearing three times on a shutter
     * channel) the one whose ModeMaster condition is currently met wins.
     *
     * @param {function} readChannel  (channelName) → current raw value, used for ModeMaster checks
     */
    pickFunction(channel, attribute, readChannel = null) {
        const candidates = channel.functions.filter(f => f.attribute === attribute);
        if (candidates.length <= 1) return candidates[0] || null;

        if (readChannel) {
            const active = candidates.find(f => this.isFunctionActive(f, readChannel));
            if (active) return active;
        }
        return candidates.find(f => !f.modeMaster) || candidates[0];
    }

    isFunctionActive(fn, readChannel) {
        if (!fn.modeMaster) return true;
        const masterName = fn.modeMaster.split('.')[0];
        const master = this.getChannelByName(masterName);
        if (!master) return true;
        const value = readChannel(master);
        const from = GDTFParser.parseDMXValue(fn.modeFrom, master.bytes);
        const to = GDTFParser.parseDMXValue(fn.modeTo, master.bytes);
        return value >= from && value <= to;
    }

    /** The function a raw value on `channel` falls into (respecting ModeMaster). */
    decodeValue(channel, raw, readChannel = null) {
        const fn = channel.functions.find(f =>
            raw >= f.dmxFrom && raw <= f.dmxTo && (!readChannel || this.isFunctionActive(f, readChannel))
        ) || null;
        const set = fn ? fn.sets.find(s => s.name && raw >= s.dmxFrom && raw <= s.dmxTo) || null : null;
        return { fn, set };
    }

    // ── value conversion inside a function ───────────────────────────────

    static normToRaw(fn, norm) {
        const n = Math.max(0, Math.min(1, norm));
        return Math.round(fn.dmxFrom + n * (fn.dmxTo - fn.dmxFrom));
    }

    static rawToNorm(fn, raw) {
        const span = fn.dmxTo - fn.dmxFrom;
        if (span <= 0) return 0;
        return Math.max(0, Math.min(1, (raw - fn.dmxFrom) / span));
    }

    static physicalToRaw(fn, physical) {
        const span = fn.physicalTo - fn.physicalFrom;
        if (span === 0) return fn.dmxFrom;
        return FixturePatch.normToRaw(fn, (physical - fn.physicalFrom) / span);
    }

    static rawToPhysical(fn, raw) {
        return fn.physicalFrom + FixturePatch.rawToNorm(fn, raw) * (fn.physicalTo - fn.physicalFrom);
    }

    // ── output corrections ───────────────────────────────────────────────

    /** "Pan", "Tilt", "Pan+Tilt" or "" */
    get invertLabel() {
        return [this.invertPan && 'Pan', this.invertTilt && 'Tilt'].filter(Boolean).join('+');
    }

    /**
     * Raw value as it goes out on DMX. Programmer values stay logical, an inverted
     * Pan/Tilt is mirrored inside its channel function's DMX range here — so
     * presets, fans and the XY pad behave the same on every fixture.
     * Only the Pan / Tilt functions are mirrored (not PanRotate, not other
     * functions sharing the channel).
     */
    outputRaw(channel, raw) {
        if (!this.invertPan && !this.invertTilt) return raw;
        const fn = channel.functions.find(f =>
            ((f.attribute === 'Pan' && this.invertPan) || (f.attribute === 'Tilt' && this.invertTilt))
            && raw >= f.dmxFrom && raw <= f.dmxTo
        );
        return fn ? fn.dmxFrom + fn.dmxTo - raw : raw;
    }

    // ── serialisation ────────────────────────────────────────────────────

    toJSON() {
        return {
            fid: this.fid,
            name: this.name,
            typeKey: this.typeKey,
            modeName: this.modeName,
            universe: this.universe,
            address: this.address,
            invertPan: this.invertPan,
            invertTilt: this.invertTilt
        };
    }
}

globalThis.FixturePatch = FixturePatch;
if (typeof module !== 'undefined') module.exports = FixturePatch;
