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

        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: (event) => {
                const data = event.data.presetData || event.data.data;
                return data?._actionId === FGMTypes.ACTIONS.BUTTON.EDIT_NAME;
            },
            handler: (event) => {
                this.handleInteraction(
                    new FGMHandleAwaitActionStore()
                        .setAction(FGMTypes.ACTIONS.BUTTON.EDIT_NAME)
                        .setSinglePreset(event.data.singlePreset)
                );
            },
            priority: 10
        });

        console.log('[EditNameModule] Initialized');
    }

    async handleInteraction(actionStore) {
        const initiatorPreset = actionStore.getSinglePreset();

        if (initiatorPreset) {
            initiatorPreset.setFlashing(true);
        }

        const interaction = await FGMKernel.awaitAction({
            types: [FGMEventTypes.PRESET_CLICKED, FGMEventTypes.WINDOW_CLICKED]
        });

        if (initiatorPreset) {
            initiatorPreset.setFlashing(false);
        }

        let targetWindow = interaction.window;
        let targetPreset = interaction.singlePreset;

        if (!targetWindow) return;
        if (targetWindow.getSingleContextField().getFGMType() === FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT) return;

        let initialValue = '';
        if (targetPreset) {
            initialValue = targetPreset.getName();
        } else {
            initialValue = targetWindow.getSingleContextField().getLabel();
        }

        const result = await FGMKernel.awaitAction({
            type: FGMTypes.ACTIONS.KEYBOARD.MAIN_INPUT,
            data: {
                targetWindow: targetWindow,
                initialValue: initialValue
            }
        });

        const string = result.value;

        if (targetPreset) {
            targetPreset.setLabel(string);
        } else {
            targetWindow.getSingleContextField().setLabel(string);
            if (typeof HCWRender !== 'undefined') HCWRender.updateFrame();
        }
    }
}