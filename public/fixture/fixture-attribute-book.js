const FEATURE_GROUPS = {
    POSITION:  'Position',
    DIMMER:    'Dimmer',
    COLOR:     'Color',
    BEAM:      'Beam',
    GOBO:      'Gobo',
    PRISM:     'Prism',
    SHAPER:    'Beam Shaper',
    FOCUS:     'Focus',
    CONTROL:   'Control',
    EFFECTS:   'Effects',
    VIDEO:     'Video',
};

const PHYSICAL_UNITS = {
    NONE:    'None',
    PERCENT: 'Percent',
    ANGLE:   'Angle',
    FREQ:    'Hz',
    TEMP:    'K',
    LENGTH:  'm',
    TIME:    's',
    MASS:    'kg',
};

const ATTRIBUTE_DEFINITIONS = [

    {
        name: 'Pan',            pretty: 'Pan',
        featureGroup: FEATURE_GROUPS.POSITION,
        feature: 'PanTilt',     physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: -270,       defaultMax: 270,
        activationGroup: 'PanTilt',
        encoderBehaviour: 'relative',
        icon: '↔',
    },
    {
        name: 'PanRotate',      pretty: 'Pan Rotate',
        featureGroup: FEATURE_GROUPS.POSITION,
        feature: 'PanTilt',     physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: -270,       defaultMax: 270,
        activationGroup: 'PanTilt',
        encoderBehaviour: 'relative',
        icon: '↺',
    },
    {
        name: 'Tilt',           pretty: 'Tilt',
        featureGroup: FEATURE_GROUPS.POSITION,
        feature: 'PanTilt',     physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: -135,       defaultMax: 135,
        activationGroup: 'PanTilt',
        encoderBehaviour: 'relative',
        icon: '↕',
    },
    {
        name: 'TiltRotate',     pretty: 'Tilt Rotate',
        featureGroup: FEATURE_GROUPS.POSITION,
        feature: 'PanTilt',     physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: -135,       defaultMax: 135,
        activationGroup: 'PanTilt',
        encoderBehaviour: 'relative',
        icon: '↺',
    },
    {
        name: 'XYZ_X',         pretty: 'X Position',
        featureGroup: FEATURE_GROUPS.POSITION,
        feature: 'XYZ',         physicalUnit: PHYSICAL_UNITS.LENGTH,
        defaultMin: -10,        defaultMax: 10,
        activationGroup: 'XYZ',
        encoderBehaviour: 'relative',
        icon: 'X',
    },
    {
        name: 'XYZ_Y',         pretty: 'Y Position',
        featureGroup: FEATURE_GROUPS.POSITION,
        feature: 'XYZ',         physicalUnit: PHYSICAL_UNITS.LENGTH,
        defaultMin: -10,        defaultMax: 10,
        activationGroup: 'XYZ',
        encoderBehaviour: 'relative',
        icon: 'Y',
    },
    {
        name: 'XYZ_Z',         pretty: 'Z Position',
        featureGroup: FEATURE_GROUPS.POSITION,
        feature: 'XYZ',         physicalUnit: PHYSICAL_UNITS.LENGTH,
        defaultMin: -10,        defaultMax: 10,
        activationGroup: 'XYZ',
        encoderBehaviour: 'relative',
        icon: 'Z',
    },

    {
        name: 'Dimmer',         pretty: 'Dimmer',
        featureGroup: FEATURE_GROUPS.DIMMER,
        feature: 'Dimmer',      physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: null,
        encoderBehaviour: 'absolute',
        icon: '☀',
    },
    {
        name: 'Shutter1',       pretty: 'Shutter',
        featureGroup: FEATURE_GROUPS.DIMMER,
        feature: 'Shutter',     physicalUnit: PHYSICAL_UNITS.NONE,
        defaultMin: 0,          defaultMax: 255,
        activationGroup: null,
        encoderBehaviour: 'absolute',
        icon: '⬟',
    },
    {
        name: 'Shutter1Strobe', pretty: 'Strobe',
        featureGroup: FEATURE_GROUPS.DIMMER,
        feature: 'Shutter',     physicalUnit: PHYSICAL_UNITS.FREQ,
        defaultMin: 0,          defaultMax: 25,
        activationGroup: null,
        encoderBehaviour: 'absolute',
        icon: '⚡',
    },

    {
        name: 'ColorAdd_R',     pretty: 'Red',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'RGB',         physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: 'RGB',
        encoderBehaviour: 'absolute',
        icon: 'R',
    },
    {
        name: 'ColorAdd_G',     pretty: 'Green',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'RGB',         physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: 'RGB',
        encoderBehaviour: 'absolute',
        icon: 'G',
    },
    {
        name: 'ColorAdd_B',     pretty: 'Blue',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'RGB',         physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: 'RGB',
        encoderBehaviour: 'absolute',
        icon: 'B',
    },
    {
        name: 'ColorAdd_W',     pretty: 'White',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'RGB',         physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: 'RGB',
        encoderBehaviour: 'absolute',
        icon: 'W',
    },
    {
        name: 'ColorAdd_A',     pretty: 'Amber',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'RGB',         physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: 'RGB',
        encoderBehaviour: 'absolute',
        icon: 'A',
    },
    {
        name: 'ColorAdd_UV',    pretty: 'UV',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'RGB',         physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: 'RGB',
        encoderBehaviour: 'absolute',
        icon: 'UV',
    },
    {
        name: 'ColorSub_C',     pretty: 'Cyan',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'CMY',         physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: 'CMY',
        encoderBehaviour: 'absolute',
        icon: 'C',
    },
    {
        name: 'ColorSub_M',     pretty: 'Magenta',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'CMY',         physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: 'CMY',
        encoderBehaviour: 'absolute',
        icon: 'M',
    },
    {
        name: 'ColorSub_Y',     pretty: 'Yellow',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'CMY',         physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: 'CMY',
        encoderBehaviour: 'absolute',
        icon: 'Y',
    },
    {
        name: 'HSB_Hue',        pretty: 'Hue',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'HSB',         physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: 0,          defaultMax: 360,
        activationGroup: 'HSB',
        encoderBehaviour: 'relative',
        icon: 'H',
    },
    {
        name: 'HSB_Saturation', pretty: 'Saturation',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'HSB',         physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: 'HSB',
        encoderBehaviour: 'absolute',
        icon: 'S',
    },
    {
        name: 'HSB_Brightness', pretty: 'Brightness',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'HSB',         physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: 'HSB',
        encoderBehaviour: 'absolute',
        icon: 'B',
    },
    {
        name: 'ColorMacro1',    pretty: 'Color Macro',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'ColorMacro',  physicalUnit: PHYSICAL_UNITS.NONE,
        defaultMin: 0,          defaultMax: 255,
        activationGroup: null,
        encoderBehaviour: 'absolute',
        icon: '🎨',
    },
    {
        name: 'CTO',            pretty: 'CTO',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'ColorTemp',   physicalUnit: PHYSICAL_UNITS.TEMP,
        defaultMin: 2700,       defaultMax: 10000,
        activationGroup: null,
        encoderBehaviour: 'relative',
        icon: '🌡',
    },
    {
        name: 'CTC',            pretty: 'CTC',
        featureGroup: FEATURE_GROUPS.COLOR,
        feature: 'ColorTemp',   physicalUnit: PHYSICAL_UNITS.TEMP,
        defaultMin: 2700,       defaultMax: 10000,
        activationGroup: null,
        encoderBehaviour: 'relative',
        icon: '🌡',
    },

    {
        name: 'Iris',           pretty: 'Iris',
        featureGroup: FEATURE_GROUPS.BEAM,
        feature: 'Iris',        physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: null,
        encoderBehaviour: 'absolute',
        icon: '◎',
    },
    {
        name: 'Zoom',           pretty: 'Zoom',
        featureGroup: FEATURE_GROUPS.BEAM,
        feature: 'Zoom',        physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: 4,          defaultMax: 50,
        activationGroup: null,
        encoderBehaviour: 'relative',
        icon: '⊕',
    },
    {
        name: 'Focus1',         pretty: 'Focus',
        featureGroup: FEATURE_GROUPS.BEAM,
        feature: 'Focus',       physicalUnit: PHYSICAL_UNITS.LENGTH,
        defaultMin: 0,          defaultMax: 30,
        activationGroup: null,
        encoderBehaviour: 'relative',
        icon: '◉',
    },
    {
        name: 'Frost1',         pretty: 'Frost',
        featureGroup: FEATURE_GROUPS.BEAM,
        feature: 'Frost',       physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,          defaultMax: 100,
        activationGroup: null,
        encoderBehaviour: 'absolute',
        icon: '❄',
    },
    {
        name: 'BeamAngle',      pretty: 'Beam Angle',
        featureGroup: FEATURE_GROUPS.BEAM,
        feature: 'BeamAngle',   physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: 0,          defaultMax: 50,
        activationGroup: null,
        encoderBehaviour: 'relative',
        icon: '∠',
    },

    {
        name: 'Shutter1Frm_A',  pretty: 'Framing A In',
        featureGroup: FEATURE_GROUPS.SHAPER,
        feature: 'FramingShutter', physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,           defaultMax: 100,
        activationGroup: 'Framing',
        encoderBehaviour: 'absolute',
        icon: '▲',
    },
    {
        name: 'Shutter1FrmA_Rot', pretty: 'Framing A Angle',
        featureGroup: FEATURE_GROUPS.SHAPER,
        feature: 'FramingShutter', physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: -45,          defaultMax: 45,
        activationGroup: 'Framing',
        encoderBehaviour: 'relative',
        icon: '↺',
    },
    {
        name: 'Shutter1Frm_B',  pretty: 'Framing B In',
        featureGroup: FEATURE_GROUPS.SHAPER,
        feature: 'FramingShutter', physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,           defaultMax: 100,
        activationGroup: 'Framing',
        encoderBehaviour: 'absolute',
        icon: '▶',
    },
    {
        name: 'Shutter1FrmB_Rot', pretty: 'Framing B Angle',
        featureGroup: FEATURE_GROUPS.SHAPER,
        feature: 'FramingShutter', physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: -45,          defaultMax: 45,
        activationGroup: 'Framing',
        encoderBehaviour: 'relative',
        icon: '↺',
    },
    {
        name: 'Shutter1Frm_C',  pretty: 'Framing C In',
        featureGroup: FEATURE_GROUPS.SHAPER,
        feature: 'FramingShutter', physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,           defaultMax: 100,
        activationGroup: 'Framing',
        encoderBehaviour: 'absolute',
        icon: '▼',
    },
    {
        name: 'Shutter1FrmC_Rot', pretty: 'Framing C Angle',
        featureGroup: FEATURE_GROUPS.SHAPER,
        feature: 'FramingShutter', physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: -45,          defaultMax: 45,
        activationGroup: 'Framing',
        encoderBehaviour: 'relative',
        icon: '↺',
    },
    {
        name: 'Shutter1Frm_D',  pretty: 'Framing D In',
        featureGroup: FEATURE_GROUPS.SHAPER,
        feature: 'FramingShutter', physicalUnit: PHYSICAL_UNITS.PERCENT,
        defaultMin: 0,           defaultMax: 100,
        activationGroup: 'Framing',
        encoderBehaviour: 'absolute',
        icon: '◀',
    },
    {
        name: 'Shutter1FrmD_Rot', pretty: 'Framing D Angle',
        featureGroup: FEATURE_GROUPS.SHAPER,
        feature: 'FramingShutter', physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: -45,          defaultMax: 45,
        activationGroup: 'Framing',
        encoderBehaviour: 'relative',
        icon: '↺',
    },
    {
        name: 'Shutter1FrmA_Pos', pretty: 'Framing Frame Rot',
        featureGroup: FEATURE_GROUPS.SHAPER,
        feature: 'FramingShutter', physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: 0,            defaultMax: 360,
        activationGroup: 'Framing',
        encoderBehaviour: 'relative',
        icon: '⟳',
    },

    {
        name: 'Gobo1',          pretty: 'Gobo 1',
        featureGroup: FEATURE_GROUPS.GOBO,
        feature: 'GoboWheel1',  physicalUnit: PHYSICAL_UNITS.NONE,
        defaultMin: 0,          defaultMax: 255,
        activationGroup: 'Gobo1',
        encoderBehaviour: 'absolute',
        icon: '◈',
    },
    {
        name: 'Gobo1Pos',       pretty: 'Gobo 1 Pos',
        featureGroup: FEATURE_GROUPS.GOBO,
        feature: 'GoboWheel1',  physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: 0,          defaultMax: 360,
        activationGroup: 'Gobo1',
        encoderBehaviour: 'relative',
        icon: '↺',
    },
    {
        name: 'Gobo1PosRotate', pretty: 'Gobo 1 Spin',
        featureGroup: FEATURE_GROUPS.GOBO,
        feature: 'GoboWheel1',  physicalUnit: PHYSICAL_UNITS.FREQ,
        defaultMin: -10,        defaultMax: 10,
        activationGroup: 'Gobo1',
        encoderBehaviour: 'relative',
        icon: '⟳',
    },
    {
        name: 'Gobo2',          pretty: 'Gobo 2',
        featureGroup: FEATURE_GROUPS.GOBO,
        feature: 'GoboWheel2',  physicalUnit: PHYSICAL_UNITS.NONE,
        defaultMin: 0,          defaultMax: 255,
        activationGroup: 'Gobo2',
        encoderBehaviour: 'absolute',
        icon: '◈',
    },
    {
        name: 'Gobo2Pos',       pretty: 'Gobo 2 Pos',
        featureGroup: FEATURE_GROUPS.GOBO,
        feature: 'GoboWheel2',  physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: 0,          defaultMax: 360,
        activationGroup: 'Gobo2',
        encoderBehaviour: 'relative',
        icon: '↺',
    },

    {
        name: 'Prism1',         pretty: 'Prism',
        featureGroup: FEATURE_GROUPS.PRISM,
        feature: 'Prism',       physicalUnit: PHYSICAL_UNITS.NONE,
        defaultMin: 0,          defaultMax: 255,
        activationGroup: 'Prism1',
        encoderBehaviour: 'absolute',
        icon: '△',
    },
    {
        name: 'Prism1Pos',      pretty: 'Prism Pos',
        featureGroup: FEATURE_GROUPS.PRISM,
        feature: 'Prism',       physicalUnit: PHYSICAL_UNITS.ANGLE,
        defaultMin: 0,          defaultMax: 360,
        activationGroup: 'Prism1',
        encoderBehaviour: 'relative',
        icon: '↺',
    },
    {
        name: 'Prism1PosRotate', pretty: 'Prism Spin',
        featureGroup: FEATURE_GROUPS.PRISM,
        feature: 'Prism',       physicalUnit: PHYSICAL_UNITS.FREQ,
        defaultMin: -10,        defaultMax: 10,
        activationGroup: 'Prism1',
        encoderBehaviour: 'relative',
        icon: '⟳',
    },

    {
        name: 'Effects1',       pretty: 'Effect',
        featureGroup: FEATURE_GROUPS.EFFECTS,
        feature: 'Effects',     physicalUnit: PHYSICAL_UNITS.NONE,
        defaultMin: 0,          defaultMax: 255,
        activationGroup: null,
        encoderBehaviour: 'absolute',
        icon: '✦',
    },
    {
        name: 'Effects1Rate',   pretty: 'Effect Rate',
        featureGroup: FEATURE_GROUPS.EFFECTS,
        feature: 'Effects',     physicalUnit: PHYSICAL_UNITS.FREQ,
        defaultMin: 0,          defaultMax: 25,
        activationGroup: null,
        encoderBehaviour: 'relative',
        icon: '~',
    },
    {
        name: 'Effects1Fade',   pretty: 'Effect Fade',
        featureGroup: FEATURE_GROUPS.EFFECTS,
        feature: 'Effects',     physicalUnit: PHYSICAL_UNITS.TIME,
        defaultMin: 0,          defaultMax: 10,
        activationGroup: null,
        encoderBehaviour: 'relative',
        icon: '~',
    },

    {
        name: 'Reset',          pretty: 'Reset',
        featureGroup: FEATURE_GROUPS.CONTROL,
        feature: 'Control',     physicalUnit: PHYSICAL_UNITS.NONE,
        defaultMin: 0,          defaultMax: 255,
        activationGroup: null,
        encoderBehaviour: 'absolute',
        icon: '⏻',
    },
    {
        name: 'LampControl',    pretty: 'Lamp Control',
        featureGroup: FEATURE_GROUPS.CONTROL,
        feature: 'Control',     physicalUnit: PHYSICAL_UNITS.NONE,
        defaultMin: 0,          defaultMax: 255,
        activationGroup: null,
        encoderBehaviour: 'absolute',
        icon: '💡',
    },
];

