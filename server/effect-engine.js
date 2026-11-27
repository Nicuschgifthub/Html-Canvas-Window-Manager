/**
 * EffectEngine — the effect layer of the server's output loop.
 *
 * An effect is plain data (built and edited on the webpage, stored in the show
 * file under memory.effects, evaluated here every frame):
 *
 *   {
 *     id, name,
 *     attribute: 'Dimmer',            GDTF attribute it moves
 *     fids: [101, 102, …],            fixtures in phase order
 *     slots: [0, 0, 1, 1, …],         optional phase slot per fixture (same slot = same phase, e.g. a grid column)
 *     wave: 'sine' | 'triangle' | 'ramp' | 'saw' | 'square' | 'random' | 'custom',
 *     points: [{ pos, value, curve }]  only for 'custom' — the phaser curve (see EffectCurve)
 *     mode: 'absolute' | 'relative',
 *       absolute: output moves between low and high (0..1 inside the channel function)
 *       relative: output = programmer/default value ± size/2  (e.g. a circle around a position)
 *     low, high, size,                0..1
 *     bpm,                            cycles per minute
 *     rate,                           multiplier on bpm for this effect (figure 8: Tilt at 2)
 *     phase,                          0..1 start offset (0.25 = 90° — Tilt of a circle)
 *     spread,                         0..1 of a cycle spread over the fixtures (1 = evenly, 0 = all together)
 *     duty,                           0..1 on-time for square (0 = 1 / fixture count → a chase)
 *     wings,                          ≥1 — mirror the phase order in N parts (1 = off)
 *     running
 *   }
 *
 * Phase is computed from the wall clock, never by counting frames — a late
 * frame never changes the speed:
 *
 *   phase = (now - startedAt) * bpm / 60000 + phase + spreadOffset(fixture)
 */
const EffectCurve = require('../public/programmer/effect-curve.js');

class EffectEngine {

    static get WAVES() {
        return EffectCurve.WAVES;
    }

    constructor() {
        this.effects = [];
        this._startedAt = new Map(); // id → ms, kept while an effect stays running
    }

    /** Replace the whole effect list (the webpage always sends all of them). */
    setEffects(list, now = Date.now()) {
        const effects = Array.isArray(list) ? list.map(EffectEngine.normalise) : [];
        const running = new Set();
        effects.forEach(e => {
            if (!e.running) return;
            running.add(e.id);
            if (!this._startedAt.has(e.id)) this._startedAt.set(e.id, now);
        });
        [...this._startedAt.keys()].forEach(id => { if (!running.has(id)) this._startedAt.delete(id); });
        this.effects = effects;
    }

    static normalise(e) {
        const num = (v, d, min = -Infinity, max = Infinity) => {
            const n = Number(v);
            return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
        };
        return {
            id: String(e.id),
            name: String(e.name || ''),
            attribute: String(e.attribute || 'Dimmer'),
            fids: Array.isArray(e.fids) ? e.fids.map(Number).filter(Number.isFinite) : [],
            slots: Array.isArray(e.slots) && Array.isArray(e.fids) && e.slots.length === e.fids.length
                ? e.slots.map(v => Math.max(0, Math.round(Number(v) || 0))) : null,
            wave: EffectCurve.WAVES.includes(e.wave) ? e.wave : 'sine',
            points: e.wave === 'custom' ? EffectCurve.normalisePoints(e.points) : null,
            mode: e.mode === 'relative' ? 'relative' : 'absolute',
            low: num(e.low, 0, 0, 1),
            high: num(e.high, 1, 0, 1),
            size: num(e.size, 0.2, 0, 1),
            bpm: num(e.bpm, 60, 0, 6000),
            rate: num(e.rate, 1, 0, 64),
            phase: num(e.phase, 0),
            spread: num(e.spread, 1, 0, 1),
            duty: num(e.duty, 0.5, 0, 1),
            wings: Math.round(num(e.wings, 1, 1, 64)),
            running: !!e.running
        };
    }

    hasRunning() {
        return this.effects.some(e => e.running && e.fids.length);
    }

    runningCount() {
        return this.effects.filter(e => e.running).length;
    }

    // ── maths ────────────────────────────────────────────────────────────

    static order(index, count, wings = 1) {
        return EffectCurve.order(index, count, wings);
    }

    /** Elapsed cycles of a running effect (the webpage animates its editor from this). */
    cyclesFor(effect, now = Date.now()) {
        const started = this._startedAt.get(effect.id) ?? now;
        return (now - started) * effect.bpm * effect.rate / 60000;
    }

    /** Wave value 0..1 of an effect for one fixture at `now`. */
    valueFor(effect, index, now) {
        return EffectCurve.valueAt(effect, index, this.cyclesFor(effect, now));
    }

    /**
     * Apply every running effect onto the rendered values.
     *
     * @param patchByFid   Map fid → FixturePatch
     * @param readRaw      (fixture, channel) → raw value before effects
     * @param writeRaw     (fixture, channel, raw) → store the value after effects
     */
    apply(patchByFid, readRaw, writeRaw, now = Date.now()) {
        const FixturePatch = globalThis.FixturePatch;
        this.effects.forEach(effect => {
            if (!effect.running) return;
            effect.fids.forEach((fid, index) => {
                const fixture = patchByFid.get(fid);
                if (!fixture || !fixture.hasAttribute(effect.attribute)) return;
                const w = this.valueFor(effect, index, now);
                const read = (ch) => readRaw(fixture, ch);

                fixture.getChannelsForAttribute(effect.attribute).forEach(channel => {
                    const fn = fixture.pickFunction(channel, effect.attribute, read);
                    if (!fn || fn.attribute !== effect.attribute) return;

                    let norm;
                    if (effect.mode === 'relative') {
                        const raw = read(channel);
                        const base = (raw >= fn.dmxFrom && raw <= fn.dmxTo) ? FixturePatch.rawToNorm(fn, raw) : 0;
                        norm = base + (w - 0.5) * effect.size;
                    } else {
                        norm = effect.low + (effect.high - effect.low) * w;
                    }
                    writeRaw(fixture, channel, FixturePatch.normToRaw(fn, norm));
                });
            });
        });
    }
}

module.exports = EffectEngine;
