class KYEColorMap {
    static command(params) {
        if (!params || !params.locationId || params.userAction) return;

        const field = FGMContextHelper.getContextByLocationId(params.locationId);
        if (!field) return;

        if (params.values) {
            const colors = {};
            if (params.values.r !== undefined) colors.r = parseInt(params.values.r, 10);
            if (params.values.g !== undefined) colors.g = parseInt(params.values.g, 10);
            if (params.values.b !== undefined) colors.b = parseInt(params.values.b, 10);
            if (params.values.w !== undefined) colors.white = parseInt(params.values.w, 10);
            if (params.values.a !== undefined) colors.amber = parseInt(params.values.a, 10);
            if (params.values.u !== undefined) colors.uv = parseInt(params.values.u, 10);

            if (Object.keys(colors).length > 0) {
                field.setColor(colors);
                if (typeof field._trigger === 'function') field._trigger();
            }
        }
    }
}

globalThis.KYEColorMap = KYEColorMap;