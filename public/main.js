const run = async () => {


    const faderUpdate = (values) => {
        console.log(values);
    }

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
                .setId(45654984),
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