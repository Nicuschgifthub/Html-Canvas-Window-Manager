/**
 * DMXOutput — renders patch + programmer into DMX universes and (optionally)
 * sends them as Art-Net through the server bridge (POST /api/artnet/send).
 *
 *   value of a channel = highlight (if on and fixture selected and the channel has one)
 *                      → programmer value
 *                      → GDTF default
 *
 * Settings live in the show file under settings.artnet:
 *   { enabled, ip, port, universeStart, rate }
 * Universe 1 of the patch is sent as Art-Net port-address `universeStart` (default 0).
 */
class DMXOutputEngine {
    constructor(patchManager, programmer) {
        this.patch = patchManager;
        this.programmer = programmer;

        this.universes = new Map();     // universe (1-based) → Uint8Array(512)
        this._dirty = new Set();
        this._lastSent = new Map();
        this._inflight = new Set();
        this._sequence = 0;
        this._timer = null;
        this._renderQueued = false;
        this._listeners = [];

        this.stats = { packets: 0, errors: 0, lastError: null };

        const queue = () => this.queueRender();
        this.patch.on(queue);
        this.programmer.on(queue);
    }

    static get DEFAULT_SETTINGS() {
        return { enabled: false, ip: '255.255.255.255', port: 6454, universeStart: 0, rate: 30 };
    }

    getSettings() {
        const show = (typeof FGMShowHandler !== 'undefined' && FGMShowHandler) ? FGMShowHandler.getShowFile() : null;
        if (!show) return DMXOutputEngine.DEFAULT_SETTINGS;
        show.settings = show.settings || {};
        show.settings.artnet = { ...DMXOutputEngine.DEFAULT_SETTINGS, ...(show.settings.artnet || {}) };
        return show.settings.artnet;
    }

    updateSettings(changes) {
        Object.assign(this.getSettings(), changes);
        this.universes.forEach((_, u) => this._dirty.add(u));
        this._restartTimer();
        this._emit('settings', this.getSettings());
    }

    // ── rendering ────────────────────────────────────────────────────────

    queueRender() {
        if (this._renderQueued) return;
        this._renderQueued = true;
        Promise.resolve().then(() => {
            this._renderQueued = false;
            this.render();
        });
    }

    render() {
        const next = new Map();
        const get = (u) => {
            if (!next.has(u)) next.set(u, new Uint8Array(512));
            return next.get(u);
        };

        const highlight = this.programmer.highlight;

        this.patch.getAllFixtures().forEach(fixture => {
            const highlighted = highlight && this.programmer.isSelected(fixture.fid);
            fixture.channels.forEach(channel => {
                let raw = this.programmer.resolveRaw(fixture, channel);
                if (highlighted && channel.highlight !== null && channel.highlight !== undefined) raw = channel.highlight;

                const bytes = GDTFParser.splitBytes(raw, channel.bytes);
                fixture.getChannelAddresses(channel).forEach((addr, i) => {
                    if (addr.address < 1 || addr.address > 512) return;
                    get(addr.universe)[addr.address - 1] = bytes[i];
                });
            });
        });

        // diff against what we had
        const all = new Set([...this.universes.keys(), ...next.keys()]);
        all.forEach(u => {
            const before = this.universes.get(u);
            const after = next.get(u) || new Uint8Array(512);
            if (!before || before.some((v, i) => v !== after[i])) this._dirty.add(u);
            next.set(u, after);
        });

        this.universes = next;
        if (this._dirty.size) this._emit('render', { dirty: [...this._dirty] });
    }

    getUniverse(u) {
        return this.universes.get(u) || new Uint8Array(512);
    }

    /** Current output of one channel of a fixture: { raw, bytes[] } */
    readChannel(fixture, channel) {
        const uni = this.getUniverse(fixture.getBreakStart(channel.dmxBreak).universe);
        const bytes = fixture.getChannelAddresses(channel).map(a => uni[a.address - 1] || 0);
        return { raw: bytes.reduce((acc, b) => acc * 256 + b, 0), bytes };
    }

    // ── Art-Net ──────────────────────────────────────────────────────────

    start() {
        this._restartTimer();
        this.render();
    }

    _restartTimer() {
        if (this._timer) clearInterval(this._timer);
        const rate = Math.max(1, Math.min(44, Number(this.getSettings().rate) || 30));
        this._timer = setInterval(() => this._tick(), 1000 / rate);
    }

    _tick() {
        const s = this.getSettings();
        if (!s.enabled) return;
        const now = Date.now();
        this.universes.forEach((data, u) => {
            const stale = now - (this._lastSent.get(u) || 0) > 1000; // Art-Net keep-alive
            if ((this._dirty.has(u) || stale) && !this._inflight.has(u)) {
                this._dirty.delete(u);
                this._send(u, data, s);
            }
        });
    }

    static buildArtDmx(portAddress, data, sequence = 0) {
        const length = Math.max(2, data.length + (data.length % 2)); // even, 2..512
        const packet = new Uint8Array(18 + length);
        const id = 'Art-Net';
        for (let i = 0; i < id.length; i++) packet[i] = id.charCodeAt(i);
        packet[7] = 0;
        packet[8] = 0x00; packet[9] = 0x50;          // OpDmx 0x5000, little endian
        packet[10] = 0; packet[11] = 14;             // protocol version 14
        packet[12] = sequence & 0xff;
        packet[13] = 0;                              // physical
        packet[14] = portAddress & 0xff;             // SubUni
        packet[15] = (portAddress >> 8) & 0x7f;      // Net
        packet[16] = (length >> 8) & 0xff;           // length hi
        packet[17] = length & 0xff;                  // length lo
        packet.set(data.subarray(0, length), 18);
        return packet;
    }

    async _send(universe, data, s) {
        const portAddress = (universe - 1) + (Number(s.universeStart) || 0);
        if (portAddress < 0 || portAddress > 0x7fff) return;

        this._sequence = (this._sequence % 255) + 1;
        const packet = DMXOutputEngine.buildArtDmx(portAddress, data, this._sequence);

        this._inflight.add(universe);
        this._lastSent.set(universe, Date.now());
        try {
            const res = await fetch('/api/artnet/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'x-target-ip': s.ip,
                    'x-target-port': String(s.port || 6454)
                },
                body: packet
            });
            if (!res.ok) throw new Error(await res.text());
            this.stats.packets++;
        } catch (e) {
            this.stats.errors++;
            if (this.stats.lastError !== e.message) console.warn('Art-Net send failed:', e.message);
            this.stats.lastError = e.message;
        } finally {
            this._inflight.delete(universe);
        }
    }

    // ── events ───────────────────────────────────────────────────────────

    on(callback) {
        this._listeners.push(callback);
        return () => { this._listeners = this._listeners.filter(l => l !== callback); };
    }

    _emit(event, data) {
        this._listeners.forEach(cb => {
            try { cb(event, data); } catch (e) { console.error('DMXOutput listener error:', e); }
        });
    }
}

const DMXOutput = new DMXOutputEngine(PatchManager, Programmer);
globalThis.DMXOutput = DMXOutput;
globalThis.DMXOutputEngine = DMXOutputEngine;
