const start = () => {
















    new FGMwithHCW('hcw-canvas')
        .hcwGrid({
            everyPixelX: 100,
            everyPixelY: 100,
            crosslineLength: 0.1,
            lineColor: '#00ff95'
        })
        .loadInital();
























}

setTimeout(() => {
    start();
}, 2000);