class FGMWindowSettings {
    static async openAndAwaitWindowSettings(window) {
        const contextField = window.getContextField();

        console.log(contextField)

        FGMShowHandler.setPageEmpty();

        const { x, y, sx, sy } = HCWPositions.getMiddleUserFocusPosition(2);

        console.log(HCWPositions.getMiddleUserFocusPosition(2))
        console.log(x, y, sx, sy)

        const tableField = new HCWTableField(`Settings \"${contextField.getLabel()} ${contextField.getLocationId()}\"`)
            .setLocationId(GLOBAL_CORE.CONTEXT_FIELDS.SETTINGS_MENU.LOCATION_ID)
            .setHeaders(["Attribute", "Value"])
            .setRows([["hi", "hi2"]])
        const settingsWindow = new HCWWindow()
            .setTouchZoneColor(GLOBAL_STYLES.FIELDS_GLOBAL.TEMP_TOUCH_ZONE_COLOR)
            .setPosition(x, y)
            .setSize(sx, sy)
            .setMinSizes(300, 400)
            .setContextField(tableField)
            .setPageId(GLOBAL_CORE.CONTEXT_FIELDS.SETTINGS_MENU.PAGE)
            .setId(GLOBAL_CORE.CONTEXT_FIELDS.SETTINGS_MENU.ID)

        HCWDB.addWindows([settingsWindow]);

        // add functions to alter attributes
    }

    static windowEdgeClicked(window) {
        this.openAndAwaitWindowSettings(window);
    }
}