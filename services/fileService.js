const vscode = require('vscode');
const fs = require('fs').promises;
async function readFiles(paths) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        throw new Error('No workspace folder open');
    }
    const results = {};
    for (const relativePath of paths) {
        try {
            const uri = vscode.Uri.joinPath(
                workspaceFolder.uri,
                relativePath
            );
            const content = await fs.readFile(
                uri.fsPath,
                'utf8'
            );
            results[relativePath] = content;
        } catch (err) {
            results[relativePath] = `Error: ${err.message}`;
        }
    }

    return results;
}
module.exports = {
    readFiles
};