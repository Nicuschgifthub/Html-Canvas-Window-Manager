/**
 * FGMFixtureSheet — fills every HCWFixtureSheetField from patch + programmer.
 *
 * One row per patched fixture, one column per channel attribute (Dimmer, Pan,
 * Color1, Gobo1 …) grouped by GDTF feature group. A cell shows what the channel
 * currently outputs, decoded through the GDTF:
 *
 *   - a named channel set → its name ("Deep Red", "Strobe", "Open")
 *   - otherwise the value: degrees for angles, Hz, K … or percent
 *   - another function on the same channel → its name in front ("WheelSpin 40%")
 *
 * Yellow = value is in the programmer, grey = fixture default. Wheel slots
 * tint the cell with the slot colour. "*" = instances (pixels) differ.
 */
class FGMFixtureSheet {

    static get GROUP_ORDER() {
        return ['Dimmer', 'Position', 'Color', 'Gobo', 'Beam', 'Focus', 'Shapers', 'Video', 'Control'];
    }

    static get GROUP_COLORS() {
        return {
            Dimmer: '#d4a900', Position: '#3d7cc9', Color: '#c43fae', Gobo: '#5fa83f',
            Beam: '#8a5cc9', Focus: '#3fa89a', Shapers: '#c9773f', Video: '#5c5cc9', Control: '#777777'
        };
    }

    static get DEFAULT_HIDDEN_GROUPS() {
        return ['Control'];
    }

    static get DISPLAY_MODES() {
        return [
            { value: 'auto', label: 'Auto (°, Hz, %)' },
            { value: 'percent', label: 'Percent' },
            { value: 'dmx', label: 'DMX' }
        ];
    }

    static _queued = false;

    static init() {
        const queue = () => this.queueRefresh();
        Programmer.on(queue);
        PatchManager.on(queue);
    }

    static queueRefresh() {
        if (this._queued) return;
        this._queued = true;
        Promise.resolve().then(() => {
            this._queued = false;
            this.refreshAll();
        });
    }

    static refreshAll() {
        if (typeof HCWDB === 'undefined') return;
        HCWDB.getWindows().forEach(win => {
            const field = win.getContextField && win.getContextField();
            if (field instanceof HCWFixtureSheetField) this.refreshField(field);
        });
    }

    // ── columns ──────────────────────────────────────────────────────────

    /** Channel attributes of the patch: [{ attribute, pretty, group }] in feature-group order. */
    static collectColumns() {
        const seen = new Map();
        PatchManager.getAllFixtures().forEach(f => {
            f.channels.forEach(ch => {
                if (ch.attribute === 'NoFeature' || seen.has(ch.attribute)) return;
                const def = f.type.attributes[ch.attribute] || {};
                seen.set(ch.attribute, { attribute: ch.attribute, pretty: this.columnLabel(ch.attribute, def.pretty), group: def.featureGroup || 'Other' });
            });
        });
        const order = this.GROUP_ORDER;
        const rank = (g) => { const i = order.indexOf(g); return i === -1 ? order.length - 1 : i; };
        return [...seen.values()]
            .map((c, i) => ({ ...c, i }))
            .sort((a, b) => (rank(a.group) - rank(b.group)) || (a.i - b.i));
    }

    /**
     * GDTF "Pretty" names are often very terse ("P", "C1", "Sh1"). Use them for
     * colour mixing (R, G, B, W read fine) and when they are readable, otherwise
     * the attribute name.
     */
    static columnLabel(attribute, pretty) {
        if (!pretty) return attribute;
        if (/^Color(Add|Sub)_/.test(attribute)) return pretty;
        return pretty.length >= 4 ? pretty : attribute;
    }

    static availableGroups() {
        return [...new Set(this.collectColumns().map(c => c.group))];
    }

    static visibleGroups(field) {
        const opts = field.getSheetOptions();
        const all = this.availableGroups();
        if (Array.isArray(opts.groups)) return all.filter(g => opts.groups.includes(g));
        return all.filter(g => !this.DEFAULT_HIDDEN_GROUPS.includes(g));
    }

    // ── building ─────────────────────────────────────────────────────────

