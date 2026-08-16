class GDTFParser {

    static async loadFromFile(file) {
        if (typeof JSZip === 'undefined') {
            throw new Error('GDTFParser: JSZip is not loaded. Check your <script> tag.');
        }

        console.group(`%c📦 GDTF Parser — ${file.name}`, 'color:#00ff95; font-weight:bold; font-size:13px;');
        console.log('File size:', (file.size / 1024).toFixed(1) + ' KB');

        const arrayBuffer = await file.arrayBuffer();

        const zip = await JSZip.loadAsync(arrayBuffer);
        console.log('ZIP contents:', Object.keys(zip.files));

        const descFile = zip.file('description.xml');
        if (!descFile) {
            throw new Error('GDTFParser: No description.xml found in .gdtf archive.');
        }
        const xmlText = await descFile.async('text');

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('GDTFParser: XML parse error — ' + parseError.textContent);
        }

        const result = GDTFParser._extract(xmlDoc, zip);

        result.images = await GDTFParser._extractImages(zip);

        result.wheels.forEach(wheel => {
            wheel.slots.forEach(slot => {
                if (slot.mediaFile) {

                    const candidates = [
                        `wheels/${slot.mediaFile}`,
                        `wheels/${slot.mediaFile}.png`,
                        `wheels/${slot.mediaFile}.jpg`,
                        `wheels/${slot.mediaFile}.svg`,
                        slot.mediaFile,
                    ];
                    for (const key of candidates) {
                        if (result.images[key]) {
                            slot.image = result.images[key]; // base64 data URL
                            break;
                        }
                    }
                }
            });
        });

        GDTFParser._prettyLog(result);
        console.groupEnd();

        return result;
    }

    static async _extractImages(zip) {
        const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif'];
        const IMAGE_DIRS = ['wheels/', 'thumbnails/', 'gobo/', 'media/'];

        const imageFiles = Object.keys(zip.files).filter(name => {
            const lower = name.toLowerCase();
            const inImageDir = IMAGE_DIRS.some(dir => lower.startsWith(dir));
            const hasImageExt = IMAGE_EXTS.some(ext => lower.endsWith(ext));
            return (inImageDir || hasImageExt) && !zip.files[name].dir;
        });

        const images = {};
        let loaded = 0;

        await Promise.all(imageFiles.map(async (filename) => {
            try {
                const base64 = await zip.file(filename).async('base64');
                const ext = filename.split('.').pop().toLowerCase();
                const mime = ext === 'svg' ? 'image/svg+xml'
                           : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                           : ext === 'webp' ? 'image/webp'
                           : 'image/png';
                images[filename] = `data:${mime};base64,${base64}`;
                loaded++;
            } catch (e) {
                console.warn(`GDTFParser: could not read image "${filename}":`, e.message);
            }
        }));

        console.log(`%c🖼  Images extracted: ${loaded} / ${imageFiles.length}`, 'color:#4499ff; font-weight:bold;');
        return images;
    }

    static _extract(xmlDoc, zip) {
        const gdtfEl = xmlDoc.querySelector('GDTF');
        const fixtureEl = xmlDoc.querySelector('FixtureType');

        if (!fixtureEl) throw new Error('GDTFParser: No <FixtureType> element found.');

        const def = {

            dataVersion:  gdtfEl?.getAttribute('DataVersion') || 'unknown',
            name:         fixtureEl.getAttribute('Name') || '',
            shortName:    fixtureEl.getAttribute('ShortName') || '',
            manufacturer: fixtureEl.getAttribute('Manufacturer') || '',
            description:  fixtureEl.getAttribute('Description') || '',
            fixturetype:  fixtureEl.getAttribute('FixtureTypeID') || '',
            thumbnail:    fixtureEl.getAttribute('Thumbnail') || null,

            modes: GDTFParser._extractModes(xmlDoc),

            attributes: GDTFParser._extractAttributes(xmlDoc),

            wheels: GDTFParser._extractWheels(xmlDoc),

            physical: GDTFParser._extractPhysical(xmlDoc),

            geometries: GDTFParser._extractGeometries(xmlDoc),

            assets: {
                models:     Object.keys(zip.files).filter(f => f.startsWith('models/')),
                wheels:     Object.keys(zip.files).filter(f => f.startsWith('wheels/')),
                thumbnails: Object.keys(zip.files).filter(f => f.startsWith('thumbnails/'))
            }
        };

        return def;
    }

    static _extractModes(xmlDoc) {
        const modes = [];
        xmlDoc.querySelectorAll('DMXMode').forEach(modeEl => {
            const channels = [];
            modeEl.querySelectorAll('DMXChannel').forEach(chEl => {

                const offsetStr = chEl.getAttribute('Offset') || '';
                const offsets = offsetStr.split(',').map(o => parseInt(o, 10)).filter(n => !isNaN(n));

                const logicalCh = chEl.querySelector('LogicalChannel');
                const attrName = logicalCh?.getAttribute('Attribute') || chEl.getAttribute('Attribute') || '';

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

globalThis.GDTFParser = GDTFParser;