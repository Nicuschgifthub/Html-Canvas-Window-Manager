_DEFS_STORE.add('window-config-menu', () => {
    const settingsMenu = new HCWPresetField("Config")
        .setLocationId(GC.CONTEXT_FIELDS.SETTINGS_MENU.LOCATION_ID)
        .addPresets(
            new HCWPreset().setLabel("Settings").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _openSettingsPresetGroup: {} }),
            new HCWPreset().setLabel("Save Show").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _downloadShowFile: {} }),
            new HCWPreset().setLabel("Status").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({}),
            new HCWPreset().setLabel("ArtNet").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({}),
            new HCWPreset().setLabel("Fixtures").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({})
        );

    return new HCWWindow({ x: 100, y: 0, sx: 400, sy: 300 })
        .setPageId(GC.CONTEXT_FIELDS.SETTINGS_MENU.PAGE)
        .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
        .setId(GLOBAL_CORE.CONTEXT_FIELDS.SETTINGS_MENU.ID)
        .setContextField(settingsMenu);
});