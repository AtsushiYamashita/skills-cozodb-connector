# CozoDB Connector Skill

AI Agent Skill for CozoDB integration - enabling seamless database connections in Node.js and Browser PWA environments.

[日本語ドキュメント](README.ja.md)

---

## How to Use This Skill

This repository is an **AI Agent Skill** - a modular package that extends your AI agent's capabilities for CozoDB database operations.

### Installation Options

#### Option 1: Direct Clone (Recommended for Development)

Clone directly into your AI agent's skills directory:

```bash
# For Gemini CLI / Claude Desktop
cd ~/.gemini/antigravity/skills  # or your agent's skills path
git clone https://github.com/your-org/skills-cozodb-connector.git cozodb
```

Your agent will now recognize the skill via `SKILL.md`.

#### Option 2: Symlink to Shared Package (Recommended for Multi-Project)

Keep skill in a central location and symlink to projects:

```bash
# Clone to shared location
cd ~/packages/skills
git clone https://github.com/your-org/skills-cozodb-connector.git

# Symlink to each project's skills directory
cd ~/.gemini/antigravity/skills
ln -s ~/packages/skills/skills-cozodb-connector cozodb

# Or for Windows (PowerShell as Admin)
New-Item -ItemType SymbolicLink -Path "cozodb" -Target "C:\packages\skills\skills-cozodb-connector"
```

**Pros**: Single source of truth, easy updates across projects
**Cons**: Symlink management, potential path issues on Windows

#### Option 3: Git Submodule (Recommended for Teams)

Add as a submodule in your project:

```bash
cd your-project
git submodule add https://github.com/your-org/skills-cozodb-connector.git .agent/skills/cozodb
```

**Pros**: Version-pinned, reproducible builds
**Cons**: Submodule complexity

#### Option 4: npm Package (Experimental)

```bash
npm install @your-org/cozodb-skill --save-dev
# Then symlink node_modules/@your-org/cozodb-skill to skills directory
```

### Directory Structure

After installation, your agent sees:

```
skills/
└── cozodb/
    ├── SKILL.md           # Entry point (agent reads this first)
    ├── references/        # Loaded on-demand by agent
    │   ├── datalog-syntax.md
    │   ├── storage-engines.md
    │   └── ...
    └── scripts/           # Executable helpers
        ├── cozo-wrapper.js
        ├── memory-monitor.js
        └── sync-helper.js
```

### Triggering the Skill

The skill activates when you ask your AI agent about:

- "Set up CozoDB in my Node.js project"
- "Create a PWA with offline database"
- "Write a Datalog query to find..."
- "Help me with CozoDB WASM"

### Customizing for Your Project

1. **Fork this repo** for project-specific modifications
2. **Edit SKILL.md** to add your schema definitions
3. **Add references/** for your domain-specific Datalog patterns

---

## Overview

CozoDB is an embedded Datalog database with graph query capabilities. This skill provides:

- **Node.js integration** via `cozo-node` (Memory/SQLite/RocksDB backends)
- **Browser PWA integration** via `cozo-lib-wasm` (WebAssembly)
- **Functional patterns** with pure functions and dependency injection
- **Multi-tenant support** with user-specific database instances
- **i18n-ready error handling** with structured error codes

## Scope

### ⚠️ Critical: WASM Volatility

> **Browser WASM data is VOLATILE. Data is lost on page refresh.**
> Always use `sync-helper.js` to sync data to your server.

### ✅ Can Do

- Embedded database for small-to-medium apps (single process)
- Graph queries and recursive Datalog operations
- Offline-first PWA with local data storage
- Multi-tenant isolation (separate DB per user)
- Full-text search and HNSW vector indexes
- **Memory usage monitoring with server offload** (NEW)
- **Bidirectional data sync** (NEW)

### ❌ Cannot Do

- Distributed transactions across multiple servers
- Real-time sync between clients (requires WebSocket etc.)
- Direct SQL queries (Datalog only)

### ⚠️ Not Suitable For

- High-concurrency write-heavy workloads (use PostgreSQL/MySQL)
- Data larger than a few GB (use dedicated database servers)
- Applications requiring ACID across network boundaries
- Teams unfamiliar with Datalog who need quick adoption

## Quick Start

### Node.js

```bash
npm install cozo-node
```

```javascript
const { CozoDb } = require("cozo-node");

// In-memory (default)
const db = new CozoDb();

// SQLite (persistent)
const db = new CozoDb("sqlite", "./data.db");

// Query
const result = await db.run(`?[x, y] <- [[1, 'hello'], [2, 'world']]`);
console.log(result.rows); // [[1, 'hello'], [2, 'world']]
```

### Browser (PWA)

```javascript
import init, { CozoDb } from "cozo-lib-wasm";

await init();
const db = CozoDb.new();

// IMPORTANT: Second parameter required for WASM
const result = db.run(`?[x] <- [[1], [2], [3]]`, "{}");
console.log(JSON.parse(result));
```

## Documentation

| File                                                                 | Description                           |
| -------------------------------------------------------------------- | ------------------------------------- |
| [SKILL.md](SKILL.md)                                                 | Main skill instructions for AI agents |
| [references/nodejs-setup.md](references/nodejs-setup.md)             | Node.js installation & configuration  |
| [references/browser-wasm-setup.md](references/browser-wasm-setup.md) | Browser WASM setup                    |
| [references/datalog-syntax.md](references/datalog-syntax.md)         | Datalog query reference               |
| [references/storage-engines.md](references/storage-engines.md)       | Backend comparison guide              |
| [references/edge-cases.md](references/edge-cases.md)                 | Known issues & workarounds            |

## Examples

### Test Runners

```bash
# Node.js (Memory backend)
node examples/nodejs-spike/test-runner.js --backend=memory

# Node.js (SQLite backend)
node examples/nodejs-spike/test-runner.js --backend=sqlite

# Browser PWA
npx serve examples/browser-spike -l 3457
# Open http://localhost:3457/test-runner.html
```

### User Journey Examples

| Journey         | Command                                           | Description        |
| --------------- | ------------------------------------------------- | ------------------ |
| 1. Node.js only | `node examples/journeys/journey1-node-only.js`    | REST API pattern   |
| 2. PWA only     | Serve `journey2-pwa-only.html`                    | Offline notes app  |
| 3. Multi-tenant | `node examples/journeys/journey3-multi-tenant.js` | Per-user databases |
| 4. Hybrid sync  | `node examples/journeys/journey4-sync-server.js`  | PWA + Node sync    |

## Scripts

| Script                      | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `scripts/cozo-errors.js`    | i18n error codes + security validation             |
| `scripts/cozo-wrapper.js`   | Functional wrapper + multi-tenant manager          |
| `scripts/memory-monitor.js` | Memory tracking + overflow detection + offload     |
| `scripts/sync-helper.js`    | Bidirectional sync + auto-sync (blur/beforeunload) |

## Security

See [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) for:

- Query injection prevention (use parameterized queries)
- Prototype pollution protection
- DoS mitigation (query length limits)

## License

MIT
