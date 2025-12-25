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
            handleInteraction: (actionStore) => this.handleInteraction(actionStore)
        });

        console.log('[EditNameModule] Initialized');
    }

    async handleInteraction(actionStore) {
        const window = actionStore.getWindow();
        const singlePreset = actionStore.getSinglePreset();

        if (!window) return;
        if (window.getSingleContextField().getFGMType() === FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT) return;

        let initialValue = '';
        if (singlePreset) {
            initialValue = singlePreset.getName();
        } else {
            initialValue = window.getSingleContextField().getLabel();
        }

        const result = await FGMKernel.awaitAction({
            type: FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT,
            data: {
                targetWindow: window,
                initialValue: initialValue
            }
        });

        const string = result.value;

        if (singlePreset) {
            singlePreset.setLabel(string);
        } else {
            window.getSingleContextField().setLabel(string);
            if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        }
    }
}