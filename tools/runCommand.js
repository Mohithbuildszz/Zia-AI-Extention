const { exec } = require('child_process');

function runCommandTool(command) {
    return new Promise((resolve) => {

        exec(command, (error, stdout, stderr) => {

            resolve({
                stdout,
                stderr,
                error: error ? error.message : null
            });

        });

    });
}

module.exports = {
    runCommandTool
};