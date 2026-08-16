/**
 * GDTFParser
 * Drag-and-drop a .gdtf file onto the canvas and this class unpacks + parses it.
 * A .gdtf file is just a ZIP archive containing:
 *   description.xml  — all fixture data
 *   wheels/          — gobo / color wheel image assets
 *   models/          — 3D mesh files
 *   thumbnails/      — preview images
 *
 * Usage (automatic via HCWTouch drop handler):
 *   GDTFParser.loadFromFile(file).then(result => console.log(result));
 */
class GDTFParser {

    /**
     * Entry point: accepts a File object (from drag-drop or input[type=file])
     * Returns a Promise<GDTFFixtureDefinition>
     */
    static async loadFromFile(file) {
        if (typeof JSZip === 'undefined') {
            throw new Error('GDTFParser: JSZip is not loaded. Check your <script> tag.');
        }

        console.group(`%c📦 GDTF Parser — ${file.name}`, 'color:#00ff95; font-weight:bold; font-size:13px;');
        console.log('File size:', (file.size / 1024).toFixed(1) + ' KB');

        // 1. Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // 2. Unzip with JSZip
        const zip = await JSZip.loadAsync(arrayBuffer);
        console.log('ZIP contents:', Object.keys(zip.files));

        // 3. Extract description.xml
        const descFile = zip.file('description.xml');
        if (!descFile) {
            throw new Error('GDTFParser: No description.xml found in .gdtf archive.');
        }
        const xmlText = await descFile.async('text');

        // 4. Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        // 5. Check for XML parse errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('GDTFParser: XML parse error — ' + parseError.textContent);
        }

        // 6. Extract all fixture data into a clean JS object
        const result = GDTFParser._extract(xmlDoc, zip);

        // 7. Pretty-print to console for inspection
        GDTFParser._prettyLog(result);
        console.groupEnd();

