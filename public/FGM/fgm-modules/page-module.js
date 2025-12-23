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

        // Register handler for preset clicks that trigger page changes
        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: (event) => {
                const data = event.data.presetData || event.data.data;
                return data?._goToPage !== undefined;
            },
            handler: (event) => this.handlePageChange(event),
            priority: 20 // Higher priority to handle before other preset handlers
        });

        // Register handler for preset clicks that trigger programmer actions
        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: (event) => {
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

        // Stop propagation so other handlers don't process this
        event.stopPropagation();
    }

    handleProgrammerAction(event) {
        const { data, singlePreset } = event.data;
        const actionType = data._programmerAction;

        FGMSubAction.setAwaitingAction(actionType, {}, singlePreset);

        // Stop propagation
        event.stopPropagation();
    }
}
