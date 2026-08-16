let HCW = {
    HCWClassInstance: null,
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

        // Info
        userForceWindowSmallerLimit: false,

        // Contextwindow
        contextwindow: null,
        contextdrag: false,
        focusedField: null,

        // Global
        dragging: false,
        lastMouseX: null,
        lastMouseY: null,

        // Window Parts vars
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

        HCW.HCWClassInstance = this;
    }

    setBackgroundColor(hex) {
        HCW.background.color = hex;
        return this;
    }

    addWindow(window) {
        if (window == null) return;
        HCW.windows.push(window);
        if (!window.hidden && typeof HCWWindow !== 'undefined' && typeof HCWWindow.resolveCollisions === 'function') {
            HCWWindow.resolveCollisions(window);
        }
        HCW.temp.filesloaded ? HCWRender.updateFrame() : (HCW.temp.foreceupdateFrame = true);
        return this;
    }

    addWindows(windowsarray) {
        if (windowsarray == null) return;
        windowsarray.forEach(w => {
            if (w == null) return;
            HCW.windows.push(w);
            if (!w.hidden && typeof HCWWindow !== 'undefined' && typeof HCWWindow.resolveCollisions === 'function') {
                HCWWindow.resolveCollisions(w);
            }
        });
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
            'hcw/hcw-color.js',
            'hcw/hcw-helper.js',
            'hcw/hcw-grid-snap.js',
            'hcw/hcw-mouse-style.js',
            'hcw/hcw-render.js',
            'hcw/hcw-canvas-resize.js',
            'hcw/hcw-touch.js',
            'hcw/hcw-positions.js'
        ]
    }

    async _loadFiles() {
        for (const file of this.files()) {
            await this._loadScript(file);
        }
    }

    _loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.type = "text/javascript";
            script.async = false;

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

class HCWDB {
    static _windowsMap = new Map();
    static _locationMap = new Map();

    static _syncIndexes() {
        this._windowsMap.clear();
        this._locationMap.clear();

        const windows = HCW.windows || [];
        windows.forEach(win => {
            if (!win) return;
            this._windowsMap.set(win.getId(), win);
            const field = typeof win.getContextField === 'function' ? win.getContextField() : win.contextfield;
            if (field && typeof field.getLocationId === 'function' && field.getLocationId()) {
                this._locationMap.set(field.getLocationId().toString(), field);
            }
        });
    }

    static getHCW() {
        return HCW;
    }

    static getWindows() {
        return HCW.windows;
    }

    static addWindows(windowArray) {
        if (!windowArray) return;
        HCW.HCWClassInstance.addWindows(windowArray);
        this._syncIndexes();
    }

    static addWindowAndResolveCollisions(window) {
        if (!window) return;
        this.addWindows([window]);
        if (typeof HCWWindow !== 'undefined' && typeof HCWWindow.resolveCollisions === 'function') {
            HCWWindow.resolveCollisions(window);
        }
    }

    static getContextFieldByLocationId(locationId) {
        if (!locationId) return null;
        const key = locationId.toString();
        if (this._locationMap.has(key)) return this._locationMap.get(key);

        // Fallback sync if map missed an inline update
        this._syncIndexes();
        return this._locationMap.get(key) || null;
    }

    static getWindowById(windowId) {
        if (windowId == null) return null;
        if (this._windowsMap.has(windowId)) return this._windowsMap.get(windowId);

        // Fallback sync if map missed an inline update
        this._syncIndexes();
        return this._windowsMap.get(windowId) || null;
    }

    static bringToFront(window) {
        if (!window || !HCW.windows) return;
        const index = HCW.windows.indexOf(window);
        if (index > -1 && index !== HCW.windows.length - 1) {
            HCW.windows.splice(index, 1);
            HCW.windows.push(window);
            if (typeof HCWRender !== 'undefined' && typeof HCWRender.updateFrame === 'function') {
                HCWRender.updateFrame();
            }
        }
    }

    static generateNextWindowId() {
        this._syncIndexes();
        let candidateId = GLOBAL_CORE.DEFS.ALL_IDS.START_UNRESERVED_WINDOW_IDS;

        while (this._windowsMap.has(candidateId)) {
            candidateId++;
        }

        return candidateId;
    }

    static generateNextLocationId() {
        this._syncIndexes();

        let major = GLOBAL_CORE.DEFS.ALL_IDS.START_UNRESERVED_LOCATION_IDS.MAJOR;
        let minor = GLOBAL_CORE.DEFS.ALL_IDS.START_UNRESERVED_LOCATION_IDS.MINOR;

        while (true) {
            const formattedMinor = minor.toString().padStart(3, '0');
            const candidateId = `${major}.${formattedMinor}`;

            if (!this._locationMap.has(candidateId)) {
                return candidateId;
            }

            minor++;
            if (minor > 999) {
                minor = 1;
                major++;
            }

            if (major > 999) {
                console.error("Location ID limit reached!");
                return null;
            }
        }
    }

    static removeWindowByWindowId(windowId) {
        const windows = this.getWindows();
        if (!windows) return;

        const index = windows.findIndex(window => window.getId() === windowId);

        if (index > -1) {
            const removedWindow = windows.splice(index, 1)[0];
            if (removedWindow) {
                this._windowsMap.delete(removedWindow.getId());
                const field = typeof removedWindow.getContextField === 'function' ? removedWindow.getContextField() : removedWindow.contextfield;
                if (field && typeof field.getLocationId === 'function' && field.getLocationId()) {
                    this._locationMap.delete(field.getLocationId().toString());
                }
            }
            HCWRender.updateFrame();
        }
    }

    static removeWindowByLocationId(locationId) {
        const windows = this.getWindows();
        if (!windows) return;

        const index = windows.findIndex(window => window.getContextField() && window.getContextField().getLocationId() == locationId);

        if (index > -1) {
            const removedWindow = windows.splice(index, 1)[0];
            if (removedWindow) {
                this._windowsMap.delete(removedWindow.getId());
                if (removedWindow.getContextField() && removedWindow.getContextField().getLocationId()) {
                    this._locationMap.delete(removedWindow.getContextField().getLocationId().toString());
                }
            }
            HCWRender.updateFrame();
        }
    }
}

class HCWPointerOverride {
    /* Used to set Focus on contextFields, to get keyboard/... interactions as long as focus is provided */
    static setFocusFieldToContextWindow(contextWindow) {
        HCW.pointer.focusedField = contextWindow;
    }
}