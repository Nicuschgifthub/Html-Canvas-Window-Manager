/**
 * EffectCurve — the shape of one effect cycle. Shared by the console server
 * (evaluates it every frame) and the webpage (draws it in the phaser editor),
 * so what you see is exactly what is output.
 *
 * A curve is either a built-in wave ('sine', 'triangle', 'ramp', 'saw',
 * 'square', 'random') or wave 'custom' with points:
 *
 *   points: [{ pos: 0..1, value: 0..1, curve: 'smooth' | 'linear' | 'step' | 'in' | 'out' }]
 *
 * `curve` is the transition from that point to the next one; the last point
 * runs into the first point of the next cycle. Values are 0..1 of the
 * effect's range (low…high, or ±size around the programmed value).
 */
class EffectCurve {

    static get WAVES() {
        return ['sine', 'triangle', 'ramp', 'saw', 'square', 'random', 'custom'];
    }

    static get TRANSITIONS() {
        return ['smooth', 'linear', 'step', 'in', 'out'];
    }

    static get MIN_GAP() {
        return 1 / 192;
    }

    // ── built-in waves ───────────────────────────────────────────────────

    /** 0..1 → 0..1 */
    static wave(type, p, duty = 0.5, seed = 0) {
        p = p - Math.floor(p);
        switch (type) {
            case 'triangle': return p < 0.5 ? p * 2 : 2 - p * 2;
            case 'ramp': return p;
            case 'saw': return 1 - p;
            case 'square': return p < duty ? 1 : 0;
            case 'random': return EffectCurve.hash(seed);
            case 'sine':
            default: return 0.5 - 0.5 * Math.cos(2 * Math.PI * p); // starts at low
        }
    }

