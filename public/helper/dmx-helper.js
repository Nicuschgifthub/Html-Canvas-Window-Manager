class DMXHelper {
    /** 0-255 -> 0.0-1.0 */
    static dmxToFloat(byte) {
        return Math.min(Math.max(byte / 255, 0), 1);
    }

    /** 0.0-1.0 -> 0-255 */
    static floatToDMX(value) {
        return Math.round(Math.min(Math.max(value, 0), 1) * 255);
    }

    /** Coarse(0-255) + Fine(0-255) -> 0-65535 */
    static dmx2ToInt16Bit(coarse, fine) {
        return (coarse << 8) | fine;
    }

    /** 0-65535 -> { coarse: 0-255, fine: 0-255 } */
    static Int16BitToDmx2(value16bit) {
        return {
            coarse: (value16bit >> 8) & 0xFF,
            fine: value16bit & 0xFF
        };
    }

    /** 0.0-1.0 -> 0-65535 */
    static floatTo16Bit(value) {
        return Math.round(Math.min(Math.max(value, 0), 1) * 65535);
    }

    /** 0.0-1.0 -> { coarse: 0-255, fine: 0-255 } */
    static floatToDmx2(value) {
        const val16 = this.floatTo16Bit(value);
        return this.Int16BitToDmx2(val16);
    }

    /** 0-65535 -> 0.0-1.0 */
    static Int16BitToFloat(value16bit) {
        return Math.min(Math.max(value16bit / 65535, 0), 1);
    }

    /** 0-255 -> "0%"-"100%" */
    static dmxToPercent(byte) {
        return `${Math.round((byte / 255) * 100)}%`;
    }
}