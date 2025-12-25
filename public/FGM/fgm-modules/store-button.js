class FGMEditNameModule extends FGMFeatureModule {
    constructor() {
        super('store-button', '1.0.0');
    }

    init() {

        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: FGMEventFilter.byPresetData('_actionId', FGMTypes.ACTIONS.BUTTON.STORE),
            handler: (event) => handleStoreInteraction(event),
            priority: 10
        });
    }

    async handleStoreInteraction(actionStore) {

    }
}