class HCWGridSnap {
    static _findClosestSnapPoint(x, y) {
        let closestPoint = null;
        let minDistance = Infinity;

        if (!HCW.grid || !HCW.grid.snappoints) return [x, y];

        HCW.grid.snappoints.forEach(([snapX, snapY]) => {
            let distance = Math.sqrt((snapX - x) ** 2 + (snapY - y) ** 2);
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = [snapX, snapY];
            }
        });

        return closestPoint || [x, y];
    }

    static updateWindows() {
        if (HCW.pointer.usermoveorresize) return;

        const gridX = HCW.grid ? HCW.grid.pointDistanceX : null;
        const gridY = HCW.grid ? HCW.grid.pointDistanceY : null;

        HCW.windows.forEach(window => {
            if (window.hidden) return;

            if (gridX && gridY) {
                const snapsForCords = this._findClosestSnapPoint(window.x, window.y);
                window.x = snapsForCords[0];
                window.y = snapsForCords[1];

                const minSx = window.minsizex || 0;
                const minSy = window.minsizey || 0;

                const snappedSx = Math.round(window.sx / gridX) * gridX;
                const snappedSy = Math.round(window.sy / gridY) * gridY;

                window.sx = Math.max(minSx, snappedSx <= 0 ? gridX : snappedSx);
                window.sy = Math.max(minSy, snappedSy <= 0 ? gridY : snappedSy);
            }

            if (typeof window._calculateTouchZones === 'function') window._calculateTouchZones();
            if (typeof window._calculateBoundingBox === 'function') window._calculateBoundingBox();
            if (typeof window._calculateContextWindow === 'function') window._calculateContextWindow();
        });
    }
}