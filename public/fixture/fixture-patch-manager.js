class FixturePatchManager {
    constructor() {
        this._fixtures = {};      // id → FixturePatch
        this._selected = new Set(); // set of fixture IDs currently selected
        this._nextId = 1;
        this._listeners = [];     // change listeners
    }


    addFixture(gdtfResult, opts = {}) {
        const id = `fixture_${String(this._nextId++).padStart(3, '0')}`;

        const name = opts.name
            || `${gdtfResult.manufacturer} ${gdtfResult.shortName || gdtfResult.name} #${this._nextId - 1}`;

        const modeName  = opts.modeName  || (gdtfResult.modes[0]?.name ?? '');
        const universe  = opts.universe  ?? 1;
        const address   = opts.address   ?? this._nextFreeAddress(universe, modeName, gdtfResult);

        const patch = new FixturePatch({ id, name, gdtfResult, modeName, universe, address });
        this._fixtures[id] = patch;

        this._emit('fixtureAdded', { patch });

        console.log(
            `%c ✓ Patched: ${name}  [${modeName}]  Uni${universe}/Addr${address}`,
            'background:#00ff95; color:#000; font-size:12px; font-weight:bold; padding:2px 8px; border-radius:4px;'
        );
        patch.debugLog();

        return patch;
    }


    removeFixture(id) {
        const patch = this._fixtures[id];
        if (!patch) return;
        delete this._fixtures[id];
        this._selected.delete(id);
        this._emit('fixtureRemoved', { id });
    }

    selectFixture(id, additive = false) {
        if (!additive) this._selected.clear();
        if (this._fixtures[id]) this._selected.add(id);
        this._emit('selectionChanged', { selected: [...this._selected] });
    }

    deselectFixture(id) {
        this._selected.delete(id);
        this._emit('selectionChanged', { selected: [...this._selected] });
    }

    selectAll() {
        Object.keys(this._fixtures).forEach(id => this._selected.add(id));
        this._emit('selectionChanged', { selected: [...this._selected] });
    }

    clearSelection() {
        this._selected.clear();
        this._emit('selectionChanged', { selected: [] });
    }

    isSelected(id) {
        return this._selected.has(id);
    }

    getSelectedFixtures() {
        return [...this._selected].map(id => this._fixtures[id]).filter(Boolean);
    }


    setAttributeOnSelection(attrName, value) {
        const fixtures = this.getSelectedFixtures();
        fixtures.forEach(f => {
            if (f.hasAttribute(attrName)) {
                f.setValue(attrName, value);
            }
        });
        this._emit('attributeChanged', { attrName, value, fixtures: fixtures.map(f => f.id) });
    }


    nudgeAttributeOnSelection(attrName, delta) {
        const fixtures = this.getSelectedFixtures();
        fixtures.forEach(f => {
            if (f.hasAttribute(attrName)) {
                f.setValue(attrName, f.getValue(attrName) + delta);
            }
        });
        this._emit('attributeChanged', { attrName, delta, fixtures: fixtures.map(f => f.id) });
    }


    getConsensusValue(attrName) {
        const fixtures = this.getSelectedFixtures().filter(f => f.hasAttribute(attrName));
        if (fixtures.length === 0) return 0;
        const sum = fixtures.reduce((acc, f) => acc + f.getValue(attrName), 0);
        return sum / fixtures.length;
    }


    getSharedAttributes() {
        const fixtures = this.getSelectedFixtures();
        if (fixtures.length === 0) return [];

        let shared = fixtures[0].attributes;
        for (let i = 1; i < fixtures.length; i++) {
            shared = shared.filter(a => fixtures[i].hasAttribute(a));
        }
        return shared;
    }


    getUnionAttributes() {
        const fixtures = this.getSelectedFixtures();
        const all = new Set();
        fixtures.forEach(f => f.attributes.forEach(a => all.add(a)));
        return [...all];
    }


    getAttributeSummary() {
        const shared = this.getSharedAttributes();
        const groups = {};

        shared.forEach(attrName => {
            const def = AttributeBook.get(attrName);
            if (!def) return;
            if (!groups[def.featureGroup]) groups[def.featureGroup] = [];
            groups[def.featureGroup].push({
                name:            attrName,
                pretty:          def.pretty,
                icon:            def.icon,
                feature:         def.feature,
                physicalUnit:    def.physicalUnit,
                encoderBehaviour: def.encoderBehaviour,
                defaultMin:      def.defaultMin,
                defaultMax:      def.defaultMax,
                value:           this.getConsensusValue(attrName),  // 0.0 – 1.0
                is16bit:         this.getSelectedFixtures().some(f => f.attributeMap[attrName]?.is16bit)
            });
        });

        return groups;
    }

    getFixture(id) {
        return this._fixtures[id] || null;
    }

    getAllFixtures() {
        return Object.values(this._fixtures);
    }

    get count() {
        return Object.keys(this._fixtures).length;
    }


    getDMXState() {
        const state = {};
        Object.values(this._fixtures).forEach(f => {
            if (!state[f.universe]) state[f.universe] = {};
            f.getAllDMXBytes().forEach(({ address, value }) => {
                state[f.universe][address] = value;
            });
        });
        return state;
    }

    toJSON() {
        return {
            fixtures: Object.values(this._fixtures).map(f => f.toJSON())
        };
    }

    on(callback) {
        this._listeners.push(callback);
        return () => { this._listeners = this._listeners.filter(l => l !== callback); };
    }

    _emit(event, data) {
        this._listeners.forEach(cb => {
            try { cb(event, data); } catch (e) { console.error('FixturePatchManager listener error:', e); }
        });
    }

    _nextFreeAddress(universe, modeName, gdtfResult) {

        const mode = gdtfResult.modes.find(m => m.name === modeName) || gdtfResult.modes[0];
        const footprint = mode ? mode.channelCount : 1;

        const used = Object.values(this._fixtures)
            .filter(f => f.universe === universe)
            .map(f => f.address + f.channelCount - 1);

        const highestUsed = used.length > 0 ? Math.max(...used) : 0;
        return Math.min(highestUsed + 1, 513 - footprint);
    }

    debugLog() {
        console.group('%c🎭 Fixture Patch Manager', 'color:#00ff95; font-weight:bold; font-size:13px;');
        console.log(`Total fixtures: ${this.count} | Selected: ${this._selected.size}`);
        Object.values(this._fixtures).forEach(f => f.debugLog());
        console.groupEnd();
    }
}

const PatchManager = new FixturePatchManager();
globalThis.PatchManager = PatchManager;
globalThis.FixturePatchManager = FixturePatchManager;