class FixtureAttributeBook {
    constructor() {

        this._book = {};

        this._groups = {};

        ATTRIBUTE_DEFINITIONS.forEach(attr => this._register(attr));
    }

    _register(attr) {
        this._book[attr.name] = Object.freeze({ ...attr });
        if (!this._groups[attr.featureGroup]) {
            this._groups[attr.featureGroup] = [];
        }
        this._groups[attr.featureGroup].push(attr.name);
    }


    get(name) {
        return this._book[name] || null;
    }


    has(name) {
        return !!this._book[name];
    }


    getGroup(featureGroup) {
        return this._groups[featureGroup] || [];
    }


    getFeatureGroups() {
        return Object.keys(this._groups);
    }


    getAll() {
        return Object.values(this._book);
    }


    resolve(gdtfAttrName) {
        if (!gdtfAttrName) return null;

        if (this._book[gdtfAttrName]) return this._book[gdtfAttrName];

        const aliases = {
            'Dimmer':           'Dimmer',
            'Intensity':        'Dimmer',
            'DimmerMode':       'Dimmer',
            'Pan':              'Pan',
            'PanMode':          'Pan',
            'Tilt':             'Tilt',
            'TiltMode':         'Tilt',
            'ColorRGBRed':      'ColorAdd_R',
            'ColorRGBGreen':    'ColorAdd_G',
            'ColorRGBBlue':     'ColorAdd_B',
            'ColorRGBWhite':    'ColorAdd_W',
            'ColorRGBAmber':    'ColorAdd_A',
            'Red':              'ColorAdd_R',
            'Green':            'ColorAdd_G',
            'Blue':             'ColorAdd_B',
            'White':            'ColorAdd_W',
            'Amber':            'ColorAdd_A',
            'Cyan':             'ColorSub_C',
            'Magenta':          'ColorSub_M',
            'Yellow':           'ColorSub_Y',
            'Hue':              'HSB_Hue',
            'Saturation':       'HSB_Saturation',
            'Color1':           'ColorMacro1',
            'Color2':           'ColorMacro1',
            'ColorTemperature': 'CTO',
            'Gobo':             'Gobo1',
            'GoboWheel1':       'Gobo1',
            'GoboWheel2':       'Gobo2',
            'GoboIndex1':       'Gobo1Pos',
            'GoboRotation1':    'Gobo1PosRotate',
            'Zoom':             'Zoom',
            'Focus':            'Focus1',
            'Iris':             'Iris',
            'Frost':            'Frost1',
            'Strobe':           'Shutter1Strobe',
            'Shutter':          'Shutter1',
            'Prism':            'Prism1',
        };

        const mapped = aliases[gdtfAttrName];
        if (mapped && this._book[mapped]) return this._book[mapped];

        console.warn(`FixtureAttributeBook: unknown attribute "${gdtfAttrName}"`);
        return null;
    }

    debugLog() {
        console.group('%c📚 Fixture Attribute Book', 'color:#00ff95; font-weight:bold; font-size:13px;');
        Object.keys(this._groups).forEach(group => {
            const attrs = this._groups[group].map(n => this._book[n]);
            console.groupCollapsed(`%c${group} (${attrs.length})`, 'color:#ffaa00; font-weight:bold;');
            console.table(attrs.map(a => ({
                Name:     a.name,
                Pretty:   a.pretty,
                Feature:  a.feature,
                Unit:     a.physicalUnit,
                Min:      a.defaultMin,
                Max:      a.defaultMax,
                Encoder:  a.encoderBehaviour,
            })));
            console.groupEnd();
        });
        console.groupEnd();
    }
}

const AttributeBook = new FixtureAttributeBook();
globalThis.AttributeBook = AttributeBook;
globalThis.FixtureAttributeBook = FixtureAttributeBook;
globalThis.FEATURE_GROUPS = FEATURE_GROUPS;
globalThis.PHYSICAL_UNITS = PHYSICAL_UNITS;