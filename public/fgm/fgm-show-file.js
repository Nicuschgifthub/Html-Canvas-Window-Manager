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
            createdByHCWType: "FullFGM", // FullFGM, CustomFGM, 12Channel, 6Channel
            info: {

            },
            settings: {
                valueType: GLOBAL_TYPES.DMX_VALUE_TYPE.PERCENT,
                artnet: {
                    enabled: false,
                    ip: '255.255.255.255',
                    port: 6454,
                    universeStart: 0,
                    rate: 30
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
            // parsed GDTF fixture types, key → model (see GDTFParser)
            fixtureTypes: {

            },
            // patched fixtures: [{ fid, name, typeKey, modeName, universe, address }]
            patch: [],
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
                mapping: {
                    // what each control does, location id → assignment (see FGMMapping)
                    controls: {

                    }
                },
                pools: {

                },
                // effect definitions — evaluated by the console server (server/effect-engine.js)
                effects: []
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
        const windows = (typeof HCWDB !== 'undefined' && HCWDB.getWindows) ? HCWDB.getWindows() : [];
        // rebuild from scratch — appending would duplicate every window on each save
        this.showFile.pages.content = {};
        windows.forEach(window => {
            if (!window) return;
            // temporary dialogs (menus, keyboards, panels) are not part of the show
            const page = window.getPageId();
            if (page === GLOBAL_CORE.DEFS.PAGES.EMPTY || page === GLOBAL_CORE.DEFS.PAGES.INPUT_PAGE) return;
            const factory = globalThis.HCWFactory || (typeof HCWFactory !== 'undefined' ? HCWFactory : null);
            const serializedWindow = factory ? factory.serialize(window) : JSON.stringify(window);
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
                        const factory = globalThis.HCWFactory || (typeof HCWFactory !== 'undefined' ? HCWFactory : null);
                        const windowInstance = factory ? factory.reconstruct(windowData) : null;
                        if (windowInstance) allWindows.push(windowInstance);
                    });
                }
            });
        }

        return allWindows;
    }

    // ─── Fixtures (library + patch live in PatchManager) ──────────────────

    /** Copy the live patch / fixture types into the show file object. */
    syncPatchToShowFile() {
        if (typeof PatchManager === 'undefined') return;
        this.showFile.fixtureTypes = PatchManager.typesToJSON();
        this.showFile.patch = PatchManager.toJSON();
    }

    /** Rebuild PatchManager, assignments and output from the show file object. */
    loadPatchFromShowFile() {
        if (typeof PatchManager === 'undefined') return;
        if (!this.showFile.fixtureTypes) this.showFile.fixtureTypes = {};
        if (!this.showFile.patch) this.showFile.patch = [];
        PatchManager.loadFromShow(this.showFile);
        if (typeof Programmer !== 'undefined') Programmer.clearSelection();
        if (typeof FGMMapping !== 'undefined') FGMMapping.refreshAll(true);
    }

    exportShowJSON() {
        this.saveWindowsToShowFilePages();
        this.syncPatchToShowFile();
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
        // the id / location lookups still point at the windows that were just dropped —
        // without this every control press (and the page highlight) acts on invisible old fields
        if (typeof HCWDB !== 'undefined' && typeof HCWDB._syncIndexes === 'function') HCWDB._syncIndexes();

        this.setPageCursor(this.showFile.pages.cursor || 0);
        this.loadPatchFromShowFile();
        // the console server gets the new show's settings + effects (patch / values follow by events)
        if (typeof ConsoleLink !== 'undefined') ConsoleLink.pushAll();

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