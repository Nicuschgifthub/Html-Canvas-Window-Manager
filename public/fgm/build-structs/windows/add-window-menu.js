_DEFS_STORE.add('window-add-menu', () => {
    const windowTypes = [
        { label: "Fader", key: "fader" },
        { label: "Color Picker", key: "colorMap" },
        { label: "Encoder", key: "encoder" },
        { label: "Presets", key: "presetGroup" },
        { label: "Page Menu", key: "pageMenu" },
        { label: "Settings Menu", key: "settingsMenu" }
    ];

    const windowMenu = new HCWPresetField("Add Window")
        .setLocationId(GC.CONTEXT_FIELDS.ADD_WINDOW_MENU.LOCATION_ID)
        .addPresets(
            ...windowTypes.map(type =>
                new HCWPreset()
                    .setLabel(type.label)
                    .setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR)
                    .setData({ _contextAdd: type.key })
            )
        );

    return new HCWWindow({ x: 100, y: 0, sx: 400, sy: 400 })
        .setTouchZoneColor(GLOBAL_STYLES.FIELDS_GLOBAL.TEMP_TOUCH_ZONE_COLOR)
        .setPageId(GLOBAL_CORE.DEFS.PAGES.EMPTY)
        .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
        .setId(GC.CONTEXT_FIELDS.ADD_WINDOW_MENU.ID)
        .setContextField(windowMenu);
});