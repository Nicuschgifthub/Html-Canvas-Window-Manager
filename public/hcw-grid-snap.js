class HCWGridSnap {
    static _findClosestSnapPoint(x, y) {
        let closestPoint = null;
        let minDistance = Infinity;

        HCW.grid.snappoints.forEach(([snapX, snapY]) => {
            let distance = Math.sqrt((snapX - x) ** 2 + (snapY - y) ** 2);
            if (distance < minDistance) {
                minDistance = distance;
                closestPoint = [snapX, snapY];
            }
        });

        return closestPoint;
    }

    static updateWindows() {
        if (HCW.pointer.usermoveorresize) return;

        HCW.windows.forEach(window => {
            if (window.hidden) return;
            const snapsForCords = this._findClosestSnapPoint(window.x, window.y);
            const snapsForDims = this._findClosestSnapPoint(window.x + window.sx, window.y + window.sy);

            window.x = snapsForCords[0];
            window.y = snapsForCords[1];

            window.sx = snapsForDims[0] - window.x;
            window.sy = snapsForDims[1] - window.y;

            if (window.sx == 0) {
                window.sx += HCW.grid.pointDistanceX;
            }

            if (window.sy == 0) {
                window.sy += HCW.grid.pointDistanceY;
            }
        });
    }
}