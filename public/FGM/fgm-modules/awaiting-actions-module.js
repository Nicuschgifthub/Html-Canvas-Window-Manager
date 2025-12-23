/**
 * Awaiting Actions Module
 * Handles awaiting actions when presets or windows are clicked
 */
class FGMAwaitingActionsModule extends FGMFeatureModule {
    constructor() {
        super('awaiting-actions', '1.0.0');
    }

    init() {
        console.log('[AwaitingActionsModule] Initializing...');

        // Register handler for preset clicks when there's an awaiting action
        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: (event) => {
                return FGMSubAction.getAwaitingAction() !== null;
            },
            handler: (event) => this.handlePresetClickWithAwaitingAction(event),
            priority: 100 // Very high priority to handle before other handlers
        });

        // Register handler for window clicks when there's an awaiting action
        this.on(FGMEventTypes.WINDOW_CLICKED, {
            filter: (event) => {
                return FGMSubAction.getAwaitingAction() !== null;
            },
            handler: (event) => this.handleWindowClickWithAwaitingAction(event),
            priority: 100 // Very high priority
        });

        console.log('[AwaitingActionsModule] Initialized');
    }

    handlePresetClickWithAwaitingAction(event) {
        const { window: fromWindow, data, singlePreset } = event.data;
        const awaitingValue = FGMSubAction.getAwaitingAction();

        const handler = FGMActionRegistry.getHandler(awaitingValue);
        if (handler) {
            handler.handleInteraction(
                new FGMHandleAwaitActionStore()
                    .setAction(awaitingValue)
                    .setWindow(fromWindow)
                    .setSinglePreset(singlePreset)
                    .setData(data)
            );
        }

        // Stop propagation so other handlers don't process this
        event.stopPropagation();
    }

    handleWindowClickWithAwaitingAction(event) {
        const { window } = event.data;
        const awaitingValue = FGMSubAction.getAwaitingAction();

        const handler = FGMActionRegistry.getHandler(awaitingValue);
        if (handler) {
            handler.handleInteraction(
                new FGMHandleAwaitActionStore()
                    .setAction(awaitingValue)
                    .setWindow(window)
            );
        }

        // Stop propagation
        event.stopPropagation();
    }
}
