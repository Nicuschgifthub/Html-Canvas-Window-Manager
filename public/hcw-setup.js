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

class HCWWindow {
    constructor(obj = {}) {
        const defaults = {
            x: 100,
            y: 100,
            sx: 100,
            sy: 100,
            type: 'default',
            id: Date.now(),
            minsizex: 0,
            minsizey: 0,
            basecolor: '#454545',
            touchzonecolor: '#969696',
            touchzonehighlightcolor: '#d6d6d6',
            touchzone: 12,
            touchzones: null,
            boundingbox: null,
            contextwindow: null,
            contextfield: null,
            scrollindex: 1,
            scrollindexratio: 1.2,
            hidden: false,
            pageId: null,
            temp: {},
            data: {}
        };

        this.className = 'HCWWindow';

        Object.assign(this, defaults, obj);

        this._init();
    }

    toJSON() {
        const { temp, ...persistentData } = this;
        return JSON.parse(JSON.stringify(persistentData));
    }

    setPageId(pageId) {
        this.pageId = pageId;
        return this;
    }

    getPageId() {
        return this.pageId;
    }

    getContextId() {
        return this.contextfield?.id;
    }

    getContextField() {
        return this.contextfield;
    }

    onPress(callback) {
        this.onPressCallback = callback;
        return this;
    }

    close() {
        const index = HCW.windows.indexOf(this);
        if (index > -1) {
            HCW.windows.splice(index, 1);
            HCWRender.updateFrame();
        }
    }

    setContextField(contextField) {
        if (contextField !== null) {
            this.contextfield = contextField;
        }
        return this;
    }

    setHidden(hide = true, reRender = true) {
        this.hidden = hide;
        if (typeof HCWRender !== 'undefined' && reRender == true) HCWRender.updateFrame();
        return this;
    }

    getHiddenStatus() {
        return this.hidden
    }

    setId(id) {
        this.id = id;
        return this;
    }

    getId() {
        return this.id;
    }

    setTouchZoneColor(hex) {
        this.touchzonecolor = hex;
        return this;
    }

    setBaseColor(hex) {
        this.basecolor = hex;
        return this;
    }

    setTouchZone(pixels) {
        this.touchzone = pixels;
        _calculateTouchZones();
        return this;
    }

    setMinSizes(x = 0, y = 0) {
        this.minsizex = x;
        this.minsizey = y;
        return this;
    }

    _init() {
        this._calculateTouchZones();
        this._calculateBoundingBox();
        this._calculateContextWindow();
    }

    _calculateBoundingBox() {
        this.boundingbox = {
            startx: this.x,
            starty: this.y,
            endx: this.x + this.sx,
            endy: this.y + this.sy
        }
    }

    _calculateContextWindow() {
        this.contextwindow = {
            x: this.x + this.touchzone,
            y: this.y + this.touchzone,
            x2: this.x + this.touchzone + (this.sx - (this.touchzone * 2)),
            y2: this.y + this.touchzone + (this.sy - (this.touchzone * 2))
        }

        this.contextwindow.sx = this.contextwindow.x2 - this.contextwindow.x;
        this.contextwindow.sy = this.contextwindow.y2 - this.contextwindow.y;
    }

    getCenter() {
        return {
            x: this.x + (this.sx / 2),
            y: this.y + (this.sy / 2)
        };
    }

    checkOverlap(other) {
        return (this.x < other.x + other.sx &&
            this.x + this.sx > other.x &&
            this.y < other.y + other.sy &&
            this.y + this.sy > other.y);
    }

