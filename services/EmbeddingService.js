'use strict';

class EmbeddingService {

    constructor(client) {

        this.client = client;

        this.model = 'nomic-embed-text';
    }

    async embed(text) {

        try {
const response =
    await this.client.embed({
        model: this.model,
        input: text
    });

console.log("[EMBED] Response:", response);

console.log(
    "[EMBED] Embedding length:",
    response.embeddings?.[0]?.length
);

return response.embeddings[0];
        } catch (err) {

            console.error(
                '[EMBEDDING ERROR]',
                err
            );

            throw err;
        }
    }
}

module.exports = EmbeddingService;