class HCWSearchResult {
    /**
     * @param {string} name - Primary display text
     * @param {string} type - Category or secondary text
     * @param {Object} rawData - The full data object
     */
    constructor(name = '', type = 'General', rawData = {}) {
        this.className = 'HCWSearchResult';
        this._name = name;
        this._type = type;
        this._rawData = rawData;
        this._shortName = null;
    }

    getName() {
        return this._name || "Unknown";
    }

    getType() {
        return this._type;
    }

    getShortName() {
        return this._shortName;
    }

    getData() {
        return this._rawData;
    }

    getSubText() {
        return this._shortName || this._type || '';
    }

    setName(name) {
        this._name = String(name).trim();
        return this;
    }

    setType(type) {
        this._type = String(type).trim();
        return this;
    }

    setShortName(shortName) {
        this._shortName = shortName;
        return this;
    }

    setData(data) {
        if (typeof data === 'object' && data !== null) {
            this._rawData = data;
        }
        return this;
    }
}

class HCWSearchField extends HCWBaseField {
    constructor(label = 'Search') {
        super(label);
        this.className = 'HCWSearchField';
        this._insertClassKeyword();

        this.searchValue = "";
        this.results = [];
        this.onResultClickCallback = null;
        this.onSearchRequestCallback = null;

        this.headerHeight = 40;
        this.resultItemHeight = 45;
        this.gap = 5;

        this.renderProps = {
            startX: null,
            startY: null,
            endX: null,
            endY: null,
            resultButtons: []
        };
    }

    getType() {
        return GLOBAL_TYPES.CONTEXT_FIELDS.SEARCH_BOX;
    }

    setSearchValue(val) {
        this.searchValue = val;
        this.updateFrame();
        return this;
    }

    setResults(...results) {
        const finalResults = Array.isArray(results[0]) ? results[0] : results;

        this.results = finalResults.slice(0, 5);
        this.updateFrame();
        return this;
    }

    _interaction(interaction) {
        const { mouseX, mouseY, type, deltaY } = interaction;

        if (type === 'mousedown') {
            this._clickStartX = mouseX;
            this._clickStartY = mouseY;
            this._dragLastY = mouseY;
            this._potentialClick = true;

        } else if (type === 'mousemove') {
            if (this._dragLastY !== null) {
                const dy = mouseY - this._dragLastY;
                if (Math.abs(mouseY - this._clickStartY) > 10) {
                    this._potentialClick = false;
                }
                this._dragLastY = mouseY;
            }

        } else if (type === 'mouseup') {
            if (this._potentialClick) {
                const clickX = this._clickStartX;
                const clickY = this._clickStartY;

                const hitResult = this.renderProps.resultButtons.find(b =>
                    clickX >= b.x && clickX <= b.x + b.w &&
                    clickY >= b.y && clickY <= b.y + b.h
                );

                if (hitResult) {
                    this.emitAction(GLOBAL_TYPES.ACTIONS.SEARCH_UPDATES.RESULT_PRESS, {
                        result: hitResult.result,
                        data: hitResult.result.getData(),
                        name: hitResult.result.getName()
                    });
                    return;
                }

                const pad = 10;
                const isHeaderHit = clickX >= this.renderProps.startX + pad &&
                    clickX <= this.renderProps.endX - pad &&
                    clickY >= this.renderProps.startY + pad &&
                    clickY <= this.renderProps.startY + pad + this.headerHeight;

                if (isHeaderHit) {
                    this.emitAction(GLOBAL_TYPES.ACTIONS.SEARCH_UPDATES.SEARCH_BAR_PRESS, {
                        searchValue: this.searchValue
                    });
                }
            }

            this._dragLastY = null;
            this._potentialClick = false;

        } else if (type === 'scroll') {
            this.updateFrame();
        }
    }

    render(w) {
        this.renderProps.startX = w.x;
        this.renderProps.startY = w.y;
        this.renderProps.endX = w.x2;
        this.renderProps.endY = w.y2;
        this.renderProps.resultButtons = [];

        const ctx = HCW.ctx;
        if (!ctx) return;

        const pad = 10;

        ctx.fillStyle = '#1b1717';
        ctx.fillRect(w.x, w.y, w.sx, w.sy);

        ctx.fillStyle = '#333';
        ctx.fillRect(w.x + pad, w.y + pad, w.sx - pad * 2, this.headerHeight);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(this.searchValue || "Click to search...", w.x + pad + 10, w.y + pad + this.headerHeight / 2 + 6);

        ctx.font = '14px Arial';
        let currentY = w.y + pad + this.headerHeight + this.gap + 10;

        this.results.forEach((result, index) => {
            if (currentY + this.resultItemHeight > w.y2) return;

            const rx = w.x + pad;
            const rw = w.sx - pad * 2;
            const rh = this.resultItemHeight;

            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(rx, currentY, rw, rh);

            ctx.fillStyle = '#00ff95';
            ctx.font = 'bold 13px Arial';
            ctx.fillText(result.getName() || "Unknown", rx + 10, currentY + 18);

            ctx.fillStyle = '#bbb';
            ctx.font = '11px Arial';
            ctx.fillText(result.getSubText(), rx + 10, currentY + 35);

            this.renderProps.resultButtons.push({
                x: rx,
                y: currentY,
                w: rw,
                h: rh,
                result: result
            });

            currentY += rh + this.gap;
        });

        ctx.textAlign = 'start';
    }
}