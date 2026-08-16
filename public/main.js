const start = () => {
    FGMShowHandler = new FGMShowFile();
    FGMWindowManager.buildDefaultSetup();
    FGMShowHandler.setPageCursor();
}

setTimeout(() => {
    start();
}, 1000);