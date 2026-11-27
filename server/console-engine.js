/**
 * ConsoleEngine — the "real" console. The webpage is only a remote: it does the
 * programming (selection, values, presets) and sends the result here over the
 * WebSocket; this process owns the output and keeps running when the tab
 * sleeps or closes.
 *
 * Every frame (settings.rate Hz, own clock):
 *
 *   programmer value → GDTF default
 *     → effects            (EffectEngine, LTP over the programmer / relative around it)
 *     → highlight          (selected fixtures, while highlight is on)
 *     → Pan / Tilt invert  (FixturePatch.outputRaw)
 *     → DMX universes → Art-Net
 *
 * Remotes get the rendered universes back (~10 Hz, binary) for the DMX
 * monitor, plus a status message once a second.
 *
 * Protocol — see public/programmer/console-link.js for the webpage side.
 */
require('../public/fixture/gdtf-parser.js');                 // sets globalThis.GDTFParser
const FixturePatch = require('../public/fixture/fixture-patch.js');
const ArtNetSender = require('./artnet.js');
const EffectEngine = require('./effect-engine.js');

const DEFAULT_ARTNET = { enabled: false, ip: '255.255.255.255', port: 6454, universeStart: 0, rate: 30 };
const MONITOR_INTERVAL_MS = 100;
const STATUS_INTERVAL_MS = 1000;

class ConsoleEngine {
    constructor() {
        this.types = {};                 // typeKey → parsed GDTF model
        this.patch = new Map();          // fid → FixturePatch
        this.values = new Map();         // fid → Map(channelKey → raw)
        this.highlight = { on: false, fids: [] };
        this.settings = { ...DEFAULT_ARTNET };

        this.artnet = new ArtNetSender();
        this.effects = new EffectEngine();

        this.universes = new Map();      // universe → Uint8Array(512), last rendered
        this._lastSent = new Map();      // universe → ms
        this._changed = new Set();       // universes changed since last Art-Net send
        this._monitorDirty = true;

        this.clients = new Set();
        this._timer = null;
        this._frameMs = 0;               // render time of the last frame
        this._frames = 0;

        this._restartLoop();
        setInterval(() => this._sendMonitor(), MONITOR_INTERVAL_MS);
        setInterval(() => this._sendStatus(), STATUS_INTERVAL_MS);
    }

    // ── clients ──────────────────────────────────────────────────────────

    attach(ws, req) {
        this.clients.add(ws);
        const who = req && req.socket ? req.socket.remoteAddress : '?';
        console.log(`[Console] remote connected (${who}) — ${this.clients.size} connected`);

        ws.on('message', (data, isBinary) => {
            if (isBinary) return;
            let msg;
            try { msg = JSON.parse(data.toString()); } catch (e) { return; }
            try { this.handle(msg, ws); } catch (e) { console.error('[Console] message failed:', msg && msg.type, e); }
        });
        ws.on('close', () => {
            this.clients.delete(ws);
            console.log(`[Console] remote disconnected — ${this.clients.size} connected, output keeps running`);
        });

        this._send(ws, { type: 'hello', server: 'vt-dmx-console', effects: EffectEngine.WAVES });
        this._monitorDirty = true;
        this._sendStatus();
    }

    _send(ws, msg) {
        if (ws.readyState === 1) ws.send(typeof msg === 'string' || Buffer.isBuffer(msg) ? msg : JSON.stringify(msg));
    }

    _broadcast(msg) {
        const data = Buffer.isBuffer(msg) ? msg : JSON.stringify(msg);
        this.clients.forEach(ws => this._send(ws, data));
    }

    // ── messages from the webpage ────────────────────────────────────────

    handle(msg) {
        switch (msg.type) {
            case 'types':       // { types: { key: model } } — merge, or replace when full
                if (msg.full) this.types = {};
                Object.assign(this.types, msg.types || {});
                this._rebuildPatch(this._patchEntries || []);
                break;

            case 'patch':       // { patch: [{ fid, name, typeKey, modeName, universe, address, invertPan, invertTilt }] }
                this._patchEntries = Array.isArray(msg.patch) ? msg.patch : [];
                this._rebuildPatch(this._patchEntries);
                break;

            case 'values':      // { full?, set: [[fid, channelKey, raw]], del: [[fid, channelKey]] }
                if (msg.full) this.values.clear();
                (msg.del || []).forEach(([fid, key]) => {
                    const m = this.values.get(Number(fid));
                    if (m) { m.delete(key); if (!m.size) this.values.delete(Number(fid)); }
                });
                (msg.set || []).forEach(([fid, key, raw]) => {
                    fid = Number(fid);
                    let m = this.values.get(fid);
                    if (!m) { m = new Map(); this.values.set(fid, m); }
                    m.set(key, Number(raw) || 0);
                });
                break;

            case 'highlight':   // { on, fids }
                this.highlight = { on: !!msg.on, fids: Array.isArray(msg.fids) ? msg.fids.map(Number) : [] };
                break;

            case 'settings':    // { artnet: { enabled, ip, port, universeStart, rate } }
                this.settings = { ...DEFAULT_ARTNET, ...this.settings, ...(msg.artnet || {}) };
                this.universes.forEach((_, u) => this._changed.add(u));
                this._restartLoop();
                break;

            case 'effects':     // { effects: [...] } — always the full list
                this.effects.setEffects(msg.effects);
                break;

            default:
                return;
        }
        this._renderNow = true;
    }

