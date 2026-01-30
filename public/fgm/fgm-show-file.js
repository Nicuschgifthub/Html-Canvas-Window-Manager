class FGMShowFile {
    constructor(json = false) {

        this.showFile = {
            fgmV: "0.0.1",
            hcwV: "0.0.1",
            name: "My First Show",
            description: "",
            media: {

            },
            fixtures: {

            },
            pages: {
                "0": {
                    name: "Page 1",
                    windows: {

                    }
                }
            }
        }

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
        return this.showFile.pages[page];
    }

    getPages() {
        return this.showFile.pages;
    }

    loadShow() {

    }
}