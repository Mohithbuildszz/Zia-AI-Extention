const fs = require('fs').promises;
const path = require('path');
const tree = require('web-tree-sitter');

let parser = null;

async function initializeParser() {
    if (parser) {
        return parser;
    }

    console.log('[TREE-SITTER] Initializing...');

    await tree.Parser.init();

    const JavaScript = await tree.Language.load(
        path.join(
            __dirname,
            '../grammars/tree-sitter-javascript.wasm'
        )
    );

    console.log(
        '[TREE-SITTER] JavaScript grammar loaded'
    );

    parser = new tree.Parser();
    parser.setLanguage(JavaScript);

    return parser;
}

async function getFiles(
    dir,
    files = []
) {
    const entries =
        await fs.readdir(dir, {
            withFileTypes: true
        });

    for (const entry of entries) {
        const fullPath = path.join(
            dir,
            entry.name
        );

        if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === '.vscode-test' ||
            entry.name === 'dist'
        ) {
            continue;
        }

        if (entry.isDirectory()) {
            await getFiles(
                fullPath,
                files
            );
        } else {
            files.push(fullPath);
        }
    }

    return files;
}

function normalize(text) {
    return text
        .replace(/\s+/g, '')
        .toLowerCase()
        .trim();
}

function levenshtein(a, b) {
    const rows = b.length + 1;
    const cols = a.length + 1;

    const matrix = Array.from(
        { length: rows },
        () => Array(cols).fill(0)
    );

    for (let i = 0; i < rows; i++) {
        matrix[i][0] = i;
    }

    for (let j = 0; j < cols; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i < rows; i++) {
        for (let j = 1; j < cols; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] =
                    matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[rows - 1][cols - 1];
}

function slidingWindowMatch(
    identifier,
    searchText
) {
    const id = normalize(identifier);
    const query = normalize(searchText);

    if (!id || !query) {
        return false;
    }

    if (
        id.includes(query) ||
        query.includes(id)
    ) {
        return true;
    }

    const maxDistance =
        query.length <= 5
            ? 1
            : query.length <= 10
            ? 2
            : 3;

    const minWindow = Math.max(
        1,
        query.length - maxDistance
    );

    const maxWindow =
        query.length + maxDistance;

    for (
        let windowSize = minWindow;
        windowSize <= maxWindow;
        windowSize++
    ) {
        for (
            let i = 0;
            i <= id.length - windowSize;
            i++
        ) {
            const window = id.slice(
                i,
                i + windowSize
            );

            const distance =
                levenshtein(
                    window,
                    query
                );

            if (
                distance <= maxDistance
            ) {
                return true;
            }
        }
    }

    return false;
}

function isMatch(
    identifier,
    searchText
) {
    const id = normalize(
        identifier
    );
    const query = normalize(
        searchText
    );

    if (!id || !query) {
        return false;
    }

    // Exact match
    if (id === query) {
        return true;
    }

    // Substring match
    if (
        id.includes(query) ||
        query.includes(id)
    ) {
        return true;
    }

    // Fuzzy match
    const distance =
        levenshtein(id, query);

    const maxDistance =
        query.length <= 5
            ? 1
            : query.length <= 10
            ? 2
            : 3;

    if (distance <= maxDistance) {
        return true;
    }

    // Sliding window fuzzy match
    return slidingWindowMatch(
        identifier,
        searchText
    );
}

function collectIdentifierEdits(
    node,
    source,
    searchText,
    edits
) {
   const searchableNodes = [
    'identifier',
    'property_identifier',
    'shorthand_property_identifier'
];

if (
    searchableNodes.includes(
        node.type
    )
) {
        const text = source.slice(
            node.startIndex,
            node.endIndex
        );

        if (
            isMatch(
                text,
                searchText
            )
        ) {
            edits.push({
                start: node.startIndex,
                end: node.endIndex,
                original: text
            });
        }
    }

    for (const child of node.namedChildren) {
        collectIdentifierEdits(
            child,
            source,
            searchText,
            edits
        );
    }
}

async function searchReplaceTool(
    workspaceRoot,
    searchText,
    replaceText
) {
    try {
        const parser =
            await initializeParser();

        const files =
            await getFiles(
                workspaceRoot
            );

        const modifiedFiles = [];

        for (const file of files) {
            let source;

            try {
                source =
                    await fs.readFile(
                        file,
                        'utf8'
                    );
            } catch {
                continue;
            }

            const ext =
                path.extname(file);

            // HTML fallback
            if (ext === '.html') {
                const regex =
                    new RegExp(
                        searchText,
                        'gi'
                    );

                const matches =
                    source.match(regex);

                if (
                    matches &&
                    matches.length > 0
                ) {
                    const updated =
                        source.replace(
                            regex,
                            replaceText
                        );

                    await fs.writeFile(
                        file,
                        updated,
                        'utf8'
                    );

                    modifiedFiles.push({
                        file,
                        replacements:
                            matches.length
                    });
                }

                continue;
            }

            if (
                ext !== '.js' &&
                ext !== '.jsx' &&
                ext !== '.ts' &&
                ext !== '.tsx'
            ) {
                continue;
            }

            const syntaxTree =
                parser.parse(source);

            const edits = [];

            collectIdentifierEdits(
                syntaxTree.rootNode,
                source,
                searchText,
                edits
            );

            if (
                edits.length === 0
            ) {
                continue;
            }

            let updated =
                source;

            edits.reverse().forEach(
                edit => {
                    updated =
                        updated.slice(
                            0,
                            edit.start
                        ) +
                        replaceText +
                        updated.slice(
                            edit.end
                        );
                }
            );

            await fs.writeFile(
                file,
                updated,
                'utf8'
            );

            modifiedFiles.push({
                file,
                replacements:
                    edits.length
            });

            console.log(
                `[SEARCH_REPLACE] ${file} -> ${edits.length} replacements`
            );
        }

        return {
            success: true,
            searchText,
            replaceText,
            modifiedCount:
                modifiedFiles.length,
            modifiedFiles
        };
    } catch (error) {
        console.error(
            '[SEARCH_REPLACE ERROR]',
            error
        );

        return {
            success: false,
            error:
                error.message,
            stack:
                error.stack
        };
    }
}

module.exports = {
    searchReplaceTool
};