/**
 * Page Handler Module
 * Handles page navigation and page-related functionality
 */
class FGMPageModule extends FGMFeatureModule {
    constructor() {
        super('page-handler', '1.0.0');
    }

    init() {
        console.log('[PageModule] Initializing...');

        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: (event) => {
                if (FGMSubAction.getAwaitingAction()) {
                    return false;
                }
                const data = event.data.presetData || event.data.data;
                return data?._goToPage !== undefined;
            },
            handler: (event) => this.handlePageChange(event),
            priority: 20
        });

        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: (event) => {
                if (FGMSubAction.getAwaitingAction()) {
                    return false;
                }
                const data = event.data.presetData || event.data.data;
                return data?._programmerAction !== undefined;
            },
            handler: (event) => this.handleProgrammerAction(event),
            priority: 15
        });

        console.log('[PageModule] Initialized');
    }

    handlePageChange(event) {
        const { window: fromWindow, field: fromPreset, data, singlePreset } = event.data;
        const pageId = data._goToPage;

        FGMPageHandler.pageChange(pageId, fromPreset, singlePreset, fromWindow);
        event.stopPropagation();
    }

    handleProgrammerAction(event) {
        const { data, singlePreset } = event.data;
        const actionType = data._programmerAction;

        FGMSubAction.setAwaitingAction(actionType, {}, singlePreset);
    }
}