    static resolveCollisions(activeWindow) {
        let processed = new Set();
        let queue = [activeWindow];

        let iterations = 0;
        const maxIterations = 100;

        while (queue.length > 0 && iterations < maxIterations) {
            let current = queue.shift();
            processed.add(current);
            iterations++;

            const currentCenter = current.getCenter();

            HCW.windows.forEach(other => {
                if (other.hidden) return;
                if (other === current || processed.has(other)) return;

                if (current.checkOverlap(other)) {
                    let overlapX = 0;
                    let overlapY = 0;

                    if (currentCenter.x < other.getCenter().x) {
                        overlapX = (current.x + current.sx) - other.x;
                    } else {
                        overlapX = (other.x + other.sx) - current.x;
                        overlapX = -overlapX;
                    }

                    if (currentCenter.y < other.getCenter().y) {
                        overlapY = (current.y + current.sy) - other.y;
                    } else {
                        overlapY = (other.y + other.sy) - current.y;
                        overlapY = -overlapY;
                    }

                    const buffer = 10;

                    if (Math.abs(overlapX) < Math.abs(overlapY)) {
                        other.x += overlapX > 0 ? overlapX + buffer : overlapX - buffer;
                    } else {
                        other.y += overlapY > 0 ? overlapY + buffer : overlapY - buffer;
                    }

                    other._calculateTouchZones();
                    other._calculateBoundingBox();
                    other._calculateContextWindow();

                    queue.push(other);
                }
            });
        }
    }

    _calculateTouchZones() {
        this.touchzones = {
            top: {
                starty: this.y,
                startx: this.x,
                endy: this.y + this.touchzone,
                endx: this.x + this.sx
            },
            bottom: {
                starty: (this.y + this.sy) - this.touchzone,
                startx: this.x,
                endy: this.y + this.sy,
                endx: this.x + this.sx
            },
            left: {
                starty: this.y,
                startx: this.x,
                endy: this.y + this.sy,
                endx: this.x + this.touchzone
            },
            right: {
                starty: this.y,
                startx: (this.x + this.sx) - this.touchzone,
                endy: this.y + this.sy,
                endx: this.x + this.sx
            }
        }
    }
}

const HCWFactory = {
    classList: {
        HCWWindow, HCWBaseField, HCWFaderField, HCWPresetField,
        HCWPreset, HCWEncoderField, HCWKeyboardField, HCWNumberField,
        HCWColorMapField, HCWTableField, HCWColorWheelEncoderField,
        HCWSearchField, HCWSearchResult
    },

    serialize(data) {
        return JSON.stringify(data);
    },

    reconstruct(json) {
        // 1. Convert string to object if needed
        let data = json;
        if (typeof json === 'string') {
            try { data = JSON.parse(json); } catch (e) { return json; }
        }

        // 2. Handle Arrays (like a list of windows)
        if (Array.isArray(data)) {
            return data.map(item => this.reconstruct(item));
        }

        // 3. If it's not a class-based object, return raw data
        if (!data || typeof data !== 'object' || !data.className) {
            return data;
        }

        // 4. Create the real Instance
        const TargetClass = this.classList[data.className];
        if (!TargetClass) {
            console.warn(`Class ${data.className} missing from Factory.`);
            return data;
        }
        const instance = new TargetClass();

        // 5. Map properties carefully
        for (let key in data) {
            const value = data[key];

            if (key !== "_CLASS_REBUILD_NONE_OVERWRITES") {
                if (value && typeof value === 'object') {
                    if (value.className || Array.isArray(value)) {
                        instance[key] = this.reconstruct(value);
                    } else {
                        instance[key] = value;
                    }
                } else {
                    instance[key] = value;
                }
            }
        }

        // 6. Post-Process Linking
        this._postLink(instance);

        return instance;
    },

    _postLink(instance) {
        if (instance instanceof HCWWindow) {
            const field = instance.contextfield || instance.contextField;
            if (field && typeof field === 'object') {
                instance.setContextField(field);
                if (field.setParentWindow) field.setParentWindow(instance);
            }
        }

        if (instance instanceof HCWPresetField && instance.presets) {
            instance.presets.forEach(p => {
                if (p.setParentField) p.setParentField(instance);
            });
        }
    }
};