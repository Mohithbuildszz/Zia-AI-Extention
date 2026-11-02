
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const lancedb = require('@lancedb/lancedb');

const IGNORE_DIRS = new Set([
    'node_modules',
    '.git',
    '.vscode',
    '.lancedb',
    '@lancedb',
    'dist',
    'build',
    'out',
    'coverage',
    '.next'
]);

const IGNORE_FILES = new Set([
    'vector.json',
    'package-lock.json',
    'chatHistory.json',
    '.DS_Store'
]);

const SUPPORTED_EXTENSIONS = new Set([
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
    '.java',
    '.py',
    '.c',
    '.cpp',
    '.cs',
    '.go',
    '.rs',
    '.php',
    '.rb',
    '.html',
    '.css',
    '.scss',
    '.xml',
    '.yml',
    '.yaml',
    '.md',
    '.txt',
    '.sql',
    '.sh'
]);

const MAX_FILE_SIZE = 1024 * 1024;
const TABLE_NAME = 'vectors';

class VectorStore {

    constructor() {
        this.documents = [];
        this.db = null;
        this.table = null;

        // Prevent multiple workers from creating the table simultaneously.
        this.tableInitPromise = null;

        // Track the first record inserted during table creation.
        this.initialRecordId = null;

        this.workspaceRoot = null;
    }

    // ==========================================
    // INITIALIZE DATABASE
    // ==========================================

    async initialize(workspaceRoot) {

        if (!workspaceRoot) {
            throw new Error('Workspace root is required.');
        }

        this.workspaceRoot = workspaceRoot;

        const dbPath = path.join(
            workspaceRoot,
            '.lancedb'
        );

        this.db = await lancedb.connect(dbPath);

        try {

            this.table = await this.db.openTable(TABLE_NAME);

            console.log(
                '[VECTOR] Opened existing LanceDB table.'
            );

        } catch (error) {

            this.table = null;

            console.log(
                '[VECTOR] No existing vectors table. ' +
                'It will be created using the first real embedding.'
            );

        }

        return true;
    }

    // ==========================================
    // VALIDATE EMBEDDING
    // ==========================================

    normalizeEmbedding(embedding) {

        if (
            !Array.isArray(embedding) &&
            !ArrayBuffer.isView(embedding)
        ) {
            throw new Error(
                'Embedding must be an array of numbers.'
            );
        }

        const normalized = Array.from(embedding);

        if (
            normalized.length === 0 ||
            !normalized.every(
                value =>
                    typeof value === 'number' &&
                    Number.isFinite(value)
            )
        ) {
            throw new Error(
                'Embedding contains invalid or empty values.'
            );
        }

        return normalized;
    }

    // ==========================================
    // CREATE RECORD
    // ==========================================

    createRecord(filePath, embedding, content) {

        return {
            id: `${filePath}-${crypto.randomBytes(12).toString('hex')}`,
            filePath,
            content,
            embedding: this.normalizeEmbedding(embedding)
        };
    }

    // ==========================================
    // ENSURE TABLE EXISTS
    // ==========================================

    async ensureTable(record) {

        if (this.table) {
            return false;
        }

        if (!this.db) {
            throw new Error(
                'LanceDB is not initialized. Call initialize() first.'
            );
        }

        if (!this.tableInitPromise) {

            this.tableInitPromise = (async () => {

                try {

                    // Create table using an actual embedding.
                    // This allows LanceDB to infer the vector dimension.

                    this.table = await this.db.createTable(
                        TABLE_NAME,
                        [record]
                    );

                    this.initialRecordId = record.id;

                    console.log(
                        '[VECTOR] Created LanceDB table using real embedding.'
                    );

                } catch (createError) {

                    console.error(
                        '[VECTOR] Table creation failed:',
                        createError.message
                    );

                    // Another worker or process may have created it.
                    this.table = await this.db.openTable(TABLE_NAME);

                    console.log(
                        '[VECTOR] Opened existing vectors table.'
                    );

                }

            })().catch(error => {

                this.tableInitPromise = null;
                throw error;

            });

        }

        await this.tableInitPromise;

        // True means createTable() already inserted this record.
        return this.initialRecordId === record.id;
    }

    // ==========================================
    // ADD VECTOR TO DATABASE
    // ==========================================

    async add(filePath, embedding, content) {

        console.log(
            '[VECTOR] Adding:',
            filePath
        );

        const record = this.createRecord(
            filePath,
            embedding,
            content
        );

        const alreadyInserted = await this.ensureTable(record);

        // The first record is already inserted by createTable().
        if (!alreadyInserted) {

            await this.table.add([record]);

        }

        this.documents.push(record);

        console.log(
            '[VECTOR] Stored in LanceDB:',
            filePath
        );

        return record;
    }

    // ==========================================
    // SPLIT CONTENT INTO CHUNKS
    // ==========================================

    splitIntoChunks(
        text,
        chunkSize = 1200,
        overlap = 200
    ) {

        if (
            typeof text !== 'string' ||
            !text.length
        ) {
            return [];
        }

        if (
            chunkSize <= 0 ||
            overlap < 0 ||
            overlap >= chunkSize
        ) {
            throw new Error(
                'Invalid chunk size or overlap.'
            );
        }

        const chunks = [];

        let start = 0;

        while (start < text.length) {

            const end = Math.min(
                start + chunkSize,
                text.length
            );

            chunks.push(
                text.substring(start, end)
            );

            start += chunkSize - overlap;

        }

        return chunks;
    }

