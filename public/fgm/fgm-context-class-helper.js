class FGMContextClassHelper {
    static getContextByFGMType(fgmType) {
        switch (fgmType) {
            case value:
                return HCWFaderField;

            default:
                break;
        }

    }
}