class FGMFixtureGroup {
    constructor(ugId) {

    }
}

class FGMFixture {
    constructor(uId) {

        this.infos = {
            id: uId,
            text: "Fixture 1",
        }

        this.dmx = {
            address: 0
        }

        this.functions = {
            DIMMER: null,
            SHUTTER: null,
            COLOR_WHEEL_1: null,
            COLOR_WHEEL_2: null,
            GOBO_WHEEL_STATIC_1: null,
            GOBO_WHEEL_STATIC_2: null,
            GOBO_WHEEL_DYNAMIC_1: null,
            GOBO_WHEEL_DYNAMIC_2: null,
            GOBO_WHEEL_ROTATION_1: null,
            GOBO_WHEEL_ROTATION_2: null,
            ZOOM: null,
            FOCUS: null,
            COLOR_R: null,
            COLOR_G: null,
            COLOR_B: null,
            COLOR_WHITE: null,
            COLOR_AMBER: null,
            COLOR_UV: null,
            PAN_8Bit: null,
            PAN_16Bit: null,
            TILT_8Bit: null,
            TILT_16Bit: null,
            FROST: null,
            PRISM_1: null,
            PRISM_2: null,
            PRISM_3: null,
            PRISM_4: null,
            BEAMSHAPER_BLADE_1: null,
            BEAMSHAPER_BLADE_2: null,
            BEAMSHAPER_BLADE_3: null,
            BEAMSHAPER_BLADE_4: null,

            _SETTINGS: [
                { label: "Test", channel: null, holdForSeconds: null, _active: false, description: "This is a Test channel" }
            ]
        }
    }


    getId() {

    }

    setId() {

    }

    setLabel() {

    }

}