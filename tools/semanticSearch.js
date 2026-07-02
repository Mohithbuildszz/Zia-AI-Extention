'use strict';

const fs = require('fs');
const path = require('path');

const IGNORE_DIRS = new Set([
    'node_modules',
    '.git',
    '.vscode',
    'dist',
    'build',
    'out'
]);

function getKeywords(query) {
    return query
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word =>
            word.length > 2 &&
            ![
                'the',
                'this',
                'that',
                'file',
                'code',
                'please',
                'explain',
                'read',
                'show',
                'tell',
                'about'
            ].includes(word)
        );
}

async function semanticSearchTool(query, workspaceRoot) {

    const keywords = getKeywords(query);

    const matches = [];

    function walk(dir) {

        const entries = fs.readdirSync(
            dir,
            { withFileTypes: true }
        );

        for (const entry of entries) {

            if (
                entry.isDirectory() &&
                IGNORE_DIRS.has(entry.name)
            ) {
                continue;
            }

            const fullPath =
                path.join(dir, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath);
                continue;
            }

            try {

                const content =
                    fs.readFileSync(fullPath, 'utf8');

                const lower =
                    content.toLowerCase();

                let score = 0;

                for (const word of keywords) {

                    if (lower.includes(word)) {
                        score++;
                    }

                    if (
                        fullPath
                            .toLowerCase()
                            .includes(word)
                    ) {
                        score += 2;
                    }
                }

                if (score > 0) {

                    let snippet =
                        content.substring(0, 500);

                    for (const word of keywords) {

                        const index =
                            lower.indexOf(word);

                        if (index !== -1) {

                            snippet =
                                content.substring(
                                    Math.max(0, index - 150),
                                    Math.min(
                                        content.length,
                                        index + 350
                                    )
                                );

                            break;
                        }
                    }

                    matches.push({

                        filePath: path.relative(
                            workspaceRoot,
                            fullPath
                        ),

                        score,

                        snippet

                    });
                }

            } catch {

            }
        }
    }

    walk(workspaceRoot);

    matches.sort(
        (a, b) => b.score - a.score
    );

    return matches.slice(0, 5);
}

module.exports = {
    semanticSearchTool
};