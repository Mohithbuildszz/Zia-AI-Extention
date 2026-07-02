'use strict';
const vscode = require('vscode');
const { Ollama } = require('ollama');
class OllamaService {
    constructor(outputChannel) {
        this.output = outputChannel;
        this._updateConfig();

        this.configListener =
            vscode.workspace.onDidChangeConfiguration(e => {
                if (
                    e.affectsConfiguration('Zia AI')
                ) {
                    this._updateConfig();
                }
            });
    }
    _updateConfig() {

        const config =
            vscode.workspace.getConfiguration(
                'Zia AI'
            );

        this.baseUrl = String(
            config.get('ollamaBaseUrl') ||
            'http://127.0.0.1:11434'
        ).replace(/\/$/, '');

        this.model =
            config.get('model') ||
            'qwen3.5:latest';

        this.temperature = Number(
            config.get('temperature') ?? 0.2
        );

        this.client = new Ollama({
            host: this.baseUrl
        });

        this.log(
            `Service Initialized | URL: ${this.baseUrl} | Model: ${this.model}`
        );
    }

    log(message, level = 'INFO') {

        const timestamp =
            new Date().toLocaleTimeString();

        const fullMessage =
            `[${timestamp}] [${level}] ${message}`;

        if (this.output) {
            this.output.appendLine(fullMessage);
        }

        console.log(
            `[Zia AI] ${fullMessage}`
        );
    }

    async chat(messages) {

        try {

            this.log(
                `Sending request to ${this.model}`
            );

            const config =
                vscode.workspace.getConfiguration(
                    'Zia AI'
                );

            const systemPrompt =
                config.get('systemPrompt');

            const maxHistory =
                config.get(
                    'maxHistoryMessages'
                ) || 12;

            let chatMessages = [];

            if (systemPrompt) {
                chatMessages.push({
                    role: 'system',
                    content: systemPrompt
                });
            }

            const history =
                messages.slice(-maxHistory);

            chatMessages.push(...history);

            this.log(
                `Base URL: ${this.baseUrl}`
            );

            this.log(
                `Model: ${this.model}`
            );

            this.log(
                `Messages: ${chatMessages.length}`
            );

            const response =
                await this.client.chat({
                    model: this.model,
                    messages: chatMessages,
                    stream: true,
                    options: {
                        temperature:
                            this.temperature
                    }
                });

            if (
                !response ||
                !response.message ||
                !response.message.content
            ) {
                throw new Error(
                    'Empty response received from Ollama'
                );
            }

            this.log(
                'Response received successfully'
            );

            return response.message.content.trim();

        } catch (error) {

            console.error(
                '[FULL OLLAMA ERROR]',
                error
            );

            this.log(
                `Ollama Error: ${error.message}`,
                'ERROR'
            );

            if (
                error.code ===
                    'ECONNREFUSED' ||
                error.message.includes(
                    'fetch failed'
                )
            ) {
                throw new Error(
                    `Could not connect to Ollama at ${this.baseUrl}`
                );
            }

            if (
                error.status === 404
            ) {
                throw new Error(
                    `Model "${this.model}" not found. Run:\nollama pull ${this.model}`
                );
            }

            if (
                error.message.includes(
                    'CUDA'
                )
            ) {
                throw new Error(
                    `Ollama GPU Error: ${error.message}`
                );
            }

            throw new Error(
                error.message ||
                'Unknown Ollama error'
            );
        }
    }

async streamChat(messages, onChunk) {

    try {

        const config =
            vscode.workspace.getConfiguration(
                'Zia AI'
            );

        const systemPrompt =
            config.get('systemPrompt');

        const maxHistory =
            config.get(
                'maxHistoryMessages'
            ) || 12;

        let chatMessages = [];

        if (systemPrompt) {
            chatMessages.push({
                role: 'system',
                content: systemPrompt
            });
        }

        const history =
            messages.slice(-maxHistory);

        chatMessages.push(...history);

        const stream =
            await this.client.chat({
                model: this.model,
                messages: chatMessages,
                stream: true,
                options: {
                    temperature:
                        this.temperature
                }
            });

        let fullResponse = '';

        for await (const chunk of stream) {

            const token =
                chunk.message?.content || '';

            fullResponse += token;

            if (onChunk) {
                onChunk(token);
            }
        }

        return fullResponse.trim();

    } catch (error) {

        this.log(
            `Streaming Error: ${error.message}`,
            'ERROR'
        );

        throw error;
    }
}

    async checkModel() {

        try {

            const models =
                await this.client.list();

            console.log(
                '[AVAILABLE MODELS]',
                models
            );

            const exists =
                models.models.some(model =>
                    model.name ===
                        this.model ||
                    model.name.split(':')[0] ===
                        this.model.split(':')[0]
                );

            if (!exists) {
                this.log(
                    `Model ${this.model} not found locally`,
                    'WARNING'
                );
            }

            return exists;

        } catch (error) {

            console.error(
                '[MODEL CHECK ERROR]',
                error
            );

            this.log(
                `Failed to check models: ${error.message}`,
                'ERROR'
            );

            return false;
        }
    }

    dispose() {

        if (
            this.configListener
        ) {
            this.configListener.dispose();
        }
    }
}

module.exports = OllamaService;