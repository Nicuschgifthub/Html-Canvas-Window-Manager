const start = () => {
    FGMShowHandler = new FGMShowFile();
    FGMWindowManager.buildDefaultSetup();
    FGMShowHandler.setPageCursor();

    FGMMapping.init();
    FGMFixtureSheet.init();
    FGMPools.init();
    FGMShowHandler.loadPatchFromShowFile();
    DMXOutput.start();
    FGMEffectEngine.init();
}

setTimeout(() => {
    start();
}, 1000);