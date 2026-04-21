class HCWCanvasDraw {
    static drawRect(x, y, sx, sy, color = '#ffffff') {
        if (!HCW.ctx) return;
        HCW.ctx.fillStyle = color;
        HCW.ctx.fillRect(x, y, sx, sy);
    }

    static drawBackground(color = '#000000') {
        if (!HCW.ctx || !HCW.canvas) return;
        HCW.ctx.fillStyle = color;
        HCW.ctx.fillRect(0, 0, HCW.canvas.width, HCW.canvas.height);
    }

    static drawHollowRect(x, y, sx, sy, color = '#ffff00', thickness = 2, alpha = 0.5) {
        if (!HCW.ctx) return;
        HCW.ctx.save();
        HCW.ctx.globalAlpha = alpha;
        HCW.ctx.strokeStyle = color;
        HCW.ctx.lineWidth = thickness;
        HCW.ctx.strokeRect(x, y, sx, sy);
        HCW.ctx.restore();
    }
}

class HCWRender {
    static debugDraw(window) {
        HCWCanvasDraw.drawRect(window.contextwindow.x, window.contextwindow.y, 5, 5, '#ff0000');
        HCWCanvasDraw.drawRect(window.contextwindow.x2, window.contextwindow.y2, 5, 5, '#ff0000');
        HCWCanvasDraw.drawRect(window.contextwindow.x, window.contextwindow.y, window.contextwindow.sx, window.contextwindow.sy, '#ff0000');
    }

    static _drawBaseBox(window) {
        HCWCanvasDraw.drawRect(window.x, window.y, window.sx, window.sy, window.basecolor);
    }

    static _drawTouchZones(window) {
        HCWCanvasDraw.drawRect(window.x, window.y, window.sx, window.touchzone, window.touchzonecolor) // top
        HCWCanvasDraw.drawRect(window.x, (window.y + window.sy), window.sx, -window.touchzone, window.touchzonecolor) // bottom
        HCWCanvasDraw.drawRect((window.x + window.sx), window.y, -window.touchzone, window.sy, window.touchzonecolor) // right
        HCWCanvasDraw.drawRect(window.x, window.y, window.touchzone, window.sy, window.touchzonecolor) // left
    }

    static drawGrid() {
        HCW.grid.snappoints = [];

        for (let indexX = 0; indexX < HCW.canvas.width; indexX += HCW.grid.pointDistanceX) {
            for (let indexY = 0; indexY < HCW.canvas.height; indexY += HCW.grid.pointDistanceY) {
                HCWCanvasDraw.drawRect(indexX, indexY, (HCW.grid.pointDistanceY * HCW.grid.crossLineLength), 1, HCW.grid.lineColor);
                HCWCanvasDraw.drawRect(indexX, indexY, -(HCW.grid.pointDistanceY * HCW.grid.crossLineLength), 1, HCW.grid.lineColor);

                HCWCanvasDraw.drawRect(indexX, indexY, 1, (HCW.grid.pointDistanceX * HCW.grid.crossLineLength), HCW.grid.lineColor);
                HCWCanvasDraw.drawRect(indexX, indexY, 1, -(HCW.grid.pointDistanceX * HCW.grid.crossLineLength), HCW.grid.lineColor);

                HCW.grid.snappoints.push([indexX, indexY]);
            }
        }
    }

    static calculateRenderProps(field, w) {
        field.renderProps.startX = w.x;
        field.renderProps.startY = w.y;
        field.renderProps.endX = w.x2;
        field.renderProps.endY = w.y2;
        field.renderProps.sx = w.sx;
        field.renderProps.sy = w.sy;
    }

    static drawContextField(window) {
        if (!window.getContextField()) return;

        const contextField = window.getContextField();

        this.calculateRenderProps(contextField, window.contextwindow);
        contextField.render(window.contextwindow);
    }

    static drawWindow(window) {
        // this.debugDraw(window);
        if (window.hidden) return;

        this._drawBaseBox(window);
        this._drawTouchZones(window);
        this.drawContextField(window);
    }

    static drawBackgroundBoxDrag() {
        const x = HCW.pointer.backgroundStartX;
        const y = HCW.pointer.backgroundStartY;

        const sx = HCW.pointer.backgroundDragSizeX;
        const sy = HCW.pointer.backgroundDragSizeY;

        HCWCanvasDraw.drawHollowRect(x, y, sx, sy);
    }

    static updateFrame() {
        if (!HCW.ctx || !HCW.canvas) return;
        HCWCanvasDraw.drawBackground(HCW.background.color);

        if (HCW.grid.pointDistanceX !== null) {
            this.drawGrid();
            HCWGridSnap.updateWindows();
        }

        if (HCW.pointer.backgroundDragDraw) {
            this.drawBackgroundBoxDrag();
        }

        HCW.windows.forEach(window => {
            window._calculateTouchZones();
            window._calculateBoundingBox();
            window._calculateContextWindow();

            this.drawWindow(window);
        });

        FGMEvents.onRenderUpdate();
    }
}