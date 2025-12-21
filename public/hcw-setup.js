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

        // [Global]
        dragging: false,
        lastMouseX: null,
        lastMouseY: null,
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

    setGrid(everyPixelX, everyPixelY, crosslineLength = 0.2, lineColor = '#373737') {
        HCW.grid.pointDistanceX = everyPixelX;
        HCW.grid.pointDistanceY = everyPixelY;
        HCW.grid.lineColor = lineColor;
        HCW.grid.crossLineLength = crosslineLength;
        return this;
    }

    getData() {

    }

    restoreData() {

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
    constructor(x, y, sizeX, sizeY) {
        this.x = x;
        this.y = y;
        this.sx = sizeX;
        this.sy = sizeY;
        this.type = null;

        this.id = null;

        this.minsizex = 0;
        this.minsizey = 0;
        this.basecolor = '#454545';

        this.touchzonecolor = '#969696';
        this.touchzonehighlightcolor = '#d6d6d6';
        this.touchzone = 12;
        this.touchzones = null;

        this.boundingbox = null;
        this.contextwindow = null;

        this.contextfields = [];
        this.scrollindex = 1;
        this.scrollindexratio = 1.2;

        this.temp = {};

        this.data = {};

        this._init();
    }

    close() {
        const index = HCW.windows.indexOf(this);
        if (index > -1) {
            HCW.windows.splice(index, 1);
            HCWRender.updateFrame();
        }
    }

    addContextField(contextField) {
        this.contextfields.push(contextField);
        return this;
    }

    setId(id) {
        this.id = id;
        return this;
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
        // Simple Queue based interaction
        // If activeWindow overlaps others, push them away.
        // Then those pushed windows become 'active' against others.

        let processed = new Set();
        let queue = [activeWindow];

        // Safety break to prevent infinite loops in tight spaces
        let iterations = 0;
        const maxIterations = 100;

        while (queue.length > 0 && iterations < maxIterations) {
            let current = queue.shift();
            processed.add(current);
            iterations++;

            const currentCenter = current.getCenter();

            HCW.windows.forEach(other => {
                if (other === current || processed.has(other)) return;

                if (current.checkOverlap(other)) {
                    // Calculate overlap amounts
                    let overlapX = 0;
                    let overlapY = 0;

                    if (currentCenter.x < other.getCenter().x) {
                        overlapX = (current.x + current.sx) - other.x;
                    } else {
                        overlapX = (other.x + other.sx) - current.x;
                        overlapX = -overlapX; // Negative means push left
                    }

                    if (currentCenter.y < other.getCenter().y) {
                        overlapY = (current.y + current.sy) - other.y;
                    } else {
                        overlapY = (other.y + other.sy) - current.y;
                        overlapY = -overlapY;
                    }

                    // Decide push direction (Min overlap axis)
                    // Add buffer
                    const buffer = 10;

                    if (Math.abs(overlapX) < Math.abs(overlapY)) {
                        // Push Horizontal
                        other.x += overlapX > 0 ? overlapX + buffer : overlapX - buffer;
                    } else {
                        // Push Vertical
                        other.y += overlapY > 0 ? overlapY + buffer : overlapY - buffer;
                    }

                    // Ensure window stays somewhat on screen (optional, but good for UX)
                    // For now, let's just push.

                    // Recalculate internals since position changed
                    other._calculateTouchZones();
                    other._calculateBoundingBox();
                    other._calculateContextWindow();

                    // Add to queue to propagate push
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