class FGMShowFile {
    constructor(json = false) {

        this.showFile = {
            version: {
                fgm: "0.0.1",
                hcw: "0.0.1",
            },
            name: "My First Show",
            createdByHCWArtnetType: "6Channel", // FullFGM, CustomFGM, 12Channel, 6Channel
            description: "",
            hcwSettings: {
                everyPixelX: 100,
                everyPixelY: 100,
                crosslineLength: 0.1,
                lineColor: '#00ff95'

            },
            media: {

            },
            fixtures: {

            },
            pages: {
                cursor: 0,
                content: {

                }
            }
        }

        this.hcwMain = null;

        if (json !== false) {
            this.showFile = json;
        }

        this.loadShow();
    }

    debugLogs() {
        console.log(this.showFile);
    }

    getVersions() {
        return {
            fgmV: this.fgmV,
            hcwV: this.hcwV
        }
    }

    getName() {
        return this.showFile.name;
    }

    setName(name = "MyShow") {
        this.showFile.name = name;
    }

    getDescription() {
        return this.showFile.description;
    }

    setDescription(description = "MyShow") {
        this.showFile.description = description;
    }

    getPage(page = 0) {
        return this.showFile.pages[page];
    }

    getPages() {
        return this.showFile.pages;
    }

    setShow(newShowFile) {
        this.showFile = newShowFile;
    }

    getShowFile() {
        return this.showFile;
    }

    getHCWSettings() {
        return this.getShowFile().hcwSettings;
    }

    getHCW() {
        return HCWDB.getHCW();
    }

    loadShow() {

        //destory other show if present

        new HCWSetup('hcw-canvas', '/')
            .setGrid({
                everyPixelX: this.getHCWSettings().everyPixelX,
                everyPixelY: this.getHCWSettings().everyPixelY,
                crossLineLength: this.getHCWSettings().crossLineLength,
                lineColor: this.getHCWSettings().lineColor
            }).addWindow(new HCWWindow({ x: 0, y: 400, sx: 100, sy: 400 }).setMinSizes(100, 100).setId(Date.now() + 10).setContextField(new HCWFaderField("Dimmer 01", Date.now()).setFloat(0.5).setLocationId("1.220")))
    }
}