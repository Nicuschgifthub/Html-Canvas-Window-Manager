class HCWInteraction {
    static _windowsFilteredByMouseCoords(mouseX, mouseY) {
        return HCW.windows.filter(window =>
            window.boundingbox.startx < mouseX &&
            window.boundingbox.endx > mouseX &&
            window.boundingbox.starty < mouseY &&
            window.boundingbox.endy > mouseY
        )
    }

    static getWindowPartByCords(mouseX, mouseY) {
        const window = this._windowsFilteredByMouseCoords(mouseX, mouseY)[0];

        if (!window) return {
            window: null,
            parts: []
        }

        let parts = ['body'];

        const top = window.touchzones.top;
        const bottom = window.touchzones.bottom;
        const left = window.touchzones.left;
        const right = window.touchzones.right;

        if (top.startx < mouseX && top.starty < mouseY && top.endx > mouseX && top.endy > mouseY) {
            parts.push('top');
        }

        if (bottom.startx < mouseX && bottom.starty < mouseY && bottom.endx > mouseX && bottom.endy > mouseY) {
            parts.push('bottom');
        }

        if (left.startx < mouseX && left.starty < mouseY && left.endx > mouseX && left.endy > mouseY) {
            parts.push('left');
        }

        if (right.startx < mouseX && right.starty < mouseY && right.endx > mouseX && right.endy > mouseY) {
            parts.push('right');
        }

        return { window, parts };
    }

    static touchZoneTop(windowPartResults) {
        return windowPartResults.parts.includes('top');
    }

    static touchZoneBottom(windowPartResults) {
        return windowPartResults.parts.includes('bottom');
    }

    static touchZoneLeft(windowPartResults) {
        return windowPartResults.parts.includes('left');
    }

    static touchZoneRight(windowPartResults) {
        return windowPartResults.parts.includes('right');
    }

    static _windowContextFilteredByMouseCoords(mouseX, mouseY) {
        return HCW.windows.filter(window =>
            window.contextwindow.x < mouseX &&
            window.contextwindow.x2 > mouseX &&
            window.contextwindow.y < mouseY &&
            window.contextwindow.y2 > mouseY
        )
    }

    static getContextHitByCords(mouseX, mouseY) {
        const window = this._windowContextFilteredByMouseCoords(mouseX, mouseY)[0];

        if (!window) return {
            window: null,
        }

        console.log(window)

        // implement the rest

    }
}

class HCWWindowActions {

    static getMovingWindow() { return HCW.pointer.draggingWindow; }
    static getRightResizeWindow() { return HCW.pointer.rightResizeWindow; }
    static getMultiResizeWindow() { return HCW.pointer.multiResizeWindow; }
    static getDownResizeWindow() { return HCW.pointer.downResizeWindow; }

    static moveStart(window, mouseX, mouseY) {
        HCW.pointer.usermoveorresize = true;

        HCW.pointer.draggingWindow = window;
        HCW.pointer.lastMouseX = mouseX;
        HCW.pointer.lastMouseY = mouseY;

        HCWMouseStyle.drag();
    }

    static moveMove(mouseX, mouseY) {
        const dx = mouseX - HCW.pointer.lastMouseX;
        const dy = mouseY - HCW.pointer.lastMouseY;

        HCW.pointer.draggingWindow.x += dx;
        HCW.pointer.draggingWindow.y += dy;

        HCW.pointer.lastMouseX = mouseX;
        HCW.pointer.lastMouseY = mouseY;

        HCWMouseStyle.drag();
    }

    static moveEnd() {
        HCW.pointer.usermoveorresize = false;

        HCW.pointer.activewindow = HCW.pointer.draggingWindow;
        HCW.pointer.draggingWindow = null;

        HCWMouseStyle.default();
    }

    static _createResizeHandlers(windowKey, axisKeys, minSizeKeys, mouseKeys, cursorStyleMethod) {
        return {
            start(window, mouseX, mouseY) {
                HCW.pointer.usermoveorresize = true;
                HCW.pointer[windowKey] = window;

                if (mouseKeys.includes('X')) HCW.pointer.lastMouseX = mouseX;
                if (mouseKeys.includes('Y')) HCW.pointer.lastMouseY = mouseY;

                HCWMouseStyle[cursorStyleMethod]();
            },

            move(mouseX, mouseY) {
                const window = HCW.pointer[windowKey];

                if (axisKeys.includes('X')) {
                    const dx = mouseX - HCW.pointer.lastMouseX;
                    window.sx += dx;
                    window.sx = Math.max(window.sx, window[minSizeKeys.x]);
                    HCW.pointer.lastMouseX = mouseX;
                }

                if (axisKeys.includes('Y')) {
                    const dy = mouseY - HCW.pointer.lastMouseY;
                    window.sy += dy;
                    window.sy = Math.max(window.sy, window[minSizeKeys.y]);
                    HCW.pointer.lastMouseY = mouseY;
                }

                HCWMouseStyle[cursorStyleMethod]();
            },

            end() {
                HCW.pointer.usermoveorresize = false;
                HCW.pointer.activewindow = HCW.pointer[windowKey];
                HCW.pointer[windowKey] = null;
                HCWMouseStyle.default();
            }
        };
    }

