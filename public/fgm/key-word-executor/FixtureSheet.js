/**
 * FixtureSheet <location> Press Row <fid>   → toggles the fixture in the selection
 */
class KYEFixtureSheet {
    static command(params) {
        if (!params || !params.locationId) return;

        if (params.subKeyword && params.subKeyword.toLowerCase() === 'row' && params.subId !== undefined) {
            const fid = Number(params.subId);
            if (!isNaN(fid)) Programmer.toggle(fid);
        }
    }
}

globalThis.KYEFixtureSheet = KYEFixtureSheet;
