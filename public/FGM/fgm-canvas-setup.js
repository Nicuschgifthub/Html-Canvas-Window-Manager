class FGMBaseWindows {
    static pages(pageCount = 10) {
        const pageField = new HCWPresetField('Pages', FGMIds.getNewId())
            .onPresetPress(FGMKernel.eventPresetClicked)

        for (let i = 0; i < pageCount; i++) {
            pageField.addPreset(`Page ${i}`, FGMColors.PAGES.BACKGROUND, { _goToPage: i }, FGMIds.getNewId());
        }

        const newWindow = new HCWWindow(0, 0, 50, 400)
            .setTouchZoneColor(FGMColors.TOUCHZONE.BACKGROUND)
            .addContextField(pageField)

        pageField.setParentWindow(newWindow);

        return newWindow;
    }

}