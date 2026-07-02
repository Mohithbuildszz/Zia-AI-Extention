'use strict';
// SEMANTIC_RAG_TEST_2026
const fs = require('fs');
const path = require('path');
const lancedb = require('@lancedb/lancedb');

const IGNORE_FILES = new Set([
    "vector.json",
    "package-lock.json"
    'node_modules',
    '.git',
    '.vscode',
    'dist',
    'build',
    'out'
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

const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

class VectorStore {

    constructor() {
        this.documents = [];
        this.db = null;
        this.table = null;
    }
async initialize(workspaceRoot) {

    this.db = await lancedb.connect(
        path.join(workspaceRoot, ".lancedb")
    );

    try {

        this.table =
            await this.db.openTable("vectors");

        console.log("[VECTOR] Opened existing table.");

    } catch {

        this.table =
    await this.db.createTable(
        "vectors",
        [
            {
                id: "",
                filePath: "",
                content: "",
                embedding: []
            }
        ]
    );

        console.log("[VECTOR] Created new table.");

    }

}
async add(filePath, embedding, content) {

    console.log("[VECTOR] Adding:", filePath);

    const record = {
        id: `${filePath}-${Date.now()}`,
        filePath,
        content,
        embedding
    };

    // Keep existing search working
    this.documents.push(record);

    // Also store in LanceDB
    await this.table.add([record]);

    console.log("[VECTOR] Stored in LanceDB");
}

    splitIntoChunks(
        text,
        chunkSize = 1200,
        overlap = 200
    ) {

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

            start += (chunkSize - overlap);

        }

        return chunks;

    }

    async processFile(
        workspaceRoot,
        fullPath,
        embeddingService
    ) {
console.log("[VECTOR] Processing:", fullPath);
        try {

            const ext =
                path.extname(fullPath)
                    .toLowerCase();

            if (
                !SUPPORTED_EXTENSIONS.has(ext)
            ) {
                return;
            }

            const stats =
                fs.statSync(fullPath);

            if (
                stats.size > MAX_FILE_SIZE
            ) {
                return;
            }

            const content =
                fs.readFileSync(
                    fullPath,
                    'utf8'
                );

            if (!content.trim()) {
                return;
            }

            const chunks =
                this.splitIntoChunks(content);

            const relativePath =
                path.relative(
                    workspaceRoot,
                    fullPath
                );
if (relativePath === "vector.json") {
    return;
} 
            for (const chunk of chunks) {

                try {

                    const embedding =
                        await embeddingService.embed(
                            chunk
                        );

                await this.add(
                    relativePath,
                     embedding,
                      chunk
                    );

                } catch (err) {

                    console.error(
                        `[VECTOR] Failed embedding ${relativePath}`,
                        err.message
                    );

                }

            }

            console.log(
                `[VECTOR] Indexed ${relativePath}`
            );

        } catch (err) {

            console.error(
                '[VECTOR]',
                err.message
            );

        }

    }

    async indexWorkspace(
        workspaceRoot,
        embeddingService,
        concurrency = 5
    ) {

        console.log(
            '[VECTOR] Starting workspace indexing...'
        );

        const files = [];

        const walk = (dir) => {

            const entries =
                fs.readdirSync(
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

                const fullPath =
                    path.join(
                        dir,
                        entry.name
                    );

                if (entry.isDirectory()) {

                    walk(fullPath);

                } else {

                    files.push(fullPath);

                }

            }

        };

        walk(workspaceRoot);

        console.log(
            `[VECTOR] Found ${files.length} files`
        );

        let index = 0;

        const workers = [];

        const worker = async () => {

            while (true) {

                const currentIndex =
                    index++;

                if (
                    currentIndex >= files.length
                ) {
                    break;
                }

                await this.processFile(
                    workspaceRoot,
                    files[currentIndex],
                    embeddingService
                );

            }

        };

        for (
            let i = 0;
            i < concurrency;
            i++
        ) {

            workers.push(
                worker()
            );

        }

await Promise.all(workers);

console.log(
    `[VECTOR] Indexed ${this.documents.length} chunks`
);
await this.save(workspaceRoot);

    }

    cosineSimilarity(a, b) {

        let dot = 0;

        let magA = 0;

        let magB = 0;

        const length =
            Math.min(
                a.length,
                b.length
            );

        for (
            let i = 0;
            i < length;
            i++
        ) {

            dot +=
                a[i] * b[i];

            magA +=
                a[i] * a[i];

            magB +=
                b[i] * b[i];

        }

        const denominator =
            Math.sqrt(magA) *
            Math.sqrt(magB);

        if (
            denominator === 0
        ) {
            return 0;
        }

        return dot / denominator;

    }

   async search(queryEmbedding, topK = 5) {

    console.log("[VECTOR] Searching LanceDB...");

    const results = await this.table
        .search(queryEmbedding)
        .limit(topK)
        .toArray();

    console.log(
        "[VECTOR] Search returned",
        results.length,
        "results"
    );

    return results;
}

async save(workspaceRoot) {

    try {

        const vectorPath =
            path.join(
                workspaceRoot,
                "vector.json"
            );

        fs.writeFileSync(
            vectorPath,
            JSON.stringify(
                this.documents,
                null,
                2
            ),
            "utf8"
        );

        console.log(
            "[VECTOR] vector.json saved at:",
            vectorPath
        );

    } catch (err) {

        console.error(
            "[VECTOR SAVE ERROR]",
            err
                     );

          }

    }  

}   

module.exports = VectorStore;