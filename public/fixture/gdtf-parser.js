/**
 * GDTFParser — deconstructs a .gdtf fixture file into a plain, JSON-serialisable
 * fixture type model that the patch / programmer / DMX output work with.
 *
 *   const type = await GDTFParser.loadFromFile(file);         // browser (needs JSZip)
 *   const type = GDTFParser.parseDescription(xmlText);         // anywhere (pure)
 *
 * Model overview (see _buildModel for every field):
 *
 *   type.attributes[name]        → { pretty, featureGroup, feature, physicalUnit, ... }
 *   type.wheels[name].slots[]    → { index, name, hex, media }      (index is 1-based like WheelSlotIndex)
 *   type.modes[]                 → { name, footprint, breaks, channels[], attributes[] }
 *     channel                    → { key, dmxBreak, offsets[], bytes, geometry, default, highlight, functions[] }
 *       function                 → { attribute, name, dmxFrom, dmxTo, physicalFrom, physicalTo, wheel, sets[] }
 *         set                    → { name, dmxFrom, dmxTo, wheelSlotIndex }
 *
 * All DMX values (dmxFrom / dmxTo / default / highlight) are integers at the
 * channel's own resolution: 0-255 for 8 bit, 0-65535 for 16 bit, etc.
 */
class GDTFParser {

    static get MODEL_VERSION() { return 1; }

    // ─────────────────────────────────────────────────────────────────────
    //  Entry points
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Load a .gdtf archive (File, Blob or ArrayBuffer) in the browser.
     * Wheel images and the thumbnail are extracted and shrunk to small PNG
     * data URLs so they can live inside the show file.
     */
    static async loadFromFile(file, opts = {}) {
        if (typeof JSZip === 'undefined') {
            throw new Error('GDTFParser: JSZip is not loaded. Check your <script> tag.');
        }

        const fileName = opts.fileName || file.name || 'unknown.gdtf';
        const buffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
        const zip = await JSZip.loadAsync(buffer);

        const descFile = zip.file('description.xml');
        if (!descFile) throw new Error(`GDTFParser: "${fileName}" has no description.xml`);

        const type = GDTFParser.parseDescription(await descFile.async('text'));
        type.source = { fileName, size: buffer.byteLength };

        await GDTFParser._attachImages(type, zip, opts);

        if (opts.log !== false) GDTFParser.prettyLog(type);
        return type;
    }

    /** Parse the description.xml text into the fixture type model. */
    static parseDescription(xmlText) {
        const doc = GDTFXml.parse(xmlText);
        const gdtfEl = GDTFXml.child(doc, 'GDTF');
        const ft = GDTFXml.child(gdtfEl, 'FixtureType');
        if (!ft) throw new Error('GDTFParser: no <FixtureType> element found');
        return GDTFParser._buildModel(gdtfEl, ft);
    }

    // ─────────────────────────────────────────────────────────────────────
    //  DMX value helpers (public — used by patch / programmer)
    // ─────────────────────────────────────────────────────────────────────

    /** Highest raw value for a channel with `bytes` bytes (1 → 255, 2 → 65535). */
    static maxValue(bytes) {
        return Math.pow(256, Math.max(1, bytes)) - 1;
    }

