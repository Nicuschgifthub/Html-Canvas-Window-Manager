class FGMSubKernel {
    static pageChange(goToPage, fromPreset, singlePreset, fromWindow) {


        console.dir(fromPreset.toJSON(), { depth: null })

        saved = FGMWindowManager.saveToJson(fromWindow);

        fromPreset.updatePreset(singlePreset.id, { color: FGMColors.PAGES.ACTIVE });
        fromPreset.updateAllPresets({ color: FGMColors.PAGES.BACKGROUND }, [singlePreset.id]);

        fromWindow.close()
    }
}

class FGMKernel {
    static eventPresetClicked(fromWindow, fromPreset, data, singlePreset) {

        if (data._goToPage !== undefined) { FGMSubKernel.pageChange(data._goToPage, fromPreset, singlePreset, fromWindow); return };

    }
}