    static hash(n) {
        // small deterministic hash → 0..1 (same value for a whole cycle)
        let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b);
        x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
        return (x >>> 0) / 4294967295;
    }

    /** Position of fixture `index` of `count` in the phase order, 0..1, respecting wings. */
    static order(index, count, wings = 1) {
        if (count <= 1) return 0;
        if (wings <= 1) return index / count;
        const size = Math.ceil(count / wings);
        const wing = Math.floor(index / size);
        let pos = index % size;
        if (wing % 2 === 1) pos = size - 1 - pos;
        return size <= 1 ? 0 : pos / size;
    }

    /**
     * Phase slot of every fixture. `effect.slots` (same length as fids) lets
     * several fixtures share a phase — e.g. one grid column. Without it every
     * fixture has its own slot in fids order.
     */
    static slotOf(effect, index) {
        const s = effect.slots;
        return Array.isArray(s) && s.length === (effect.fids || []).length ? (Number(s[index]) || 0) : index;
    }

    static slotCount(effect) {
        const s = effect.slots;
        const n = (effect.fids || []).length;
        if (!Array.isArray(s) || s.length !== n || !n) return n;
        return Math.max(...s.map(v => Number(v) || 0)) + 1;
    }

    /** Phase of fixture `index` at `cycles` (cycles = elapsed time × speed). */
    static phaseOf(effect, index, cycles) {
        const offset = EffectCurve.order(EffectCurve.slotOf(effect, index), EffectCurve.slotCount(effect), effect.wings || 1) * (effect.spread ?? 1);
        return cycles + (effect.phase || 0) - offset;
    }

    // ── custom points ────────────────────────────────────────────────────

    static ease(curve, t) {
        switch (curve) {
            case 'linear': return t;
            case 'step': return 0;
            case 'in': return t * t;
            case 'out': return 1 - (1 - t) * (1 - t);
            case 'smooth':
            default: return 0.5 - 0.5 * Math.cos(Math.PI * t);
        }
    }

    /** Sorted, clamped copy; at least one point. */
    static normalisePoints(points) {
        const list = (Array.isArray(points) ? points : [])
            .map(p => ({
                pos: Math.min(1 - EffectCurve.MIN_GAP, Math.max(0, Number(p.pos) || 0)),
                value: Math.min(1, Math.max(0, Number(p.value) || 0)),
                curve: EffectCurve.TRANSITIONS.includes(p.curve) ? p.curve : 'smooth'
            }))
            .sort((a, b) => a.pos - b.pos);
        return list.length ? list : [{ pos: 0, value: 0, curve: 'smooth' }];
    }

    /** Value of a (normalised, sorted) point list at phase p. */
    static evalPoints(points, p) {
        const n = points.length;
        if (n === 1) return points[0].value;
        p = p - Math.floor(p);

        // segment start: last point at or before p (or the last point, wrapped from the previous cycle)
        let i = n - 1;
        for (let k = 0; k < n; k++) {
            if (points[k].pos <= p) i = k; else break;
        }
        const a = points[i];
        const b = points[(i + 1) % n];
        const wrapped = a.pos > p;                     // p is before the first point
        const aPos = wrapped ? a.pos - 1 : a.pos;
        const bPos = (wrapped || i + 1 < n) ? b.pos : b.pos + 1;
        const span = bPos - aPos;
        const t = span > 0 ? (p - aPos) / span : 0;
        return a.value + (b.value - a.value) * EffectCurve.ease(a.curve, Math.min(1, Math.max(0, t)));
    }

    /**
     * Value of an effect's curve at phase p.
     * effect: { wave, points?, duty }, count = fixtures (chase duty), seed for random.
     */
    static value(effect, p, count = 1, seed = 0) {
        if (effect.wave === 'custom' && Array.isArray(effect.points) && effect.points.length) {
            return EffectCurve.evalPoints(effect.points, p);
        }
        const duty = effect.duty > 0 ? effect.duty : 1 / Math.max(1, count);
        return EffectCurve.wave(effect.wave, p, duty, seed);
    }

    /** Value for fixture `index` at `cycles` — what the server outputs (before range / size). */
    static valueAt(effect, index, cycles) {
        const p = EffectCurve.phaseOf(effect, index, cycles);
        const seed = Math.floor(p) * 7919 + EffectCurve.slotOf(effect, index) * 104729 + String(effect.id || '').length;
        return EffectCurve.value(effect, p, EffectCurve.slotCount(effect), seed);
    }

    // ── templates ────────────────────────────────────────────────────────

    /** Point templates for the phaser editor. build(count) → points. */
    static get TEMPLATES() {
        const P = (pos, value, curve) => ({ pos, value, curve });
        return [
            { key: 'sine', label: 'Sine', build: () => [P(0, 0, 'smooth'), P(0.5, 1, 'smooth')] },
            { key: 'triangle', label: 'Triangle', build: () => [P(0, 0, 'linear'), P(0.5, 1, 'linear')] },
            { key: 'ramp', label: 'Ramp up', build: () => [P(0, 0, 'linear'), P(1 - 1 / 48, 1, 'step')] },
            { key: 'saw', label: 'Ramp down', build: () => [P(0, 1, 'linear'), P(1 - 1 / 48, 0, 'step')] },
            { key: 'square', label: 'Square 50%', build: () => [P(0, 1, 'step'), P(0.5, 0, 'step')] },
            { key: 'pulse', label: 'Pulse 25%', build: () => [P(0, 1, 'step'), P(0.25, 0, 'step')] },
            { key: 'chase', label: 'Chase (1 / fixtures)', build: (n) => [P(0, 1, 'step'), P(1 / Math.max(2, n), 0, 'step')] },
            { key: 'swell', label: 'Swell (in, snap off)', build: () => [P(0, 0, 'in'), P(0.75, 1, 'out'), P(0.875, 0, 'step')] },
            { key: 'double', label: 'Double', build: () => [P(0, 0, 'smooth'), P(0.25, 1, 'smooth'), P(0.5, 0, 'smooth'), P(0.75, 1, 'smooth')] },
            { key: 'steps4', label: '4 Steps', build: () => [P(0, 0, 'step'), P(0.25, 1 / 3, 'step'), P(0.5, 2 / 3, 'step'), P(0.75, 1, 'step')] },
            { key: 'steps8', label: '8 Steps (stairs up/down)', build: () => [0, 1, 2, 3, 4, 3, 2, 1].map((v, i) => P(i / 8, v / 4, 'step')) }
        ];
    }

    /** Points that reproduce a built-in wave (so editing starts from what is running). */
    static pointsForWave(effect, count = 1) {
        if (effect.wave === 'custom' && Array.isArray(effect.points) && effect.points.length) {
            return EffectCurve.normalisePoints(effect.points);
        }
        const t = (key) => EffectCurve.TEMPLATES.find(x => x.key === key).build(count);
        switch (effect.wave) {
            case 'triangle': return t('triangle');
            case 'ramp': return t('ramp');
            case 'saw': return t('saw');
            case 'square': {
                const duty = effect.duty > 0 ? effect.duty : 1 / Math.max(1, count);
                return [{ pos: 0, value: 1, curve: 'step' }, { pos: Math.min(1 - EffectCurve.MIN_GAP, duty), value: 0, curve: 'step' }];
            }
            case 'random': return t('steps4');
            case 'sine':
            default: return t('sine');
        }
    }
}

globalThis.EffectCurve = EffectCurve;
if (typeof module !== 'undefined') module.exports = EffectCurve;
