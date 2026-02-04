class FGMEvents {

    static backgroundClicked() {
        console.log("BG click");
    }

    static onRenderUpdate() {
        
    }

    static onWindowChange(type, data = {}) {
        console.log(type, data);
    }

    static onAction(type, data = {}) {

        if (data.fgmType == null) return;

        console.log(type, data);
        console.log(data.fgmType)

    }
}