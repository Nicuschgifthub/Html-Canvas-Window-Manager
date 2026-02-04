const start = () => {

    const faderContext = new HCWFaderField("Dimmer 01", Date.now())
        .setValue(0.5)

    const presetContext = new HCWPresetField("My Sets", Date.now())
        .addPresets(
            new HCWPreset()
                .setLabel("Preset")
                .setColor("#014d79")
                .setData({ _best: null }),
            new HCWPreset()
                .setLabel("Preset 2")
                .setColor("#014d79")
                .setData({ _best: null }),
            new HCWPreset()
                .setLabel("Preset 3")
                .setColor("#014d79")
                .setData({ _best: null }),
            new HCWPreset()
                .setLabel("Preset 4")
                .setColor("#014d79")
                .setData({ _best: null }),
            new HCWPreset()
                .setLabel("Preset 5")
                .setColor("#014d79")
                .setDefaultColor("#ff0000")
                .setData({ _best: null }),
            new HCWPreset()
                .setLabel("Preset 6")
                .setColor("#014d79")
                .setDefaultColor("#ff0000")
                .setData({ _best: null }),
            new HCWPreset()
                .setLabel("Preset 7")
                .setColor("#014d79")
                .setDefaultColor("#ff0000")
                .setData({ _best: null })
        )

    const encoderContext = new HCWEncoderField("Encoder 1", Date.now())
        .setValue(0, 0)

    const keyboardContext = new HCWKeyboardField("Keyboard 1", Date.now())

    const numberContext = new HCWNumberField("Keypad 1", Date.now())

    const colorContext = new HCWColorMapField("Color 1", Date.now())

    const tableContext = new HCWTableField("Table 1", Date.now())
        .setHeaders(["Type", "Size", "uid"])
        .setRows([
            ["Nicusch", "300MB", "888317"],
            ["Rang", "400MB", "313145"],
            ["tulper", "100MB", "5732"],
            ["sudo", "560MB", "785771"],
            ["jang", "330MB", "8761"],
        ])
        .setButtonAddRowLabel("Set next element")
        .setButtonRemoveRow()

    const searchFieldContext = new HCWSearchField("Search Some", Date.now())
        .setResults(new HCWSearchResult().setName("Full name").setShortName("Short Name").setType("Fixture"))

    const colorWheelContext = new HCWCustomEncoderField("Color Wheel 1", Date.now());

    colorWheelContext.setWheelData([
        { range: [[1, 10], [100, 110]], data: "#ff0000" },

        { range: [11, 30], data: ["#ff0000", "#00ff00"] },

        { range: [50, 60], data: "#0000ff" },
        { range: [50, 60], data: "#ffff00" },

        /* {
            range: [200, 255],
            data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVR42mP8/5+hnoGEYBxSgzEAmf7/P0M9AwXBGKQGYwAy/f9/hnoGCmI0TIsHAAD//wMAV90LHfS1ByEAAAAASUVORK5CYII="
        } */
    ]);

    colorWheelContext.setValue(0.05);

    const window = new HCWWindow({ x: 0, y: 400, sx: 100, sy: 400 })
        .setMinSizes(100, 100)
        .setId(Date.now())
        .setContextField(faderContext);

    const window2 = new HCWWindow({ x: 0, y: 0, sx: 100, sy: 400 })
        .setMinSizes(100, 100)
        .setId(Date.now())
        .setContextField(presetContext);

    const window3 = new HCWWindow({ x: 100, y: 0, sx: 200, sy: 200 })
        .setMinSizes(100, 100)
        .setId(Date.now())
        .setContextField(encoderContext);

    /* 
const window4 = new HCWWindow({ x: 0, y: 0, sx: 100, sy: 400 })
    .setMinSizes(100, 100)
    .setId(Date.now())
    .setContextField(keyboardContext);
const window5 = new HCWWindow({ x: 0, y: 0, sx: 100, sy: 400 })
    .setMinSizes(100, 100)
    .setId(Date.now())
    .setContextField(numberContext); */

    const window6 = new HCWWindow({ x: 100, y: 500, sx: 400, sy: 300 })
        .setMinSizes(100, 100)
        .setId(Date.now())
        .setContextField(colorContext);

    const window7 = new HCWWindow({ x: 100, y: 200, sx: 500, sy: 300 })
        .setMinSizes(100, 100)
        .setId(Date.now())
        .setContextField(tableContext);

    const window8 = new HCWWindow({ x: 300, y: 0, sx: 200, sy: 200 })
        .setMinSizes(100, 100)
        .setId(Date.now())
        .setContextField(colorWheelContext);





    const hcwMain = new HCWSetup('hcw-canvas', '/')
        .setGrid({
            everyPixelX: 100,
            everyPixelY: 100,
            crosslineLength: 0.1,
            lineColor: '#00ff95'
        })
        .addWindows([window, window2, window3, window6, window7, window8]);

    /* setTimeout(() => {
        const windowData = HCWFactory.serialize(window);

        window.close();
        setTimeout(() => {
            const newWindow = HCWFactory.reconstruct(windowData);

            hcwMain.addWindow(newWindow);
        }, 2000);

    }, 5000); */
























}

setTimeout(() => {
    start();
}, 2000);