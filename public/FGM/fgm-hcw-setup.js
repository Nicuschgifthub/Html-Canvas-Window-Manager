class FGMwithHCW {
    constructor(canvasId, srcPath = "/") {
        FGMStore.saveHCWClass(new HCWSetup(canvasId));
        FGMStore.saveFGMClass(this);
    }

    hcwGrid(hcwOptions = {}) {
        FGMStore.getHCW()
            .setGrid(hcwOptions.everyPixelX, hcwOptions.everyPixelY, hcwOptions.crosslineLength, hcwOptions.lineColor);
        return this;
    }

    loadInital() {
        const basePages = FGMBaseWindows.pageView(10);
        const baseFixtureControl = FGMBaseWindows.fixtureControl();

        const hiddenInputs = FGMBaseWindows.hiddenInputDevices();
        const inOutWindows = FGMBaseWindows.inOut();
        const artNetSettings = FGMBaseWindows.artNetSettings();

        FGMStore.getHCW()
            .addWindow(basePages)
            .addWindow(baseFixtureControl.dimFader)
            .addWindow(baseFixtureControl.panEncoder)
            .addWindow(baseFixtureControl.tiltEncoder)
            .addWindow(baseFixtureControl.colorPicker)
            .addWindow(baseFixtureControl.programmerActions)
            .addWindow(inOutWindows.trigger)
            .addWindow(artNetSettings)
            .addWindow(hiddenInputs.keyboard)
    }

    saveShow() {

    }

    loadShow(show = {}) {

    }
}