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

    async loadInital() {
        console.log('[FGM Setup] Registering feature modules...');
        FGMModuleRegistry.register(new FGMAwaitingActionsModule());
        FGMModuleRegistry.register(new FGMPageModule());
        FGMModuleRegistry.register(new FGMProgrammerModule());
        FGMModuleRegistry.register(new FGMArtNetModule());
        FGMModuleRegistry.register(new FGMEditNameModule());
        FGMModuleRegistry.register(new FGMFixturePatchModule());
        FGMModuleRegistry.register(new FGMPoolModule());
        FGMModuleRegistry.register(new FGMStoreModule());
        FGMModuleRegistry.register(new FGMProgrammerSheetModule());

        // Initialize all modules
        FGMModuleRegistry.initializeAll();
        console.log('[FGM Setup] All modules initialized');

        FGMKernel.eventInit();

        try {
            const response = await fetch('/FGM/fixture-library.json');
            const libraryData = await response.json();
            const lib = new FGMLibrary().loadLibrary(libraryData);
            FGMStore.setLibrary(lib);
            console.log("FGM Setup: Fixture library loaded successfully.", libraryData);
        } catch (e) {
            console.error("FGM Setup: Failed to load fixture library:", e);
        }

        const basePages = FGMBaseWindows.pageView(10);
        const baseFixtureControl = FGMBaseWindows.fixtureControl();

        const hiddenInputs = FGMBaseWindows.hiddenInputDevices();
        const inOutWindows = FGMBaseWindows.inOut();
        const artNetSettings = FGMBaseWindows.artNetSettings();

        const fixtureTable = FGMBaseWindows.fixtureTable();

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
            .addWindow(fixtureTable.fixtureTableWindow)
            .addWindow(fixtureTable.fixtureSearchWindow)
            .addWindow(baseFixtureControl.groupPool)
            .addWindow(baseFixtureControl.fixturePool)
            .addWindow(baseFixtureControl.dimmerPool)
            .addWindow(baseFixtureControl.colorPool)
            .addWindow(baseFixtureControl.positionPool)
            .addWindow(baseFixtureControl.allPool)
            .addWindow(baseFixtureControl.programmerSheet)
            .addWindow(baseFixtureControl.zoomEncoder)
            .addWindow(baseFixtureControl.focusEncoder)
            .addWindow(baseFixtureControl.colorWheelEncoder)
            .addWindow(baseFixtureControl.shutterEncoder)
    }

    saveShow() {

    }

    loadShow(show = {}) {

    }
}