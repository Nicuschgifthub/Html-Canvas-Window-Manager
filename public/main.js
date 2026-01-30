const start = () => {

    const faderContext = new HCWFaderField("Dimmer 01", Date.now())
        .setValue(0.5)

    const presetContext = new HCWPresetField("My Sets", Date.now())
        .addPresets(

            new HCWPreset()
                .setLabel("Preset")
                .setColor("#ff00ff")
                .setData({ _best: null }),
            new HCWPreset()
                .setLabel("Preset2")
                .setColor("#ff00ff")
                .setData({ _best: null }),
            new HCWPreset()
                .setLabel("Preset3")
                .setColor("#ff00ff")
                .setData({ _best: null }),
            new HCWPreset()
                .setLabel("Preset4")
                .setColor("#ff00ff")
                .setData({ _best: null }),
            new HCWPreset()
                .setLabel("Preset5")
                .setColor("#ff00ff")
                .setData({ _best: null })
        )
        .onAction(FGMEvents.onAction)

    const window = new HCWWindow({ x: 100, y: 100, sx: 100, sy: 300 })
        .setMinSizes(100, 100)
        .setId(Date.now())
        .setContextField(presetContext);

    console.log(window);

    const hcwMain = new HCWSetup('hcw-canvas', '/')
        .setGrid({
            everyPixelX: 100,
            everyPixelY: 100,
            crosslineLength: 0.1,
            lineColor: '#00ff95'
        })
        .addWindow(window);

    setTimeout(() => {
        const windowData = HCWFactory.serialize(window);

        window.close();
        setTimeout(() => {
            const newWindow = HCWFactory.reconstruct(windowData);

            hcwMain.addWindow(newWindow);
        }, 2000);

    }, 5000);
























}

setTimeout(() => {
    start();
}, 2000);