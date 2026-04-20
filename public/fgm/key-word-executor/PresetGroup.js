class KYEPresetGroup {
    static command(params) {

        switch (params.subKeyword) {
            case 'Preset':
                this.findPresetFunctionAndExecute(params);
                break;

            default:
                break;
        }
    }

    static findPresetFunctionAndExecute(params) {
        const presetData = HCWDB.getContextFieldByLocationId(params.locationId)
            .getPresetByIndex(params.subId)
            .getData();

        Object.keys(presetData).forEach(functionName => {
            const functionData = presetData[functionName];

            const targetFunctions = this.presetFunctions();

            if (targetFunctions[functionName]) {
                targetFunctions[functionName](functionData);
            } else {
                console.error(`Function ${functionName} not found in presetFunctions`);
            }
        });
    }

    static presetFunctions() {
        return {
            _pageChangeTo(data) {
                // change page
            }
        };
    }
}

globalThis.KYEPresetGroup = KYEPresetGroup;