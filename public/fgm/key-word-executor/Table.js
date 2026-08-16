class KYETable {
    static command(params) {
        if (!params || !params.locationId || params.userAction) return;

        const field = FGMContextHelper.getContextByLocationId(params.locationId);
        if (!field) return;

        if (params.action === 'Delete' && params.values && params.values.row !== undefined) {
            const rowIndex = parseInt(params.values.row, 10);
            if (!isNaN(rowIndex) && field.rows && field.rows[rowIndex]) {
                field.rows.splice(rowIndex, 1);
                if (typeof HCWRender !== 'undefined' && typeof HCWRender.updateFrame === 'function') {
                    HCWRender.updateFrame();
                }
            }
        }
    }
}

globalThis.KYETable = KYETable;