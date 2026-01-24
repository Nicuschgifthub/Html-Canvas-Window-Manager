class FGMFixtureFunction {
    constructor(definition, channel, fineChannel = null, defaultValue = 0) {
        this.definition = definition;
        this.channel = channel; // 0-indexed offset from fixture start
        this.fineChannel = fineChannel;
        this.defaultValue = defaultValue;
        this.value = defaultValue; // Logic value 0-255
    }

    resetToDefault() {
        this.value = this.defaultValue;
    }

    setLogicValue(val) {
        this.value = Math.max(0, Math.min(255, val));
    }

    getLogicValue() {
        return this.value;
    }

    /**
     * @returns {Object} { offset: value } mapping
     */
    getDmxValues() {
        const out = {};
        if (this.definition.is16Bit && this.fineChannel !== null) {
            const total = Math.round((this.value / 255) * 65535);
            out[this.channel] = (total >> 8) & 0xFF;
            out[this.fineChannel] = total & 0xFF;
        } else {
            out[this.channel] = Math.max(0, Math.min(255, Math.round(this.value)));
        }
        return out;
    }
}

class FGMFixtureGroup {
    constructor(ugId) {
        this.id = ugId;
        this.fixtures = [];
    }
}

class FGMFixture {
    constructor(uId = FGMIds.newFixtureId(), shortName = '', label = '') {
        this.infos = {
            id: uId,
            text: label || "Fixture " + uId,
            shortName: shortName || ''
        }

        this.dmx = {
            address: 500,
            universe: 1
        }

        this.functions = [];
    }

    addFunction(func) {
        this.functions.push(func);
        return this;
    }

    loadProfile(profile) {
        if (!profile || !profile.functions) return;
        this.setLabel(profile.shortName);
        this.setShortName(profile.shortName || '');
        this.functions = [];
        profile.functions.forEach(f => {
            const def = FGMFixtureFunctionDefinitions.getDefinitionByType(f.type);
            if (def) {
                const func = new FGMFixtureFunction(def, f.channel, f.fineChannel, f.default || 0);
                if (f.indexs) func.wheelData = f.indexs;
                this.addFunction(func);
            }
        });
        return this;
    }

    resetToDefaults() {
        this.functions.forEach(f => f.resetToDefault());
        return this;
    }

    setDmxAddress(addr) {
        this.dmx.address = addr;
        return this;
    }

    setAddress(addr) {
        this.dmx.address = addr;
        return this;
    }

    getAddress() {
        return this.dmx.address;
    }

    setUniverse(universe) {
        this.dmx.universe = universe;
        return this;
    }

    getUniverse() {
        return this.dmx.universe;
    }

    getFunctions() {
        return this.functions;
    }

    updateProgrammerValue(type, value) {
        const func = this.functions.find(f => f.definition.type === type);
        if (func) {
            func.setLogicValue(value);
        } else {
            console.warn(`[Fixture] ${this.getId()} has no function of type ${type}`);
        }
    }

    getId() {
        return this.infos.id;
    }

    setId(id) {
        this.infos.id = id;
    }

    setLabel(label) {
        this.infos.text = label;
    }

    getLabel() {
        return this.infos.text;
    }

    setShortName(shortName) {
        this.infos.shortName = shortName;
    }

    getShortName() {
        return this.infos.shortName;
    }
}