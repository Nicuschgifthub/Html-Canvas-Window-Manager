class FGMContextHelper {

    static getWindowByLocationId(locationId) {
        return HCWDB.getWindows().find(win => win.getLocationId() === locationId);
    }

    static getContextByLocationId(locationId) {
        const win = this.getWindowByLocationId(locationId);
        return win ? win.getContextField() : null;
    }
}