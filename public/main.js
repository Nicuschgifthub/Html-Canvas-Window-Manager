const run = async () => {


    const faderUpdate = (values) => {
        console.log(values);
    }

    const presetField = new HCWPresetField("Colors");
    presetField.addPreset("Red", "#ff0000", { r: 255, g: 0, b: 0 });
    presetField.addPreset("Blue", "#0000ff", { r: 0, g: 0, b: 255 });
    presetField.addPreset("Blue1", "#0000ff", { r: 0, g: 0, b: 255 });
    presetField.addPreset("Blue21", "#0000ff", { r: 0, g: 0, b: 255 });
    presetField.addPreset("Blue2", "#0000ff", { r: 0, g: 0, b: 255 });
    presetField.addPreset("Blue3", "#0000ff", { r: 0, g: 0, b: 255 });
    presetField.addPreset("Blue4", "#0000ff", { r: 0, g: 0, b: 255 });
    presetField.addPreset("Blue5", "#0000ff", { r: 0, g: 0, b: 255 });
    presetField.addPreset("Blue6", "#0000ff", { r: 0, g: 0, b: 255 });
    presetField.addPreset("Blue7", "#0000ff", { r: 0, g: 0, b: 255 });
    presetField.addPreset("Blue77", "#0000ff", { r: 0, g: 0, b: 255 });
    presetField.onPresetPress((data, preset) => {
        console.log("Selected:", preset.name, data);
    });

    const faderFiled = new HCWFaderField('Fader 1', 99321841)
        .onValueChange(faderUpdate)


    const encoderFiled = new HCWEncoderField('Encoder 1', 99321842)
        .onValueChange(faderUpdate)

    const simpleWindow = new HCWWindow(200, 200, 200, 200)
        .setTouchZoneColor('#00ff95')
        .setMinSizes(50, 50)
        .setId(2898361)
        .addContextField(faderFiled)
    // .addContextField(encoderFiled)

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
                .addContextField(encoderFiled)
        ])
        .addWindow(simpleWindow)

    setTimeout(() => {
        console.log(HCW)
    }, 2500);

}

run();