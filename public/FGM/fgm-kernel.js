class FGMSubKernel {
    static pageChange(goToPage, fromPreset, singlePreset) {
        fromPreset.updatePreset(singlePreset.id, { color: FGMColors.PAGES.ACTIVE });
        fromPreset.updateAllPresets({ color: FGMColors.PAGES.BACKGROUND }, [singlePreset.id]);
    }
}

class FGMKernel {
    static eventPresetClicked(fromWindow, fromPreset, data, singlePreset) {

        if (data._goToPage !== undefined) { FGMSubKernel.pageChange(data._goToPage, fromPreset, singlePreset); return };


    }
}