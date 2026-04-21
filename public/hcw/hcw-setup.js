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

        // BackgroundClick
        backgroundPress: false,
        backgroundStartX: null,
        backgroundStartY: null,
        backgroundDragSizeX: 0,
        backgroundDragSizeY: 0,
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

    static getContextFieldByLocationId(locationId) {
        let contextField = null;
        this.getWindows().forEach(window => {
            if (window.getContextField().getLocationId() == locationId) {
                contextField = window.getContextField();
            }
        })
        return contextField;
    }

    static removeWindowByWindowId(windowId) {
        const windows = this.getWindows();
        if (!windows) return;

        const index = windows.findIndex(window => window.getId() === windowId);

        if (index !== -1) {
            HCW.windows.splice(index, 1);
            return true;
        }

        return false;
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
        if (window == null) return;
        HCW.windows.push(window);
        HCW.temp.filesloaded ? HCWRender.updateFrame() : (HCW.temp.foreceupdateFrame = true);
        return this;
    }

    addWindows(windowsarray) {
        if (windowsarray == null) return;
        HCW.windows.push(...windowsarray);
        HCW.temp.filesloaded ? HCWRender.updateFrame() : (HCW.temp.foreceupdateFrame = true);
        return this;
    }

    setGrid(data = { everyPixelX: 100, everyPixelY: 100, crossLineLength: 0.2, lineColor: '#373737' }) {
        HCW.grid.pointDistanceX = data.everyPixelX;
        HCW.grid.pointDistanceY = data.everyPixelY;
        HCW.grid.lineColor = data.lineColor;
        HCW.grid.crossLineLength = data.crossLineLength;
        return this;
    }

    getWindows() {
        return HCW.windows;
    }

    files() {
        return [
            'hcw/hcw-helper.js',
            'hcw/hcw-grid-snap.js',
            'hcw/hcw-mouse-style.js',
            'hcw/hcw-render.js',
            'hcw/hcw-canvas-resize.js',
            'hcw/hcw-touch.js'
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