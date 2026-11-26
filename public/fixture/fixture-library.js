/**
 * FixtureLibrary — getting .gdtf files into the show.
 *
 *   FixtureLibrary.listServerFiles()       → files in the server's ./gdtf folder
 *   FixtureLibrary.importServerFile(name)  → parse + add to PatchManager, returns typeKey
 *   FixtureLibrary.importFile(file)        → same for a dropped / picked File
 */
class FixtureLibrary {

    static async listServerFiles() {
        try {
            const res = await fetch('/api/gdtf');
            if (!res.ok) return [];
            const data = await res.json();
            return Array.isArray(data.files) ? data.files : [];
        } catch (e) {
            console.warn('FixtureLibrary: server library not available:', e.message);
            return [];
        }
    }

    static async importServerFile(fileName) {
        const res = await fetch(`/api/gdtf/${encodeURIComponent(fileName)}`);
        if (!res.ok) throw new Error(`Could not download ${fileName} (${res.status})`);
        const buffer = await res.arrayBuffer();
        const type = await GDTFParser.loadFromFile(buffer, { fileName });
        return PatchManager.addType(type);
    }

    static async importFile(file) {
        const type = await GDTFParser.loadFromFile(file, { fileName: file.name });
        const key = PatchManager.addType(type);
        console.log(`%c 📁 Fixture type added: ${type.manufacturer} ${type.name} → "${key}"`,
            'background:#1a3322; color:#00ff95; font-size:11px; padding:2px 6px; border-radius:3px;');
        return key;
    }

    /** "Robe_Lighting@Robin_Pointe@2024…gdtf" → "Robe Lighting · Robin Pointe" */
    static prettyFileName(fileName) {
        const parts = fileName.replace(/\.gdtf$/i, '').split('@').map(p => p.replace(/_/g, ' ').trim());
        return parts.length >= 2 ? `${parts[0]} · ${parts[1]}` : parts[0];
    }

    /** Is a server file already loaded as a type? (by source file name) */
    static loadedKeyForFile(fileName) {
        const hit = PatchManager.getTypes().find(({ type }) => type.source && type.source.fileName === fileName);
        return hit ? hit.key : null;
    }
}

globalThis.FixtureLibrary = FixtureLibrary;
