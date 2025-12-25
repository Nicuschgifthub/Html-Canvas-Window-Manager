/**
 * ArtNet Module
 * Handles all ArtNet-related functionality
 */
class FGMArtNetModule extends FGMFeatureModule {
    constructor() {
        super('artnet', '1.0.0');
    }

    init() {
        console.log('[ArtNetModule] Initializing...');

        // Register handler for ArtNet table cell clicks
        this.on(FGMEventTypes.TABLE_CELL_CLICKED, {
            filter: (event) => {
                return event.data.field?.getFGMType() === FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS;
            },
            handler: (event) => this.handleCellClick(event),
            priority: 10
        });

        // Register handler for ArtNet table row deletion
        this.on(FGMEventTypes.TABLE_ROW_DELETED, {
            filter: (event) => {
                return event.data.field?.getFGMType() === FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS;
            },
            handler: (event) => this.handleRowDelete(event),
            priority: 10
        });

        // Register handler for ArtNet table row addition
        this.on(FGMEventTypes.TABLE_ROW_ADDED, {
            filter: (event) => {
                return event.data.field?.getFGMType() === FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS;
            },
            handler: (event) => this.handleRowAdd(event),
            priority: 10
        });

        // Register handler for window clicks (to close ArtNet window)
        this.on(FGMEventTypes.WINDOW_CLICKED, {
            handler: (event) => this.handleWindowClick(event),
            priority: 5
        });

        // Register handler for background clicks (to close ArtNet window)
        this.on(FGMEventTypes.BACKGROUND_CLICKED, {
            handler: (event) => this.handleBackgroundClick(event),
            priority: 5
        });

        // Register action handler for keyboard input
        // this.registerAction(FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS, {
        //     handleKeyboardEnter: (value) => this.handleKeyboardSave(value)
        // });

        console.log('[ArtNetModule] Initialized');
    }

    async handleCellClick(event) {
        const { window: fromWindow, field: fromTable, rowIndex, colIndex, value } = event.data;

        const result = await FGMKernel.awaitAction({
            type: FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT,
            data: {
                targetWindow: fromWindow,
                initialValue: value
            }
        });

        const string = result.value;

        if (fromTable && rowIndex !== undefined) {
            fromTable.updateCellValue(rowIndex, colIndex, string);

            const fields = ['name', 'ip', 'subnet', 'universe'];
            const fieldName = fields[colIndex];
            if (fieldName) {
                FGMStore.updateArtNetNode(rowIndex, fieldName, string);
            }
        }

        this.refreshTable();
    }

    handleRowDelete(event) {
        const { rowIndex } = event.data;
        FGMStore.deleteArtNetNode(rowIndex);
        this.refreshTable();
    }

    handleRowAdd(event) {
        FGMStore.addArtNetNode();
        this.refreshTable();
    }

    handleWindowClick(event) {
        const window = event.data.window;
        const artNetWin = this.getArtNetConfigWindow();

        if (artNetWin && !artNetWin.getHiddenStatus() &&
            window.getSingleContextField().getId() !== artNetWin.getSingleContextField().getId() &&
            window.getSingleContextField().getFGMType() !== FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT) {
            artNetWin.setHidden();
            FGMWindowManager.closeKeyboard();
        }
    }

    handleBackgroundClick(event) {
        const artNetWin = this.getArtNetConfigWindow();
        if (artNetWin && !artNetWin.getHiddenStatus()) {
            artNetWin.setHidden(true);
            FGMWindowManager.closeKeyboard();
        }
    }

    /*
    handleKeyboardSave(string) {
        const data = FGMSubAction.actionData;
        if (data.targetField && data.rowIndex !== undefined) {
            data.targetField.updateCellValue(data.rowIndex, data.colIndex, string);

            const fields = ['name', 'ip', 'subnet', 'universe'];
            const fieldName = fields[data.colIndex];
            if (fieldName) {
                FGMStore.updateArtNetNode(data.rowIndex, fieldName, string);
            }
        }
        FGMSubAction.clearAwaitingAction();
        FGMWindowManager.closeKeyboard();
        this.refreshTable();
    }
    */

    refreshTable() {
        const artNetWin = FGMStore.getHCW().getWindows().find(w => w.getId() === FGMIds.DEFAULT.WINDOWS.ART_NET_CONFIG);
        if (artNetWin) {
            const tableField = artNetWin.getSingleContextField();
            const nodes = FGMStore.getArtNetNodes();
            const rows = nodes.map(n => [n.name, n.ip, n.subnet, n.universe]);
            tableField.setRows(rows);
        }
    }

    getArtNetConfigWindow() {
        return FGMStore.getHCW().getWindows().find(w => w.getId() === FGMIds.DEFAULT.WINDOWS.ART_NET_CONFIG);
    }
}