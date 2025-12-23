class FGMActionRegistry {
    static _handlers = new Map();

    static register(actionType, handler) {
        this._handlers.set(actionType, handler);
    }

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

    handleKeyboardUpdate(win, field, value) {
        // Real-time updates if needed
    }
}

class FGMEditNameHandler extends FGMBaseHandler {
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

FGMActionRegistry.register(FGMTypes.ACTIONS.BUTTON.EDIT_NAME, new FGMEditNameHandler());
FGMActionRegistry.register(FGMTypes.ACTIONS.WINDOW.ARTNET_SETTINGS, new FGMArtNetHandler());