    _rebuildPatch(entries) {
        const next = new Map();
        entries.forEach(entry => {
            const type = this.types[entry.typeKey];
            if (!type) return; // type arrives in its own message
            try {
                next.set(Number(entry.fid), new FixturePatch({ ...entry, type }));
            } catch (e) {
                console.warn(`[Console] cannot patch FID ${entry.fid}: ${e.message}`);
            }
        });
        this.patch = next;
    }

    // ── output loop ──────────────────────────────────────────────────────

    _restartLoop() {
        if (this._timer) clearInterval(this._timer);
        const rate = Math.max(1, Math.min(44, Number(this.settings.rate) || 30));
        this._timer = setInterval(() => this._frame(), 1000 / rate);
    }

    _frame() {
        const now = Date.now();
        // nothing moves without effects — only re-render after a message
        if (this._renderNow || this.effects.hasRunning()) {
            this._renderNow = false;
            const t0 = process.hrtime.bigint();
            this._render(now);
            this._frameMs = Number(process.hrtime.bigint() - t0) / 1e6;
            this._frames++;
        }
        if (!this.settings.enabled) return;

        this.universes.forEach((data, u) => {
            const stale = now - (this._lastSent.get(u) || 0) > 1000; // Art-Net keep-alive
            if (this._changed.has(u) || stale) {
                this._changed.delete(u);
                this._lastSent.set(u, now);
                this.artnet.send(u, data, this.settings);
            }
        });
    }

    _render(now) {
        // 1. programmer / default, per channel (kept raw so effects and invert work in function space)
        const raws = new Map(); // fixture → Map(channelKey → raw)
        this.patch.forEach(fixture => {
            const vals = this.values.get(fixture.fid);
            const m = new Map();
            fixture.channels.forEach(ch => m.set(ch.key, vals && vals.has(ch.key) ? vals.get(ch.key) : ch.default));
            raws.set(fixture, m);
        });
        const programmerRaw = (fixture, ch) => {
            const vals = this.values.get(fixture.fid);
            return vals && vals.has(ch.key) ? vals.get(ch.key) : ch.default;
        };

        // 2. effects (read programmer values so relative effects never feed back into themselves)
        this.effects.apply(this.patch, programmerRaw, (fixture, ch, raw) => raws.get(fixture).set(ch.key, raw), now);

        // 3. highlight, 4. invert, 5. bytes into universes
        const highlighted = this.highlight.on ? new Set(this.highlight.fids) : null;
        const next = new Map();
        const uni = (u) => {
            if (!next.has(u)) next.set(u, new Uint8Array(512));
            return next.get(u);
        };

        this.patch.forEach(fixture => {
            const m = raws.get(fixture);
            const hl = highlighted && highlighted.has(fixture.fid);
            fixture.channels.forEach(ch => {
                let raw = m.get(ch.key);
                if (hl && ch.highlight !== null && ch.highlight !== undefined) raw = ch.highlight;
                raw = fixture.outputRaw(ch, raw);
                const bytes = GDTFParser.splitBytes(raw, ch.bytes);
                fixture.getChannelAddresses(ch).forEach((addr, i) => {
                    if (addr.address < 1 || addr.address > 512) return;
                    uni(addr.universe)[addr.address - 1] = bytes[i];
                });
            });
        });

        // diff → which universes need sending
        const all = new Set([...this.universes.keys(), ...next.keys()]);
        all.forEach(u => {
            const before = this.universes.get(u);
            const after = next.get(u) || new Uint8Array(512);
            if (!before || before.some((v, i) => v !== after[i])) {
                this._changed.add(u);
                this._monitorDirty = true;
            }
            next.set(u, after);
        });
        this.universes = next;
    }

    // ── to the webpage ───────────────────────────────────────────────────

    /** Binary: [0x44 'D'] then per universe [u16 LE universe][512 bytes]. */
    _sendMonitor() {
        if (!this._monitorDirty || !this.clients.size) return;
        this._monitorDirty = false;
        const list = [...this.universes.entries()];
        const buf = Buffer.alloc(1 + list.length * 514);
        buf[0] = 0x44;
        list.forEach(([u, data], i) => {
            const o = 1 + i * 514;
            buf.writeUInt16LE(u, o);
            buf.set(data, o + 2);
        });
        this._broadcast(buf);
    }

    _sendStatus() {
        if (!this.clients.size) return;
        this._broadcast({
            type: 'status',
            artnet: {
                enabled: !!this.settings.enabled,
                packets: this.artnet.stats.packets,
                errors: this.artnet.stats.errors,
                lastError: this.artnet.stats.lastError,
                sourcePort: this.artnet.boundPort
            },
            fixtures: this.patch.size,
            universes: this.universes.size,
            effectsRunning: this.effects.runningCount(),
            // elapsed cycles per running effect — the phaser editor animates from this
            effectCycles: Object.fromEntries(this.effects.effects.filter(e => e.running).map(e => [e.id, this.effects.cyclesFor(e)])),
            frameMs: Math.round(this._frameMs * 100) / 100,
            remotes: this.clients.size
        });
    }
}

module.exports = ConsoleEngine;
