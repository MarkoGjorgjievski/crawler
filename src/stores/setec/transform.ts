export function extractUniqueMainCategories(raw: string): { name: string, slug: string }[] {
    // 1. Remove escaped slashes
    const text = raw.replace(/\\/g, "");

    const key = '"main_categories":[';
    const results = [];

    let index = text.indexOf(key);

    while (index !== -1) {

        //
        // 2. Extract the full array using bracket depth counting
        //
        let start = index + key.length - 1; // at '['
        let i = start;
        let depth = 0;

        do {
            if (text[i] === '[') depth++;
            if (text[i] === ']') depth--;
            i++;
        } while (depth > 0 && i < text.length);

        const arrayBody = text.slice(start + 1, i - 1).trim();

        //
        // 3. Extract each top-level object via brace counting
        //
        const objs = [];
        let braceDepth = 0;
        let objStart = null;

        for (let j = 0; j < arrayBody.length; j++) {
            const c = arrayBody[j];

            if (c === '{') {
                if (braceDepth === 0) objStart = j;
                braceDepth++;
            } else if (c === '}') {
                braceDepth--;
                if (braceDepth === 0 && objStart !== null) {
                    const objStr = arrayBody.slice(objStart, j + 1);
                    objs.push(objStr);
                }
            }
        }

        //
        // 4. Convert into real objects + keep only MainCategory
        //
        const parsed = objs
            .map(str => {
                try {
                    return JSON.parse(str);
                } catch (e) {
                    return null;
                }
            })
            .filter(obj => obj && obj.__typename === "MainCategory");

        results.push(...parsed);

        index = text.indexOf(key, i);
    }

    //
    // 5. Deduplicate by name + slug
    //
    const seen = new Set();
    const unique: { name: string, slug: string }[] = [];

    for (const obj of results) {
        const key = `${obj.name}|${obj.slug}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push({
                name: obj.name,
                slug: obj.slug
            });
        }
    }

    return unique;
}