    static rightResize = HCWWindowActions._createResizeHandlers(
        'rightResizeWindow',
        ['X'],
        { x: 'minsizex' },
        ['X'],
        'moveX'
    );

    static downResize = HCWWindowActions._createResizeHandlers(
        'downResizeWindow',
        ['Y'],
        { y: 'minsizey' },
        ['Y'],
        'moveY'
    );

    static multiResize = HCWWindowActions._createResizeHandlers(
        'multiResizeWindow',
        ['X', 'Y'],
        { x: 'minsizex', y: 'minsizey' },
        ['X', 'Y'],
        'move'
    );
}

class HCWContextActions {

}

class HCWTouch {
    static _eventMouseToCords(e) {
        const rect = HCW.canvas.getBoundingClientRect();
        const scaleX = HCW.canvas.width / rect.width;
        const scaleY = HCW.canvas.height / rect.height;

        let clientX, clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            clientX = e.changedTouches[0].clientX;
            clientY = e.changedTouches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const mouseX = (clientX - rect.left) * scaleX;
        const mouseY = (clientY - rect.top) * scaleY;

        return { mouseX, mouseY };
    }

    static _handleMouseDown(e) {
        e.preventDefault();
        const { mouseX, mouseY } = HCWTouch._eventMouseToCords(e);

        const windowParts = HCWInteraction.getWindowPartByCords(mouseX, mouseY);

        if (HCWInteraction.touchZoneTop(windowParts) && !HCWInteraction.touchZoneRight(windowParts)) {
            HCWWindowActions.moveStart(windowParts.window, mouseX, mouseY);
        }

        if (!HCWInteraction.touchZoneTop(windowParts) && HCWInteraction.touchZoneRight(windowParts) && !HCWInteraction.touchZoneBottom(windowParts)) {
            HCWWindowActions.rightResize.start(windowParts.window, mouseX, mouseY);
        }

        if (HCWInteraction.touchZoneBottom(windowParts) && HCWInteraction.touchZoneRight(windowParts)) {
            HCWWindowActions.multiResize.start(windowParts.window, mouseX, mouseY);
        }

        if (HCWInteraction.touchZoneBottom(windowParts) && !HCWInteraction.touchZoneRight(windowParts) && !HCWInteraction.touchZoneLeft(windowParts)) {
            HCWWindowActions.downResize.start(windowParts.window, mouseX, mouseY);
        }

        const contextHit = HCWInteraction.getContextHitByCords(mouseX, mouseY);

        HCWRender.updateFrame();
    }

    static _handleMouseMove(e) {
        e.preventDefault();
        const { mouseX, mouseY } = HCWTouch._eventMouseToCords(e);

        if (HCWWindowActions.getMovingWindow()) {
            HCWWindowActions.moveMove(mouseX, mouseY);
        }

        if (HCWWindowActions.getRightResizeWindow()) {
            HCWWindowActions.rightResize.move(mouseX, mouseY);
        }

        if (HCWWindowActions.getMultiResizeWindow()) {
            HCWWindowActions.multiResize.move(mouseX, mouseY);
        }

        if (HCWWindowActions.getDownResizeWindow()) {
            HCWWindowActions.downResize.move(mouseX, mouseY);
        }

        HCWRender.updateFrame();
    }

    static _handleMouseUp(e) {
        e.preventDefault();

        if (HCWWindowActions.getMovingWindow()) {
            HCWWindowActions.moveEnd();
        }

        if (HCWWindowActions.getRightResizeWindow()) {
            HCWWindowActions.rightResize.end();
        }

        if (HCWWindowActions.getMultiResizeWindow()) {
            HCWWindowActions.multiResize.end();
        }

        if (HCWWindowActions.getDownResizeWindow()) {
            HCWWindowActions.downResize.end();
        }

        HCWRender.updateFrame();
    }

    static setupListener() {
        HCW.canvas.addEventListener('mousedown', this._handleMouseDown);
        HCW.canvas.addEventListener('mousemove', this._handleMouseMove);
        HCW.canvas.addEventListener('mouseup', this._handleMouseUp);

        HCW.canvas.addEventListener('touchstart', this._handleMouseDown);
        HCW.canvas.addEventListener('touchmove', this._handleMouseMove);
        HCW.canvas.addEventListener('touchend', this._handleMouseUp);
    }
}