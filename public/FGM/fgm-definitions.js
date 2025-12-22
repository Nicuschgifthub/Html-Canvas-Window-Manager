class DMXValues {
    /** 0.0-1.0 to 0-255 */
    static valueToByte(val) {
        return Math.max(0, Math.min(255, Math.round(val * 255)));
    }

    /** 0.0-1.0 to 0-100 */
    static valueToPercent(val) {
        return Math.max(0, Math.min(100, Math.round(val * 100)));
    }

    /** 0-255 to 0.0-1.0 */
    static byteToValue(byte) {
        return Math.max(0, Math.min(1, byte / 255));
    }

    /** 0-255 to 0-100 */
    static byteToPercent(byte) {
        return Math.max(0, Math.min(100, Math.round((byte / 255) * 100)));
    }

    /** 0-100 to 0.0-1.0 */
    static percentToValue(pct) {
        return Math.max(0, Math.min(1, pct / 100));
    }

    /** 0-100 to 0-255 */
    static percentToByte(pct) {
        return Math.max(0, Math.min(255, Math.round((pct / 100) * 255)));
    }
}

class DmxConvert {
    /**
     * Converts a 0.0-1.0 value to a 16-bit pair
     * @returns {object} { coarse: 0-255, fine: 0-255 }
     */
    static valueTo16Bit(val) {
        const total = Math.max(0, Math.min(65535, Math.round(val * 65535)));
        return {
            coarse: (total >> 8) & 0xFF,
            fine: total & 0xFF
        };
    }

    /**
     * Combines two 8-bit numbers into one 16-bit integer (0-65535)
     * @param {number} coarse 0-255
     * @param {number} fine 0-255
     * @returns {number} 0-65535
     */
    static combineTo16Bit(coarse, fine) {
        // Shift coarse left by 8 bits and add the fine bits
        return ((coarse & 0xFF) << 8) | (fine & 0xFF);
    }

    static to8Bits(coarse, fine) {
        const total = this.combineTo16Bit(coarse, fine);
        return parseFloat((total / 65535).toFixed(5));
    }
}

class FGMTypes {
    static get PROGRAMMER() {
        return {
            DIMMERS: {
                get MAIN() {
                    return 'p_dimmer_main';
                }
            },
        }
    }
}