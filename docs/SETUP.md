# Complete Setup Guide

For full AI Agent integration with CozoDB, install both the **Skill** (knowledge) and **MCP Server** (connection).

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  AI Agent (Claude / Gemini)                             │
├─────────────────────────┬───────────────────────────────┤
│  Skill (Knowledge)      │  MCP Server (Connection)      │
│  ├─ SKILL.md            │  ├─ cozo_query               │
│  ├─ references/         │  ├─ cozo_list_relations      │
│  │  ├─ datalog-syntax   │  ├─ cozo_describe_relation   │
│  │  └─ storage-engines  │  ├─ cozo_create_relation     │
│  └─ scripts/            │  ├─ cozo_put / cozo_remove   │
│                         │  └─ cozo_drop_relation       │
└─────────────────────────┴───────────────────────────────┘
                          ▼
                   ┌──────────────┐
                   │   CozoDB     │
                   └──────────────┘
```

## Step 1: Install the Skill

```bash
cd ~/.gemini/antigravity/skills  # or your skills path
git clone https://github.com/AtsushiYamashita/skills-cozodb-connector.git cozodb
```

## Step 2: Install the MCP Server

```bash
git clone https://github.com/AtsushiYamashita/mcp-cozodb.git
cd mcp-cozodb
npm install && npm run build
```

## Step 3: Configure Your AI Agent

### Claude Desktop

Edit `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cozodb": {
      "command": "node",
      "args": ["/path/to/mcp-cozodb/dist/index.js"],
      "env": {
        "COZO_ENGINE": "sqlite",
        "COZO_PATH": "./my-database.db"
      }
    }
  }
}
```

### Gemini CLI

Edit MCP config:

```json
{
  "cozodb": {
    "command": "node",
    "args": ["D:/project/mcp-cozodb/dist/index.js"],
    "env": { "COZO_ENGINE": "mem" }
  }
}
```

## Step 4: Verify

Ask your AI agent:

> "List all CozoDB relations"

The agent should use `cozo_list_relations` from the MCP server.

## Alternative Skill Installation Methods

### Symlink (Multi-Project)

```bash
# Clone to shared location
git clone https://github.com/AtsushiYamashita/skills-cozodb-connector.git ~/packages/skills/cozodb

# Symlink
ln -s ~/packages/skills/cozodb ~/.gemini/antigravity/skills/cozodb
```

### Git Submodule (Teams)

```bash
git submodule add https://github.com/AtsushiYamashita/skills-cozodb-connector.git .agent/skills/cozodb
```
