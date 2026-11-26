/**
 * Output panel — Art-Net settings and a DMX monitor per universe.
 */
class FGMOutputPanel {

    static async open() {
        while (true) {
            const s = DMXOutput.getSettings();
            DMXOutput.render();
            const universes = [...DMXOutput.universes.keys()].sort((a, b) => a - b);

            const rows = [
                { label: 'Art-Net output', value: s.enabled ? 'ON' : 'off', edit: () => DMXOutput.updateSettings({ enabled: !s.enabled }) },
                {
                    label: 'Target IP', value: s.ip, edit: async () => {
                        const v = await FGMModal.input({
                            label: 'Art-Net target IP (255.255.255.255 = broadcast)', initial: s.ip,
                            verify: (val) => /^(\d{1,3}\.){3}\d{1,3}$/.test(String(val).trim()) && String(val).trim().split('.').every(n => Number(n) <= 255)
                                ? { valid: true, infoText: '' } : { valid: false, infoText: 'IPv4 address' }
                        });
                        if (v !== null) DMXOutput.updateSettings({ ip: String(v).trim() });
                    }
                },
                {
                    label: 'Port', value: String(s.port), edit: async () => {
                        const v = await FGMModal.input({ label: 'UDP port', initial: s.port, verify: FGMModal.verifyInt(1, 65535) });
                        if (v !== null) DMXOutput.updateSettings({ port: Number(v) });
                    }
                },
                {
                    label: 'Universe 1 = Art-Net', value: String(s.universeStart), edit: async () => {
                        const v = await FGMModal.input({ label: 'Art-Net port-address of universe 1', initial: s.universeStart, verify: FGMModal.verifyInt(0, 32767) });
                        if (v !== null) DMXOutput.updateSettings({ universeStart: Number(v) });
                    }
                },
                {
                    label: 'Rate', value: `${s.rate} Hz`, edit: async () => {
                        const v = await FGMModal.input({ label: 'Frames per second', initial: s.rate, verify: FGMModal.verifyInt(1, 44) });
                        if (v !== null) DMXOutput.updateSettings({ rate: Number(v) });
                    }
                },
                { label: 'Packets sent', value: `${DMXOutput.stats.packets}${DMXOutput.stats.errors ? ` · ${DMXOutput.stats.errors} errors (${DMXOutput.stats.lastError})` : ''}` },
                ...universes.map(u => ({
                    label: `Universe ${u} monitor`,
                    value: `${DMXOutput.getUniverse(u).filter(v => v > 0).length} channels > 0`,
                    edit: () => this.monitor(u)
                }))
            ];

            const { window } = FGMModal.openTable({
                title: 'Output',
                headers: ['Setting', 'Value'],
                rows: rows.map(r => [r.label, r.value])
            });

            const action = await FGMModal.nextTableAction();
            if (action.type === 'close') { FGMModal.close(window); return; }
            if (action.type === 'cell') {
                const row = rows[action.rowIndex];
                if (row && row.edit) await row.edit();
            }
        }
    }

    /** Every patched address of a universe with its fixture, attribute and value. */
    static async monitor(universe) {
        while (true) {
            DMXOutput.render();
            const data = DMXOutput.getUniverse(universe);
            const rows = [];

            PatchManager.getAllFixtures().forEach(f => {
                f.channels.forEach(ch => {
                    const addrs = f.getChannelAddresses(ch);
                    if (!addrs.length || addrs[0].universe !== universe) return;
                    const { raw } = DMXOutput.readChannel(f, ch);
                    const { fn, set } = f.decodeValue(ch, raw, (c) => Programmer.resolveRaw(f, c));
                    rows.push({
                        address: addrs[0].address,
                        cells: [
                            addrs.map(a => a.address).join(','),
                            `${f.fid} ${f.name}`,
                            f.type.attributes[ch.attribute]?.pretty || ch.attribute,
                            addrs.map(a => data[a.address - 1]).join(' / '),
                            fn ? `${fn.name}${set ? ' · ' + set.name : ''}` : ''
                        ]
                    });
                });
            });
            rows.sort((a, b) => a.address - b.address);

            const { window } = FGMModal.openTable({
                title: `Universe ${universe} — tap a row to refresh`,
                headers: ['Addr', 'Fixture', 'Attribute', 'Value', 'Function'],
                rows: rows.map(r => r.cells)
            });

            const action = await FGMModal.nextTableAction();
            if (action.type === 'close') { HCWDB.removeWindowByWindowId(window.getId()); return; }
        }
    }
}

globalThis.FGMOutputPanel = FGMOutputPanel;
