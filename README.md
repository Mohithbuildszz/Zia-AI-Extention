#  Zia AI - Intelligent Coding Assistant for VS Code

> An AI-powered coding assistant built as a VS Code extension that brings local LLMs, Retrieval-Augmented Generation (RAG), semantic code search, and intelligent tool execution directly into the editor.

![VS Code](https://img.shields.io/badge/VS%20Code-Extension-blue)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![JavaScript](https://img.shields.io/badge/Language-JavaScript-yellow)
![Ollama](https://img.shields.io/badge/LLM-Ollama-orange)
![LanceDB](https://img.shields.io/badge/VectorDB-LanceDB-red)

---

# 📌 Overview

Zia AI is an intelligent coding assistant designed to work completely inside Visual Studio Code.

Instead of simply chatting with an LLM, Zia AI understands your entire workspace using Retrieval-Augmented Generation (RAG), semantic embeddings, and tool execution.

The assistant can:

- 📂 Understand your codebase
- 🔍 Perform semantic code search
- 🧠 Answer questions using project context
- ✍️ Create new files
- 🔄 Modify existing files
- 📖 Read multiple source files
- 🌳 Analyze project structure
- 💻 Execute terminal commands
- ⚡ Work completely with local LLMs through Ollama

---

# ✨ Features

## 🤖 AI Chat

- Interactive AI assistant inside VS Code
- Streaming responses
- Conversation history
- Markdown rendering
- Thinking tokens support

---

## 📂 Workspace Awareness (RAG)

Zia AI understands your workspace before answering.

Pipeline:

Workspace
→ Read Files
→ Chunk Documents
→ Generate Embeddings
→ Store in LanceDB
→ Semantic Retrieval
→ Build Context
→ LLM Response

Instead of answering only from model knowledge, the assistant retrieves relevant project files and injects them into the prompt.

---

## 🔎 Semantic Code Search

Uses vector embeddings instead of keyword matching.

Example:

```
Find authentication logic
```

```
Explain how VectorStore works
```

```
Where is JWT verification implemented?
```

---

## 🧠 Retrieval-Augmented Generation

Implemented from scratch.

Workflow:

1. Read supported files
2. Ignore generated files
3. Split files into chunks
4. Generate embeddings
5. Store vectors
6. Retrieve relevant chunks
7. Build contextual prompt
8. Send to LLM

---

## 🗂 LanceDB Vector Storage

Embeddings are stored inside LanceDB.

Stored metadata:

- File Path
- Chunk Content
- Embedding Vector
- Unique ID

Benefits:

- Persistent vector storage
- Fast similarity search
- Workspace-level indexing
- Local database

---

## 📖 Read Files Tool

Reads one or multiple project files.

Example:

```
Explain package.json
```

```
Read extension.js
```

---

## 🌳 File Tree Tool

Generates the complete workspace hierarchy.

Useful for:

- Project explanation
- Architecture understanding
- Navigation

---

## 🔍 Semantic Search Tool

Searches code using natural language.

Unlike grep or keyword search, it retrieves semantically similar code.

---

## ✍️ Write File Tool

Creates or updates workspace files.

Example:

```
Create Express server
```

```
Generate README
```

```
Create Dockerfile
```

---

## 🔄 Search & Replace Tool

AST-aware search and replacement.

Supports:

- Variable rename
- Function rename
- Project-wide replacement
- Safer refactoring

---

## 💻 Run Command Tool

Executes terminal commands directly from the assistant.

Example:

```
npm install
```

```
npm test
```

```
git status
```

---

# 🧠 RAG Architecture

```
                    User Question
                          │
                          ▼
                Embedding Generation
                          │
                          ▼
                 Semantic Retrieval
                          │
                          ▼
                   LanceDB Search
                          │
                          ▼
                 Relevant Code Chunks
                          │
                          ▼
                 Context Construction
                          │
                          ▼
                 Ollama Local LLM
                          │
                          ▼
                    AI Response
```

---

# 📦 Project Structure

```
Zia
│
├── providers
│   └── ChatViewProvider.js
│
├── services
│   ├── agentService.js
│   ├── EmbeddingService.js
│   ├── VectorStore.js
│   ├── ollamaService.js
│   ├── fileService.js
│   └── chatHistoryService.js
│
├── RaG
│   └── ragService.js
│
├── tools
│   ├── readFiles.js
│   ├── fileTree.js
│   ├── semanticSearch.js
│   ├── writeFile.js
│   ├── runCommand.js
│   └── searchAndReplace.js
│
└── extension.js
```

---

# ⚙️ Technologies Used

| Category | Technology |
|-----------|------------|
| Extension | VS Code API |
| Language | JavaScript |
| Runtime | Node.js |
| LLM | Ollama |
| Models | Qwen 3.5, Nomic Embed |
| Vector Database | LanceDB |
| Parser | Tree-sitter |
| Markdown | Marked.js |

---

# 🚀 How It Works

## Step 1

User asks a question.

```
Explain VectorStore.js
```

---

## Step 2

Relevant project chunks are retrieved from LanceDB.

---

## Step 3

Retrieved context is injected into the system prompt.

---

## Step 4

Ollama generates an answer using project-specific context.

---

## Step 5

The response streams directly inside VS Code.

---

# 📈 Performance Optimizations

✔ Concurrent workspace indexing

✔ Chunk-based embeddings

✔ File size filtering

✔ Supported extension filtering

✔ Ignored generated files

✔ Persistent vector database

✔ Streaming AI responses

---

# 🔒 Runs Completely Locally

No cloud APIs are required.

Everything runs locally:

- Ollama
- LanceDB
- Embedding generation
- Retrieval
- Tool execution

Your code never leaves your machine.

---

# 🎯 Future Enhancements

- Multi-workspace indexing
- Incremental indexing
- File change watchers
- Hybrid search
- Code generation benchmarking
- Multi-model support
- Conversation memory
- Automatic re-indexing

---

# 👨‍💻 Developed By

**Mohith Kumar S**

B.Tech Information Technology

Zoho Summer Intern — AI Coding Assistant Project

GitHub: https://github.com/mohith182
