class FGMPageHandler {

    static pageChange(goToPage, fromPreset, singlePreset, fromWindow) {
        fromPreset.updatePreset(singlePreset.id, { color: FGMColors.PAGES.ACTIVE });
        fromPreset.updateAllPresets({ color: null }, [singlePreset.id]);

        const windows = FGMStore.getHCW().getWindows();

        windows.forEach(window => {
            if (window.getPageId() == goToPage) {
                window.setHidden(false);
                return;
            }

            if (window.getPageId() !== null) {
                window.setHidden(true);
            }
        });
    }

    static get PAGE_ENUMS() {
        return {
            SETUP: 'setup_page',
            LINK_SETTINGS: 'link_settings',
            FIXTURE_CONTROL: 'fixture_control'
        }
    }
}