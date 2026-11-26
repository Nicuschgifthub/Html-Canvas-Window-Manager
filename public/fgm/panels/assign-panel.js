/**
 * Assign panel — overview of every assignable control (fader, encoder, pad,
 * colour picker, preset group) on every page and what it does.
 * Tap a row to change the assignment. The same chooser is used from a
 * window's own settings ("Function" row).
 */
class FGMAssignPanel {

    static async open() {
        while (true) {
            const controls = this.listControls();
            const { window } = FGMModal.openTable({
                title: `Assignments — ${controls.filter(c => c.assignment).length} of ${controls.length} controls assigned`,
                headers: ['Location', 'Control', 'Page', 'Does'],
                rows: controls.map(c => [
                    c.locationId,
                    c.field.getLabel(),
                    c.page === null || c.page === undefined ? '-' : String(c.page),
                    FGMMapping.describe(c.assignment)
                ])
            });

            const action = await FGMModal.nextTableAction();
            if (action.type === 'close') { FGMModal.close(window); return; }
            if (action.type === 'cell') {
                const c = controls[action.rowIndex];
                if (c) await this.chooseFor(c.field);
            }
        }
    }

    static listControls() {
        return HCWDB.getWindows()
            .map(win => ({ win, field: win.getContextField && win.getContextField() }))
            .filter(({ field }) => FGMMapping.isAssignable(field))
            .map(({ win, field }) => ({
                field,
                locationId: field.getLocationId(),
                page: win.getPageId(),
                assignment: FGMMapping.get(field.getLocationId())
            }))
            .sort((a, b) => String(a.locationId).localeCompare(String(b.locationId), undefined, { numeric: true }));
    }

    /** Walk the user through assigning `field`. Returns the new assignment (or undefined when cancelled). */
    static async chooseFor(field) {
        const loc = field.getLocationId();
        const current = FGMMapping.get(loc);
        const types = FGMMapping.typesFor(field);

        const type = await FGMModal.choose({
            title: `${field.getLabel()} (${loc}) does…`,
            options: [
                { label: 'Nothing', value: FGMMapping.TYPES.NONE, color: '#3a3a3a', selected: !current },
                ...types.map(t => ({ label: FGMMapping.typeLabel(t), value: t, selected: current && current.type === t }))
            ]
        });
        if (!type) return undefined;

        let assignment = null;
        const T = FGMMapping.TYPES;

        if (type === T.ATTRIBUTE) {
            const attribute = await this.chooseAttribute({ title: `${field.getLabel()} → attribute`, current: current?.attribute });
            if (!attribute) return undefined;

            const target = await FGMModal.choose({
                title: `${FGMMapping.attributeLabel(attribute)} on…`,
                options: [
                    { label: 'Selected fixtures', value: 'selection', selected: !current?.fids },
                    { label: 'Fixed fixtures', value: 'fixed', selected: !!current?.fids }
                ]
            });
            if (!target) return undefined;

            assignment = { type, attribute };
            if (target === 'fixed') {
                const fixtures = PatchManager.getAllFixtures().filter(f => f.hasAttribute(attribute));
                if (!fixtures.length) return undefined;
                const fids = await FGMModal.choose({
                    title: `Fixtures for ${FGMMapping.attributeLabel(attribute)}`,
                    multi: true,
                    selected: current?.fids || [],
                    options: fixtures.map(f => ({ label: `${f.fid} ${f.name}`, value: f.fid, color: '#1f2a44' }))
                });
                if (!fids || !fids.length) return undefined;
                assignment.fids = fids.sort((a, b) => a - b);
            }
        } else if (type === T.POOL) {
            const pool = await FGMModal.choose({
                title: `${field.getLabel()} → pool`,
                options: FGMPools.TYPES.map(t => ({ label: t.label, value: t.key, color: t.color, selected: current?.pool === t.key }))
            });
            if (!pool) return undefined;
            assignment = { type, pool };
            if (!current || current.type !== T.POOL || current.pool !== pool) field.setLabel(FGMPools.getType(pool).label);
        } else if (type === T.WHEEL) {
            const attribute = await this.chooseAttribute({ title: `${field.getLabel()} → wheel`, onlyWheels: true, current: current?.attribute });
            if (!attribute) return undefined;
            assignment = { type, attribute };
        } else if (type === T.CHANNEL_SETS) {
            const attribute = await this.chooseAttribute({ title: `${field.getLabel()} → sets of…`, onlyWithSets: true, current: current?.attribute });
            if (!attribute) return undefined;
            assignment = { type, attribute };
        } else if (type !== T.NONE) {
            assignment = { type };
        }

        FGMMapping.set(loc, assignment);
        return assignment;
    }

