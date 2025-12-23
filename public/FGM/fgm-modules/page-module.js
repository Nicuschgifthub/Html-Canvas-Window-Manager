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
                // Don't handle if there's an awaiting action - let the action handler deal with it
                if (FGMSubAction.getAwaitingAction()) {
                    return false;
                }
                const data = event.data.presetData || event.data.data;
                return data?._goToPage !== undefined;
            },
            handler: (event) => this.handlePageChange(event),
            priority: 20 // Higher priority to handle before other preset handlers
        });

        // Register handler for preset clicks that trigger programmer actions
        this.on(FGMEventTypes.PRESET_CLICKED, {
            filter: (event) => {
                // Don't handle if there's already an awaiting action
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

        // Stop propagation so other handlers don't process this
        event.stopPropagation();
    }

    handleProgrammerAction(event) {
        const { data, singlePreset } = event.data;
        const actionType = data._programmerAction;

        FGMSubAction.setAwaitingAction(actionType, {}, singlePreset);

        // Don't stop propagation - let the kernel's backward compatibility code handle the awaiting action
    }
}
