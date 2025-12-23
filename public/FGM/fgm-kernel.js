class FGMSubAction {
    static awaitingAction = null;
    static actionData = {};
    static initiatorPreset = null;

    static setAwaitingAction(actionType, data = {}, initiatorPreset = null) {
        this.clearAwaitingAction();

        this.awaitingAction = actionType;
        this.actionData = data;
        this.initiatorPreset = initiatorPreset;

        console.log(`Action set: ${actionType}`, data);
    }

    static clearAwaitingAction() {
        this.awaitingAction = null;
        this.actionData = {};
        this.initiatorPreset = null;
        console.log("Action cleared");
    }

    static getAwaitingAction() {
        return this.awaitingAction;
    }
}

class FGMAwaitingActions {
    static getAwaitingColor() {
        if (typeof FGMColors === 'undefined') return '#ffffff';

        const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
        const target = FGMColors.PAGES.AWAITING;

        const r = parseInt(target.slice(1, 3), 16);
        const g = parseInt(target.slice(3, 5), 16);
        const b = parseInt(target.slice(5, 7), 16);

        const fr = Math.round(r * pulse);
        const fg = Math.round(g * pulse);
        const fb = Math.round(b * pulse);

        return `rgb(${fr}, ${fg}, ${fb})`;
    }

    static handle(actionStore) {
        const handler = FGMActionRegistry.getHandler(actionStore.getAction());
        if (handler) {
            handler.handleInteraction(actionStore);
        }
    }
}

class FGMFixturePatcherLogic {

    static cellClicked(fromWindow, fromTable, rowIndex, colIndex, value) {

    }

    static cellDelete(fromWindow, fromTable, rowIndex, colIndex, value) {

    }

    static cellAddFixture() {

    }

}

class FGMArtNetLogic {
    static refreshTable() {
        const artNetWin = FGMStore.getHCW().getWindows().find(w => w.getId() === FGMIds.DEFAULT.WINDOWS.ART_NET_CONFIG);
        if (artNetWin) {
            const tableField = artNetWin.getSingleContextField();
            const nodes = FGMStore.getArtNetNodes();
            const rows = nodes.map(n => [n.name, n.ip, n.subnet, n.universe]);
            tableField.setRows(rows);
        }
    }

    static handleWindowClick(window) {
        const artNetWin = this.getArtNetConfigWindow();
        if (artNetWin && !artNetWin.getHiddenStatus() &&
            window.getSingleContextField().getId() !== artNetWin.getSingleContextField().getId() &&
            window.getSingleContextField().getFGMType() !== FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT) {
            artNetWin.setHidden();
            FGMWindowManager.closeKeyboard();
        }
    }

    static addNode() {
        FGMStore.addArtNetNode();
        FGMArtNetLogic.refreshTable();
    }

    static deleteNode(rowIndex) {
        FGMStore.deleteArtNetNode(rowIndex);
        FGMArtNetLogic.refreshTable();
    }

    static handleCellClick(fromWindow, fromTable, rowIndex, colIndex, value) {
        FGMSubAction.setAwaitingAction(FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS, {
            targetWindow: fromWindow,
            targetField: fromTable,
            rowIndex: rowIndex,
            colIndex: colIndex
        });
        FGMWindowManager.openKeyboardForWindow(fromWindow, value);
    }

    static handleKeyboardSave(string) {
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
        FGMArtNetLogic.refreshTable();
    }

    static getArtNetConfigWindow() {
        return FGMStore.getHCW().getWindows().find(w => w.getId() === FGMIds.DEFAULT.WINDOWS.ART_NET_CONFIG);
    }

    static handleBackgroundClick() {
        const artNetWin = this.getArtNetConfigWindow();
        if (artNetWin && !artNetWin.getHiddenStatus()) {
            artNetWin.setHidden(true);
            FGMWindowManager.closeKeyboard();
        }
    }
}

class FGMInputHandlers {
    /** @param {HCWFaderField} fromFader @param {Object} data */
    static handleFader(fromFader, data) {
        const type = fromFader.getFGMType();
        if (type) {
            FGMProgrammer.setAttributeValue(type, data.value * 255);
        }
    }

    /** @param {HCWEncoderField} fromEncoder @param {Object} data */
    static handleEncoder(fromEncoder, data) {
        const type = fromEncoder.getFGMType();
        if (!type) return;
        if (type == FGMTypes.PROGRAMMER.POSITION.PAN_ENCODER) {
            FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.POSITION.PAN_8Bit, data.outer.value * 255);
            FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.POSITION.PAN_16Bit, data.inner.value * 255);
        }
        if (type == FGMTypes.PROGRAMMER.POSITION.TILT_ENCODER) {
            FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.POSITION.TILT_8Bit, data.outer.value * 255);
            FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.POSITION.TILT_16Bit, data.inner.value * 255);
        }
    }

    /** @param {HCWColorMapField} fromColorPicker @param {Object} data */
    static handleColorPicker(fromColorPicker, data) {
        const type = fromColorPicker.getFGMType();
        if (type === FGMTypes.PROGRAMMER.COLORS.COLOR_PICKER) {
            // Split the color object into individual attribute updates
            if (data.r !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_R, data.r);
            if (data.g !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_G, data.g);
            if (data.b !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_B, data.b);
            if (data.white !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_W, data.white);
            if (data.amber !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_A, data.amber);
            if (data.uv !== undefined) FGMProgrammer.setAttributeValue(FGMTypes.PROGRAMMER.COLORS.COLOR_U, data.uv);
        }
    }
}