    // ==========================================
    // PROCESS INDIVIDUAL FILE
    // ==========================================

    async processFile(
        workspaceRoot,
        fullPath,
        embeddingService
    ) {

        try {

            const ext = path.extname(fullPath).toLowerCase();

            if (!SUPPORTED_EXTENSIONS.has(ext)) {
                return;
            }

            const stats = fs.statSync(fullPath);

            if (
                !stats.isFile() ||
                stats.size > MAX_FILE_SIZE
            ) {
                return;
            }

            const relativePath = path.relative(
                workspaceRoot,
                fullPath
            );

            if (
                IGNORE_FILES.has(
                    path.basename(relativePath)
                )
            ) {
                return;
            }

            const content = fs.readFileSync(
                fullPath,
                'utf8'
            );

            if (!content.trim()) {
                return;
            }

            console.log(
                '[VECTOR] Processing:',
                relativePath
            );

            const chunks = this.splitIntoChunks(content);

            for (let i = 0; i < chunks.length; i++) {

                const chunk = chunks[i];

                try {

                    // Generate embedding.
                    const embedding =
                        await embeddingService.embed(chunk);

                    // Store embedding in LanceDB.
                    await this.add(
                        relativePath,
                        embedding,
                        chunk
                    );

                } catch (error) {

                    console.error(
                        `[VECTOR] Failed embedding ${relativePath}, chunk ${i}:`,
                        error.message
                    );

                }

            }

            console.log(
                `[VECTOR] Indexed: ${relativePath}`
            );

        } catch (error) {

            console.error(
                '[VECTOR] File processing error:',
                fullPath,
                error.message
            );

        }
    }

    // ==========================================
    // INDEX ENTIRE WORKSPACE
    // ==========================================

    async indexWorkspace(
        workspaceRoot,
        embeddingService,
        concurrency = 5
    ) {

        console.log(
            '[VECTOR] Starting workspace indexing...'
        );

        if (!this.db) {
            await this.initialize(workspaceRoot);
        }

        if (
            !embeddingService ||
            typeof embeddingService.embed !== 'function'
        ) {
            throw new Error(
                'A valid embedding service is required.'
            );
        }

        const files = [];

        // Recursively collect project files.
        const walk = (dir) => {

            const entries = fs.readdirSync(
                dir,
                { withFileTypes: true }
            );

            for (const entry of entries) {

                if (
                    entry.isDirectory() &&
                    IGNORE_DIRS.has(entry.name)
                ) {
                    continue;
                }

                const fullPath = path.join(
                    dir,
                    entry.name
                );

                if (entry.isDirectory()) {

                    walk(fullPath);

                } else if (entry.isFile()) {

                    files.push(fullPath);

                }

            }

        };

        walk(workspaceRoot);

        console.log(
            `[VECTOR] Found ${files.length} files.`
        );

        let index = 0;

        const workers = [];

        const worker = async () => {

            while (true) {

                const currentIndex = index++;

                if (currentIndex >= files.length) {
                    break;
                }

                await this.processFile(
                    workspaceRoot,
                    files[currentIndex],
                    embeddingService
                );

            }

        };

        const workerCount = Math.max(
            1,
            Math.min(
                Math.floor(concurrency) || 1,
                10
            )
        );

        for (
            let i = 0;
            i < workerCount;
            i++
        ) {

            workers.push(worker());

        }

        await Promise.all(workers);

        console.log(
            `[VECTOR] Indexed ${this.documents.length} chunks.`
        );

        console.log(
            '[VECTOR] Workspace indexing completed.'
        );

    }

    // ==========================================
    // COSINE SIMILARITY
    // ==========================================

    cosineSimilarity(a, b) {

        if (
            !Array.isArray(a) ||
            !Array.isArray(b) ||
            a.length !== b.length ||
            a.length === 0
        ) {
            return 0;
        }

        let dot = 0;
        let magA = 0;
        let magB = 0;

        for (let i = 0; i < a.length; i++) {

            dot += a[i] * b[i];

            magA += a[i] * a[i];

            magB += b[i] * b[i];

        }

        const denominator =
            Math.sqrt(magA) *
            Math.sqrt(magB);

        if (denominator === 0) {
            return 0;
        }

        return dot / denominator;
    }

    // ==========================================
    // SEMANTIC SEARCH
    // ==========================================

    async search(queryEmbedding, topK = 5) {

        console.log(
            '[VECTOR] Searching LanceDB...'
        );

        if (!this.table) {

            console.warn(
                '[VECTOR] Search skipped: vectors table does not exist.'
            );

            return [];
        }

        const normalizedQuery = this.normalizeEmbedding(
            queryEmbedding
        );

        const limit = Math.max(
            1,
            Math.floor(topK) || 5
        );

        const results = await this.table
            .search(normalizedQuery)
            .limit(limit)
            .toArray();

        console.log(
            '[VECTOR] Search returned',
            results.length,
            'results.'
        );

        return results;
    }

    // ==========================================
    // GET DOCUMENT COUNT
    // ==========================================

    getDocumentCount() {

        return this.documents.length;

    }

}

module.exports = VectorStore;
