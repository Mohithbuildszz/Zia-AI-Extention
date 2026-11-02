
'use strict';

class EmbeddingService {

    constructor(client) {

        if (!client || typeof client.embed !== 'function') {
            throw new Error(
                'A valid Ollama client with an embed() method is required.'
            );
        }

        this.client = client;

        // Same model must be used for documents and queries.
        this.model = 'nomic-embed-text';

        this.embeddingDimensions = null;

    }

    // ==========================================
    // GENERATE EMBEDDING
    // ==========================================

    async embed(text) {

        try {

            if (
                typeof text !== 'string' ||
                !text.trim()
            ) {
                throw new Error(
                    'Text cannot be empty.'
                );
            }

            console.log(
                '[EMBED] Generating embedding...'
            );

            const response = await this.client.embed({

                model: this.model,

                input: text

            });

            // Ollama returns embeddings as an array of vectors.
            const embedding = response?.embeddings?.[0];

            if (
                !Array.isArray(embedding) &&
                !ArrayBuffer.isView(embedding)
            ) {
                throw new Error(
                    'Ollama returned an invalid embedding response.'
                );
            }

            const normalizedEmbedding = Array.from(embedding);

            if (
                normalizedEmbedding.length === 0 ||
                !normalizedEmbedding.every(
                    value =>
                        typeof value === 'number' &&
                        Number.isFinite(value)
                )
            ) {
                throw new Error(
                    'Embedding contains invalid numerical values.'
                );
            }

            // Validate vector dimensions.
            if (this.embeddingDimensions === null) {

                this.embeddingDimensions =
                    normalizedEmbedding.length;

                console.log(
                    '[EMBED] Embedding dimensions:',
                    this.embeddingDimensions
                );

            } else if (
                normalizedEmbedding.length !==
                this.embeddingDimensions
            ) {

                throw new Error(
                    `Embedding dimension mismatch. Expected ${this.embeddingDimensions}, received ${normalizedEmbedding.length}.`
                );

            }

            console.log(
                '[EMBED] Embedding generated successfully.'
            );

            return normalizedEmbedding;

        } catch (error) {

            console.error(
                '[EMBEDDING ERROR]',
                error.message
            );

            throw error;

        }

    }

    // ==========================================
    // GET MODEL INFORMATION
    // ==========================================

    getModelInfo() {

        return {
            model: this.model,
            dimensions: this.embeddingDimensions
        };

    }

}

module.exports = EmbeddingService;