    static refreshField(field) {
        const display = field.getSheetOptions().display || 'auto';
        const groups = this.visibleGroups(field);
        const attrColumns = this.collectColumns().filter(c => groups.includes(c.group));
        const fixtures = PatchManager.getAllFixtures();

        const columns = [
            { label: 'FID', width: 46 },
            { label: 'Name', width: 120 },
            ...attrColumns.map(c => ({
                label: c.pretty,
                width: c.group === 'Color' || c.group === 'Gobo' || c.group === 'Beam' ? 86 : 66,
                group: c.group,
                groupColor: this.GROUP_COLORS[c.group] || '#555555'
            }))
        ];

        let programmedFixtures = 0;
        const rows = fixtures.map(f => {
            const selected = Programmer.isSelected(f.fid);
            const hasValues = Programmer.hasValues(f.fid);
            if (hasValues) programmedFixtures++;
            return {
                id: f.fid,
                selected,
                cells: [
                    { text: String(f.fid), color: hasValues ? '#ffd24a' : '#ffffff' },
                    { text: f.name, color: '#ffffff' },
                    ...attrColumns.map(c => this._cell(f, c.attribute, display))
                ]
            };
        });

        const sel = Programmer.selection.length;
        field.setSheet({
            subtitle: `${fixtures.length} fixtures · ${sel} selected · ${programmedFixtures} in programmer${Programmer.highlight ? ' · HIGHLIGHT' : ''}`,
            fixed: 2,
            columns,
            rows
        });
    }

    static _cell(fixture, attribute, display) {
        const channels = fixture.channels.filter(ch => ch.attribute === attribute);
        if (!channels.length) return { text: '', bg: '#0a0a0a' };

        const read = (ch) => Programmer.resolveRaw(fixture, ch);
        const first = channels[0];
        const raw = read(first);
        const mixed = channels.some(ch => read(ch) !== raw);
        const programmed = channels.some(ch => Programmer.isChannelProgrammed(fixture.fid, ch.key));
        const { fn, set } = fixture.decodeValue(first, raw, read);
        const programmedColor = programmed ? '#ffd24a' : '#8a8a8a';

        // range that does nothing on this fixture
        if (fn && fn.attribute === 'NoFeature' && display !== 'dmx') return { text: '—', color: programmedColor };

        let text = this._format(fixture, fn, raw, display);
        if (mixed) text += '*';

        const names = [];
        if (fn && fn.attribute !== attribute && fn.attribute !== 'NoFeature') names.push(fn.name);
        if (set && set.name) names.push(set.name);
        const sub = names.join(' · ') || null;

        let bg = null;
        if (fn && fn.wheel && set && set.wheelSlotIndex) {
            const slot = fixture.type.wheels[fn.wheel]?.slots[set.wheelSlotIndex - 1];
            if (slot && slot.hex) bg = FGMMapping._darken(slot.hex, 0.45);
        }

        return { text, sub, color: programmedColor, bg };
    }

    static _format(fixture, fn, raw, display) {
        if (display === 'dmx') return String(raw);
        if (!fn) return String(raw);
        const pct = `${Math.round(FixturePatch.rawToNorm(fn, raw) * 100)}%`;
        if (display === 'percent') return pct;

        const unit = fixture.type.attributes[fn.attribute]?.physicalUnit || 'None';
        const phys = FixturePatch.rawToPhysical(fn, raw);
        const round = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toString();
        switch (unit) {
            case 'Angle': return `${round(phys)}°`;
            case 'AngularSpeed': return `${round(phys, 1)}°/s`;
            case 'Frequency': return `${round(phys, 1)}Hz`;
            case 'Temperature': return `${round(phys)}K`;
            case 'Time': return `${round(phys, 1)}s`;
            default: return pct;
        }
    }

    // ── window settings ──────────────────────────────────────────────────

    static describeGroups(field) {
        const vis = this.visibleGroups(field);
        const all = this.availableGroups();
        if (!all.length) return '-';
        return vis.length === all.length ? 'All' : (vis.join(', ') || 'None');
    }

    static async chooseGroups(field) {
        const all = this.availableGroups();
        if (!all.length) return;
        const picked = await FGMModal.choose({
            title: 'Columns — feature groups to show',
            multi: true,
            selected: this.visibleGroups(field),
            options: all.map(g => ({ label: g, value: g, color: FGMMapping._darken(this.GROUP_COLORS[g] || '#555555', 0.6) }))
        });
        if (picked) {
            field.setSheetOptions({ groups: picked });
            this.refreshField(field);
        }
    }

    static async chooseDisplay(field) {
        const current = field.getSheetOptions().display || 'auto';
        const mode = await FGMModal.choose({
            title: 'Fixture sheet values',
            options: this.DISPLAY_MODES.map(m => ({ label: m.label, value: m.value, selected: m.value === current }))
        });
        if (mode) {
            field.setSheetOptions({ display: mode });
            this.refreshField(field);
        }
    }
}

globalThis.FGMFixtureSheet = FGMFixtureSheet;
