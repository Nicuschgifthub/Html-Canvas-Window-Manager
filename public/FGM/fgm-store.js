class FGMStore {
    static HCW_Class = null;
    static FGM_Class = null;
    static currentPage = null;
    static artNetNodes = [
        { name: "MyArtNetNode", ip: "127.0.0.1", subnet: "255.0.0.0", universe: "0:0:1" }
    ];
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
}