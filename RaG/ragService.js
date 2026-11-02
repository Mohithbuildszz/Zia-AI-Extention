
'use strict';

const EmbeddingService = require('../services/EmbeddingService');
const VectorStore = require('../services/VectorStore');

class RagService {

    constructor(workspaceRoot, client) {

        if (!workspaceRoot) {
            throw new Error('Workspace root is required.');
        }

        this.workspaceRoot = workspaceRoot;

        this.embeddingService = new EmbeddingService(client);

        this.vectorStore = new VectorStore();

        // Track initialization so retrieval waits for indexing.
        this.indexPromise = null;

        this.initialized = false;

        this.maxContextLength = 12000;

        // Start initialization.
        this.indexPromise = this.initialize();

    }

    // ==========================================
    // INITIALIZE RAG PIPELINE
    // ==========================================

    async initialize() {

        try {

            console.log('[RAG] Initializing RAG service...');

            // Step 1: Initialize LanceDB.
            await this.vectorStore.initialize(
                this.workspaceRoot
            );

            console.log('[RAG] VectorStore initialized.');

            // Step 2: Index workspace files.
            await this.vectorStore.indexWorkspace(
                this.workspaceRoot,
                this.embeddingService
            );

            this.initialized = true;

            console.log('[RAG] Workspace indexing completed.');

            return true;

        } catch (error) {

            this.initialized = false;

            console.error(
                '[RAG INITIALIZATION ERROR]',
                error
            );

            throw error;

        }

    }

    // ==========================================
    // RETRIEVE RELEVANT DOCUMENTS
    // ==========================================

    async retrieve(query) {

        console.log('[RAG] retrieve() called.');

        if (
            typeof query !== 'string' ||
            !query.trim()
        ) {
            console.warn('[RAG] Empty query received.');

            return [];
        }

        try {

            // Wait until workspace indexing completes.
            await this.indexPromise;

            if (!this.initialized) {

                throw new Error(
                    'RAG service is not initialized.'
                );

            }

            console.log('[RAG] Workspace indexed.');

            // Generate embedding for user query.
            const queryEmbedding =
                await this.embeddingService.embed(
                    query.trim()
                );

            if (
                !Array.isArray(queryEmbedding) &&
                !ArrayBuffer.isView(queryEmbedding)
            ) {
                throw new Error(
                    'Invalid query embedding returned by EmbeddingService.'
                );
            }

            if (queryEmbedding.length === 0) {

                throw new Error(
                    'Query embedding is empty.'
                );

            }

            console.log(
                '[RAG] Query embedding generated. Dimensions:',
                queryEmbedding.length
            );

            // Search LanceDB.
            const results = await this.vectorStore.search(
                queryEmbedding,
                5
            );

            console.log(
                '[RAG] Search completed. Results:',
                results.length
            );

            // Display metadata, not entire source code.
            console.log(
                '[RAG] Search Results:',
                results.map(result => ({
                    file: result.filePath,
                    score: result._distance
                }))
            );

            return results;

        } catch (error) {

            console.error(
                '[RAG RETRIEVAL ERROR]',
                error
            );

            return [];

        }

    }

    // ==========================================
    // BUILD CONTEXT FOR LLM
    // ==========================================

    async buildContext(query) {

        console.log('[RAG] Building context...');

        const results = await this.retrieve(query);

        if (!results.length) {

            console.log(
                '[RAG] No relevant documents found.'
            );

            return '';

        }

        let context = '';

        for (const result of results) {

            const filePath =
                result.filePath || 'Unknown file';

            const content =
                result.content || '';

            const section = `
FILE: ${filePath}

CONTENT:
${content}

----------------------------------------
`;

            // Avoid sending excessively large context to the LLM.
            if (
                context.length + section.length >
                this.maxContextLength
            ) {
                break;
            }

            context += section;

        }

        console.log(
            '[RAG] Context built successfully.',
            {
                retrievedChunks: results.length,
                contextCharacters: context.length
            }
        );

        return context;

    }

    // ==========================================
    // CHECK INITIALIZATION STATUS
    // ==========================================

    isReady() {

        return this.initialized;

    }

}

module.exports = RagService;
