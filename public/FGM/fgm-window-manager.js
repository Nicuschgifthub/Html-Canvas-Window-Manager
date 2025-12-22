class FGMWindowManager {
    static saveToJson(window) {
        let dataJson = {
            windowJson: {},
            contextFieldJson: {},
            fieldType: ""
        }

        const contextField = window.getSingleContextField();
        dataJson.contextFieldJson = contextField.toJSON();
        dataJson.fieldType = contextField.getType();
        dataJson.windowJson = window.toJSON();

        return dataJson;
    }

    static windowfromJson(dataJson) {
        let contextField = null;

        switch (dataJson.fieldType) {
            case "PRESET_FIELD":
                contextField = new HCWPresetField()
                    .fromJSON(dataJson.contextFieldJson);

                contextField.onPresetPress(FGMKernel.eventPresetClicked)
                break;

            default:

                break;
        }

        const window = new HCWWindow()
            .fromJSON(dataJson.windowJson)

        contextField.setParentWindow(window);

        window.addContextField(contextField);

        return window
    }
}