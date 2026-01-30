const start = () => {


    const window = new HCWWindow({ x: 100, y: 100, xs: 100, ys: 100 })
        .setMinSizes(100, 100)
        .setId(Date.now())

    const hcwMain = new HCWSetup('hcw-canvas', '/')
        .setGrid({
            everyPixelX: 100,
            everyPixelY: 100,
            crosslineLength: 0.1,
            lineColor: '#00ff95'
        })
        .addWindow(window)

    setTimeout(() => {
        const json = window.toJSON();

        console.log(json)

        window.close();

        const window2 = new HCWWindow(json);

        hcwMain.addWindow(window2);
    }, 2000);


    /* 
        new FGMwithHCW('hcw-canvas')
            .hcwGrid({
                everyPixelX: 100,
                everyPixelY: 100,
                crosslineLength: 0.1,
                lineColor: '#00ff95'
            })
            .loadInital();
     */

















}

setTimeout(() => {
    start();
}, 2000);