class FGMProgrammer {
    static selection = []; // Array of fixture IDs
    static ghostSelection = []; // Array of fixture IDs that have manipulated dmx values, but are not selected anymore press "clear all" to also release them
    static data = {}; // { fixtureId: { attributeType: value } }

    static selectFixture(id, clearSelection = false) {
        if (clearSelection) this.selection = [];
        if (!this.selection.includes(id)) {
            this.selection.push(id);
        }
    }

    static unselectFixture(id) {
        this.selection = this.selection.filter(fid => fid !== id);
    }

    static clearSelection() {
        this.selection = [];
    }

    static getSelectedFixture() {

    }

    static setAttributeValue(attributeType, value) {
        console.log(attributeType, value)

        this.selection.forEach(fid => {
            if (!this.data[fid]) this.data[fid] = {};
            this.data[fid][attributeType] = value;

            const fixture = FGMStore.getPatchedFixtures().find(f => f.getId() === fid);
            if (fixture) {
                fixture.updateProgrammerValue(attributeType, value);
            }
        });
    }

    static getSelection() {
        return this.selection;
    }

    static getData() {
        return this.data;
    }

    static clearProgrammer() {
        this.data = {};
        this.selection.forEach(fid => {
            const fixture = FGMStore.getPatchedFixtures().find(f => f.getId() === fid);
            // Logic to clear values if needed
        });
    }
}