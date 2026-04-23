const start = () => {

    FGMShowHandler = new FGMShowFile();

    // Temporary Actions as now showfile can be loaded currently

    FGMWindowManager.buildDefaultSetup();
    FGMShowHandler.setPageCursor();
}

setTimeout(() => {
    start();
}, 1000);