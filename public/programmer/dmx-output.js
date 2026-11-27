/**
 * DMXOutput — the webpage's view of the console server's output.
 *
 * The server (server/console-engine.js) renders patch + programmer + effects +
 * highlight + Pan/Tilt invert into DMX and sends Art-Net. This class only:
 *   - keeps the Art-Net settings (show file settings.artnet) and sends them to the server
 *   - mirrors the rendered universes the server sends back (~10 Hz) for the monitor
 *   - mirrors the server status (packets, errors, effects running …)
 *
 * Settings: { enabled, ip, port, universeStart, rate }
 * Universe 1 of the patch is sent as Art-Net port-address `universeStart` (default 0).
 */
class DMXOutputEngine {
    constructor() {
        this.universes = new Map();     // universe (1-based) → Uint8Array(512), as the server outputs it
        this.status = null;             // last status message from the server
        this.stats = { packets: 0, errors: 0, lastError: null };
        this._listeners = [];
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
        ConsoleLink.send({ type: 'settings', artnet: this.getSettings() });
        this._emit('settings', this.getSettings());
    }

    start() {
        ConsoleLink.start();
    }

    get connected() {
        return ConsoleLink.connected;
    }

    // ── mirrored output ──────────────────────────────────────────────────

    getUniverse(u) {
        return this.universes.get(u) || new Uint8Array(512);
    }

    /** Current output of one channel of a fixture: { raw, bytes[] } */
    readChannel(fixture, channel) {
        const uni = this.getUniverse(fixture.getBreakStart(channel.dmxBreak).universe);
        const bytes = fixture.getChannelAddresses(channel).map(a => uni[a.address - 1] || 0);
        return { raw: bytes.reduce((acc, b) => acc * 256 + b, 0), bytes };
    }

    /** Binary frame: ['D'] then per universe [u16 LE universe][512 bytes]. */
    _onFrame(buffer) {
        const view = new DataView(buffer);
        const next = new Map();
        for (let o = 1; o + 514 <= buffer.byteLength; o += 514) {
            next.set(view.getUint16(o, true), new Uint8Array(buffer.slice(o + 2, o + 514)));
        }
        this.universes = next;
        this._emit('frame', {});
    }

    _onStatus(status) {
        this.status = status;
        this._statusAt = performance.now();
        const a = status.artnet || {};
        this.stats = { packets: a.packets || 0, errors: a.errors || 0, lastError: a.lastError || null };
        this._emit('status', status);
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

const DMXOutput = new DMXOutputEngine();
globalThis.DMXOutput = DMXOutput;
globalThis.DMXOutputEngine = DMXOutputEngine;
