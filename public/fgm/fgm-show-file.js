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
        const windows = (typeof HCWDB !== 'undefined' && HCWDB.getWindows) ? HCWDB.getWindows() : [];
        windows.forEach(window => {
            if (!window) return;
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

    // ─── Fixture Library ───────────────────────────────────────────────────

    getFixtures() {
        return this.showFile.fixtures || {};
    }

    /**
     * Add a parsed GDTF result into the show file's fixture library.
     * Stores the full definition + pre-resolved attribute channel map per mode.
     * Key is auto-generated from manufacturer + fixture name.
     *
     * @param {object} gdtfResult  Output from GDTFParser.loadFromFile()
     * @returns {string} fixtureKey
     */
    addFixtureToShow(gdtfResult) {
        if (!this.showFile.fixtures) this.showFile.fixtures = {};

        // Build a stable key from manufacturer + name (slugified)
        const slug = `${gdtfResult.manufacturer}_${gdtfResult.name}`
            .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

        // Avoid duplicates — append counter if key exists
        let key = slug;
        let counter = 1;
        while (this.showFile.fixtures[key] && counter < 999) {
            key = `${slug}_${counter++}`;
        }

        // Build per-mode attribute maps using AttributeBook resolution
        const mappedModes = gdtfResult.modes.map(mode => {
            const attributeChannels = {};

            mode.channels.forEach(ch => {
                // Try to resolve the GDTF attribute name to a canonical book entry
                const resolved = (typeof AttributeBook !== 'undefined')
                    ? AttributeBook.resolve(ch.attribute)
                    : null;

                const canonName = resolved ? resolved.name : ch.attribute;

                attributeChannels[canonName] = {
                    // Resolved attribute info
                    attribute:     canonName,
                    pretty:        resolved ? resolved.pretty        : ch.attribute,
                    featureGroup:  resolved ? resolved.featureGroup  : 'Unknown',
                    feature:       resolved ? resolved.feature       : 'Unknown',
                    physicalUnit:  resolved ? resolved.physicalUnit  : 'None',
                    encoderBehaviour: resolved ? resolved.encoderBehaviour : 'absolute',
                    defaultMin:    resolved ? resolved.defaultMin    : 0,
                    defaultMax:    resolved ? resolved.defaultMax    : 255,
                    icon:          resolved ? resolved.icon          : '?',
                    // Raw GDTF channel data
                    gdtfAttribute: ch.attribute,
                    offsets:       ch.offset,     // relative offsets within mode footprint (1-indexed)
                    is16bit:       ch.is16bit,
                    default:       ch.default,
                    geometry:      ch.geometry,
                    // Resolved flag
                    resolved:      !!resolved,
                };
            });

            return {
                name:           mode.name,
                description:    mode.description,
                channelCount:   mode.channelCount,
                attributeChannels,              // canonical attr name → channel map
                unmappedCount:  mode.channels.filter(ch => {
                    if (typeof AttributeBook === 'undefined') return true;
                    return !AttributeBook.resolve(ch.attribute);
                }).length
            };
        });

        this.showFile.fixtures[key] = {
            key,

            // ── Identity ──────────────────────────────────────────────────
            name:         gdtfResult.name,
            shortName:    gdtfResult.shortName,
            manufacturer: gdtfResult.manufacturer,
            description:  gdtfResult.description,
            dataVersion:  gdtfResult.dataVersion,

            // ── Thumbnail (first image from thumbnails/ folder) ───────────
            thumbnail: gdtfResult.images
                ? (Object.entries(gdtfResult.images).find(([k]) => k.toLowerCase().startsWith('thumbnails/'))?.[1] || null)
                : null,

            // ── DMX Modes with fully remapped attribute channels ──────────
            // attributeChannels: canonical attr name → { offsets, is16bit, featureGroup, ... }
            modes: mappedModes,

            // ── Wheels with gobo images already embedded on each slot ─────
            // slot.image = base64 data URL if extracted from ZIP
            wheels: gdtfResult.wheels,

            // ── All extracted images keyed by ZIP path ────────────────────
            // e.g. { 'wheels/Gobo1_Open.png': 'data:image/png;base64,...' }
            images: gdtfResult.images || {},

            // ── Physical info (weight, connectors, operating temp) ────────
            physical: gdtfResult.physical || null,
        };



        console.log(
            `%c 📁 Fixture saved to show: ${gdtfResult.manufacturer} ${gdtfResult.name} → "${key}"`,
            'background:#1a3322; color:#00ff95; font-size:11px; padding:2px 6px; border-radius:3px;'
        );

        return key;
    }

    removeFixture(key) {
        if (this.showFile.fixtures && this.showFile.fixtures[key]) {
            delete this.showFile.fixtures[key];
        }
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