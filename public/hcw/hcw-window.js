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

        if (typeof HCWGridSnap !== 'undefined' && typeof HCWGridSnap.updateWindows === 'function') {
            HCWGridSnap.updateWindows();
        }

        const gridX = (typeof HCW !== 'undefined' && HCW.grid && HCW.grid.pointDistanceX) ? HCW.grid.pointDistanceX : 100;
        const gridY = (typeof HCW !== 'undefined' && HCW.grid && HCW.grid.pointDistanceY) ? HCW.grid.pointDistanceY : 100;

        const maxPasses = 50;

        for (let pass = 0; pass < maxPasses; pass++) {
            let anyOverlap = false;

            const visibleWindows = HCW.windows.filter(w => !w.hidden);
            if (visibleWindows.length <= 1) break;

            for (let i = 0; i < visibleWindows.length; i++) {
                const w1 = visibleWindows[i];

                for (let j = 0; j < visibleWindows.length; j++) {
                    if (i === j) continue;
                    const w2 = visibleWindows[j];

                    if (w2 === activeWindow) continue;

                    if (w1.checkOverlap(w2)) {
                        anyOverlap = true;

                        w2.sx = Math.max(w2.sx, w2.minsizex || 0);
                        w2.sy = Math.max(w2.sy, w2.minsizey || 0);

                        const c1 = w1.getCenter();
                        const c2 = w2.getCenter();

                        const prefRight = c2.x >= c1.x;
                        const prefDown = c2.y >= c1.y;

                        const candidates = [];

                        // 1. Right
                        let rightX = Math.ceil((w1.x + w1.sx) / gridX) * gridX;
                        let scoreRight = Math.abs(rightX - w2.x) - (prefRight ? 0.1 * gridX : 0);
                        if (activeWindow && activeWindow !== w2 &&
                            rightX < activeWindow.x + activeWindow.sx && rightX + w2.sx > activeWindow.x &&
                            w2.y < activeWindow.y + activeWindow.sy && w2.y + w2.sy > activeWindow.y) {
                            scoreRight += 10000;
                        }
                        candidates.push({ x: rightX, y: w2.y, score: scoreRight });

                        // 2. Left
                        let leftX = Math.floor((w1.x - w2.sx) / gridX) * gridX;
                        if (leftX >= 0) {
                            let scoreLeft = Math.abs(leftX - w2.x) - (!prefRight ? 0.1 * gridX : 0);
                            if (activeWindow && activeWindow !== w2 &&
                                leftX < activeWindow.x + activeWindow.sx && leftX + w2.sx > activeWindow.x &&
                                w2.y < activeWindow.y + activeWindow.sy && w2.y + w2.sy > activeWindow.y) {
                                scoreLeft += 10000;
                            }
                            candidates.push({ x: leftX, y: w2.y, score: scoreLeft });
                        }

                        // 3. Down
                        let downY = Math.ceil((w1.y + w1.sy) / gridY) * gridY;
                        let scoreDown = Math.abs(downY - w2.y) - (prefDown ? 0.1 * gridY : 0);
                        if (activeWindow && activeWindow !== w2 &&
                            w2.x < activeWindow.x + activeWindow.sx && w2.x + w2.sx > activeWindow.x &&
                            downY < activeWindow.y + activeWindow.sy && downY + w2.sy > activeWindow.y) {
                            scoreDown += 10000;
                        }
                        candidates.push({ x: w2.x, y: downY, score: scoreDown });

                        // 4. Up
                        let upY = Math.floor((w1.y - w2.sy) / gridY) * gridY;
                        if (upY >= 0) {
                            let scoreUp = Math.abs(upY - w2.y) - (!prefDown ? 0.1 * gridY : 0);
                            if (activeWindow && activeWindow !== w2 &&
                                w2.x < activeWindow.x + activeWindow.sx && w2.x + w2.sx > activeWindow.x &&
                                upY < activeWindow.y + activeWindow.sy && upY + w2.sy > activeWindow.y) {
                                scoreUp += 10000;
                            }
                            candidates.push({ x: w2.x, y: upY, score: scoreUp });
                        }

                        candidates.sort((a, b) => a.score - b.score);

                        const best = candidates[0];
                        if (best) {
                            w2.x = best.x;
                            w2.y = best.y;

                            if (typeof w2._calculateTouchZones === 'function') w2._calculateTouchZones();
                            if (typeof w2._calculateBoundingBox === 'function') w2._calculateBoundingBox();
                            if (typeof w2._calculateContextWindow === 'function') w2._calculateContextWindow();
                        }
                    }
                }
            }

            if (!anyOverlap) break;
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