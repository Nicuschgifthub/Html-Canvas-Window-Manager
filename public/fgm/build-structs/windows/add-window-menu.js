_DEFS_STORE.add('window-add-menu', () => {
    const windowTypes = [
        { label: "Fader", key: "fader" },
        { label: "Color Picker", key: "colorMap" },
        { label: "Pan / Tilt Pad", key: "xyPad" },
        { label: "Encoder", key: "encoder" },
        { label: "Presets", key: "presetGroup" },
        { label: "Page Menu", key: "pageMenu" },
        { label: "Settings Menu", key: "settingsMenu" },
        { label: "3D Stage View", key: "viewer3D", internalOnly: true },
        { label: "Custom Wheel", key: "customEncoder", internalOnly: true },
        { label: "Sequence Editor", key: "sequenceEditor", internalOnly: true },
        { label: "Table", key: "table", internalOnly: true },
        { label: "Search Bar", key: "search", internalOnly: true },
        { label: "Keyboard", key: "keyboard", internalOnly: true },
        { label: "Numpad", key: "number", internalOnly: true }
    ];

    // The internalOnly is there to let the user know that you wont be able to open this usally.
    // Also many things like the 3D viewer are not finished at all so its just for testing.

    const windowMenu = new HCWPresetField("Add Window")
        .setLocationId(GC.CONTEXT_FIELDS.ADD_WINDOW_MENU.LOCATION_ID)
        .addPresets(
            ...windowTypes.map(type =>
                new HCWPreset()
                    .setLabel(type.label)
                    .setDefaultColor(type.internalOnly ? GS.FIELDS.PRESETS.GRAY : GS.FIELDS.PRESETS.DEFAULT_COLOR)
                    .setData({ _contextAdd: type.key })
            )
        );

    return new HCWWindow({ x: 100, y: 0, sx: 400, sy: 500 })
        .setTouchZoneColor(GLOBAL_STYLES.FIELDS_GLOBAL.TEMP_TOUCH_ZONE_COLOR)
        .setPageId(GLOBAL_CORE.DEFS.PAGES.EMPTY)
        .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
        .setId(GC.CONTEXT_FIELDS.ADD_WINDOW_MENU.ID)
        .setContextField(windowMenu);
});