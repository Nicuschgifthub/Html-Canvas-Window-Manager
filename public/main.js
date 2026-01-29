const start = () => {






    const window = new HCWWindow(100, 100, 100, 100)
        .setMinSizes(100, 100)
        .setId(Date.now())

    new HCWSetup('hcw-canvas', '/')
        .setGrid({
            everyPixelX: 100,
            everyPixelY: 100,
            crosslineLength: 0.1,
            lineColor: '#00ff95'
        })
        .addWindow(window)






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