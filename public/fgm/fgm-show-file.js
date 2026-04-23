class FGMShowFile {
    constructor(json = false) {

        // base showFile
        this.showFile = {
            version: {
                fgm: "0.0.1",
                hcw: "0.0.1",
            },
            name: "My First Show",
            description: "",
            createdByHCWArtnetType: "FullFGM", // FullFGM, CustomFGM, 12Channel, 6Channel
            info: {

            },
            settings: {
                valueType: GLOBAL_TYPES.DMX_VALUE_TYPE.PERCENT,
                artnet: {

                }
            },
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
                content: {}
            },
            memory: {
                programmer: {

                },
                dmxUniverses: {
                    0: [] // universe 0 with 512 * (8Bit 0-255)  
                },
                executor: {

                },
                mapping: { // examples
                    directFixtureLink: {
                        1.002: {
                            fixtureId: 1,
                            fixtureAttribute: 1,
                            fixtureChannel: 1
                        }
                    },
                    executorLink: {
                        1.002: {
                            executorId: 1,
                            executorAttribute: "speed"
                        }
                    }
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

    setPageEmpty() {
        HCWDB.getWindows().forEach(window => {
            const pageId = window.getPageId();
            window.setHidden(true);
        })
    }

    setPagePresetGroupHighlight(pageNumber) {
        if (pageNumber < 0) return;
        const presetGroup = HCWDB.getContextFieldByLocationId(GLOBAL_CORE.CONTEXT_FIELDS.PAGE_MENU.LOCATION_ID)
        if (!presetGroup) {
            console.warn(`Cannot find any Preset Group for Page Changes`);
            return;
        }
        presetGroup.updateAllPresets({ color: null }, [pageNumber]);
        presetGroup.updatePreset(pageNumber, { color: GLOBAL_STYLES.FIELDS.PRESETS.HIGHLIGHT_COLOR });
    }

    setPageCursor(pageNumber = this.showFile.pages.cursor) {
        this.showFile.pages.cursor = pageNumber;

        this.setPagePresetGroupHighlight(pageNumber);

        HCWDB.getWindows().forEach(window => {
            const pageId = window.getPageId();

            if (pageId == -3 || pageId == -2 || pageId == -1 || pageId == pageNumber) {
                window.setHidden(false);
            } else {
                if (window.getHiddenStatus() == false) window.setHidden(true);
            }
        })
    }

    getValueTypeSettings() {
        return this.showFile.settings.valueType;
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

        this.setPageCursor();
    }
}