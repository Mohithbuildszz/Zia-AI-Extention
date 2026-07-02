const fs = require('fs');
const path = require('path');
const IGNORED_DIRS = new Set([
    'node_modules',
    '.git',
    '.vscode-test',
    'dist',
    'build',
    'out',
    '.next',
    '.cache'
]);
function walk(dir, depth = 0) {
    if (depth > 4) {
        return [];
    }
    try {
        return fs.readdirSync(dir, { withFileTypes: true })
            .filter(entry => !IGNORED_DIRS.has(entry.name))
            .map(entry => {
                const full = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    return {
                        name: entry.name,
                        type: 'directory',
                        children: walk(full, depth + 1)
                    };
                }

                return {
                    name: entry.name,
                    type: 'file'
                };
            });
    } catch (err) {
    console.error(err);
    return [];
}
}

function fileTreeTool(workspaceRoot) {
    return walk(workspaceRoot);
}

module.exports = {
    fileTreeTool
};