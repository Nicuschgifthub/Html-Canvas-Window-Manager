class FGMBaseWindows {
    static pages(pageCount = 10, windowId = FGMIds.getNewId(), presetId = FGMIds.getNewId()) {
        const pageField = new HCWPresetField('Pages', presetId)
            .onPresetPress(FGMKernel.eventPresetClicked)

        for (let i = 0; i < pageCount; i++) {
            pageField.addPreset(`Page ${i}`, FGMColors.PAGES.BACKGROUND, { _goToPage: i }, FGMIds.getNewId());
        }

        const newWindow = new HCWWindow(0, 0, 50, 400)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(pageField)
            .setId(windowId)

        pageField.setParentWindow(newWindow);

        return newWindow;
    }
}