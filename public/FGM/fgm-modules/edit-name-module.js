/**
 * Edit Name Module
 * Handles the "Edit Name" functionality for windows and presets
 */
class FGMEditNameModule extends FGMFeatureModule {
    constructor() {
        super('edit-name', '1.0.0');
    }

    init() {
        console.log('[EditNameModule] Initializing...');

        this.registerAction(FGMTypes.ACTIONS.BUTTON.EDIT_NAME, {
            handleInteraction: (actionStore) => this.handleInteraction(actionStore),
            handleKeyboardEnter: (value) => this.handleKeyboardEnter(value)
        });

        console.log('[EditNameModule] Initialized');
    }

    handleInteraction(actionStore) {
        const window = actionStore.getWindow();
        const singlePreset = actionStore.getSinglePreset();

        if (!window) return;
        if (window.getSingleContextField().getFGMType() === FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT) return;

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
