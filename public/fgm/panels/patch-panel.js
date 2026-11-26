/**
 * Patch panel — list, add, edit and remove patched fixtures.
 *
 * Tap a cell to edit it: FID, Name, Mode or Address.
 * Tap the type to open it in the fixture type inspector.
 * "+ Add Fixtures" walks through type → mode → count → FID → address.
 */
class FGMPatchPanel {
    static _message = null;

    static async open() {
        while (true) {
            const fixtures = PatchManager.getAllFixtures();
            const title = `Patch — ${fixtures.length} fixture${fixtures.length === 1 ? '' : 's'}`
                + (this._message ? `  ·  ${this._message}` : '');
            this._message = null;

            const { window } = FGMModal.openTable({
                title,
                headers: ['FID', 'Name', 'Type', 'Mode', 'Address'],
                rows: fixtures.map(f => [
                    String(f.fid),
                    f.name,
                    f.type.shortName || f.type.name,
                    `${f.modeName} (${f.footprint})`,
                    f.addressString + (PatchManager.findCollisions(f).length ? ' ⚠' : '')
                ]),
                addLabel: '+ Add Fixtures',
                removable: true
            });

            const action = await FGMModal.nextTableAction();

            if (action.type === 'close') { FGMModal.close(window); return; }

            try {
                if (action.type === 'add') {
                    await this.addFlow();
                } else if (action.type === 'delete') {
                    const f = fixtures[action.rowIndex];
                    if (f) PatchManager.removeFixture(f.fid);
                } else if (action.type === 'cell') {
                    const f = fixtures[action.rowIndex];
                    if (f) await this.editCell(f, action.colIndex);
                }
            } catch (e) {
                console.error('Patch panel:', e);
                this._message = `⚠ ${e.message}`;
            }
        }
    }

    // ── editing ──────────────────────────────────────────────────────────

    static async editCell(f, col) {
        switch (col) {
            case 0: {
                const v = await FGMModal.input({
                    label: `FID for ${f.name}`,
                    initial: f.fid,
                    verify: (val) => {
                        const r = FGMModal.verifyInt(1, 99999)(val);
                        if (!r.valid) return r;
                        if (Number(val) !== f.fid && PatchManager.getFixture(Number(val))) return { valid: false, infoText: 'FID in use' };
                        return r;
                    }
                });
                if (v !== null) PatchManager.updateFixture(f.fid, { fid: Number(v) });
                return;
            }
            case 1: {
                const v = await FGMModal.input({
                    label: `Name of FID ${f.fid}`,
                    initial: f.name,
                    verify: (val) => String(val).trim() ? { valid: true, infoText: '' } : { valid: false, infoText: 'Empty' }
                });
                if (v !== null) PatchManager.updateFixture(f.fid, { name: String(v).trim() });
                return;
            }
            case 2:
                await FGMLibraryPanel.openType(f.typeKey);
                return;
            case 3: {
                const mode = await this.chooseMode(f.type, f.modeName);
                if (mode) {
                    PatchManager.updateFixture(f.fid, { modeName: mode });
                    this._checkCollisions(PatchManager.getFixture(f.fid));
                }
                return;
            }
            case 4: {
                const v = await FGMModal.input({ label: `Address of FID ${f.fid} (universe.address)`, initial: f.addressString, verify: FGMModal.verifyAddress() });
                if (v !== null) {
                    const a = FGMModal.parseAddress(v);
                    PatchManager.updateFixture(f.fid, a);
                    this._checkCollisions(PatchManager.getFixture(f.fid));
                }
                return;
            }
        }
    }

    static _checkCollisions(f) {
        if (!f) return;
        const clash = PatchManager.findCollisions(f);
        if (clash.length) this._message = `⚠ ${f.fid} overlaps ${clash.map(c => c.fid).join(', ')}`;
    }

    // ── adding ───────────────────────────────────────────────────────────

    static async chooseType() {
        const loaded = PatchManager.getTypes();
        const files = await FixtureLibrary.listServerFiles();

        const options = [
            ...loaded.map(({ key, type }) => ({
                label: `${type.manufacturer} ${type.name}`,
                value: { key },
                color: '#14532d'
            })),
            ...files
                .filter(file => !FixtureLibrary.loadedKeyForFile(file.name))
                .map(file => ({
                    label: FixtureLibrary.prettyFileName(file.name),
                    value: { file: file.name }
                }))
        ];

        if (options.length === 0) {
            this._message = '⚠ No fixture types — put .gdtf files in ./gdtf or drop one on the window';
            return null;
        }

        const choice = await FGMModal.choose({ title: 'Fixture type  (green = already in show)', options });
        if (!choice) return null;
        if (choice.key) return choice.key;
        return FixtureLibrary.importServerFile(choice.file);
    }

    static async chooseMode(type, current = null) {
        if (type.modes.length === 1) return type.modes[0].name;
        return FGMModal.choose({
            title: `${type.name} — DMX mode`,
            options: type.modes.map(m => ({
                label: `${m.name} (${m.footprint}ch)`,
                value: m.name,
                selected: m.name === current
            }))
        });
    }

    static async addFlow() {
        const typeKey = await this.chooseType();
        if (!typeKey) return;
        const type = PatchManager.getType(typeKey);

        const modeName = await this.chooseMode(type);
        if (!modeName) return;
        const mode = type.modes.find(m => m.name === modeName);

        const count = await FGMModal.input({ label: `How many ${type.name}?`, initial: 1, verify: FGMModal.verifyInt(1, 512) });
        if (count === null) return;

        const fid = await FGMModal.input({ label: 'First FID', initial: PatchManager.nextFreeFid(), verify: FGMModal.verifyInt(1, 99999) });
        if (fid === null) return;

        const free = PatchManager.nextFreeAddress(mode.footprint);
        const addr = await FGMModal.input({
            label: `Start address (universe.address) — ${mode.footprint} ch each`,
            initial: `${free.universe}.${String(free.address).padStart(3, '0')}`,
            verify: FGMModal.verifyAddress()
        });
        if (addr === null) return;
        const { universe, address } = FGMModal.parseAddress(addr);

        const result = PatchManager.patch({ typeKey, modeName, count: Number(count), fid: Number(fid), universe, address });
        this._message = result.errors.length
            ? `⚠ ${result.errors[0]}${result.errors.length > 1 ? ` (+${result.errors.length - 1})` : ''}`
            : `✓ patched ${result.fixtures.length}`;
    }
}

globalThis.FGMPatchPanel = FGMPatchPanel;
