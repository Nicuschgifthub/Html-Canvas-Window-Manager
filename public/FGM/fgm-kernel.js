class FGMSubKernel {

}

class FGMKernel {
    static eventPresetClicked(fromWindow, fromPreset, data, singlePreset) {
        FGMPageHandler.pageChange
        if (data._goToPage !== undefined) { FGMPageHandler.pageChange(data._goToPage, fromPreset, singlePreset, fromWindow); return };

    }

    static eventFaderUpdate(fromWindow, fromFader, data) {

        if (fromFader.getFGMFaderType() == FGMTypes.PROGRAMMER.DIMMERS.MAIN) {
            console.log("main Dimmer", data)
        }

    }
}