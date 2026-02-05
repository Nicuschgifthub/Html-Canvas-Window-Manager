let HCW = {
    canvas: null,
    ctx: null,
    windows: [],
    connectors: [],
    pointer: {
        // Window
        activewindow: null,
        draggingWindow: null,
        rightResizeWindow: null,
        multiResizeWindow: null,
        downResizeWindow: null,
        usermoveorresize: false,

        // Contextwindow
        contextwindow: null,
        contextdrag: false,
        focusedField: null,

        // Global
        dragging: false,
        lastMouseX: null,
        lastMouseY: null,

        _windowPressCandidate: null,
        _windowPressStartX: null,
        _windowPressStartY: null,
    },
    background: {
        color: '#000000'
    },
    grid: {
        pointDistanceX: null,
        pointDistanceY: null,
        snappoints: null
    },
    temp: {}
}

class HCWDB {
    static getHCW() {
        return HCW;
    }

    static getWindows() {
        return HCW.windows;
    }
}

class HCWSetup {
    constructor(canvasId, srcPath = "/") {
        this._srcPath = srcPath;

        this._hcwSettings = {};

        this._loadFiles().then(() => {
            console.log("HCW scripts loaded. Setting up HCW.");

            HCW.canvas = document.getElementById(canvasId);
            HCW.ctx = HCW.canvas.getContext("2d");

            HCWCanvasResize.setupListener();
            HCWTouch.setupListener();

            HCW.temp.filesloaded = true;

            if (HCW.temp.foreceupdateFrame) {
                delete HCW.temp.foreceupdateFrame;
                HCWRender.updateFrame();
            }

        }).catch(error => {
            console.error("Error loading scripts:", error);
        });
    }

    setBackgroundColor(hex) {
        HCW.background.color = hex;
        return this;
    }

    addWindow(window) {
        HCW.windows.push(window);
        HCW.temp.filesloaded ? HCWRender.updateFrame() : (HCW.temp.foreceupdateFrame = true);
        return this;
    }

    addWindows(windowsarray) {
        HCW.windows.push(...windowsarray);
        HCW.temp.filesloaded ? HCWRender.updateFrame() : (HCW.temp.foreceupdateFrame = true);
        return this;
    }

    setGrid(data = { everyPixelX: 100, everyPixelY: 100, crosslineLength: 0.2, lineColor: '#373737' }) {

        HCW.grid.pointDistanceX = data.everyPixelX;
        HCW.grid.pointDistanceY = data.everyPixelY;
        HCW.grid.lineColor = data.lineColor;
        HCW.grid.crossLineLength = data.crosslineLength;
        return this;
    }

    getWindows() {
        return HCW.windows;
    }

    files() {
        return [
            'hcw-helper.js',
            'hcw-grid-snap.js',
            'hcw-mouse-style.js',
            'hcw-render.js',
            'hcw-canvas-resize.js',
            'hcw-touch.js'
        ]
    }

    async _loadFiles() {
        const scriptPromises = this.files().map(file => this._loadScript(file));
        return Promise.all(scriptPromises);
    }

    _loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.type = "text/javascript";
            script.async = true;

            script.onload = () => {
                console.log(`HCW Script loaded: ${src}`);
                resolve();
            }

            script.onerror = () => {
                console.error(`Failed to load script: ${src}`);
                reject(new Error(`Failed to load script: ${src}`));
            }

            document.head.appendChild(script);
        });
    }
}