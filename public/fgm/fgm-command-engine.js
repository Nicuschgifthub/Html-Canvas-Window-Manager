class FGMCommandEngine {
    static command(rawString) {
        const isInternal = rawString.includes('<Internal>');
        // Remove flag and split into clean tokens
        const cleanString = rawString.replace('<Internal>', '').trim();
        // Regex handles spaces but keeps quoted strings together: 'My Value'
        const tokens = cleanString.match(/(?:[^\s"']+|['"][^'"]*['"])+/g) || [];

        const params = {
            keyword: null,
            address: null,
            subKeyword: null,
            subId: null,
            action: null,
            values: {},
            isInternal: isInternal,
            raw: tokens
        };

        // 1. Identify Keyword and Address (Usually tokens 0 and 1)
        // We check if the first token matches your GLOBAL_TYPES.CONSOLE.KEYWORDS
        const possibleKw = tokens[0];
        if (this.isMainKeyword(possibleKw)) {
            params.keyword = possibleKw;
            params.address = tokens[1]; // The '1.101' part
        }

        // 2. Loop through the rest to find Actions and Sub-data
        tokens.forEach((token, index) => {
            const lowerToken = token.toLowerCase();
            const nextToken = tokens[index + 1];

            // Identify Actions (Verbs)
            if (['at', 'go+', 'enter', 'delete', 'add', 'press', 'focus', 'load', 'update'].includes(lowerToken)) {
                params.action = token;
            }

            // Identify Sub-Keywords (Children)
            if (['preset', 'row', 'index', 'cell'].includes(lowerToken)) {
                params.subKeyword = token;
                params.subId = nextToken;
            }

            // Identify Key-Value Pairs (r 255, g 0, inner 127)
            if (['r', 'g', 'b', 'c', 'a', 'u', 'inner', 'outer', 'value', 'byte'].includes(lowerToken)) {
                params.values[lowerToken] = nextToken;
            }
        });

        console.log("Parsed Params:", params);
        this.execute(params);
    }

    static isMainKeyword(str) {
        // Checks against your GLOBAL_TYPES.CONSOLE.KEYWORDS values
        return Object.values(GLOBAL_TYPES.CONSOLE.KEYWORDS).includes(str);
    }

    static execute(params) {
        if (!params.address) return;

        console.log(params)
    }
}