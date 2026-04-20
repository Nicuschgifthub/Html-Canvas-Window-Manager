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
                cursor: 'every',
                content: {
                    "0": [
                        "{\"className\":\"HCWWindow\",\"x\":300,\"y\":0,\"sx\":100,\"sy\":600,\"type\":\"default\",\"id\":1776711171516,\"minsizex\":100,\"minsizey\":100,\"basecolor\":\"#454545\",\"touchzonecolor\":\"#969696\",\"touchzonehighlightcolor\":\"#d6d6d6\",\"touchzone\":12,\"touchzones\":{\"top\":{\"starty\":0,\"startx\":300,\"endy\":12,\"endx\":400},\"bottom\":{\"starty\":588,\"startx\":300,\"endy\":600,\"endx\":400},\"left\":{\"starty\":0,\"startx\":300,\"endy\":600,\"endx\":312},\"right\":{\"starty\":0,\"startx\":388,\"endy\":600,\"endx\":400}},\"boundingbox\":{\"startx\":300,\"starty\":0,\"endx\":400,\"endy\":600},\"contextwindow\":{\"x\":312,\"y\":12,\"x2\":388,\"y2\":588,\"sx\":76,\"sy\":576},\"contextfield\":{\"label\":\"My Sets\",\"renderProps\":{\"colors\":{\"background\":\"#1b1717ff\",\"headerText\":\"#ffffff\",\"itemText\":\"#ffffffff\",\"itemDefaultColor\":\"#aaaaaa\",\"itemPressedColor\":\"#ffffff\"},\"startX\":312,\"startY\":12,\"endX\":388,\"endY\":588,\"sx\":76,\"sy\":576,\"cols\":1,\"visibleItems\":[{\"index\":0,\"x\":312,\"y\":42,\"w\":76,\"h\":60},{\"index\":1,\"x\":312,\"y\":107,\"w\":76,\"h\":60}]},\"actionFunction\":null,\"className\":\"HCWPresetField\",\"address\":{\"keyword\":\"PresetGroup\",\"childKeyword\":\"Preset\",\"locationId\":\"0.002\"},\"presets\":[{\"className\":\"HCWPreset\",\"presetId\":0,\"name\":\"Settings\",\"color\":\"#005b2f\",\"defaultColor\":null,\"data\":{\"_pageChangeTo\":\"every\"},\"progress\":null,\"flashing\":false,\"selectionState\":0},{\"className\":\"HCWPreset\",\"presetId\":1,\"name\":\"Page 1\",\"color\":\"#00059c\",\"defaultColor\":null,\"data\":{\"_pageChangeTo\":1},\"progress\":null,\"flashing\":false,\"selectionState\":0}],\"scrollY\":0,\"itemMinWidth\":80,\"itemHeight\":60,\"gap\":5,\"headerHeight\":30,\"_dragLastY\":null,\"_pressedIndex\":-1},\"scrollindex\":1,\"scrollindexratio\":1.2,\"hidden\":false,\"pageId\":0,\"data\":{}}",

                    ],
                    "1": [
                        "{\"className\":\"HCWWindow\",\"x\":0,\"y\":0,\"sx\":100,\"sy\":600,\"type\":\"default\",\"id\":1776711171517,\"minsizex\":100,\"minsizey\":100,\"basecolor\":\"#454545\",\"touchzonecolor\":\"#969696\",\"touchzonehighlightcolor\":\"#d6d6d6\",\"touchzone\":12,\"touchzones\":{\"top\":{\"starty\":0,\"startx\":0,\"endy\":12,\"endx\":100},\"bottom\":{\"starty\":588,\"startx\":0,\"endy\":600,\"endx\":100},\"left\":{\"starty\":0,\"startx\":0,\"endy\":600,\"endx\":12},\"right\":{\"starty\":0,\"startx\":88,\"endy\":600,\"endx\":100}},\"boundingbox\":{\"startx\":0,\"starty\":0,\"endx\":100,\"endy\":600},\"contextwindow\":{\"x\":12,\"y\":12,\"x2\":88,\"y2\":588,\"sx\":76,\"sy\":576},\"contextfield\":{\"label\":\"My Sets\",\"renderProps\":{\"colors\":{\"background\":\"#1b1717ff\",\"headerText\":\"#ffffff\",\"itemText\":\"#ffffffff\",\"itemDefaultColor\":\"#aaaaaa\",\"itemPressedColor\":\"#ffffff\"},\"startX\":12,\"startY\":12,\"endX\":88,\"endY\":588,\"sx\":76,\"sy\":576,\"cols\":1,\"visibleItems\":[{\"index\":0,\"x\":12,\"y\":42,\"w\":76,\"h\":60},{\"index\":1,\"x\":12,\"y\":107,\"w\":76,\"h\":60}]},\"actionFunction\":null,\"className\":\"HCWPresetField\",\"address\":{\"keyword\":\"PresetGroup\",\"childKeyword\":\"Preset\",\"locationId\":\"0.002\"},\"presets\":[{\"className\":\"HCWPreset\",\"presetId\":0,\"name\":\"Settings\",\"color\":\"#005b2f\",\"defaultColor\":null,\"data\":{\"_pageChangeTo\":\"every\"},\"progress\":null,\"flashing\":false,\"selectionState\":0},{\"className\":\"HCWPreset\",\"presetId\":1,\"name\":\"Page 1\",\"color\":\"#00059c\",\"defaultColor\":null,\"data\":{\"_pageChangeTo\":1},\"progress\":null,\"flashing\":false,\"selectionState\":0}],\"scrollY\":0,\"itemMinWidth\":80,\"itemHeight\":60,\"gap\":5,\"headerHeight\":30,\"_dragLastY\":null,\"_pressedIndex\":-1},\"scrollindex\":1,\"scrollindexratio\":1.2,\"hidden\":false,\"pageId\":1,\"data\":{}}"

                    ]
                }
            }
        }

        this.HCWClass = null;

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
        return this.showFile.pages.content[page];
    }

    getPages() {
        return this.showFile.pages.content;
    }

    setPageCursor(pageNumber = 0) {
        this.showFile.pages.cursor = pageNumber;

        HCWDB.getWindows().forEach(window => {
            const pageId = window.getPageId();

            if (pageId == 0 || pageId == pageNumber) {
                window.setHidden(false);
            } else {
                if (window.getHiddenStatus() == false) window.setHidden(true);
            }
        })
    }

    getPageCursor() {
        return this.showFile.pages.cursor;
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

    getHCWClass() {
        return this.HCWClass;
    }

    saveWindowsToShowFilePages() {
        this.getHCWClass().getWindows().forEach(window => {

            const serializedWindow = HCWFactory.serialize(window);

            if (!this.getPages()[window.getPageId()]) this.getPages()[window.getPageId()] = [];

            this.getPages()[window.getPageId()].push(serializedWindow)
        })
    }

    getNewWindowsFromShowFile() {
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

        this.HCWClass = new HCWSetup('hcw-canvas', '/')
            .setGrid({
                everyPixelX: this.getHCWSettings().everyPixelX,
                everyPixelY: this.getHCWSettings().everyPixelY,
                crossLineLength: this.getHCWSettings().crossLineLength,
                lineColor: this.getHCWSettings().lineColor
            }).addWindows(this.getNewWindowsFromShowFile())

        this.setPageCursor(this.getPageCursor());
    }
}