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


        console.log(type, data);


        console.log("--------------COMMAND--------------")


        console.log(data.fieldClass.getKeyword())
        console.log(data.fieldClass.getLocationId())


        console.log("--------------COMMAND--------------")

    }
}