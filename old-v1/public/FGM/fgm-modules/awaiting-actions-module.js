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

        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: (event) => {
                return FGMSubAction.getAwaitingAction() !== null;
            },
            handler: (event) => this.handlePresetClickWithAwaitingAction(event),
            priority: 100
        });

        this.on(FGMEventTypes.WINDOW_CLICKED, {
            filter: (event) => {
                return FGMSubAction.getAwaitingAction() !== null;
            },
            handler: (event) => this.handleWindowClickWithAwaitingAction(event),
            priority: 100
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

        event.stopPropagation();
    }
}
