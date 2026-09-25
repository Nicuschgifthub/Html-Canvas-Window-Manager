class KYEXYPad {
    static command(params) {
        if (!params || !params.locationId) return;
        if (!params.originContext || typeof params.originContext.setPanTilt !== 'function') return;

        if (params.rawTokens && params.rawTokens.includes('At')) {
            const panIdx = params.rawTokens.indexOf('pan');
            const tiltIdx = params.rawTokens.indexOf('tilt');

            if (panIdx > -1 && tiltIdx > -1) {
                const panDMX = parseFloat(params.rawTokens[panIdx + 1]) || 0;
                const tiltDMX = parseFloat(params.rawTokens[tiltIdx + 1]) || 0;

                const normPan = Math.max(0, Math.min(255, panDMX)) / 255;
                const normTilt = Math.max(0, Math.min(255, tiltDMX)) / 255;

                params.originContext.setPanTilt(normPan, normTilt);
            }
        }
    }
}

globalThis.KYEXYPad = KYEXYPad;