        return result;
    }

    /** Core extraction — walks description.xml and returns a structured object */
    static _extract(xmlDoc, zip) {
        const gdtfEl = xmlDoc.querySelector('GDTF');
        const fixtureEl = xmlDoc.querySelector('FixtureType');

        if (!fixtureEl) throw new Error('GDTFParser: No <FixtureType> element found.');

        const def = {
            // ── Top-level identity ──────────────────────────────────────────
            dataVersion:  gdtfEl?.getAttribute('DataVersion') || 'unknown',
            name:         fixtureEl.getAttribute('Name') || '',
            shortName:    fixtureEl.getAttribute('ShortName') || '',
            manufacturer: fixtureEl.getAttribute('Manufacturer') || '',
            description:  fixtureEl.getAttribute('Description') || '',
            fixturetype:  fixtureEl.getAttribute('FixtureTypeID') || '',
            thumbnail:    fixtureEl.getAttribute('Thumbnail') || null,

            // ── DMX Modes ───────────────────────────────────────────────────
            modes: GDTFParser._extractModes(xmlDoc),

            // ── Attribute definitions ────────────────────────────────────────
            attributes: GDTFParser._extractAttributes(xmlDoc),

            // ── Wheels (Gobo / Color / Prism / Animation) ───────────────────
            wheels: GDTFParser._extractWheels(xmlDoc),

            // ── Physical descriptions ────────────────────────────────────────
            physical: GDTFParser._extractPhysical(xmlDoc),

            // ── Geometry tree summary ────────────────────────────────────────
            geometries: GDTFParser._extractGeometries(xmlDoc),

            // ── Raw asset filenames in the ZIP ───────────────────────────────
            assets: {
                models:     Object.keys(zip.files).filter(f => f.startsWith('models/')),
                wheels:     Object.keys(zip.files).filter(f => f.startsWith('wheels/')),
                thumbnails: Object.keys(zip.files).filter(f => f.startsWith('thumbnails/'))
            }
        };

        return def;
    }

    /** Extract all DMX modes and their channel maps */
    static _extractModes(xmlDoc) {
        const modes = [];
        xmlDoc.querySelectorAll('DMXMode').forEach(modeEl => {
            const channels = [];
            modeEl.querySelectorAll('DMXChannel').forEach(chEl => {
                // Offset can be "1" or "1,2" (16-bit coarse+fine)
                const offsetStr = chEl.getAttribute('Offset') || '';
                const offsets = offsetStr.split(',').map(o => parseInt(o, 10)).filter(n => !isNaN(n));

                // Attribute is referenced through LogicalChannel > ChannelFunction
                const logicalCh = chEl.querySelector('LogicalChannel');
                const attrName = logicalCh?.getAttribute('Attribute') || chEl.getAttribute('Attribute') || '';

                // Default value
                const defaultVal = chEl.getAttribute('Default') || '0/1';

                channels.push({
                    offset:     offsets,            // DMX footprint addresses (1-indexed)
                    attribute:  attrName,           // e.g. "Pan", "Tilt", "Dimmer", "Color1"
                    default:    defaultVal,
                    highlight:  chEl.getAttribute('Highlight') || null,
                    geometry:   chEl.getAttribute('Geometry') || null,
                    is16bit:    offsets.length === 2
                });
            });

            modes.push({
                name:         modeEl.getAttribute('Name') || '',
                description:  modeEl.getAttribute('Description') || '',
                geometry:     modeEl.getAttribute('Geometry') || '',
                channelCount: channels.reduce((sum, ch) => sum + ch.offset.length, 0),
                channels
            });
        });
        return modes;
    }

    /** Extract attribute definitions (pan range, tilt range, etc.) */
    static _extractAttributes(xmlDoc) {
        const attrs = {};
        xmlDoc.querySelectorAll('Attribute').forEach(el => {
            const name = el.getAttribute('Name');
            if (!name) return;
            attrs[name] = {
                name,
                pretty:       el.getAttribute('Pretty') || name,
                activationGroup: el.getAttribute('ActivationGroup') || null,
                feature:      el.getAttribute('Feature') || null,
                physicalUnit: el.getAttribute('PhysicalUnit') || null,
                color:        el.getAttribute('Color') || null
            };
        });
        return attrs;
    }

    /** Extract wheel definitions — gobo/color/prism slots */
    static _extractWheels(xmlDoc) {
        const wheels = [];
        xmlDoc.querySelectorAll('Wheel').forEach(wheelEl => {
            const slots = [];
            wheelEl.querySelectorAll('Slot').forEach(slotEl => {
                const facets = [];
                slotEl.querySelectorAll('Facet').forEach(facetEl => {
                    facets.push({
                        color:    facetEl.getAttribute('Color') || null,
                        rotation: facetEl.getAttribute('Rotation') || null
                    });
                });

                slots.push({
                    name:        slotEl.getAttribute('Name') || '',
                    color:       slotEl.getAttribute('Color') || null,
                    mediaFile:   slotEl.getAttribute('MediaFileName') || null,
                    facets
                });
            });

            wheels.push({
                name: wheelEl.getAttribute('Name') || '',
                slots
            });
        });
        return wheels;
    }

    /** Extract physical fixture description (weight, power, beam angle, etc.) */
    static _extractPhysical(xmlDoc) {
        const physEl = xmlDoc.querySelector('PhysicalDescriptions');
        if (!physEl) return null;

        const properties = physEl.querySelector('Properties');
        const operating  = properties?.querySelector('OperatingTemperature');
        const weight     = properties?.querySelector('Weight');
        const legHeight  = properties?.querySelector('LegHeight');

        const beamEl = physEl.querySelector('Emitter') || physEl.querySelector('BeamDescription');

        return {
            weight:            weight?.getAttribute('Value') || null,
            legHeight:         legHeight?.getAttribute('Value') || null,
            operatingTempLow:  operating?.getAttribute('Low') || null,
            operatingTempHigh: operating?.getAttribute('High') || null,
            connectors: Array.from(physEl.querySelectorAll('Connector')).map(c => ({
                name:  c.getAttribute('Name'),
                type:  c.getAttribute('Type'),
                count: c.getAttribute('Count')
            }))
        };
    }

    /** Extract top-level geometry names (just names, not full tree) */
    static _extractGeometries(xmlDoc) {
        const geoms = [];
        const geomRoot = xmlDoc.querySelector('Geometries');
        if (!geomRoot) return geoms;
        geomRoot.children && Array.from(geomRoot.children).forEach(el => {
            geoms.push({
                tag:  el.tagName,
                name: el.getAttribute('Name') || '',
                model: el.getAttribute('Model') || null
            });
        });
        return geoms;
    }

    /** Console pretty-print the extracted result */
    static _prettyLog(def) {
        console.log('%c🔦 Fixture Identity', 'color:#ffaa00; font-weight:bold;');
        console.table({
            Name:         def.name,
            Manufacturer: def.manufacturer,
            ShortName:    def.shortName,
            DataVersion:  def.dataVersion,
            Description:  def.description
        });

        console.log(`%c🎛  DMX Modes (${def.modes.length})`, 'color:#4499ff; font-weight:bold;');
        def.modes.forEach((mode, i) => {
            console.groupCollapsed(`  Mode ${i + 1}: "${mode.name}" — ${mode.channelCount} channels`);
            console.table(mode.channels.map(ch => ({
                'DMX Address':  ch.offset.join(', '),
                'Attribute':    ch.attribute,
                '16-bit':       ch.is16bit ? '✓' : '',
                'Default':      ch.default,
                'Geometry':     ch.geometry || ''
            })));
            console.groupEnd();
        });

        if (def.wheels.length > 0) {
            console.log(`%c🌀 Wheels (${def.wheels.length})`, 'color:#ff44aa; font-weight:bold;');
            def.wheels.forEach(w => {
                console.groupCollapsed(`  Wheel: "${w.name}" — ${w.slots.length} slots`);
                console.table(w.slots.map(s => ({
                    'Slot':      s.name,
                    'Color':     s.color || '',
                    'MediaFile': s.mediaFile || '',
                    'Facets':    s.facets.length
                })));
                console.groupEnd();
            });
        }

        if (def.assets.models.length || def.assets.wheels.length) {
            console.log('%c📁 Assets in ZIP', 'color:#aaaaaa; font-weight:bold;');
            console.log('  3D Models:  ', def.assets.models);
            console.log('  Wheel imgs: ', def.assets.wheels);
            console.log('  Thumbnails: ', def.assets.thumbnails);
        }

        if (def.attributes && Object.keys(def.attributes).length > 0) {
            console.log(`%c📋 Attributes (${Object.keys(def.attributes).length})`, 'color:#00ffcc; font-weight:bold;');
            console.log(Object.keys(def.attributes).join(', '));
        }
    }
}

// Also expose a convenience function on the global for quick console testing
globalThis.GDTFParser = GDTFParser;
