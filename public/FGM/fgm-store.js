class FGMStore {
    static HCW_Class = null;
    static FGM_Class = null;
    static currentPage = null;
    static artNetNodes = [
        { name: "MyArtNetNode", ip: "127.0.0.1", subnet: "255.0.0.0", universe: "0:0:1" }
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
            universe: "0:0:1"
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
    }

    static updateFixtureMetadata(id, updates = {}) {
        const fixture = this.patchedFixtures.find(f => f.getId() === id);
        if (!fixture) {
            console.error(`FGMStore: Fixture with ID ${id} not found.`);
            return false;
        }

        if (updates.id !== undefined && updates.id !== id) {
            // Check for duplicate ID
            const exists = this.patchedFixtures.find(f => f.getId() === updates.id);
            if (exists) {
                console.warn(`FGMStore: Duplicate ID ${updates.id} rejected.`);
                return false;
            }
            fixture.setId(updates.id);
        }

        if (updates.label !== undefined) {
            fixture.setLabel(updates.label);
        }

        return true;
    }

    static deletePatchedFixture(index) {
        if (this.patchedFixtures[index]) {
            this.patchedFixtures.splice(index, 1);
        }
    }
}
