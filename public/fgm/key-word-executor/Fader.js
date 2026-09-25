class KYEFader {
    static command(params) {
        if (!params || !params.locationId || params.userAction) return;

        const field = params.originContext;
        if (!field) return;

        if (params.values) {
            if (params.values.byte !== undefined) {
                field.setDMX(parseInt(params.values.byte, 10));
            } else if (params.values.value !== undefined) {
                field.setFloat(parseFloat(params.values.value));
            }
        }
    }
}

globalThis.KYEFader = KYEFader;