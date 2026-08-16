class HCWWindow {
    constructor(obj = {}) {
        const defaults = {
            x: 100,
            y: 100,
            sx: 100,
            sy: 100,
            type: GLOBAL_TYPES.WINDOW.TYPE,
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

    getLocationId() {
        return this.contextfield?.getLocationId();
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

    setMinSizes(sx = 0, sy = 0) {
        this.minsizex = sx;
        this.minsizey = sy;
        if (this.sx < this.minsizex) this.sx = this.minsizex;
        if (this.sy < this.minsizey) this.sy = this.minsizey;
        return this;
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }

    setSize(sx, sy) {
        this.sx = Math.max(sx, this.minsizex || 0);
        this.sy = Math.max(sy, this.minsizey || 0);
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
        if (!activeWindow || activeWindow.hidden) return;

        let processed = new Set();
        let queue = [activeWindow];

        let iterations = 0;
        const maxIterations = 100;

        const gridX = (typeof HCW !== 'undefined' && HCW.grid && HCW.grid.pointDistanceX) ? HCW.grid.pointDistanceX : 0;
        const gridY = (typeof HCW !== 'undefined' && HCW.grid && HCW.grid.pointDistanceY) ? HCW.grid.pointDistanceY : 0;

        while (queue.length > 0 && iterations < maxIterations) {
            let current = queue.shift();
            processed.add(current);
            iterations++;

            const currentCenter = current.getCenter();

            HCW.windows.forEach(other => {
                if (other.hidden || other === current || processed.has(other)) return;

                if (current.checkOverlap(other)) {
                    other.sx = Math.max(other.sx, other.minsizex || 0);
                    other.sy = Math.max(other.sy, other.minsizey || 0);

                    let rightX = current.x + current.sx;
                    if (gridX > 0) rightX = Math.ceil(rightX / gridX) * gridX;

                    let leftX = current.x - other.sx;
                    if (gridX > 0) leftX = Math.floor(leftX / gridX) * gridX;

                    let downY = current.y + current.sy;
                    if (gridY > 0) downY = Math.ceil(downY / gridY) * gridY;

                    let upY = current.y - other.sy;
                    if (gridY > 0) upY = Math.floor(upY / gridY) * gridY;

                    const otherCenter = other.getCenter();

                    let candX = (otherCenter.x >= currentCenter.x) ? rightX : leftX;
                    let candY = (otherCenter.y >= currentCenter.y) ? downY : upY;

                    if (candX < 0) candX = rightX;
                    if (candY < 0) candY = downY;

                    const distX = Math.abs(candX - other.x);
                    const distY = Math.abs(candY - other.y);

                    if (distX <= distY) {
                        other.x = candX;
                    } else {
                        other.y = candY;
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
        HCWColorMapField, HCWTableField, HCWCustomEncoderField,
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