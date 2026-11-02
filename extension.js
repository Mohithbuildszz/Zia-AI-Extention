'use strict';

const vscode = require('vscode');
const ChatViewProvider = require('./providers/ChatViewProvider');

function activate(context) {
    console.log('[ZIA] ACTIVATING');

    const outputChannel =
        vscode.window.createOutputChannel('Zia AI');

    outputChannel.appendLine('[ZIA] Activated');

    try {
        const provider = new ChatViewProvider(
             context,
    context.extensionUri,
    outputChannel
        );

        console.log('[ZIA] PROVIDER CREATED');

        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                'zia-ai.chatView',
                provider,
                {
                    webviewOptions: {
                        retainContextWhenHidden: true
                    }
                }
            )
        );

        console.log('[ZIA] WEBVIEW REGISTERED');

        context.subscriptions.push(
            vscode.commands.registerCommand(
                'zia-ai.focusChat',
                () => {
                    vscode.commands.executeCommand(
                        'workbench.view.extension.zia-ai-sidebar'
                    );
                }
            )
        );

        outputChannel.appendLine(
            '[ZIA] Webview Provider Registered'
        );

        console.log(
            '[ZIA] Webview Provider Registered'
        );

    } catch (err) {
        console.error(
            '[ZIA] Activation Failed',
            err
        );

        outputChannel.appendLine(
            `[ERROR] ${err.stack || err.message}`
        );
    }
}

function deactivate() {
    console.log('[ZIA] Extension Deactivated');
}

module.exports = {
    activate,
    deactivate
};