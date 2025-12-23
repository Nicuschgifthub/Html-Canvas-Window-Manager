class FGMActionRegistry {
    static _handlers = new Map();

    /** @param {string} actionType @param {object} handler */
    static register(actionType, handler) {
        this._handlers.set(actionType, handler);
    }

    /** @param {string} actionType */
    static getHandler(actionType) {
        return this._handlers.get(actionType) || null;
    }
}

class FGMBaseHandler {
    constructor() { }

    /** @param {FGMHandleAwaitActionStore} actionStore */
    handleInteraction(actionStore) {
        // Base click/interaction logic
    }

    /** @param {string} value */
    handleKeyboardEnter(value) {
        // Base keyboard enter logic
    }

    /** @param {HCWWindow} win */
    handleKeyboardUpdate(win, field, value) {
        // Real-time updates if needed
    }
}

class FGMEditNameHandler extends FGMBaseHandler {

    /** @param {FGMHandleAwaitActionStore} actionStore */
    handleInteraction(actionStore) {
        const window = actionStore.getWindow();
        const singlePreset = actionStore.getSinglePreset();

        if (!window) return;
        if (window.getSingleContextField().getFGMType() == FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT) return;

        if (singlePreset) {
            FGMSubAction.actionData.targetPreset = singlePreset;
            FGMSubAction.actionData.fromSinglePreset = singlePreset;
            FGMSubAction.actionData.fromWindow = window;
            FGMWindowManager.openKeyboardForWindow(window, singlePreset.getName());
        } else {
            FGMSubAction.actionData.targetWindow = window;
            FGMSubAction.actionData.fromWindow = window;
            FGMWindowManager.openKeyboardForWindow(window, window.getSingleContextField().getLabel());
        }
        FGMSubAction.initiatorPreset = null;
    }

    /** @param {String} string */
    handleKeyboardEnter(string) {
        const targetPreset = FGMSubAction.actionData.targetPreset;
        const fromSinglePreset = FGMSubAction.actionData.fromSinglePreset;
        const targetWindow = FGMSubAction.actionData.targetWindow;

        if (targetPreset && fromSinglePreset) {
            fromSinglePreset.setLabel(string);
        } else if (targetWindow) {
            targetWindow.getSingleContextField().setLabel(string);
            if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        }

        FGMSubAction.clearAwaitingAction();
        FGMWindowManager.closeKeyboard();
    }
}

class FGMArtNetHandler extends FGMBaseHandler {
    handleKeyboardEnter(string) {
        FGMArtNetLogic.handleKeyboardSave(string);
    }
}

class FGMSearchFixture extends FGMBaseHandler {
    /** @param {FGMHandleAwaitActionStore} actionStore */
    handleInteraction(actionStore) {
        // Base click/interaction logic
    }

    /** @param {string} value */
    handleKeyboardEnter(value) {
        // Base keyboard enter logic
    }

    /** @param {HCWWindow} win */
    handleKeyboardUpdate(win, field, value) {
        // Real-time updates if needed
    }
}

FGMActionRegistry.register(FGMTypes.ACTIONS.BUTTON.EDIT_NAME, new FGMEditNameHandler());
FGMActionRegistry.register(FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS, new FGMArtNetHandler());
FGMActionRegistry.register(FGMTypes.ACTIONS.WINDOW.FIXTURE_LIST_SEARCH_FIELD, new FGMSearchFixture());