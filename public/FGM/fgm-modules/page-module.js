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
            filter: FGMEventFilter.hasPresetData('_goToPage'),
            handler: (event) => this.handlePageChange(event),
            priority: 20
        });

        console.log('[PageModule] Initialized');
    }

    handlePageChange(event) {
        const { window: fromWindow, field: fromPreset, data, singlePreset } = event.data;
        const pageId = data._goToPage;

        FGMPageHandler.pageChange(pageId, fromPreset, singlePreset, fromWindow);
        event.stopPropagation();
    }
}