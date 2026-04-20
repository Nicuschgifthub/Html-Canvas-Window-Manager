class FGMShowFile {
    constructor(json = false) {

        // base showFile
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
                crossLineLength: 0.1,
                lineColor: '#00ff95'
            },
            media: {

            },
            fixtures: {

            },
            pages: {
                cursor: 0,
                content: {
                    "every": [],
                    // every is a page that is shown, always
                    "0": [],
                    // 0 are settings etc
                    "1": [{ "className": "HCWWindow", "x": 0, "y": 400, "sx": 100, "sy": 400, "type": "default", "id": 1776702975570, "minsizex": 100, "minsizey": 100, "basecolor": "#454545", "touchzonecolor": "#969696", "touchzonehighlightcolor": "#d6d6d6", "touchzone": 12, "touchzones": { "top": { "starty": 400, "startx": 0, "endy": 412, "endx": 100 }, "bottom": { "starty": 788, "startx": 0, "endy": 800, "endx": 100 }, "left": { "starty": 400, "startx": 0, "endy": 800, "endx": 12 }, "right": { "starty": 400, "startx": 88, "endy": 800, "endx": 100 } }, "boundingbox": { "startx": 0, "starty": 400, "endx": 100, "endy": 800 }, "contextwindow": { "x": 12, "y": 412, "x2": 88, "y2": 788, "sx": 76, "sy": 376 }, "contextfield": { "label": "Fader 1", "renderProps": { "colors": { "background": "#1b1717ff", "fader": "#574b4bff", "text": "#ffffff" }, "startX": 12, "startY": 412, "endX": 88, "endY": 788, "sx": 76, "sy": 376 }, "className": "HCWFaderField", "address": { "keyword": "Fader", "childKeyword": null, "locationId": "1.100" }, "value": 0, "displayType": "byte", "_isDragging": false, "_clickStartY": 587, "_initialValue": 0 }, "scrollindex": 1, "scrollindexratio": 1.2, "hidden": false, "pageId": 0, "data": {} }]
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

    setPageCursor(pageNumber = 0) {
        this.showFile.pages.cursor = pageNumber;
        // run hide etc to show new page
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

    createAllWindowsFromShowFile() {
        const showFile = this.getShowFile();
        const allWindows = [];

        Object.keys(showFile.pages.content).forEach(pageId => {
            showFile.pages.content[pageId].forEach(windowData => {
                const windowInstance = HCWFactory.reconstruct(windowData);
                allWindows.push(windowInstance);
            });
        });

        return allWindows;
    }

    loadShow() {

        //destory other show if present

        new HCWSetup('hcw-canvas', '/')
            .setGrid({
                everyPixelX: this.getHCWSettings().everyPixelX,
                everyPixelY: this.getHCWSettings().everyPixelY,
                crossLineLength: this.getHCWSettings().crossLineLength,
                lineColor: this.getHCWSettings().lineColor
            }).addWindows(this.createAllWindowsFromShowFile())

        // show only page cursor context
    }
}