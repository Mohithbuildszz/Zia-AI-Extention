'use strict';

const EmbeddingService = require('../services/EmbeddingService');

const VectorStore = require('../services/VectorStore');

class RagService {

    constructor(workspaceRoot, client) {

    this.workspaceRoot = workspaceRoot;
    this.embeddingService = new EmbeddingService(client);
    this.vectorStore = new VectorStore();
    this.indexPromise = this.initialize();

} async initialize() {
        await this.vectorStore.initialize(
            this.workspaceRoot
        );
        await this.vectorStore.indexWorkspace(
            this.workspaceRoot,
            this.embeddingService
        );
    }

async retrieve(query) {
    console.log("[RAG] retrieve() called");
    console.log("[RAG] Query:", query);

    try {

        await this.indexPromise;

        console.log("[RAG] Workspace indexed");

        const queryEmbedding = await this.embeddingService.embed(query);

        console.log("[RAG] Query embedding generated");

        const results =
             await this.vectorStore.search(
             queryEmbedding
    );

        console.log(
            "[RAG] Search Results:",
            results.map(result => ({
                file: result.filePath,
                score: result.score
            }))
        );

        return results;
    } catch (err) {
        console.error("[RAG ERROR]", err);
        return [];
    }
}
async buildContext(query) {

    const results = await this.retrieve(query);
    if (!results.length) {
        return '';
    }

    let context = '';
    for (const result of results) {
        context += `
FILE: ${result.filePath}

CONTENT:
${result.content}

----------------------------------------
`;

    }

    console.log(
        "[RAG] Context built with",
        results.length,
        "chunks"
    );

    console.log(
        "========== RAG CONTEXT =========="
    );
    console.log(context);
    console.log(
        "================================="
    );

    return context;
    } 
}   
module.exports = RagService;