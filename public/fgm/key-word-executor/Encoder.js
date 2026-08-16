class KYEEncoder {
    static command(params) {
        if (!params || !params.locationId || params.userAction) return;

        const field = FGMContextHelper.getContextByLocationId(params.locationId);
        if (!field) return;

        if (params.values) {
            const outer = params.values.outer !== undefined ? parseInt(params.values.outer, 10) : null;
            const inner = params.values.inner !== undefined ? parseInt(params.values.inner, 10) : null;

            if (outer !== null || inner !== null) {
                const v1 = outer !== null ? outer : field.getV1_DMX();
                const v2 = inner !== null ? inner : field.getV2_DMX();
                field.setDMX(v1, v2);
            }
        }
    }
}

globalThis.KYEEncoder = KYEEncoder;