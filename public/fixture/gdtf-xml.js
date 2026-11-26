/**
 * GDTFXml — tiny dependency-free XML reader for GDTF description.xml files.
 *
 * Produces a plain tree: { tag, attr: {}, children: [] }.
 * Works in the browser and in Node (no DOMParser needed), so the GDTF
 * deconstructor can be tested from the command line (see tools/gdtf-inspect.js).
 *
 * Text nodes are ignored — GDTF stores everything in attributes.
 */
class GDTFXml {

    static parse(text) {
        if (typeof text !== 'string') throw new Error('GDTFXml: input must be a string');
        if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

        const root = { tag: '#document', attr: {}, children: [] };
        const stack = [root];
        const len = text.length;
        let i = 0;

        while (i < len) {
            const lt = text.indexOf('<', i);
            if (lt === -1) break;

            // comment
            if (text.startsWith('<!--', lt)) {
                const end = text.indexOf('-->', lt + 4);
                i = end === -1 ? len : end + 3;
                continue;
            }
            // CDATA (text — ignored)
            if (text.startsWith('<![CDATA[', lt)) {
                const end = text.indexOf(']]>', lt + 9);
                i = end === -1 ? len : end + 3;
                continue;
            }
            // processing instruction / xml declaration
            if (text.startsWith('<?', lt)) {
                const end = text.indexOf('?>', lt + 2);
                i = end === -1 ? len : end + 2;
                continue;
            }
            // DOCTYPE and friends
            if (text.startsWith('<!', lt)) {
                const end = text.indexOf('>', lt + 2);
                i = end === -1 ? len : end + 1;
                continue;
            }
            // closing tag
            if (text[lt + 1] === '/') {
                const end = text.indexOf('>', lt + 2);
                const tag = text.slice(lt + 2, end).trim();
                // pop until matching tag (tolerant of sloppy files)
                for (let s = stack.length - 1; s > 0; s--) {
                    if (stack[s].tag === tag) { stack.length = s; break; }
                }
                i = end + 1;
                continue;
            }

            // opening tag — find the end, respecting quoted attribute values
            let j = lt + 1;
            let quote = null;
            while (j < len) {
                const c = text[j];
                if (quote) { if (c === quote) quote = null; }
                else if (c === '"' || c === "'") quote = c;
                else if (c === '>') break;
                j++;
            }
            let inner = text.slice(lt + 1, j);
            const selfClosing = inner.endsWith('/');
            if (selfClosing) inner = inner.slice(0, -1);

            const nameMatch = /^[^\s/>]+/.exec(inner);
            const tag = nameMatch ? nameMatch[0] : '';
            const node = { tag, attr: GDTFXml._parseAttributes(inner.slice(tag.length)), children: [] };

            stack[stack.length - 1].children.push(node);
            if (!selfClosing) stack.push(node);
            i = j + 1;
        }

        return root;
    }

    static _parseAttributes(src) {
        const attr = {};
        const re = /([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
        let m;
        while ((m = re.exec(src)) !== null) {
            attr[m[1]] = GDTFXml.decodeEntities(m[3] !== undefined ? m[3] : m[4]);
        }
        return attr;
    }

    static decodeEntities(s) {
        if (s.indexOf('&') === -1) return s;
        return s.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (_, e) => {
            switch (e) {
                case 'amp': return '&';
                case 'lt': return '<';
                case 'gt': return '>';
                case 'quot': return '"';
                case 'apos': return "'";
                default:
                    return String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
            }
        });
    }

    // ── tree helpers ──────────────────────────────────────────────────────
    static child(node, tag) {
        if (!node) return null;
        return node.children.find(c => c.tag === tag) || null;
    }

    static childrenOf(node, tag) {
        if (!node) return [];
        return tag ? node.children.filter(c => c.tag === tag) : node.children;
    }

    /** Depth-first search for the first descendant with the given tag. */
    static find(node, tag) {
        if (!node) return null;
        for (const c of node.children) {
            if (c.tag === tag) return c;
            const deep = GDTFXml.find(c, tag);
            if (deep) return deep;
        }
        return null;
    }

    /** Follow a path of tags, e.g. path(root, 'GDTF', 'FixtureType'). */
    static path(node, ...tags) {
        let cur = node;
        for (const t of tags) {
            cur = GDTFXml.child(cur, t);
            if (!cur) return null;
        }
        return cur;
    }
}

globalThis.GDTFXml = GDTFXml;
if (typeof module !== 'undefined') module.exports = GDTFXml;
