class FGMStore {
    static HCW_Class = null;
    static FGM_Class = null;
    static currentPage = null;
    static artNetNodes = [
        { name: "MyArtNetNode", ip: "192.168.2.200", subnet: "255.0.0.0", universe: "0:0:0", softUni: 1 }
    ];
    static patchedFixtures = [];
    static library = null;

    static setLibrary(lib) {
        this.library = lib;
    }

    static getLibrary() {
        return this.library;
    }

    static saveHCWClass(HCW) {
        this.HCW_Class = HCW;
    }

    static saveFGMClass(FGM) {
        this.FGM_Class = FGM;
    }

    static getHCW() {
        return this.HCW_Class;
    }

    static getFGM() {
        return this.FGM_Class;
    }

    static setCurrentPage(page) {
        this.currentPage = page;
    }

    static getCurrentPage() {
        return this.currentPage;
    }

    static getArtNetNodes() {
        return this.artNetNodes;
    }

    static updateArtNetNode(index, field, value) {
        if (this.artNetNodes[index]) {
            this.artNetNodes[index][field] = value;
        }
    }

    static addArtNetNode() {
        this.artNetNodes.push({
            name: "New Node",
            ip: "0.0.0.0",
            subnet: "255.0.0.0",
            universe: "0:0:0",
            softUni: 1
        });
    }

    static deleteArtNetNode(index) {
        if (this.artNetNodes[index]) {
            this.artNetNodes.splice(index, 1);
        }
    }

    static getPatchedFixtures() {
        return this.patchedFixtures;
    }

    static addPatchedFixture(fixture) {
        this.patchedFixtures.push(fixture);
        if (typeof FGMEventBus !== 'undefined') {
            FGMEventBus.emit(FGMEventTypes.PATCH_CHANGED);
        }
    }

    static updateFixtureMetadata(id, updates = {}) {
        const fixture = this.patchedFixtures.find(f => f.getId() === id);
        if (!fixture) {
            console.error(`FGMStore: Fixture with ID ${id} not found.`);
            return false;
        }

        let changed = false;
        if (updates.id !== undefined && updates.id !== id) {
            const exists = this.patchedFixtures.find(f => f.getId() === updates.id);
            if (exists) {
                console.warn(`FGMStore: Duplicate ID ${updates.id} rejected.`);
                return false;
            }
            fixture.setId(updates.id);
            changed = true;
        }

        if (updates.label !== undefined) {
            fixture.setLabel(updates.label);
            changed = true;
        }

        if (changed && typeof FGMEventBus !== 'undefined') {
            FGMEventBus.emit(FGMEventTypes.PATCH_CHANGED);
        }

        return true;
    }

    static deletePatchedFixture(index) {
        if (this.patchedFixtures[index]) {
            this.patchedFixtures.splice(index, 1);
            if (typeof FGMEventBus !== 'undefined') {
                FGMEventBus.emit(FGMEventTypes.PATCH_CHANGED);
            }
        }
    }

    static presets = {}; // { [poolType]: [ { name, data } ] }

    static getPresets(poolType) {
        return this.presets[poolType] || [];
    }

    static savePreset(poolType, index, name, data) {
        if (!this.presets[poolType]) this.presets[poolType] = [];

        if (data && typeof data === 'object' && !data.id) {
            data.id = FGMIds.getNewId('preset');
        }

        this.presets[poolType][index] = { name, data };

        if (typeof FGMEventBus !== 'undefined') {
            FGMEventBus.emit(FGMEventTypes.PATCH_CHANGED);
        }
    }

    static getPreset(poolType, index) {
        return this.presets[poolType]?.[index] || null;
    }

    static getPresetDataById(presetId) {
        for (let poolType in this.presets) {
            const pool = this.presets[poolType];
            for (let i = 0; i < pool.length; i++) {
                const preset = pool[i];
                if (preset && preset.data && preset.data.id === presetId) {
                    return preset.data;
                }
            }
        }
        return null;
    }

    static swapPresets(poolType, index1, index2) {
        if (!this.presets[poolType]) return false;

        const p1 = this.presets[poolType][index1];
        const p2 = this.presets[poolType][index2];

        this.presets[poolType][index1] = p2;
        this.presets[poolType][index2] = p1;

        if (typeof FGMEventBus !== 'undefined') {
            FGMEventBus.emit(FGMEventTypes.PATCH_CHANGED);
        }
        return true;
    }

    static deletePreset(poolType, index) {
        if (this.presets[poolType] && this.presets[poolType][index]) {
            delete this.presets[poolType][index];
            if (typeof FGMEventBus !== 'undefined') {
                FGMEventBus.emit(FGMEventTypes.PATCH_CHANGED);
            }
            return true;
        }
        return false;
    }

    static renamePreset(poolType, index, newName) {
        if (this.presets[poolType]?.[index]) {
            this.presets[poolType][index].name = newName;
            if (typeof FGMEventBus !== 'undefined') {
                FGMEventBus.emit(FGMEventTypes.PATCH_CHANGED);
            }
            return true;
        }
        return false;
    }

    /**
     * Aggregates all fixture data into 512-byte DMX buffers per universe.
     * @returns {Object} { [universeNumber]: Uint8Array(512) }
     */
    static getUniverseBuffers() {
        const universes = {};
        let activeChannels = 0;

        this.patchedFixtures.forEach(fixture => {
            const uni = fixture.getUniverse() !== undefined ? fixture.getUniverse() : 1;
            const addr = fixture.getAddress() || 1; // 1-based

            if (!universes[uni]) {
                universes[uni] = new Uint8Array(512).fill(0);
            }

            const buffer = universes[uni];
            const functions = fixture.getFunctions();

            if (functions.length === 0) {
                const library = this.getLibrary();
                if (library) {
                    const profile = library.getProfile(fixture.getShortName());
                    if (profile) {
                        console.log(`[Store] Self-healing fixture ${fixture.getId()} with profile ${profile.shortName}`);
                        fixture.loadProfile(profile);
                    }
                }
            }

            if (fixture.getFunctions().length === 0 && !fixture._warnedEmpty) {
                console.warn(`[Store] Fixture ${fixture.getId()} (${fixture.getShortName()}) has NO functions. DMX will be 0. Try re-patching.`);
                fixture._warnedEmpty = true;
            }

            fixture.getFunctions().forEach(func => {
                const dmxVals = func.getDmxValues(); // { offset: value }
                for (let offset in dmxVals) {
                    // FIX: Library offsets in fixture-library.json are already 0-indexed.
                    // addr is 1-based (standard DMX). So (addr - 1) is the 0-based start.
                    // offset is 0-based (already from JSON).
                    const channelIndex = (addr - 1) + parseInt(offset);

                    if (channelIndex >= 0 && channelIndex < 512) {
                        const val = dmxVals[offset];
                        buffer[channelIndex] = val;
                        if (val > 0) {
                            activeChannels++;
                        }
                    }
                }
            });
        });

        // Periodic debug log for DMX activity
        if (!this._lastDmxLog || Date.now() - this._lastDmxLog > 3000) {
            const activeUnis = Object.keys(universes);
            if (activeUnis.length > 0) {
                console.log(`[Store] DMX Aggregation: ${this.patchedFixtures.length} fixtures, ${activeChannels} active channels across universes: ${activeUnis.join(', ')}`);
            }
            this._lastDmxLog = Date.now();
        }

        return universes;
    }
}
