/**
 * Programmer Sheet Module
 * Manages the modular table view for programmer values
 */
class FGMProgrammerSheetModule extends FGMFeatureModule {
    constructor() {
        super('programmer-sheet-manager', '1.0.0');

        // Define attribute categories for grouping
        this.categories = {
            'DIMMER': 'Intensity',
            'PAN8BIT': 'Position',
            'PAN16BIT': 'Position',
            'TILT8BIT': 'Position',
            'TILT16BIT': 'Position',
            'COLOR_R': 'Color',
            'COLOR_G': 'Color',
            'COLOR_B': 'Color',
            'COLOR_W': 'Color',
            'COLOR_A': 'Color',
            'COLOR_U': 'Color',
            'COLOR_WHEEL': 'Color',
            'ZOOM': 'Beam',
            'FOCUS': 'Beam',
            'SHUTTER': 'Beam'
        };

        // Short labels for condensed display
        this.shortLabels = {
            'COLOR_R': 'R',
            'COLOR_G': 'G',
            'COLOR_B': 'B',
            'COLOR_W': 'W',
            'COLOR_A': 'A',
            'COLOR_U': 'U',
            'COLOR_WHEEL': 'CW',
            'ZOOM': 'Z',
            'FOCUS': 'F',
            'SHUTTER': 'S',
            'PAN8BIT': 'P',
            'PAN16BIT': 'Pf',
            'TILT8BIT': 'T',
            'TILT16BIT': 'Tf'
        };
    }

    init() {
        console.log('[ProgrammerSheetModule] Initializing...');

        // Refresh sheet on programmer change
        this.on(FGMEventTypes.PROGRAMMER_VALUE_CHANGED, () => this.refreshSheet());

        // Initial refresh
        this.refreshSheet();

        console.log('[ProgrammerSheetModule] Initialized');
    }

    refreshSheet() {
        const hcw = FGMStore.getHCW();
        if (!hcw) return;

        const data = FGMProgrammer.getData();
        const fixturesWithData = Object.keys(data);
        if (fixturesWithData.length === 0) {
            this._clearTable(hcw);
            return;
        }

        // Find all unique categories across all fixtures to form headers
        const activeCategories = new Set();
        fixturesWithData.forEach(fid => {
            Object.keys(data[fid]).forEach(attr => {
                const cat = this.categories[attr] || attr;
                activeCategories.add(cat);
            });
        });

        const sortedCategories = Array.from(activeCategories).sort((a, b) => {
            // Force some order: Intensity first, then Position, then Beam, then Color, then others
            const order = { 'Intensity': 0, 'Position': 1, 'Beam': 2, 'Color': 3 };
            const orderA = order[a] !== undefined ? order[a] : 99;
            const orderB = order[b] !== undefined ? order[b] : 99;
            return orderA - orderB || a.localeCompare(b);
        });

        const headers = ['Fixture', ...sortedCategories];

        const rows = fixturesWithData.map(fid => {
            const fixture = FGMStore.getPatchedFixtures().find(f => String(f.getId()) === String(fid));
            const fixtureLabel = fixture ? `${fixture.getLabel()} (${fid})` : fid;

            const row = [fixtureLabel];
            sortedCategories.forEach(cat => {
                const values = [];
                // Find all attributes that belong to this category
                for (let attr in data[fid]) {
                    const attrCat = this.categories[attr] || attr;
                    if (attrCat === cat) {
                        const state = data[fid][attr];
                        const val = state.value.toFixed(2);
                        const label = this.shortLabels[attr] || "";
                        values.push(label ? `${label}:${val}` : val);
                    }
                }

                if (values.length > 0) {
                    row.push(values.join(' '));
                } else {
                    row.push("-");
                }
            });
            return row;
        });

        // Find the Programmer Sheet window and update its field
        hcw.getWindows().forEach(win => {
            const field = win.getSingleContextField();
            if (field && field.getFGMType() === FGMTypes.PROGRAMMER.POOLS.PROGRAMMER_SHEET) {
                field.setHeaders(headers).setRows(rows);
            }
        });

        if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
    }

    _clearTable(hcw) {
        hcw.getWindows().forEach(win => {
            const field = win.getSingleContextField();
            if (field && field.getFGMType() === FGMTypes.PROGRAMMER.POOLS.PROGRAMMER_SHEET) {
                field.setHeaders(['Fixture']).setRows([]);
            }
        });
    }
}
