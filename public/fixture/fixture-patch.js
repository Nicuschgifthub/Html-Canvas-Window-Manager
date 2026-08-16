class FixturePatch {

    constructor({ id, name, gdtfResult, modeName, universe, address }) {
        this.id = id;
        this.name = name;
        this.gdtfResult = gdtfResult;
        this.universe = universe;
        this.address = address; // 1-indexed DMX start address

        this.mode = gdtfResult.modes.find(m => m.name === modeName)
            || gdtfResult.modes[0]
            || null;

        this.modeName = this.mode ? this.mode.name : 'Unknown';

        this.attributeMap = {};

        this._values = {};

        this._buildAttributeMap();
    }

    _buildAttributeMap() {
        if (!this.mode) return;

        this.mode.channels.forEach(ch => {

            const attrDef = AttributeBook.resolve(ch.attribute);
            if (!attrDef) return; // unknown / unmapped attribute — skip

            const canonName = attrDef.name;

            const absoluteOffsets = ch.offset.map(o => this.address + o - 1);

            this.attributeMap[canonName] = {
                attribute: attrDef,       // full attribute definition
                offsets: absoluteOffsets,// absolute 1-indexed DMX addresses
                is16bit: ch.is16bit,
                rawDefault: ch.default,
                geometry: ch.geometry,
            };

            this._values[canonName] = 0;
        });
    }

    hasAttribute(attrName) {
        return !!this.attributeMap[attrName];
    }

    getValue(attrName) {
        return this._values[attrName] ?? 0;
    }

    setValue(attrName, normalisedValue) {
        if (!this.attributeMap[attrName]) return;
        this._values[attrName] = Math.max(0, Math.min(1, normalisedValue));
    }

    getDMXBytes(attrName) {
        const map = this.attributeMap[attrName];
        if (!map) return [];

        const norm = this._values[attrName] ?? 0;

        if (map.is16bit && map.offsets.length === 2) {
            const raw16 = Math.round(norm * 65535);
            const coarse = (raw16 >> 8) & 0xFF;
            const fine = raw16 & 0xFF;
            return [
                { address: map.offsets[0], value: coarse },
                { address: map.offsets[1], value: fine }
            ];
        } else {
            const raw8 = Math.round(norm * 255);
            return [{ address: map.offsets[0], value: raw8 }];
        }
    }

    getAllDMXBytes() {
        const result = [];
        Object.keys(this.attributeMap).forEach(attrName => {
            result.push(...this.getDMXBytes(attrName));
        });

        return result.sort((a, b) => a.address - b.address);
    }

    get channelCount() {
        return this.mode ? this.mode.channelCount : 0;
    }


    get attributes() {
        return Object.keys(this.attributeMap);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            gdtfName: this.gdtfResult.name,
            manufacturer: this.gdtfResult.manufacturer,
            modeName: this.modeName,
            universe: this.universe,
            address: this.address,
            values: { ...this._values }
        };
    }

    debugLog() {
        console.group(`%c🔦 Patch: ${this.name}`, 'color:#00ff95; font-weight:bold;');
        console.log(`Fixture: ${this.gdtfResult.manufacturer} ${this.gdtfResult.name}`);
        console.log(`Mode: "${this.modeName}"  |  Universe: ${this.universe}  |  Address: ${this.address}  |  Footprint: ${this.channelCount}ch`);
        console.log(`Mapped attributes: ${this.attributes.length} of ${this.mode?.channels.length || 0} channels`);
        console.table(
            Object.entries(this.attributeMap).map(([name, map]) => ({
                'Attribute': name,
                'Pretty': map.attribute.pretty,
                'Feature Group': map.attribute.featureGroup,
                'DMX Addr': map.offsets.join(', '),
                '16-bit': map.is16bit ? '✓' : '',
                'Current Value': (this._values[name] * 100).toFixed(1) + '%',
            }))
        );
        console.groupEnd();
    }
}

globalThis.FixturePatch = FixturePatch;