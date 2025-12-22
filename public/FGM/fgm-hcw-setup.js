

class FGMwithHCW {
    constructor(canvasId, srcPath = "/") {
        FGMStore.saveHCWClass(new HCWSetup(canvasId));
        FGMStore.saveFGMClass(this);
    }

    hcwGrid(hcwOptions = {}) {
        FGMStore.getHCW()
            .setGrid(hcwOptions.everyPixelX, hcwOptions.everyPixelY, hcwOptions.crosslineLength, hcwOptions.lineColor)
    }
}