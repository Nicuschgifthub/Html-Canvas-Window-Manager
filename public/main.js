const start = () => {

    const faderContext = new HCWFaderField("Dimmer 01", Date.now()).setFloat(0.5).setLocationId("1.220")

    const presetContext = new HCWPresetField("My Sets", Date.now() + 1)
        .addPresets(
            new HCWPreset().setLabel("Preset").setColor("#014d79").setData({ _best: null }),
            new HCWPreset().setLabel("Preset 2").setColor("#014d79").setData({ _best: null }),
            new HCWPreset().setLabel("Preset 3").setColor("#014d79").setData({ _best: null }),
            new HCWPreset().setLabel("Preset 4").setColor("#014d79").setData({ _best: null }),
            new HCWPreset().setLabel("Preset 5").setColor("#014d79").setDefaultColor("#ff0000").setData({ _best: null }),
            new HCWPreset().setLabel("Preset 6").setColor("#014d79").setDefaultColor("#ff0000").setData({ _best: null }),
            new HCWPreset().setLabel("Preset 7").setColor("#014d79").setDefaultColor("#ff0000").setData({ _best: null })
        );

    const encoderContext = new HCWEncoderField("Encoder 1", Date.now() + 2).setFloats(0, 0);
    const colorContext = new HCWColorMapField("Color 1", Date.now() + 3);

    const tableContext = new HCWTableField("Table 1", Date.now() + 4)
        .setHeaders(["Type", "Size", "uid"])
        .setRows([
            ["Nicusch", "300MB", "888317"],
            ["Rang", "400MB", "313145"],
            ["tulper", "100MB", "5732"],
            ["sudo1", "560MB", "785771"],
            ["sudo2", "560MB", "55153"],
            ["sudo3", "560MB", "765185"]
        ])
        .setButtonAddRowLabel("Set next element")
        .setButtonRemoveRow();

    const colorWheelContext = new HCWCustomEncoderField("Color Wheel 1", Date.now() + 5);
    colorWheelContext.setWheelData([
        { range: [[1, 10], [100, 110]], data: "#ff0000" },
        { range: [11, 30], data: ["#ff0000", "#00ff00"] }
    ]);
    colorWheelContext.setFloats(0.05);


    const window = new HCWWindow({ x: 0, y: 400, sx: 100, sy: 400 }).setMinSizes(100, 100).setId(Date.now() + 10).setContextField(faderContext);
    const window2 = new HCWWindow({ x: 0, y: 0, sx: 100, sy: 400 }).setMinSizes(100, 100).setId(Date.now() + 11).setContextField(presetContext);
    const window3 = new HCWWindow({ x: 100, y: 0, sx: 200, sy: 200 }).setMinSizes(100, 100).setId(Date.now() + 12).setContextField(encoderContext);
    const window6 = new HCWWindow({ x: 100, y: 500, sx: 400, sy: 300 }).setMinSizes(100, 100).setId(Date.now() + 13).setContextField(colorContext);
    const window7 = new HCWWindow({ x: 100, y: 200, sx: 500, sy: 300 }).setMinSizes(100, 100).setId(Date.now() + 14).setContextField(tableContext);
    const window8 = new HCWWindow({ x: 300, y: 0, sx: 200, sy: 200 }).setMinSizes(100, 100).setId(Date.now() + 15).setContextField(colorWheelContext);

    const windows = [window, window2, window3, window6, window7, window8];










    const hcwMain = new HCWSetup('hcw-canvas', '/')
        .setGrid({
            everyPixelX: 100,
            everyPixelY: 100,
            crosslineLength: 0.1,
            lineColor: '#00ff95'
        })
        .addWindows(windows);


















    setTimeout(() => {
        console.log("Starting serialization and rebuild test...");

        windows.forEach((win) => {
            const windowData = HCWFactory.serialize(win);

            win.close();

            setTimeout(() => {
                const newWindow = HCWFactory.reconstruct(windowData);
                hcwMain.addWindow(newWindow);
            }, 1000);
        });

    }, 4000);
}

setTimeout(() => {
    start();
}, 2000);