    /**
     * Convert a GDTF DMXValue string ("128/1", "43690/2", "255/1s") to an integer
     * at `targetBytes` resolution. Default conversion is byte mirroring
     * (255/1 → 65535 in 16 bit), a trailing "s" means byte shifting (255/1s → 65280).
     */
    static parseDMXValue(str, targetBytes) {
        if (str === undefined || str === null) return null;
        const s = String(str).trim();
        if (s === '' || s === 'None') return null;

        const m = /^(\d+)(?:\/(\d+)(s?))?$/.exec(s);
        if (!m) return null;

        const value = Number(m[1]);
        const srcBytes = m[2] ? Number(m[2]) : (targetBytes || 1);
        const shifting = m[3] === 's';
        const tgt = targetBytes || srcBytes;

        if (srcBytes === tgt) return Math.min(value, GDTFParser.maxValue(tgt));
        if (srcBytes > tgt) return Math.floor(value / Math.pow(256, srcBytes - tgt));
        if (shifting) return value * Math.pow(256, tgt - srcBytes);

        // byte mirroring — repeat the source bytes into the new low bytes
        const srcByteList = [];
        for (let k = srcBytes - 1; k >= 0; k--) srcByteList.push(Math.floor(value / Math.pow(256, k)) % 256);
        let out = value;
        for (let k = 0; k < tgt - srcBytes; k++) out = out * 256 + srcByteList[k % srcBytes];
        return out;
    }

    /** Split a raw channel value into bytes, coarse first. */
    static splitBytes(value, bytes) {
        const out = [];
        for (let k = bytes - 1; k >= 0; k--) out.push(Math.floor(value / Math.pow(256, k)) % 256);
        return out;
    }

