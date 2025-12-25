class FGMProgrammer {
    static selection = []; // Array of fixture IDs in selection order
    static data = {}; // { fixtureId: { attributeType: { value: 0, active: true } } }
    static clearStep = 0; // 0: None, 1: Selection cleared, 2: Values inactivated, 3: Everything cleared

    static selectFixture(id, clearSelection = false) {
        if (clearSelection) {
            this.selection = [];
            this.clearStep = 0;
        }

        const index = this.selection.indexOf(id);
        if (index === -1) {
            this.selection.push(id);
            this.clearStep = 0;
        }

        if (typeof FGMEventBus !== 'undefined') {
            FGMEventBus.emit(FGMEventTypes.SELECTION_CHANGED, { selection: this.selection });
        }
    }

    static unselectFixture(id) {
        this.selection = this.selection.filter(fid => fid !== id);
        if (typeof FGMEventBus !== 'undefined') {
            FGMEventBus.emit(FGMEventTypes.SELECTION_CHANGED, { selection: this.selection });
        }
    }

    static clear() {
        if (this.selection.length > 0) {
            this.clearSelection();
            this.clearStep = 1;
            console.log("[Programmer] Clear Step 1: Selection cleared");
        } else if (this.hasActiveValues()) {
            this.clearActive();
            this.clearStep = 2;
            console.log("[Programmer] Clear Step 2: Values inactivated");
        } else {
            this.clearProgrammer();
            this.clearStep = 0;
            console.log("[Programmer] Clear Step 3: Programmer fully released");
        }
    }

    static clearSelection() {
        this.selection = [];
        if (typeof FGMEventBus !== 'undefined') {
            FGMEventBus.emit(FGMEventTypes.SELECTION_CHANGED, { selection: this.selection });
        }
    }

    static clearActive() {
        for (let fid in this.data) {
            for (let attr in this.data[fid]) {
                this.data[fid][attr].active = false;
            }
        }
    }

    static clearProgrammer() {
        this.data = {};
        this.selection = [];
        this.clearStep = 0;
    }

    static hasActiveValues() {
        for (let fid in this.data) {
            for (let attr in this.data[fid]) {
                if (this.data[fid][attr].active) return true;
            }
        }
        return false;
    }

    static setAttributeValue(attributeType, value) {
        this.selection.forEach(fid => {
            if (!this.data[fid]) this.data[fid] = {};

            this.data[fid][attributeType] = {
                value: value,
                active: true
            };

            const fixture = FGMStore.getPatchedFixtures().find(f => f.getId() === fid);
            if (fixture) {
                fixture.updateProgrammerValue(attributeType, value);
            }
        });

        this.clearStep = 0;
    }

    static getSelection() {
        return this.selection;
    }

    static getData() {
        return this.data;
    }

    static getFixtureAttributeState(fixtureId, attributeType) {
        return this.data[fixtureId]?.[attributeType] || null;
    }

    static getValuesForPool(poolType, isUniversal = false) {
        const poolMapping = {
            [FGMTypes.PROGRAMMER.POOLS.DIMMER_POOL]: [FGMTypes.PROGRAMMER.DIMMERS.MAIN],
            [FGMTypes.PROGRAMMER.POOLS.COLOR_POOL]: [
                FGMTypes.PROGRAMMER.COLORS.COLOR_R,
                FGMTypes.PROGRAMMER.COLORS.COLOR_G,
                FGMTypes.PROGRAMMER.COLORS.COLOR_B,
                FGMTypes.PROGRAMMER.COLORS.COLOR_W,
                FGMTypes.PROGRAMMER.COLORS.COLOR_A,
                FGMTypes.PROGRAMMER.COLORS.COLOR_U
            ],
            [FGMTypes.PROGRAMMER.POOLS.POSITION_POOL]: [
                FGMTypes.PROGRAMMER.POSITION.PAN_8Bit,
                FGMTypes.PROGRAMMER.POSITION.PAN_16Bit,
                FGMTypes.PROGRAMMER.POSITION.TILT_8Bit,
                FGMTypes.PROGRAMMER.POSITION.TILT_16Bit
            ]
        };

        const relevantAttributes = poolMapping[poolType] || null;
        const isAllPool = poolType === FGMTypes.PROGRAMMER.POOLS.ALL_POOL;

        if (isUniversal) {
            const firstFid = this.selection[0];
            const fixtureData = this.data[firstFid];
            if (!fixtureData) return null;

            const universalValues = {};
            let hasData = false;

            for (let attr in fixtureData) {
                if (isAllPool || (relevantAttributes && relevantAttributes.includes(attr))) {
                    universalValues[attr] = { ...fixtureData[attr] };
                    hasData = true;
                }
            }
            return hasData ? { _universal: true, values: universalValues } : null;
        }

        const result = {};
        for (let fid in this.data) {
            const fixtureData = this.data[fid];
            if (!fixtureData) continue;

            const filteredFixtureData = {};
            let hasData = false;

            for (let attr in fixtureData) {
                if (isAllPool || (relevantAttributes && relevantAttributes.includes(attr))) {
                    filteredFixtureData[attr] = { ...fixtureData[attr] };
                    hasData = true;
                }
            }

            if (hasData) {
                result[fid] = filteredFixtureData;
            }
        }

        return result;
    }

    static applyPreset(type, data) {
        if (type === FGMTypes.PROGRAMMER.POOLS.GROUP_POOL) {
            if (Array.isArray(data)) {
                this.selection = [];
                data.forEach(id => this.selectFixture(id, false));
                console.log("[Programmer] Group recalled:", data);
            }
        } else if (data && data._universal) {
            const values = data.values;
            this.selection.forEach(fid => {
                if (!this.data[fid]) this.data[fid] = {};
                for (let attr in values) {
                    const state = values[attr];
                    this.data[fid][attr] = { ...state };
                    const fixture = FGMStore.getPatchedFixtures().find(f => f.getId() === fid);
                    if (fixture) {
                        fixture.updateProgrammerValue(attr, state.value);
                    }
                }
            });
            console.log("[Programmer] Universal Preset recalled of type:", type);
        } else {
            for (let fid in data) {
                if (!this.data[fid]) this.data[fid] = {};
                if (!this.selection.includes(fid)) {
                    this.selection.push(fid);
                }

                for (let attr in data[fid]) {
                    const state = data[fid][attr];
                    this.data[fid][attr] = { ...state };
                    const fixture = FGMStore.getPatchedFixtures().find(f => f.getId() === fid);
                    if (fixture) {
                        fixture.updateProgrammerValue(attr, state.value);
                    }
                }
            }
            console.log("[Programmer] Selective Preset recalled of type:", type);
        }

        this.clearStep = 0;
        if (typeof FGMEventBus !== 'undefined') {
            FGMEventBus.emit(FGMEventTypes.SELECTION_CHANGED, { selection: this.selection });
        }
    }
}