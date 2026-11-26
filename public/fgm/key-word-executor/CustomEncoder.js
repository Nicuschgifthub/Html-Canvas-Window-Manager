/**
 * CustomEncoder <location> At outer <byte> inner <byte>
 * The custom wheel shows gobo / colour wheels (see FGMMapping "wheel" assignments).
 */
class KYECustomEncoder {
    static command(params) {
        if (!params || !params.locationId) return;

        const field = params.originContext;
        if (!field) return;

        // user turned the wheel → drive the assigned wheel attribute
        if (params.userAction) {
            FGMMapping.applyFromField(field);
            return;
        }

        if (params.values) {
            const outer = params.values.outer !== undefined ? parseInt(params.values.outer, 10) : null;
            const inner = params.values.inner !== undefined ? parseInt(params.values.inner, 10) : null;
            if (outer !== null || inner !== null) {
                field.setDMX(outer !== null ? outer : field.getV1_DMX(), inner !== null ? inner : field.getV2_DMX());
            }
        }
    }
}

globalThis.KYECustomEncoder = KYECustomEncoder;
