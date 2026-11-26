/**
 * Fixture type inspector — browse what the GDTF deconstructor made of a file:
 *
 *   types → modes → channels → channel functions + channel sets
 *
 * Tapping the background goes back one level. Useful to check whether a
 * fixture file is supported correctly before patching it.
 */
class FGMLibraryPanel {

    static async open() {
        while (true) {
            const types = PatchManager.getTypes();
            const files = await FixtureLibrary.listServerFiles();
            const notLoaded = files.filter(f => !FixtureLibrary.loadedKeyForFile(f.name));

            const { window } = FGMModal.openTable({
                title: `Fixture Types — ${types.length} in show, ${notLoaded.length} more in ./gdtf`,
                headers: ['Manufacturer', 'Fixture', 'Modes', 'GDTF', 'Patched'],
                rows: types.map(({ key, type }) => [
                    type.manufacturer,
                    type.name,
                    String(type.modes.length),
                    type.gdtfVersion + (type.warnings.length ? ` ⚠${type.warnings.length}` : ''),
                    String(PatchManager.getAllFixtures().filter(f => f.typeKey === key).length)
                ]),
                addLabel: '+ Import GDTF',
                removable: true
            });

            const action = await FGMModal.nextTableAction();
            if (action.type === 'close') { FGMModal.close(window); return; }

            try {
                if (action.type === 'add') {
                    const file = await FGMModal.choose({
                        title: 'Import from ./gdtf  (or drop a .gdtf file on the window)',
                        options: notLoaded.map(f => ({ label: FixtureLibrary.prettyFileName(f.name), value: f.name }))
                    });
                    if (file) await FixtureLibrary.importServerFile(file);
                } else if (action.type === 'delete') {
                    const t = types[action.rowIndex];
                    if (t && !PatchManager.removeType(t.key)) {
                        console.warn(`Fixture type ${t.key} is patched — unpatch it first`);
                    }
                } else if (action.type === 'cell') {
                    const t = types[action.rowIndex];
                    if (t) await this.openType(t.key);
                }
            } catch (e) {
                console.error('Fixture library:', e);
            }
        }
    }

    /** Modes of one type. Returns when the user goes back. */
    static async openType(typeKey) {
        const type = PatchManager.getType(typeKey);
        if (!type) return;

        while (true) {
            const { window } = FGMModal.openTable({
                title: `${type.manufacturer} ${type.name} — modes`,
                headers: ['Mode', 'Footprint', 'Parameters', '16 bit', 'Functions'],
                rows: type.modes.map(m => [
                    m.name,
                    `${m.footprint} ch` + (Object.keys(m.breaks).length > 1 ? ` / ${Object.keys(m.breaks).length} breaks` : ''),
                    String(m.channels.length) + (m.instances ? ` (${m.instances}×)` : ''),
                    String(m.channels.filter(c => c.bytes > 1).length),
                    String(m.channels.reduce((n, c) => n + c.functions.length, 0))
                ])
            });

            const action = await FGMModal.nextTableAction();
            if (action.type === 'close') { HCWDB.removeWindowByWindowId(window.getId()); return; }
            if (action.type === 'cell') {
                const mode = type.modes[action.rowIndex];
                if (mode) await this.openMode(type, mode);
            }
        }
    }

    static async openMode(type, mode) {
        while (true) {
            const { window } = FGMModal.openTable({
                title: `${type.name} — ${mode.name}`,
                headers: ['DMX', 'Geometry', 'Attribute', 'Res', 'Default', 'Functions'],
                rows: mode.channels.map(ch => [
                    (ch.dmxBreak > 1 ? `B${ch.dmxBreak}:` : '') + ch.offsets.join(','),
                    ch.geometry || '',
                    this._pretty(type, ch.attribute),
                    `${ch.bytes * 8}`,
                    String(ch.default),
                    ch.functions.length > 1 ? `${ch.functions.length} functions` : ch.functions[0].name
                ])
            });

            const action = await FGMModal.nextTableAction();
            if (action.type === 'close') { HCWDB.removeWindowByWindowId(window.getId()); return; }
            if (action.type === 'cell') {
                const ch = mode.channels[action.rowIndex];
                if (ch) await this.openChannel(type, mode, ch);
            }
        }
    }

    static async openChannel(type, mode, ch) {
        // one row per function, followed by its named sets
        const rows = [];
        ch.functions.forEach(fn => {
            const unit = type.attributes[fn.attribute]?.physicalUnit;
            rows.push([
                `${fn.dmxFrom}-${fn.dmxTo}`,
                `${this._pretty(type, fn.attribute)} · ${fn.name}`,
                `${this._num(fn.physicalFrom)} … ${this._num(fn.physicalTo)}${unit && unit !== 'None' ? ' ' + unit : ''}`,
                fn.wheel ? `wheel ${fn.wheel}` : (fn.modeMaster ? `if ${fn.modeMaster} ${fn.modeFrom}-${fn.modeTo}` : '')
            ]);
            fn.sets.filter(s => s.name).forEach(s => {
                const slot = fn.wheel && s.wheelSlotIndex ? type.wheels[fn.wheel]?.slots[s.wheelSlotIndex - 1] : null;
                rows.push([
                    `   ${s.dmxFrom}-${s.dmxTo}`,
                    `   ↳ ${s.name}`,
                    s.physicalFrom !== null ? `${this._num(s.physicalFrom)} … ${this._num(s.physicalTo)}` : '',
                    slot ? `slot ${slot.index} ${slot.name}${slot.hex ? ' ' + slot.hex : ''}` : ''
                ]);
            });
        });

        const { window } = FGMModal.openTable({
            title: `${mode.name} · ${ch.name} — ${ch.bytes * 8} bit, default ${ch.default}${ch.highlight !== null ? `, highlight ${ch.highlight}` : ''}`,
            headers: ['DMX', 'Function / Set', 'Physical', 'Info'],
            rows
        });

        while (true) {
            const action = await FGMModal.nextTableAction();
            if (action.type === 'close') { HCWDB.removeWindowByWindowId(window.getId()); return; }
        }
    }

    static _pretty(type, attribute) {
        return type.attributes[attribute]?.pretty || attribute;
    }

    static _num(v) {
        if (v === null || v === undefined || isNaN(v)) return '';
        return Math.abs(v) >= 100 ? String(Math.round(v)) : String(Math.round(v * 100) / 100);
    }
}

globalThis.FGMLibraryPanel = FGMLibraryPanel;
