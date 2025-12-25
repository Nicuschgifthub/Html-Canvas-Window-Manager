class FGMProgrammer {
    static selection = []; // Array of fixture IDs in selection order
    static data = {}; // { fixtureId: { attributeType: { value: 0, active: true } } }
    static clearStep = 0; // 0: None, 1: Selection cleared, 2: Values inactivated, 3: Everything cleared

    /**
     * Selects a fixture and maintains order
     */
    static selectFixture(id, clearSelection = false) {
        if (clearSelection) {
            this.selection = [];
            this.clearStep = 0;
        }

        const index = this.selection.indexOf(id);
        if (index === -1) {
            this.selection.push(id);
            this.clearStep = 0; // Reset clear sequence on new selection
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
}