    /** CIE "x,y,Y" → "#rrggbb" (normalised brightness — shows the hue of a filter / LED). */
    static cieToHex(cie) {
        if (!cie) return null;
        const parts = String(cie).split(',').map(Number);
        if (parts.length < 2 || parts.some(isNaN)) return null;
        const [x, y] = parts;
        if (y <= 0) return '#000000';

        const Y = 1;
        const X = (x * Y) / y;
        const Z = ((1 - x - y) * Y) / y;

        let r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z;
        let g = -0.9689 * X + 1.8758 * Y + 0.0415 * Z;
        let b = 0.0557 * X - 0.2040 * Y + 1.0570 * Z;

        r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
        const max = Math.max(r, g, b) || 1;
        const gamma = v => {
            v = v / max;
            v = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
            return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0');
        };
        return `#${gamma(r)}${gamma(g)}${gamma(b)}`;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Model building
    // ─────────────────────────────────────────────────────────────────────

    static _buildModel(gdtfEl, ft) {
        const a = ft.attr;
        const warnings = [];

        const attrDefs = GDTFXml.child(ft, 'AttributeDefinitions');
        const attributes = GDTFParser._parseAttributes(attrDefs);
        const geometryNodes = GDTFXml.child(ft, 'Geometries');
        const geometry = GDTFParser._parseGeometries(geometryNodes);
        const wheels = GDTFParser._parseWheels(GDTFXml.child(ft, 'Wheels'));
        const phys = GDTFXml.child(ft, 'PhysicalDescriptions');

        const model = {
            modelVersion: GDTFParser.MODEL_VERSION,
            gdtfVersion: gdtfEl?.attr.DataVersion || 'unknown',

            name: a.Name || '',
            shortName: a.ShortName || '',
            longName: a.LongName || '',
            manufacturer: a.Manufacturer || '',
            description: a.Description || '',
            fixtureTypeId: a.FixtureTypeID || '',
            refFT: a.RefFT || '',
            thumbnail: a.Thumbnail || null,
            canHaveChildren: a.CanHaveChildren !== 'No',

            activationGroups: GDTFXml.childrenOf(GDTFXml.child(attrDefs, 'ActivationGroups'), 'ActivationGroup').map(n => n.attr.Name),
            featureGroups: GDTFXml.childrenOf(GDTFXml.child(attrDefs, 'FeatureGroups'), 'FeatureGroup').map(fg => ({
                name: fg.attr.Name,
                pretty: fg.attr.Pretty || fg.attr.Name,
                features: GDTFXml.childrenOf(fg, 'Feature').map(f => f.attr.Name)
            })),
            attributes,
            wheels,
            emitters: GDTFParser._parseEmitters(phys),
            physical: GDTFParser._parsePhysical(phys),
            geometry,
            modes: [],
            revisions: GDTFXml.childrenOf(GDTFXml.child(ft, 'Revisions'), 'Revision').map(r => ({
                text: r.attr.Text || '', date: r.attr.Date || '', modifiedBy: r.attr.ModifiedBy || ''
            })),
            images: {},
            warnings
        };

        const geoIndex = GDTFParser._indexGeometries(geometry);

        GDTFXml.childrenOf(GDTFXml.child(ft, 'DMXModes'), 'DMXMode').forEach(modeEl => {
            try {
                model.modes.push(GDTFParser._parseMode(modeEl, model, geoIndex, warnings));
            } catch (e) {
                warnings.push(`Mode "${modeEl.attr.Name}": ${e.message}`);
            }
        });

        return model;
    }

    static _parseAttributes(attrDefs) {
        const out = {};
        GDTFXml.childrenOf(GDTFXml.child(attrDefs, 'Attributes'), 'Attribute').forEach(el => {
            const name = el.attr.Name;
            if (!name) return;
            const [featureGroup, feature] = (el.attr.Feature || '').split('.');
            out[name] = {
                name,
                pretty: el.attr.Pretty || name,
                featureGroup: featureGroup || null,
                feature: feature || null,
                activationGroup: el.attr.ActivationGroup || null,
                mainAttribute: el.attr.MainAttribute || null,
                physicalUnit: el.attr.PhysicalUnit || 'None',
                color: el.attr.Color || null
            };
        });
        return out;
    }

    static _parseWheels(wheelsEl) {
        const out = {};
        GDTFXml.childrenOf(wheelsEl, 'Wheel').forEach(w => {
            const name = w.attr.Name || `Wheel ${Object.keys(out).length + 1}`;
            out[name] = {
                name,
                slots: GDTFXml.childrenOf(w, 'Slot').map((s, idx) => ({
                    index: idx + 1,
                    name: s.attr.Name || '',
                    color: s.attr.Color || null,
                    hex: GDTFParser.cieToHex(s.attr.Color),
                    filter: s.attr.Filter || null,
                    mediaFileName: s.attr.MediaFileName || null,
                    media: null, // filled with an images{} key when the archive has the file
                    facets: GDTFXml.childrenOf(s, 'Facet').map(f => ({
                        color: f.attr.Color || null,
                        hex: GDTFParser.cieToHex(f.attr.Color),
                        rotation: f.attr.Rotation || null
                    }))
                }))
            };
        });
        return out;
    }

    static _parseEmitters(phys) {
        const out = {};
        GDTFXml.childrenOf(GDTFXml.child(phys, 'Emitters'), 'Emitter').forEach(e => {
            out[e.attr.Name] = {
                name: e.attr.Name,
                color: e.attr.Color || null,
                hex: GDTFParser.cieToHex(e.attr.Color),
                dominantWaveLength: e.attr.DominantWaveLength ? Number(e.attr.DominantWaveLength) : null
            };
        });
        return out;
    }

    static _parsePhysical(phys) {
        if (!phys) return null;
        const props = GDTFXml.child(phys, 'Properties');
        const temp = GDTFXml.child(props, 'OperatingTemperature');
        const num = v => (v === undefined || v === null || v === '') ? null : Number(v);
        return {
            weight: num(GDTFXml.child(props, 'Weight')?.attr.Value),
            legHeight: num(GDTFXml.child(props, 'LegHeight')?.attr.Value),
            operatingTemperature: temp ? { low: num(temp.attr.Low), high: num(temp.attr.High) } : null,
            connectors: GDTFXml.childrenOf(GDTFXml.child(phys, 'Connectors'), 'Connector').map(c => ({
                name: c.attr.Name || '', type: c.attr.Type || '', dmxBreak: num(c.attr.DMXBreak)
            }))
        };
    }

    static _parseGeometries(geomEl) {
        const walk = (el) => {
            const node = { type: el.tag, name: el.attr.Name || '', model: el.attr.Model || null, children: [] };
            if (el.tag === 'GeometryReference') {
                node.geometry = el.attr.Geometry || null;
                node.breaks = GDTFXml.childrenOf(el, 'Break').map(b => ({
                    dmxBreak: Number(b.attr.DMXBreak || 1),
                    dmxOffset: Number(b.attr.DMXOffset || 1)
                }));
            }
            if (el.tag === 'Beam') {
                node.beam = {
                    beamType: el.attr.BeamType || null,
                    lampType: el.attr.LampType || null,
                    beamAngle: el.attr.BeamAngle ? Number(el.attr.BeamAngle) : null,
                    fieldAngle: el.attr.FieldAngle ? Number(el.attr.FieldAngle) : null,
                    luminousFlux: el.attr.LuminousFlux ? Number(el.attr.LuminousFlux) : null,
                    colorTemperature: el.attr.ColorTemperature ? Number(el.attr.ColorTemperature) : null
                };
            }
            node.children = el.children.filter(c => c.attr.Name !== undefined && c.tag !== 'Break').map(walk);
            return node;
        };
        return geomEl ? geomEl.children.map(walk) : [];
    }

    /** name → { node, top } where top is the top-level geometry the node lives under. */
    static _indexGeometries(roots) {
        const index = {};
        const visit = (node, top) => {
            if (node.name && !index[node.name]) index[node.name] = { node, top };
            node.children.forEach(c => visit(c, top));
        };
        roots.forEach(r => visit(r, r.name));
        return index;
    }

    static _collectReferences(node, out = []) {
        if (!node) return out;
        if (node.type === 'GeometryReference') out.push(node);
        node.children.forEach(c => GDTFParser._collectReferences(c, out));
        return out;
    }

    // ── DMX modes ────────────────────────────────────────────────────────

    static _parseMode(modeEl, model, geoIndex, warnings) {
        const modeName = modeEl.attr.Name || 'Unnamed';
        const rootGeometry = modeEl.attr.Geometry || model.geometry[0]?.name || null;

        // GeometryReferences under this mode's root → multi-instance templates
        const refsByTemplate = {};
        GDTFParser._collectReferences(geoIndex[rootGeometry]?.node).forEach(ref => {
            if (!ref.geometry) return;
            (refsByTemplate[ref.geometry] = refsByTemplate[ref.geometry] || []).push(ref);
        });

        const channels = [];
        const virtualChannels = [];

        GDTFXml.childrenOf(GDTFXml.child(modeEl, 'DMXChannels'), 'DMXChannel').forEach(chEl => {
            const template = GDTFParser._parseChannel(chEl, model, warnings, modeName);
            if (!template) return;

            const topLevel = geoIndex[template.geometry]?.top;
            const refs = (topLevel && topLevel !== rootGeometry) ? refsByTemplate[topLevel] : null;

            if (refs && refs.length) {
                refs.forEach((ref, refIdx) => {
                    channels.push(GDTFParser._instantiateChannel(template, ref, refIdx, topLevel));
                });
            } else if (template.virtual) {
                virtualChannels.push(template);
            } else {
                channels.push(template);
            }
        });

        // stable order: break, then first offset
        channels.sort((x, y) => (x.dmxBreak - y.dmxBreak) || (x.offsets[0] - y.offsets[0]));

        // channel keys must be unique (Geometry|Attribute) — de-duplicate if a file repeats them
        const seen = {};
        [...channels, ...virtualChannels].forEach(ch => {
            if (seen[ch.key]) ch.key = `${ch.key}#${++seen[ch.key]}`;
            else seen[ch.key] = 1;
        });

        const breaks = {};
        channels.forEach(ch => {
            const last = Math.max(...ch.offsets);
            breaks[ch.dmxBreak] = Math.max(breaks[ch.dmxBreak] || 0, last);
        });

        const attributeSet = new Set();
        channels.forEach(ch => ch.functions.forEach(f => f.attribute && attributeSet.add(f.attribute)));

        return {
            name: modeName,
            description: modeEl.attr.Description || '',
            geometry: rootGeometry,
            footprint: breaks[1] || 0,
            breaks,
            instances: Object.values(refsByTemplate).reduce((n, list) => Math.max(n, list.length), 0),
            channels,
            virtualChannels,
            attributes: [...attributeSet]
        };
    }

    static _parseChannel(chEl, model, warnings, modeName) {
        const offsetStr = (chEl.attr.Offset || '').trim();
        const offsets = (offsetStr === '' || offsetStr === 'None')
            ? []
            : offsetStr.split(',').map(o => parseInt(o, 10)).filter(n => !isNaN(n));
        const bytes = Math.max(1, offsets.length);

        const breakAttr = chEl.attr.DMXBreak || '1';
        const dmxBreak = breakAttr === 'Overwrite' ? 'Overwrite' : (parseInt(breakAttr, 10) || 1);

        const geometry = chEl.attr.Geometry || null;
        const logicalChannels = [];
        const functions = [];

        GDTFXml.childrenOf(chEl, 'LogicalChannel').forEach((lcEl, lcIdx) => {
            logicalChannels.push({
                attribute: lcEl.attr.Attribute || '',
                snap: lcEl.attr.Snap || 'No',
                master: lcEl.attr.Master || 'None',
                mibFade: Number(lcEl.attr.MibFade || 0),
                dmxChangeTimeLimit: Number(lcEl.attr.DMXChangeTimeLimit || 0)
            });

            GDTFXml.childrenOf(lcEl, 'ChannelFunction').forEach(cfEl => {
                const c = cfEl.attr;
                const attribute = c.Attribute || lcEl.attr.Attribute || 'NoFeature';
                functions.push({
                    index: functions.length,
                    logicalIndex: lcIdx,
                    name: c.Name || attribute,
                    attribute,
                    originalAttribute: c.OriginalAttribute || '',
                    customName: c.CustomName || '',
                    dmxFrom: GDTFParser.parseDMXValue(c.DMXFrom || '0/1', bytes) || 0,
                    dmxTo: null,
                    default: GDTFParser.parseDMXValue(c.Default, bytes),
                    physicalFrom: c.PhysicalFrom !== undefined ? Number(c.PhysicalFrom) : 0,
                    physicalTo: c.PhysicalTo !== undefined ? Number(c.PhysicalTo) : 1,
                    realFade: Number(c.RealFade || 0),
                    wheel: c.Wheel || null,
                    emitter: c.Emitter || null,
                    filter: c.Filter || null,
                    modeMaster: c.ModeMaster || null,
                    // raw DMXValue strings — resolved against the master channel's resolution at runtime
                    modeFrom: c.ModeMaster ? (c.ModeFrom || '0/1') : null,
                    modeTo: c.ModeMaster ? (c.ModeTo || '0/1') : null,
                    sets: GDTFXml.childrenOf(cfEl, 'ChannelSet').map(sEl => ({
                        name: (sEl.attr.Name || '').trim(),
                        dmxFrom: GDTFParser.parseDMXValue(sEl.attr.DMXFrom || '0/1', bytes) || 0,
                        dmxTo: null,
                        physicalFrom: sEl.attr.PhysicalFrom !== undefined ? Number(sEl.attr.PhysicalFrom) : null,
                        physicalTo: sEl.attr.PhysicalTo !== undefined ? Number(sEl.attr.PhysicalTo) : null,
                        wheelSlotIndex: sEl.attr.WheelSlotIndex !== undefined ? Number(sEl.attr.WheelSlotIndex) : null
                    }))
                });
            });
        });

        if (functions.length === 0) {
            warnings.push(`Mode "${modeName}": channel at offset ${offsetStr || '-'} has no channel functions — skipped`);
            return null;
        }

        GDTFParser._computeRanges(functions, bytes);

        // InitialFunction = "ChannelName.LogicalAttribute.FunctionName"
        let initialFunction = 0;
        if (chEl.attr.InitialFunction) {
            const parts = chEl.attr.InitialFunction.split('.');
            const fnName = parts[parts.length - 1];
            const lcAttr = parts[parts.length - 2];
            const hit = functions.find(f => f.name === fnName && logicalChannels[f.logicalIndex].attribute === lcAttr)
                || functions.find(f => f.name === fnName);
            if (hit) initialFunction = hit.index;
        }

        // GDTF 1.0 kept Default on the DMXChannel
        let defaultValue = functions[initialFunction].default;
        if (chEl.attr.Default !== undefined) defaultValue = GDTFParser.parseDMXValue(chEl.attr.Default, bytes);
        if (defaultValue === null || defaultValue === undefined) defaultValue = functions[initialFunction].dmxFrom;

        const primaryAttribute = logicalChannels[0]?.attribute || functions[0].attribute;

        return {
            key: `${geometry || 'Fixture'}|${primaryAttribute}`,
            name: `${geometry || 'Fixture'}_${primaryAttribute}`,
            dmxBreak,
            offsets,
            bytes,
            virtual: offsets.length === 0,
            geometry,
            instance: null,
            attribute: primaryAttribute,
            default: defaultValue,
            highlight: GDTFParser.parseDMXValue(chEl.attr.Highlight, bytes),
            initialFunction,
            logicalChannels,
            functions
        };
    }

    /**
     * Work out dmxTo for every channel function and channel set.
     * Functions are grouped by mode dependency (ModeMaster/From/To) — inside a
     * group a function ends where the next one starts.
     */
    static _computeRanges(functions, bytes) {
        const max = GDTFParser.maxValue(bytes);
        const groups = {};
        functions.forEach(f => {
            const key = `${f.modeMaster}|${f.modeFrom}|${f.modeTo}`;
            (groups[key] = groups[key] || []).push(f);
        });

        Object.values(groups).forEach(list => {
            const sorted = [...list].sort((x, y) => x.dmxFrom - y.dmxFrom);
            sorted.forEach((f, i) => {
                const next = sorted.slice(i + 1).find(n => n.dmxFrom > f.dmxFrom);
                f.dmxTo = next ? next.dmxFrom - 1 : max;
            });
        });

        functions.forEach(f => {
            const sets = f.sets;
            sets.forEach((s, i) => {
                const next = sets.slice(i + 1).find(n => n.dmxFrom > s.dmxFrom);
                s.dmxTo = next ? Math.min(next.dmxFrom - 1, f.dmxTo) : f.dmxTo;
                if (s.dmxTo < s.dmxFrom) s.dmxTo = s.dmxFrom;
            });
        });
    }

    static _instantiateChannel(template, ref, refIdx, topLevel) {
        const ch = JSON.parse(JSON.stringify(template));

        let brk = ref.breaks.find(b => b.dmxBreak === template.dmxBreak);
        if (template.dmxBreak === 'Overwrite' || !brk) brk = ref.breaks[ref.breaks.length - 1] || { dmxBreak: 1, dmxOffset: 1 };

        const shift = brk.dmxOffset - 1;
        ch.offsets = template.offsets.map(o => o + shift);
        ch.dmxBreak = brk.dmxBreak;
        ch.virtual = ch.offsets.length === 0;
        ch.instance = ref.name || `${topLevel} ${refIdx + 1}`;
        ch.instanceIndex = refIdx + 1;
        ch.templateGeometry = template.geometry;
        ch.geometry = template.geometry === topLevel ? ch.instance : template.geometry;
        ch.key = `${ch.instance}|${template.geometry === topLevel ? '' : template.geometry + '|'}${template.attribute}`;
        ch.name = `${ch.instance}_${template.attribute}`;
        return ch;
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Images (browser only)
    // ─────────────────────────────────────────────────────────────────────

    static async _attachImages(type, zip, opts) {
        const maxWheel = opts.wheelImageSize || 96;
        const maxThumb = opts.thumbnailSize || 160;
        const files = Object.keys(zip.files).filter(n => !zip.files[n].dir);
        const findFile = (base, dir = '') => {
            const lowered = (dir + base).toLowerCase();
            return files.find(f => f.toLowerCase() === lowered)
                || files.find(f => {
                    const l = f.toLowerCase();
                    return l.startsWith(lowered + '.') && /\.(png|jpe?g|svg|webp|gif)$/.test(l);
                });
        };

        const jobs = [];

        Object.values(type.wheels).forEach(wheel => {
            wheel.slots.forEach(slot => {
                if (!slot.mediaFileName) return;
                const path = findFile(slot.mediaFileName, 'wheels/');
                if (!path) return;
                slot.media = path;
                if (!type.images[path]) {
                    type.images[path] = null;
                    jobs.push(GDTFParser._readImage(zip, path, maxWheel).then(url => { type.images[path] = url; }));
                }
            });
        });

        if (type.thumbnail) {
            const path = findFile(type.thumbnail);
            if (path) {
                type.thumbnailMedia = path;
                jobs.push(GDTFParser._readImage(zip, path, maxThumb).then(url => { type.images[path] = url; }));
            }
        }

        await Promise.all(jobs);
        Object.keys(type.images).forEach(k => { if (!type.images[k]) delete type.images[k]; });
    }

    static async _readImage(zip, path, maxSize) {
        try {
            const ext = path.split('.').pop().toLowerCase();
            const mime = ext === 'svg' ? 'image/svg+xml'
                : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg'
                    : ext === 'webp' ? 'image/webp'
                        : ext === 'gif' ? 'image/gif' : 'image/png';

            const bytes = await zip.file(path).async('uint8array');
            const blob = new Blob([bytes], { type: mime });

            if (mime !== 'image/svg+xml' && typeof createImageBitmap === 'function' && typeof OffscreenCanvas === 'function') {
                const bmp = await createImageBitmap(blob);
                const scale = Math.min(1, maxSize / Math.max(bmp.width, bmp.height));
                const w = Math.max(1, Math.round(bmp.width * scale));
                const h = Math.max(1, Math.round(bmp.height * scale));
                const canvas = new OffscreenCanvas(w, h);
                canvas.getContext('2d').drawImage(bmp, 0, 0, w, h);
                bmp.close && bmp.close();
                return await GDTFParser._blobToDataURL(await canvas.convertToBlob({ type: 'image/png' }));
            }
            return await GDTFParser._blobToDataURL(blob);
        } catch (e) {
            console.warn(`GDTFParser: could not read image "${path}":`, e.message);
            return null;
        }
    }

    static _blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // ─────────────────────────────────────────────────────────────────────
    //  Debug output
    // ─────────────────────────────────────────────────────────────────────

    static prettyLog(type) {
        console.groupCollapsed(`%c📦 GDTF ${type.manufacturer} ${type.name} — ${type.modes.length} modes`, 'color:#00ff95; font-weight:bold;');
        type.modes.forEach(mode => {
            console.groupCollapsed(`Mode "${mode.name}" — ${mode.footprint} ch${mode.instances ? `, ${mode.instances} instances` : ''}`);
            console.table(mode.channels.map(ch => ({
                Offset: ch.offsets.join(','),
                Break: ch.dmxBreak,
                Geometry: ch.geometry,
                Attribute: ch.attribute,
                Default: ch.default,
                Functions: ch.functions.map(f => `${f.attribute}[${f.dmxFrom}-${f.dmxTo}]`).join(' ')
            })));
            console.groupEnd();
        });
        if (type.warnings.length) console.warn('GDTF warnings:', type.warnings);
        console.groupEnd();
    }
}

globalThis.GDTFParser = GDTFParser;
if (typeof module !== 'undefined') module.exports = GDTFParser;
