const fs = require('fs').promises;
const path = require('path');

async function writeFileTool(workspaceRoot, relativePath, content) {
    try {
        if (!relativePath) {
            return {
                success: false,
                error: 'relativePath is required'
            };
        }
        const fullPath = path.join(workspaceRoot, relativePath);

        await fs.mkdir(path.dirname(fullPath), {
            recursive: true
        });
        await fs.writeFile(fullPath, content, 'utf8');

        return {
            success: true,
            relativePath,
            fullPath,
            message: 'File written successfully'
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    writeFileTool
};