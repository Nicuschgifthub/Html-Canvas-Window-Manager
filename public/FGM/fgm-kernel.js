class FGMSubAction {
    static awaitingAction = null;
    static actionData = {};
    static initiatorPreset = null;

    static resolvePromise = null;
    static pendingRequest = null; // { type, filter, data }

    static setAwaitingAction(actionType, data = {}, initiatorPreset = null) {
        this.clearAwaitingAction();

        this.awaitingAction = actionType;
        this.actionData = data;
        this.initiatorPreset = initiatorPreset;

        console.log(`Action set: ${actionType}`, data);
    }

    /**
     * @param {object} options { type, types, filter, data }
     * @returns {Promise}
     */
    static async awaitAction(options) {
        if (typeof options === 'string') {
            options = { type: options };
        }

        const { type, types, filter, data = {} } = options;

        this.clearAwaitingAction();
        this.pendingRequest = { type, types, filter };

        this.awaitingAction = type || (types && types[0]) || 'generic';
        this.actionData = data;

        if (type === FGMEventTypes.KEYBOARD_ENTER || type === FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT) {
            if (data && data.targetWindow) {
                const initialValue = data.initialValue || '';
                FGMWindowManager.openKeyboardForWindow(data.targetWindow, initialValue);
            }
        }

        return new Promise((resolve) => {
            this.resolvePromise = resolve;
        });
    }

    static clearAwaitingAction() {
        this.awaitingAction = null;
        this.actionData = {};
        this.initiatorPreset = null;
        this.resolvePromise = null;
        this.pendingRequest = null;
    }

    static getAwaitingAction() {
        return this.awaitingAction;
    }

    /**
     * Check if an event matches the pending request and resolve if so.
     * @param {string} eventType 
     * @param {object} payload 
     * @returns {boolean} true if handled (resolved), false otherwise
     */

    static checkAndResolve(eventType, payload) {
        if (!this.resolvePromise || !this.pendingRequest) return false;

        const req = this.pendingRequest;

        let typeMatches = (req.type === eventType);

        if (req.types && Array.isArray(req.types)) {
            if (req.types.includes(eventType)) typeMatches = true;
        }

        if (req.type === FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT && eventType === FGMEventTypes.KEYBOARD_ENTER) {
            typeMatches = true;
        }

        if (!typeMatches) return false;

        // Check filter first
        if (req.filter && typeof req.filter === 'function') {
            if (!req.filter(payload)) return false;
        }

        // Special case: If we are awaiting both a preset and a window click, 
        // give the preset click priority by delaying the window click resolution.
        if (eventType === FGMEventTypes.WINDOW_CLICKED && req.types && req.types.includes(FGMEventTypes.PRESET_CLICKED)) {
            const resolve = this.resolvePromise;
            const currentRequest = this.pendingRequest;

            queueMicrotask(() => {
                // If it hasn't been resolved by PRESET_CLICKED in the same task
                if (this.resolvePromise === resolve && this.pendingRequest === currentRequest) {
                    this.clearAwaitingAction();
                    resolve(payload);
                }
            });
            return true;
        }

        const resolve = this.resolvePromise;
        this.clearAwaitingAction();
        resolve(payload);
        return true;
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

class FGMKernel {
    static eventInit() {
        console.log("FGMKernel initialized");
        FGMEventBus.emit(FGMEventTypes.INIT, {});
    }

    static getAwaitingColor() {
        return FGMAwaitingActions.getAwaitingColor();
    }

    static awaitAction(options) {
        return FGMSubAction.awaitAction(options);
    }

    static handleAwaitingAction(...args) {
        FGMAwaitingActions.handle(...args);
    }

    static eventPresetClicked(fromWindow, fromPreset, data, singlePreset) {
        const payload = {
            window: fromWindow,
            field: fromPreset,
            data: data,
            presetData: data,
            singlePreset: singlePreset
        };

        if (FGMSubAction.checkAndResolve(FGMEventTypes.PRESET_CLICKED, payload)) {
            return;
        }

        FGMEventBus.emit(FGMEventTypes.PRESET_CLICKED, payload);
    }

    static eventFaderUpdate(fromWindow, fromFader, data) {
        FGMEventBus.emit(FGMEventTypes.FADER_UPDATE, {
            window: fromWindow,
            field: fromFader,
            data: data
        });
    }

    static eventEncoderUpdate(fromWindow, fromEncoder, data) {
        FGMEventBus.emit(FGMEventTypes.ENCODER_UPDATE, {
            window: fromWindow,
            field: fromEncoder,
            data: data
        });
    }

    static eventKeyboardOnEnter(fromWindow, fromKeyboard, string) {
        const payload = {
            window: fromWindow,
            field: fromKeyboard,
            value: string
        };

        if (FGMSubAction.checkAndResolve(FGMEventTypes.KEYBOARD_ENTER, payload)) {
            FGMWindowManager.closeKeyboard();
            return;
        }

        FGMEventBus.emit(FGMEventTypes.KEYBOARD_ENTER, payload);

        const actionType = FGMSubAction.getAwaitingAction();
        const handler = FGMActionRegistry.getHandler(actionType);

        if (handler) {
            handler.handleKeyboardEnter(string);
        }
    }

    static eventKeyboardUpdate(fromWindow, fromKeyboard, string) {
        FGMEventBus.emit(FGMEventTypes.KEYBOARD_UPDATE, {
            window: fromWindow,
            field: fromKeyboard,
            value: string
        });
    }

    static eventTableRowAdded(fromWindow, fromTable) {
        FGMEventBus.emit(FGMEventTypes.TABLE_ROW_ADDED, {
            window: fromWindow,
            field: fromTable
        });
    }

    static eventTableRowDeleted(fromWindow, fromTable, rowIndex, colIndex, value) {
        FGMEventBus.emit(FGMEventTypes.TABLE_ROW_DELETED, {
            window: fromWindow,
            field: fromTable,
            rowIndex: rowIndex,
            colIndex: colIndex,
            value: value
        });
    }

    static eventTableCellClicked(fromWindow, fromTable, rowIndex, colIndex, value) {
        FGMEventBus.emit(FGMEventTypes.TABLE_CELL_CLICKED, {
            window: fromWindow,
            field: fromTable,
            rowIndex: rowIndex,
            colIndex: colIndex,
            value: value
        });
    }

    static eventBackgroundClicked() {
        FGMEventBus.emit(FGMEventTypes.BACKGROUND_CLICKED, {});
    }

    static eventWindowClicked(window) {
        const payload = { window: window };

        if (FGMSubAction.checkAndResolve(FGMEventTypes.WINDOW_CLICKED, payload)) {
            return;
        }

        FGMEventBus.emit(FGMEventTypes.WINDOW_CLICKED, payload);
    }

    static eventColorPickerUpdate(fromWindow, fromColorPicker, data) {
        FGMEventBus.emit(FGMEventTypes.COLOR_PICKER_UPDATE, {
            window: fromWindow,
            field: fromColorPicker,
            data: data
        });
    }
}