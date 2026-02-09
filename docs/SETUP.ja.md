# 完全セットアップガイド

AI AgentでCozoDBを完全に活用するには、**Skill**（知識）と**MCPサーバー**（接続）の両方をインストールします。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│  AI Agent (Claude / Gemini)                             │
├─────────────────────────┬───────────────────────────────┤
│  Skill (知識)           │  MCPサーバー (接続)           │
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

## Step 1: Skillをインストール

```bash
cd ~/.gemini/antigravity/skills  # またはskillsパス
git clone https://github.com/AtsushiYamashita/skills-cozodb-connector.git cozodb
```

## Step 2: MCPサーバーをインストール

```bash
git clone https://github.com/AtsushiYamashita/mcp-cozodb.git
cd mcp-cozodb
npm install && npm run build
```

## Step 3: AIエージェントを設定

### Claude Desktop

`claude_desktop_config.json`を編集:

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

MCP設定を編集:

```json
{
  "cozodb": {
    "command": "node",
    "args": ["D:/project/mcp-cozodb/dist/index.js"],
    "env": { "COZO_ENGINE": "mem" }
  }
}
```

## Step 4: 動作確認

AIエージェントに質問:

> 「CozoDBのリレーション一覧を表示して」

MCPサーバーの `cozo_list_relations` が使用されます。

## Skillの代替インストール方法

### シンボリックリンク (複数プロジェクト)

```bash
# 共有場所にクローン
git clone https://github.com/AtsushiYamashita/skills-cozodb-connector.git ~/packages/skills/cozodb

# シンボリックリンク
ln -s ~/packages/skills/cozodb ~/.gemini/antigravity/skills/cozodb
```

### Git サブモジュール (チーム)

```bash
git submodule add https://github.com/AtsushiYamashita/skills-cozodb-connector.git .agent/skills/cozodb
```
