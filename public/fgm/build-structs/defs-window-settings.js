_DEFS_STORE.add('window-settings', (input) => {
    const { targetContext } = input;

    const rawDefinitions = [
        {
            label: "Label",
            getValue: () => targetContext.getLabel(),
            getKeyboardValue: () => targetContext.getLabel(), // Overridden for strings
            setterFunction: (value) => targetContext.setLabel(value),
            isReadOnly: false,
            setterValueVerify: (newValue) => {
                const val = newValue.trim();
                if (val.length === 0) return { valid: false, infoText: "Label cannot be empty" };
                if (val.length > 20) return { valid: false, infoText: "Label cannot be longer than 20 chars" };
                return { valid: true, infoText: "" };
            }
        },
        {
            label: "Location ID",
            getValue: () => targetContext.getLocationId(),
            getKeyboardValue: () => targetContext.getLocationId(), // Overridden for strings
            setterFunction: (value) => targetContext.setLocationId(value),
            isReadOnly: targetContext.getLocationId().startsWith("0"),
            setterValueVerify: (newValue) => {
                const val = newValue.toString().trim();
                const pattern = /^[1-9]\.\d{3}$/;
                if (!pattern.test(val)) return { valid: false, infoText: "Format Error: Use X.XXX" };
                const exists = HCWDB.getContextFieldByLocationId(val);
                if (exists && exists !== targetContext) return { valid: false, infoText: `ID ${val} used by "${exists.getLabel()}"` };
                return { valid: true, infoText: "" };
            }
        },
        // Faders
        {
            label: "Fader Value",
            _isNumeric: true,
            _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.FADER,
            getValue: () => targetContext.getDMX(),
            setterFunction: (v) => targetContext.setDMX(v)
        },
        // Encoders (Standard & Custom)
        {
            label: "Outer Value (V1)",
            _isNumeric: true,
            _forContextTypeOnly: [GLOBAL_TYPES.CONTEXT_FIELDS.ENCODER, GLOBAL_TYPES.CONTEXT_FIELDS.CUSTOM_WHEEL_ENCODER],
            getValue: () => targetContext.getV1_DMX(),
            setterFunction: (v) => targetContext.setDMX(v, targetContext.getV2_DMX())
        },
        {
            label: "Inner Value (V2)",
            _isNumeric: true,
            _forContextTypeOnly: [GLOBAL_TYPES.CONTEXT_FIELDS.ENCODER, GLOBAL_TYPES.CONTEXT_FIELDS.CUSTOM_WHEEL_ENCODER],
            getValue: () => targetContext.getV2_DMX(),
            setterFunction: (v) => targetContext.setDMX(targetContext.getV1_DMX(), v)
        },
        // Color Maps
        { label: "Hue", _isNumeric: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getH_DMX(), setterFunction: (v) => { targetContext.setH_DMX(v); targetContext._trigger(); } },
        { label: "Saturation", _isNumeric: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getS_DMX(), setterFunction: (v) => { targetContext.setS_DMX(v); targetContext._trigger(); } },
        { label: "Brightness (V)", _isNumeric: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getV_DMX(), setterFunction: (v) => { targetContext.setV_DMX(v); targetContext._trigger(); } },
        { label: "Red", _isNumeric: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getColors().r, setterFunction: (v) => { targetContext.setColor({ r: v }); targetContext._trigger(); } },
        { label: "Green", _isNumeric: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getColors().g, setterFunction: (v) => { targetContext.setColor({ g: v }); targetContext._trigger(); } },
        { label: "Blue", _isNumeric: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getColors().b, setterFunction: (v) => { targetContext.setColor({ b: v }); targetContext._trigger(); } },
        { label: "White LED", _isNumeric: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getColors().white, setterFunction: (v) => { targetContext.setColor({ white: v }); targetContext._trigger(); } },
        { label: "Amber LED", _isNumeric: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getColors().amber, setterFunction: (v) => { targetContext.setColor({ amber: v }); targetContext._trigger(); } },
        { label: "UV LED", _isNumeric: true, _forContextTypeOnly: GLOBAL_TYPES.CONTEXT_FIELDS.COLOR_MAP_INPUT, getValue: () => targetContext.getColors().uv, setterFunction: (v) => { targetContext.setColor({ uv: v }); targetContext._trigger(); } },
        {
            label: "Type",
            getValue: () => currentType,
            getKeyboardValue: () => currentType,
            isReadOnly: true
        }
    ];

    return rawDefinitions;
})