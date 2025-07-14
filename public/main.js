const run = async () => {

    const textField = new HCWTextField('Hi this is me');

    textField.setText('Its still Me');
    textField.onClick = (interaction) => { console.log(interaction) };

    const simpleWindow = new HCWWindow(200, 200, 200, 200)
        .setTouchZoneColor('#00ff95')
        .setMinSizes(50, 50)
        .setId(2898361)
        .addContextField(textField)

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
        ])
        .addWindow(simpleWindow)

    setTimeout(() => {
        console.log(HCW)
    }, 2500);

}

run();