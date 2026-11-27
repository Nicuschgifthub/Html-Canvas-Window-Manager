/**
 * ConsoleLink — the webpage's connection to the console server (ws://<host>/ws).
 *
 * The webpage is a remote: selection, programmer values, presets, patching all
 * happen here. Whatever affects the output is mirrored to the server, which
 * renders effects and sends Art-Net. Nothing is sent per frame — only changes.
 *
 * webpage → server (JSON)
 *   { type: 'types',     full, types: { key: model } }   fixture library
 *   { type: 'patch',     patch: [...] }                  PatchManager.toJSON()
 *   { type: 'values',    full?, set: [[fid, channelKey, raw]], del: [[fid, channelKey]] }
 *   { type: 'highlight', on, fids }
 *   { type: 'settings',  artnet: {...} }
 *   { type: 'effects',   effects: [...] }                always the full list
 *
 * server → webpage
 *   { type: 'hello' }  { type: 'status', ... }
 *   binary 'D' frame   rendered universes (incl. effects) for the DMX monitor
 *
 * On every (re)connect the whole state is pushed again, so a restarted server
 * or a page reload never leaves them out of sync. The last remote that
 * connected / changed something wins.
 */
class ConsoleLinkClient {
    constructor() {
        this.ws = null;
        this.connected = false;
        this._retryMs = 1000;
        this._retryTimer = null;
        this._listeners = [];

        this._pending = new Set();     // 'types' | 'patch' | 'values' | 'highlight'
        this._flushQueued = false;
        this._sentValues = new Map();  // "fid\tchannelKey" → raw, as the server has it
        this._started = false;
    }

    get url() {
        const proto = location.protocol === 'https:' ? 'wss' : 'ws';
        return `${proto}://${location.host}/ws`;
    }

    // ── connection ───────────────────────────────────────────────────────

    start() {
        if (this._started) return;
        this._started = true;
        this._watchState();
        this.connect();
    }

    connect() {
        clearTimeout(this._retryTimer);
        let ws;
        try {
            ws = new WebSocket(this.url);
        } catch (e) {
            this._scheduleRetry();
            return;
        }
        ws.binaryType = 'arraybuffer';
        this.ws = ws;

        ws.onopen = () => {
            this.connected = true;
            this._retryMs = 1000;
            console.log('%c Console server connected ', 'background:#00ff95;color:#000');
            this.pushAll();
            this._emit('connection', { connected: true });
        };
        ws.onclose = () => {
            if (this.ws !== ws) return;
            const was = this.connected;
            this.connected = false;
            this.ws = null;
            if (was) {
                console.warn('Console server disconnected — retrying');
                this._emit('connection', { connected: false });
            }
            this._scheduleRetry();
        };
        ws.onerror = () => { /* onclose follows */ };
        ws.onmessage = (e) => this._receive(e.data);
    }

    _scheduleRetry() {
        clearTimeout(this._retryTimer);
        this._retryTimer = setTimeout(() => this.connect(), this._retryMs);
        this._retryMs = Math.min(5000, this._retryMs * 1.5);
    }

    send(msg) {
        if (!this.connected || !this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
        this.ws.send(JSON.stringify(msg));
        return true;
    }

    _receive(data) {
        if (data instanceof ArrayBuffer) {
            const view = new Uint8Array(data);
            if (view[0] === 0x44 && typeof DMXOutput !== 'undefined') DMXOutput._onFrame(data);
            return;
        }
        let msg;
        try { msg = JSON.parse(data); } catch (e) { return; }
        if (msg.type === 'status' && typeof DMXOutput !== 'undefined') DMXOutput._onStatus(msg);
        this._emit('message', msg);
    }

    // ── state mirroring ──────────────────────────────────────────────────

    _watchState() {
        PatchManager.on((event) => {
            if (event === 'typesChanged') this._queue('types');
            if (event === 'patchChanged') { this._queue('patch'); this._queue('values'); this._queue('highlight'); }
        });
        Programmer.on((event) => {
            if (event === 'values') this._queue('values');
            if (event === 'selection' || event === 'highlight') this._queue('highlight');
        });
    }

    _queue(what) {
        this._pending.add(what);
        if (this._flushQueued) return;
        this._flushQueued = true;
        // one message per kind per task — an encoder turn of 30 events sends one diff
        Promise.resolve().then(() => this._flush());
    }

    _flush() {
        this._flushQueued = false;
        const pending = this._pending;
        this._pending = new Set();
        if (!this.connected) return; // pushAll() on connect sends everything
        if (pending.has('types')) this._sendTypes();
        if (pending.has('patch')) this._sendPatch();
        if (pending.has('values')) this._sendValues(false);
        if (pending.has('highlight')) this._sendHighlight();
    }

    /** Everything, from scratch — on connect and after loading a show. */
    pushAll() {
        if (!this.connected) return;
        this._sendTypes();
        this._sendPatch();
        this._sendValues(true);
        this._sendHighlight();
        if (typeof DMXOutput !== 'undefined') this.send({ type: 'settings', artnet: DMXOutput.getSettings() });
        if (typeof Effects !== 'undefined') Effects.push();
    }

    _sendTypes() {
        const types = {};
        PatchManager.getTypes().forEach(({ key, type }) => { types[key] = type; });
        this.send({ type: 'types', full: true, types });
    }

    _sendPatch() {
        this.send({ type: 'patch', patch: PatchManager.toJSON() });
    }

    _currentValues() {
        const now = new Map();
        Programmer._values.forEach((map, fid) => {
            map.forEach((entry, key) => now.set(`${fid}\t${key}`, entry.raw));
        });
        return now;
    }

    _sendValues(full) {
        const now = this._currentValues();
        const set = [];
        const del = [];
        now.forEach((raw, k) => {
            if (full || this._sentValues.get(k) !== raw) {
                const [fid, key] = k.split('\t');
                set.push([Number(fid), key, raw]);
            }
        });
        if (!full) {
            this._sentValues.forEach((_, k) => {
                if (!now.has(k)) {
                    const [fid, key] = k.split('\t');
                    del.push([Number(fid), key]);
                }
            });
        }
        if (!full && !set.length && !del.length) return;
        if (this.send({ type: 'values', full, set, del })) this._sentValues = now;
    }

    _sendHighlight() {
        this.send({ type: 'highlight', on: !!Programmer.highlight, fids: [...Programmer.selection] });
    }

    // ── events ───────────────────────────────────────────────────────────

    on(callback) {
        this._listeners.push(callback);
        return () => { this._listeners = this._listeners.filter(l => l !== callback); };
    }

    _emit(event, data) {
        this._listeners.forEach(cb => {
            try { cb(event, data); } catch (e) { console.error('ConsoleLink listener error:', e); }
        });
    }
}

const ConsoleLink = new ConsoleLinkClient();
globalThis.ConsoleLink = ConsoleLink;
