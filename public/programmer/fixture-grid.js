/**
 * FixtureGrid — where every fixture sits in the Effect Engine's selection grid.
 *
 * One layout per show (memory.fixtureGrid: { fid: [x, y] }). Lay it out like
 * the rig on stage: effects can then run left → right, top → bottom or from the
 * centre, and fixtures in the same column / row move together.
 *
 * Fixtures without a position are placed automatically (next free cell,
 * rows of `autoColumns`) — the grid always contains the whole patch.
 */
class FixtureGridStore {
    constructor() {
        this._listeners = [];
        this.autoColumns = 8;
    }

    _store() {
        const show = (typeof FGMShowHandler !== 'undefined' && FGMShowHandler) ? FGMShowHandler.getShowFile() : null;
        if (!show) return {};
        show.memory = show.memory || {};
        if (!show.memory.fixtureGrid || typeof show.memory.fixtureGrid !== 'object') show.memory.fixtureGrid = {};
        return show.memory.fixtureGrid;
    }

    /** { fid: { x, y } } for every patched fixture (places new ones, drops removed ones). */
    positions() {
        const store = this._store();
        const fids = PatchManager.getAllFixtures().map(f => f.fid);
        const alive = new Set(fids.map(String));
        let changed = false;
        Object.keys(store).forEach(k => { if (!alive.has(k)) { delete store[k]; changed = true; } });

        const used = new Set(Object.values(store).map(([x, y]) => `${x},${y}`));
        let cursor = 0;
        fids.forEach(fid => {
            if (store[fid]) return;
            let x, y;
            do {
                x = cursor % this.autoColumns;
                y = Math.floor(cursor / this.autoColumns);
                cursor++;
            } while (used.has(`${x},${y}`));
            store[fid] = [x, y];
            used.add(`${x},${y}`);
            changed = true;
        });
        if (changed) this._emit('grid', {});

        const out = {};
        fids.forEach(fid => { out[fid] = { x: store[fid][0], y: store[fid][1] }; });
        return out;
    }

    get(fid) {
        return this.positions()[fid] || null;
    }

    fidAt(x, y) {
        const pos = this.positions();
        const hit = Object.entries(pos).find(([, p]) => p.x === x && p.y === y);
        return hit ? Number(hit[0]) : null;
    }

    /** Move a fixture to a cell; a fixture already there swaps to the old cell. */
    move(fid, x, y) {
        x = Math.max(0, Math.round(x));
        y = Math.max(0, Math.round(y));
        const store = this._store();
        const from = store[fid];
        if (!from || (from[0] === x && from[1] === y)) return;
        const other = this.fidAt(x, y);
        if (other !== null) store[other] = [from[0], from[1]];
        store[fid] = [x, y];
        this._emit('grid', { moved: fid });
    }

    /** Move several fixtures by the same offset (keeps their shape). */
    moveGroup(fids, dx, dy) {
        if (!dx && !dy) return;
        const store = this._store();
        const set = new Set(fids.map(Number));
        const moving = fids.filter(fid => store[fid]).map(fid => ({ fid, x: store[fid][0] + dx, y: store[fid][1] + dy }));
        if (moving.some(m => m.x < 0 || m.y < 0)) return;
        const targets = new Set(moving.map(m => `${m.x},${m.y}`));
        // fixtures in the way go to the cells that become free
        const freed = fids.filter(fid => store[fid]).map(fid => store[fid]).filter(([x, y]) => !targets.has(`${x},${y}`));
        Object.entries(store).forEach(([fid, [x, y]]) => {
            if (set.has(Number(fid)) || !targets.has(`${x},${y}`)) return;
            const cell = freed.shift();
            if (cell) store[fid] = [cell[0], cell[1]];
        });
        moving.forEach(m => { store[m.fid] = [m.x, m.y]; });
        this._emit('grid', { moved: fids });
    }

    /** Re-place everything in patch order, `columns` per row. */
    arrange(columns = this.autoColumns) {
        const store = this._store();
        Object.keys(store).forEach(k => delete store[k]);
        this.autoColumns = Math.max(1, columns);
        this.positions();
        this._emit('grid', { arranged: true });
    }

    bounds() {
        const list = Object.values(this.positions());
        if (!list.length) return { maxX: 0, maxY: 0 };
        return { maxX: Math.max(...list.map(p => p.x)), maxY: Math.max(...list.map(p => p.y)) };
    }

    // ── phase order from the grid ────────────────────────────────────────

    static get DIRECTIONS() {
        return [
            { key: 'right', label: '→  Left to right' },
            { key: 'left', label: '←  Right to left' },
            { key: 'down', label: '↓  Top to bottom' },
            { key: 'up', label: '↑  Bottom to top' },
            { key: 'out', label: '◎  From the centre out' },
            { key: 'in', label: '◉  From outside in' },
            { key: 'selection', label: '1 2 3  Selection order' }
        ];
    }

    static directionIcon(key) {
        return { right: '→', left: '←', down: '↓', up: '↑', out: '◎', in: '◉', selection: '123' }[key] || '→';
    }

    /**
     * Phase order for `fids` in a direction: { fids (sorted), slots }.
     * Fixtures on the same column (→ ←) / row (↓ ↑) / ring (◎ ◉) share a slot.
     */
    order(fids, direction) {
        if (direction === 'selection' || !direction) return { fids: [...fids], slots: null };
        const pos = this.positions();
        const list = fids.filter(fid => pos[fid]).map(fid => ({ fid, ...pos[fid] }));
        if (!list.length) return { fids: [...fids], slots: null };

        const cx = (Math.min(...list.map(p => p.x)) + Math.max(...list.map(p => p.x))) / 2;
        const cy = (Math.min(...list.map(p => p.y)) + Math.max(...list.map(p => p.y))) / 2;
        const key = (p) => {
            switch (direction) {
                case 'left': return -p.x;
                case 'down': return p.y;
                case 'up': return -p.y;
                case 'out': return Math.round(Math.hypot(p.x - cx, p.y - cy) * 2) / 2;
                case 'in': return -Math.round(Math.hypot(p.x - cx, p.y - cy) * 2) / 2;
                case 'right':
                default: return p.x;
            }
        };
        const tie = (p) => (direction === 'down' || direction === 'up') ? p.x : p.y;
        list.sort((a, b) => (key(a) - key(b)) || (tie(a) - tie(b)));
        const ranks = [...new Set(list.map(key))];
        return { fids: list.map(p => p.fid), slots: list.map(p => ranks.indexOf(key(p))) };
    }

    // ── events ───────────────────────────────────────────────────────────

    on(callback) {
        this._listeners.push(callback);
        return () => { this._listeners = this._listeners.filter(l => l !== callback); };
    }

    _emit(event, data) {
        this._listeners.forEach(cb => {
            try { cb(event, data); } catch (e) { console.error('FixtureGrid listener error:', e); }
        });
    }
}

const FixtureGrid = new FixtureGridStore();
globalThis.FixtureGrid = FixtureGrid;
globalThis.FixtureGridStore = FixtureGridStore;
