class FGMCommandEngine {
    static command(rawString) {
        const userActionKeyword = '<UserAction>';
        const userAction = rawString.includes(userActionKeyword);
        // Remove flag and split into clean tokens
        const cleanString = rawString.replace(userActionKeyword, '').trim();
        // Regex handles spaces but keeps quoted strings together: 'My Value'
        const tokens = cleanString.match(/(?:[^\s"']+|['"][^'"]*['"])+/g) || [];

        const params = {
            keyword: null,
            locationId: null,
            subKeyword: null,
            subId: null,
            action: null,
            values: {},
            userAction,
            raw: tokens
        };

        // 1. Identify Keyword and locationId (Usually tokens 0 and 1)
        // We check if the first token matches your GLOBAL_TYPES.CONSOLE.KEYWORDS
        const possibleKw = tokens[0];
        if (this.isMainKeyword(possibleKw)) {
            params.keyword = possibleKw;
            params.locationId = tokens[1]; // The '1.101' part
        }

        // 2. Loop through the rest to find Actions and Sub-data
        tokens.forEach((token, index) => {
            const lowerToken = token.toLowerCase();
            const nextToken = tokens[index + 1];

            // Identify Actions (Verbs)
            if (['at', 'go+', 'enter', 'delete', 'edit', 'add', 'press', 'focus', 'load', 'update'].includes(lowerToken)) {
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
        return Object.values(GLOBAL_TYPES.CONSOLE.KEYWORDS).includes(str);
    }

    static execute(params) {
        if (!params || !params.keyword) return;

        params.keyword = GLOBAL_TYPES.CONTEXT_FIELDS_EXECUTOR.KEY_WORD_EXECUTOR_START_STRING + params.keyword;

        const TargetClass = globalThis[params.keyword];

        if (TargetClass && typeof TargetClass.command === 'function') {
            TargetClass.command(params);
        } else {
            console.error(`Execution failed: Class "${params.keyword}" not found globally.`);
        }

        console.log(params);
    }
}