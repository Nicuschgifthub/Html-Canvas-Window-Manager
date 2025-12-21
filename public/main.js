const run = async () => {


    const faderUpdate = (values) => {
        console.log(values);
    }

    const presetField = new HCWPresetField("Colors");

    presetField.addPreset("Red", "#ff0000", { r: 255, g: 0, b: 0 }, "preset_red");
    presetField.addPreset("Blue", "#0000ff", { r: 0, g: 0, b: 255 }, "preset_blue");

    for (let i = 1; i <= 20; i++) {
        presetField.addPreset(`Generic ${i}`, '#555555', { index: i });
    }

    presetField.onPresetPress((data, preset) => {
        console.log("Selected:", preset.name, data, "ID:", preset.id);
    });

    // Demonstrate updating a preset with progress
    presetField.addPreset("Downloading...", "#444444", {}, "preset_load", 0.0);

    setTimeout(() => {
        console.log("Updating Blue Preset...");
        presetField.updatePreset("preset_blue", {
            name: "Dark Blue",
            color: "#00008b",
            data: { r: 0, g: 0, b: 139 }
        });

        // Animate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 0.1;
            if (progress > 1) {
                progress = 1;
                clearInterval(interval);
                presetField.updatePreset("preset_load", { name: "Done!", progress: 1.0, color: "#005500" });
            } else {
                presetField.updatePreset("preset_load", { progress: progress });
            }
        }, 500);

    }, 2000);

    const faderFiled = new HCWFaderField('Fader 1', 99321841)
        .onValueChange(faderUpdate)


    const encoderFiled = new HCWEncoderField('Encoder 1', 99321842)
        .onValueChange(faderUpdate)

    const simpleWindow = new HCWWindow(200, 200, 200, 200)
        .setTouchZoneColor('#00ff95')
        .setMinSizes(50, 50)
        .setId(2898361)
        .addContextField(faderFiled)

    const numberField = new HCWNumberField('The Numpad', 12345)
        .onEnter((val) => {
            console.log("Numpad Enter:", val);
        });

    new HCWSetup('hcw-canvas')
        .setGrid(100, 100, 0.1, '#00ff95')
        .addWindows([
            new HCWWindow(200, 500, 100, 100)
                .setTouchZoneColor('#00ff95')
                .setMinSizes(50, 50)
                .setId(45654984)
                .addContextField(presetField),
            new HCWWindow(200, 700, 100, 100)
                .setTouchZoneColor('#00ff95')
                .setMinSizes(50, 50)
                .setId(459852587)
                .addContextField(numberField)
        ])
        .addWindow(simpleWindow)

    setTimeout(() => {
        console.log(HCW)
    }, 2500);

}

run();