    // ── attribute picker ─────────────────────────────────────────────────

    static get FEATURE_COLORS() {
        return {
            Dimmer: '#4a3b00', Position: '#1d3557', Color: '#5b1f4f', Gobo: '#2d4a22',
            Beam: '#3d2b56', Focus: '#21453f', Control: '#3a3a3a', Shapers: '#4a2c1a',
            Video: '#2a2a4a'
        };
    }

    /**
     * Attributes available in the current patch (falls back to the common
     * ones when nothing is patched yet), grouped by GDTF feature group.
     */
    static collectAttributes(onlyWithSets = false, onlyWheels = false) {
        const out = new Map();
        PatchManager.getAllFixtures().forEach(f => {
            f.attributes.forEach(attr => {
                if (attr === 'NoFeature') return;
                if (onlyWheels && !FGMMapping.isWheelAttribute(f, attr)) return;
                if (onlyWithSets && !f.getChannelsForAttribute(attr).some(ch =>
                    ch.functions.some(fn => fn.attribute === attr && fn.sets.some(s => s.name)))) return;
                if (!out.has(attr)) {
                    const def = f.type.attributes[attr] || {};
                    out.set(attr, { attribute: attr, pretty: def.pretty || attr, group: def.featureGroup || 'Other', count: 0 });
                }
                out.get(attr).count++;
            });
        });

        if (out.size === 0 && !onlyWithSets && !onlyWheels) {
            ['Dimmer', 'Pan', 'Tilt', 'Zoom', 'Focus1', 'Shutter1', 'ColorAdd_R', 'ColorAdd_G', 'ColorAdd_B', 'ColorAdd_W', 'Iris', 'Frost1']
                .forEach(a => out.set(a, { attribute: a, pretty: a, group: 'Common', count: 0 }));
        }
        return [...out.values()];
    }

    static async chooseAttribute({ title, onlyWithSets = false, onlyWheels = false, current = null }) {
        const attrs = this.collectAttributes(onlyWithSets, onlyWheels);
        if (!attrs.length) return null;

        const toOption = (a) => ({
            label: a.count ? `${a.pretty} (${a.count})` : a.pretty,
            value: a.attribute,
            color: this.FEATURE_COLORS[a.group] || '#2b2b2b',
            selected: a.attribute === current
        });

        if (attrs.length <= 24) return FGMModal.choose({ title, options: attrs.map(toOption) });

        // many attributes → choose the feature group first
        const groups = [...new Set(attrs.map(a => a.group))];
        while (true) {
            const group = await FGMModal.choose({
                title: `${title} — feature group`,
                options: groups.map(g => ({
                    label: `${g} (${attrs.filter(a => a.group === g).length})`,
                    value: g,
                    color: this.FEATURE_COLORS[g] || '#2b2b2b',
                    selected: attrs.some(a => a.group === g && a.attribute === current)
                }))
            });
            if (!group) return null;
            const attribute = await FGMModal.choose({
                title: `${title} — ${group}  (tap background to go back)`,
                options: attrs.filter(a => a.group === group).map(toOption)
            });
            if (attribute) return attribute;
        }
    }
}

globalThis.FGMAssignPanel = FGMAssignPanel;
