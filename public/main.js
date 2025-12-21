/* const start = () => {

















    new HCWSetup('hcw-canvas')
        .setGrid(100, 100, 0.1, '#00ff95')
        .addWindows([
            FGMBaseWindows.pages()
        ])
        .addWindow(keyboardWindow)





























































}


























setTimeout(() => {
    start();
}, 1000); */


const faderUpdate = (values) => {
    console.log(values);
}

const presetField = new HCWPresetField("Colors");
presetField.addPreset("Red", "#860000ff", { r: 255, g: 0, b: 0 }, "preset_red");
presetField.addPreset("Blue", "#00007eff", { r: 0, g: 0, b: 255 }, "preset_blue");
presetField.addPreset("Loading...", "#444444", {}, "preset_load", 0.4);

for (let i = 1; i <= 20; i++) {
    presetField.addPreset(`Generic ${i}`, '#555555', { index: i });
}

presetField.onPresetPress((data, preset) => {
    console.log("Selected:", preset.name, data, "ID:", preset.id);
});

const encoderFiled = new HCWEncoderField('Enco1', 99321842)
    .setDisplayType('byte')
    .setLabel("Encoder 1")
    .onValueChange(faderUpdate)

const faderFiled = new HCWFaderField('Fader 1', 99321841)
    .setValue(.4)
    .onValueChange(faderUpdate)

const keyboardField = new HCWKeyboardField('Full Keyboard', 123456)
    .setValue("lol")
    .onEnter((val) => {
        console.log("Keyboard Enter:", val);
    });

const numberField = new HCWNumberField('Full Numbers', 883216)
    .onEnter((val) => {
        console.log(val);
    })

const keyboardWindow = new HCWWindow(500, 500, 700, 400)
    .setTouchZoneColor('#00ff95')
    .setMinSizes(50, 50)
    .setId(58972168)
    .addContextField(keyboardField)

new HCWSetup('hcw-canvas')
    .setGrid(100, 100, 0.1, '#00ff95')
    .addWindows([
        new HCWWindow(200, 0, 500, 300)
            .setTouchZoneColor('#00ff95')
            .setMinSizes(50, 50)
            .setId(45654984)
            .addContextField(presetField),
        new HCWWindow(0, 300, 200, 200)
            .setTouchZoneColor('#00ff95')
            .setMinSizes(50, 50)
            .setId(459852587)
            .addContextField(encoderFiled),
        new HCWWindow(0, 600, 100, 300)
            .setTouchZoneColor('#00ff95')
            .setMinSizes(50, 50)
            .setId(577712893)
            .addContextField(faderFiled),

        new HCWWindow(200, 600, 200, 300)
            .setTouchZoneColor('#00ff95')
            .setMinSizes(50, 50)
            .setId(58972167)
            .addContextField(numberField)
    ])
    .addWindow(keyboardWindow)