class FGMKernel {
    static eventInit() {
        console.log("FGMKernel initialized");

        // Emit system init event
        FGMEventBus.emit(FGMEventTypes.INIT, {});
    }

    static getAwaitingColor() {
        return FGMAwaitingActions.getAwaitingColor();
    }

    static handleAwaitingAction(...args) {
        FGMAwaitingActions.handle(...args);
    }

    /** @param {HCWWindow} fromWindow @param {HCWPresetField} fromPreset @param {Object} data @param {HCWPreset} singlePreset */
    static eventPresetClicked(fromWindow, fromPreset, data, singlePreset) {
        // Emit event to event bus - modules will handle it
        FGMEventBus.emit(FGMEventTypes.PRESET_CLICKED, {
            window: fromWindow,
            field: fromPreset,
            data: data,
            presetData: data,
            singlePreset: singlePreset
        });
    }

    /** @param {HCWWindow} fromWindow @param {HCWFaderField} fromFader @param {Object} data */
    static eventFaderUpdate(fromWindow, fromFader, data) {
        // Emit event to event bus
        FGMEventBus.emit(FGMEventTypes.FADER_UPDATE, {
            window: fromWindow,
            field: fromFader,
            data: data
        });
    }

    /** @param {HCWWindow} fromWindow @param {HCWEncoderField} fromEncoder @param {Object} data */
    static eventEncoderUpdate(fromWindow, fromEncoder, data) {
        // Emit event to event bus
        FGMEventBus.emit(FGMEventTypes.ENCODER_UPDATE, {
            window: fromWindow,
            field: fromEncoder,
            data: data
        });
    }

    /** @param {HCWWindow} fromWindow @param {HCWTableField} fromTable @param {String} string */
    static eventKeyboardOnEnter(fromWindow, fromKeyboard, string) {
        // Emit event to event bus - modules will handle it
        FGMEventBus.emit(FGMEventTypes.KEYBOARD_ENTER, {
            window: fromWindow,
            field: fromKeyboard,
            value: string
        });

        // Action handlers still need to be called for keyboard input
        const actionType = FGMSubAction.getAwaitingAction();
        const handler = FGMActionRegistry.getHandler(actionType);

        if (handler) {
            handler.handleKeyboardEnter(string);
        }
    }

    static eventAddArtNetNode() {
        // Emit event to event bus
        FGMEventBus.emit(FGMEventTypes.TABLE_ROW_ADDED, {
            field: { getFGMType: () => FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS }
        });
    }

    /** @param {HCWWindow} fromWindow @param {HCWTableField} fromTable */
    static eventDeleteArtNetNode(fromWindow, fromTable, rowIndex) {
        // Emit event to event bus
        FGMEventBus.emit(FGMEventTypes.TABLE_ROW_DELETED, {
            window: fromWindow,
            field: fromTable,
            rowIndex: rowIndex
        });
    }

    static eventTableArtNetCellClicked(fromWindow, fromTable, rowIndex, colIndex, value) {
        // Emit event to event bus
        FGMEventBus.emit(FGMEventTypes.TABLE_CELL_CLICKED, {
            window: fromWindow,
            field: fromTable,
            rowIndex: rowIndex,
            colIndex: colIndex,
            value: value
        });
    }

    static eventBackgroundClicked() {
        // Emit event to event bus
        FGMEventBus.emit(FGMEventTypes.BACKGROUND_CLICKED, {});
    }

    /** @param {HCWWindow} window */
    static eventWindowClicked(window) {
        // Emit event to event bus - modules will handle it
        FGMEventBus.emit(FGMEventTypes.WINDOW_CLICKED, {
            window: window
        });
    }

    static eventColorPickerUpdate(fromWindow, fromColorPicker, data) {
        // Emit event to event bus
        FGMEventBus.emit(FGMEventTypes.COLOR_PICKER_UPDATE, {
            window: fromWindow,
            field: fromColorPicker,
            data: data
        });
    }

    static eventTableFixturePatchCellClicked(fromWindow, fromTable, rowIndex, colIndex, value) {
        // Emit event to event bus
        FGMEventBus.emit(FGMEventTypes.TABLE_CELL_CLICKED, {
            window: fromWindow,
            field: fromTable,
            rowIndex: rowIndex,
            colIndex: colIndex,
            value: value
        });
    }

    static eventDeleteFixturePatchCell(fromWindow, fromTable, rowIndex, colIndex, value) {
        // Emit event to event bus
        FGMEventBus.emit(FGMEventTypes.TABLE_ROW_DELETED, {
            window: fromWindow,
            field: fromTable,
            rowIndex: rowIndex,
            colIndex: colIndex,
            value: value
        });
    }

    static eventAddFixturePatchCell() {
        // Emit event to event bus
        FGMEventBus.emit(FGMEventTypes.TABLE_ROW_ADDED, {
            field: { getFGMType: () => FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_CONFIG }
        });
    }
}