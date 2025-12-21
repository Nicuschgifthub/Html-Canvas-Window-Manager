const start = () => {

















    new HCWSetup('hcw-canvas')
        .setGrid(100, 100, 0.1, '#00ff95')
        .addWindows([
            FGMBaseWindows.pages()
        ])
        .addWindow(keyboardWindow)





























































}


























setTimeout(() => {
    start();
}, 1000);