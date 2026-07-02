const fs = require('fs').promises;
const path = require('path');

async function readFilesTool(paths, workspaceRoot) {
    const results = [];
    for (const filePath of paths) {
        try {
            const fullPath = path.join(workspaceRoot, filePath);
           const content = await fs.readFile(fullPath, 'utf8');

const MAX_CHARS = 6000;

results.push({
    path: filePath,
    content:
        content.length > MAX_CHARS
            ? content.slice(0, MAX_CHARS) +
              "\n\n...[File truncated]"
            : content
});
        } catch (error) {
            if (error.code === 'ENOENT') {
                results.push({
                    path: filePath,
                    error: 'File not found in workspace'
                });
            } else {
                results.push({
                    path: filePath,
                    error: error.message
                });
            }
        }
    }

    return results;
}

module.exports = { readFilesTool };