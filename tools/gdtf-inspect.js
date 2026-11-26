#!/usr/bin/env node
/**
 * GDTF inspector — runs the same deconstructor the browser uses against .gdtf files.
 *
 *   node tools/gdtf-inspect.js                       # summary of every file in ./gdtf
 *   node tools/gdtf-inspect.js gdtf/foo.gdtf         # summary of one file
 *   node tools/gdtf-inspect.js gdtf/foo.gdtf --mode "Std" --sets   # channel detail
 *   node tools/gdtf-inspect.js --check               # sanity checks, exit 1 on problems
 *   node tools/gdtf-inspect.js gdtf/foo.gdtf --json  # dump the parsed model
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

require('../public/fixture/gdtf-xml.js');
const GDTFParser = require('../public/fixture/gdtf-parser.js');

// ── minimal zip reader (central directory + deflate) ────────────────────────
function readZipEntry(buf, wanted) {
    let eocd = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
        if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd === -1) throw new Error('not a zip file');
    const count = buf.readUInt16LE(eocd + 10);
    let p = buf.readUInt32LE(eocd + 16);
    for (let n = 0; n < count; n++) {
        const method = buf.readUInt16LE(p + 10);
        const compSize = buf.readUInt32LE(p + 20);
        const nameLen = buf.readUInt16LE(p + 28);
        const extraLen = buf.readUInt16LE(p + 30);
        const commentLen = buf.readUInt16LE(p + 32);
        const localOffset = buf.readUInt32LE(p + 42);
        const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
        if (name === wanted) {
            const lNameLen = buf.readUInt16LE(localOffset + 26);
            const lExtraLen = buf.readUInt16LE(localOffset + 28);
            const start = localOffset + 30 + lNameLen + lExtraLen;
            const data = buf.subarray(start, start + compSize);
            return method === 0 ? data : zlib.inflateRawSync(data);
        }
        p += 46 + nameLen + extraLen + commentLen;
    }
    return null;
}

function loadType(file) {
    const xml = readZipEntry(fs.readFileSync(file), 'description.xml');
    if (!xml) throw new Error('no description.xml');
    return GDTFParser.parseDescription(xml.toString('utf8'));
}

// ── checks ─────────────────────────────────────────────────────────────────
function check(type) {
    const problems = [...type.warnings];
    type.modes.forEach(mode => {
        const used = {};
        mode.channels.forEach(ch => {
            const max = GDTFParser.maxValue(ch.bytes);
            ch.offsets.forEach(o => {
                const k = `${ch.dmxBreak}:${o}`;
                if (used[k]) problems.push(`[${mode.name}] offset ${k} used by ${used[k]} and ${ch.key}`);
                used[k] = ch.key;
            });
            if (ch.default < 0 || ch.default > max) problems.push(`[${mode.name}] ${ch.key} default ${ch.default} out of range`);
            ch.functions.forEach(f => {
                if (f.dmxFrom > f.dmxTo) problems.push(`[${mode.name}] ${ch.key} fn "${f.name}" from>to ${f.dmxFrom}>${f.dmxTo}`);
                if (f.dmxTo > max) problems.push(`[${mode.name}] ${ch.key} fn "${f.name}" to ${f.dmxTo} > ${max}`);
                if (f.wheel && !type.wheels[f.wheel]) problems.push(`[${mode.name}] ${ch.key} fn "${f.name}" unknown wheel "${f.wheel}"`);
                f.sets.forEach(s => {
                    if (s.dmxFrom < f.dmxFrom || s.dmxTo > f.dmxTo) problems.push(`[${mode.name}] ${ch.key} set "${s.name}" ${s.dmxFrom}-${s.dmxTo} outside fn ${f.dmxFrom}-${f.dmxTo}`);
                });
                if (!type.attributes[f.attribute] && f.attribute !== 'NoFeature') problems.push(`[${mode.name}] ${ch.key} unknown attribute "${f.attribute}"`);
            });
        });
    });
    return problems;
}

// ── output ─────────────────────────────────────────────────────────────────
function summary(file, type) {
    console.log(`\n■ ${type.manufacturer} — ${type.name}  (${path.basename(file)}, GDTF ${type.gdtfVersion})`);
    console.log(`  attributes: ${Object.keys(type.attributes).length}  wheels: ${Object.keys(type.wheels).map(w => `${w}(${type.wheels[w].slots.length})`).join(', ') || '-'}  emitters: ${Object.keys(type.emitters).length}`);
    type.modes.forEach(m => {
        const fnCount = m.channels.reduce((n, c) => n + c.functions.length, 0);
        const b16 = m.channels.filter(c => c.bytes > 1).length;
        console.log(`  mode "${m.name}": ${m.footprint} ch, ${m.channels.length} params (${b16} 16-bit), ${fnCount} functions${m.instances ? `, ${m.instances} instances` : ''}${Object.keys(m.breaks).length > 1 ? `, breaks ${JSON.stringify(m.breaks)}` : ''}`);
    });
}

function detail(type, modeName, showSets) {
    const mode = type.modes.find(m => m.name === modeName) || type.modes[0];
    console.log(`\n  ── mode "${mode.name}" ──`);
    mode.channels.forEach(ch => {
        console.log(`  ${String(ch.offsets.join(',')).padEnd(7)} ${ch.key.padEnd(34)} ${ch.bytes * 8}bit default=${ch.default}${ch.highlight !== null ? ` highlight=${ch.highlight}` : ''}`);
        ch.functions.forEach(f => {
            console.log(`            · ${f.attribute.padEnd(22)} ${String(f.dmxFrom).padStart(5)}-${String(f.dmxTo).padEnd(5)} "${f.name}" phys ${f.physicalFrom}..${f.physicalTo}${f.wheel ? ` wheel="${f.wheel}"` : ''}`);
            if (showSets) f.sets.forEach(s => {
                const slot = s.wheelSlotIndex && f.wheel ? type.wheels[f.wheel]?.slots[s.wheelSlotIndex - 1] : null;
                console.log(`                ${String(s.dmxFrom).padStart(5)}-${String(s.dmxTo).padEnd(5)} ${s.name || '(unnamed)'}${slot ? `  → slot ${slot.index} ${slot.name} ${slot.hex || ''} ${slot.mediaFileName || ''}` : ''}`);
            });
        });
    });
}

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : null; };
const modeArg = opt('--mode');
let files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--mode');
if (files.length === 0) {
    const dir = path.join(__dirname, '..', 'gdtf');
    files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.gdtf')).map(f => path.join(dir, f));
}

let failed = false;
files.forEach(file => {
    try {
        const t0 = Date.now();
        const type = loadType(file);
        const ms = Date.now() - t0;
        if (flag('--json')) { console.log(JSON.stringify(type, null, 2)); return; }
        summary(file, type);
        console.log(`  parsed in ${ms} ms`);
        if (modeArg !== null || flag('--sets') || flag('--detail')) detail(type, modeArg, flag('--sets'));
        if (flag('--check')) {
            const problems = check(type);
            if (problems.length) { failed = true; problems.slice(0, 30).forEach(p => console.log(`  ✗ ${p}`)); if (problems.length > 30) console.log(`  … ${problems.length - 30} more`); }
            else console.log('  ✓ checks passed');
        }
    } catch (e) {
        failed = true;
        console.log(`\n✗ ${path.basename(file)}: ${e.message}`);
    }
});
process.exit(failed ? 1 : 0);
