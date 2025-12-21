class HCWBackup {
    /**
     * Save the current layout of all windows to a JSON string.
     * Only saves position, size, and ID.
     * @returns {string} JSON string of the layout
     */
    static save() {
        const layout = HCW.windows.map(win => {
            return {
                id: win.id,
                x: win.x,
                y: win.y,
                sx: win.sx,
                sy: win.sy
            };
        });
        return JSON.stringify(layout);
    }

    /**
     * Load a layout from a JSON string and apply it to existing windows.
     * Windows are matched by ID.
     * @param {string} json JSON string of the layout
     */
    static load(json) {
        try {
            const layout = JSON.parse(json);
            if (!Array.isArray(layout)) {
                console.error("HCWBackup: Invalid layout format. Expected an array.");
                return;
            }

            layout.forEach(item => {
                const win = HCW.windows.find(w => w.id === item.id);
                if (win) {
                    win.x = item.x;
                    win.y = item.y;
                    win.sx = item.sx;
                    win.sy = item.sy;

                    if (typeof win._calculateTouchZones === 'function') win._calculateTouchZones();
                    if (typeof win._calculateBoundingBox === 'function') win._calculateBoundingBox();
                    if (typeof win._calculateContextWindow === 'function') win._calculateContextWindow();
                }
            });

            if (typeof HCWRender !== 'undefined') {
                HCWRender.updateFrame();
            }
            console.log("HCWBackup: Layout restored.");

        } catch (e) {
            console.error("HCWBackup: Failed to load layout.", e);
        }
    }
}
