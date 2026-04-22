class HCWPositions {
    static getMiddleUserFocusPosition(gridOffset = 0) {
        const points = HCW.grid.snappoints;
        if (!points || points.length === 0) return null;

        const uniqueX = [...new Set(points.map(p => p[0]))].sort((a, b) => a - b);
        const uniqueY = [...new Set(points.map(p => p[1]))].sort((a, b) => a - b);

        const cols = uniqueX.length;
        const rows = uniqueY.length;

        const safeOffset = Math.max(0, Math.min(gridOffset, Math.floor(Math.min(cols, rows) / 2) - 1));

        const startIdx = (safeOffset * rows) + safeOffset;
        const endCol = (cols - 1) - safeOffset;
        const endRow = (rows - 1) - safeOffset;
        const endIdx = (endCol * rows) + endRow;

        const startPoint = points[startIdx];
        const endPoint = points[endIdx];

        if (!startPoint || !endPoint) return null;

        const width = endPoint[0] - startPoint[0];
        const height = endPoint[1] - startPoint[1];

        return {
            x: startPoint[0],
            y: startPoint[1],
            sx: width,
            sy: height,

            absoluteCenter: {
                x: startPoint[0] + (width / 2),
                y: startPoint[1] + (height / 2)
            }
        };
    }
}