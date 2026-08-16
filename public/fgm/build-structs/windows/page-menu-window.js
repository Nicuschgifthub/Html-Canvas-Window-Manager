_DEFS_STORE.add('window-page-menu', () => {
    const pagesMenu = new HCWPresetField("Pages")
        .setLocationId(GC.CONTEXT_FIELDS.PAGE_MENU.LOCATION_ID)
        .addPresets(
            new HCWPreset().setLabel("Menu").setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR).setData({ _pageChangeTo: 0 }),
            ...Array.from({ length: 50 }, (_, i) =>
                new HCWPreset()
                    .setLabel(`Page ${i + 1}`)
                    .setDefaultColor(GS.FIELDS.PRESETS.DEFAULT_COLOR)
                    .setData({ _pageChangeTo: i + 1 })
            )
        );

    return new HCWWindow({ x: 0, y: 0, sx: 100, sy: 600 })
        .setPageId(GC.CONTEXT_FIELDS.PAGE_MENU.PAGE)
        .setMinSizes(GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY, GLOBAL_CORE.DEFS.WINDOW.SIZE.MIN_SIZEXY)
        .setId(GC.CONTEXT_FIELDS.PAGE_MENU.ID)
        .setContextField(pagesMenu);
});