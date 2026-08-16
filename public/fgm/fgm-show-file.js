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
                },
                pools: {

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
        this.showFile.pages.content = {};
        const windows = (typeof HCWDB !== 'undefined' && HCWDB.getWindows) ? HCWDB.getWindows() : [];
        windows.forEach(window => {
            if (!window) return;
            const serializedWindow = HCWFactory.serialize(window);
            const pageId = window.getPageId();

            if (!this.getPages()[pageId]) this.getPages()[pageId] = [];

            let windowData = serializedWindow;
            if (typeof serializedWindow === 'string') {
                try { windowData = JSON.parse(serializedWindow); } catch (e) { }
            }

            this.getPages()[pageId].push(windowData);
        });
    }

    getNewWindowsFromShowFile() {
        const showFile = this.getShowFile();
        const allWindows = [];

        if (showFile && showFile.pages && showFile.pages.content) {
            Object.keys(showFile.pages.content).forEach(pageId => {
                const pageWindows = showFile.pages.content[pageId];
                if (Array.isArray(pageWindows)) {
                    pageWindows.forEach(windowData => {
                        const windowInstance = HCWFactory.reconstruct(windowData);
                        if (windowInstance) allWindows.push(windowInstance);
                    });
                }
            });
        }

        return allWindows;
    }

    exportShowJSON() {
        this.saveWindowsToShowFilePages();
        return JSON.stringify(this.showFile, null, 2);
    }

    exportShowToFile(filename = null) {
        const jsonStr = this.exportShowJSON();
        const defaultName = (this.getName() || "show").toLowerCase().replace(/\s+/g, '_');
        const name = filename || `${defaultName}_show.json`;

        if (typeof document !== 'undefined') {
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        return jsonStr;
    }

    importShowJSON(json) {
        let data = json;
        if (typeof json === 'string') {
            try {
                data = JSON.parse(json);
            } catch (e) {
                console.error("Failed to parse show JSON:", e);
                return false;
            }
        }

        if (!data || typeof data !== 'object' || !data.pages) {
            console.error("Invalid show file structure");
            return false;
        }

        this.showFile = data;

        const existingWindows = (typeof HCWDB !== 'undefined' && HCWDB.getWindows) ? HCWDB.getWindows() : [];
        if (existingWindows) {
            existingWindows.length = 0;
        }

        const newWindows = this.getNewWindowsFromShowFile();
        if (this.HCWClass) {
            this.HCWClass.addWindows(newWindows);
        } else if (typeof HCWDB !== 'undefined' && typeof HCWDB.addWindows === 'function') {
            HCWDB.addWindows(newWindows);
        }

        this.setPageCursor(this.showFile.pages.cursor || 0);

        if (typeof HCWRender !== 'undefined' && typeof HCWRender.updateFrame === 'function') {
            HCWRender.updateFrame();
        }

        return true;
    }

    importShowFromFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) return reject(new Error("No file provided"));
            const reader = new FileReader();
            reader.onload = (e) => {
                const success = this.importShowJSON(e.target.result);
                if (success) resolve(this.getShowFile());
                else reject(new Error("Failed to load show file JSON"));
            };
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
        });
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