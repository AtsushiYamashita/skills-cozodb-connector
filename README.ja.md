# CozoDB Connector Skill

CozoDB統合のためのAI Agentスキル - グラフクエリ機能を持つDatalogデータベース

[English](README.md) | [セットアップガイド](docs/SETUP.ja.md)

## クイックスタート

```bash
# 1. Skillをインストール
cd ~/.gemini/antigravity/skills
git clone https://github.com/AtsushiYamashita/skills-cozodb-connector.git cozodb

# 2. MCPサーバーをインストール
git clone https://github.com/AtsushiYamashita/mcp-cozodb.git
cd mcp-cozodb && npm install && npm run build

# 3. エージェント設定 (docs/SETUP.ja.md参照)
```

## 提供内容

| コンポーネント                  | 目的                                      |
| ------------------------------- | ----------------------------------------- |
| **Skill** (`SKILL.md`)          | Datalog構文、パターン、ベストプラクティス |
| **MCPサーバー** (`mcp-cozodb/`) | 7つのDBツール (query, CRUD, schema)       |
| **スクリプト**                  | メモリ監視、同期ヘルパー、エラーハンドラ  |

## スコープ

### ✅ できること

- 小〜中規模アプリの組み込みDB
- グラフクエリ、再帰的Datalog
- オフラインPWA、マルチテナント分離
- 全文検索、ベクトルインデックス

### ⚠️ 制限事項

- **WASMデータは揮発性** - `sync-helper.js`を使用
- Datalogのみ（SQLなし）
- シングルプロセスのみ

### ❌ 不向き

- 高並行書き込み → PostgreSQL使用
- 大規模データ (>GB) → 専用DB使用

## コード例

### Node.js

```javascript
const { CozoDb } = require("cozo-node");
const db = new CozoDb("sqlite", "./data.db");
const result = await db.run(`?[x, y] <- [[1, 'hello'], [2, 'world']]`);
```

### ブラウザ (WASM)

```javascript
import init, { CozoDb } from "cozo-lib-wasm";
await init();
const db = CozoDb.new();
db.run(`?[x] <- [[1], [2]]`, "{}"); // 注: 第2引数必須
```

## ドキュメント

| ファイル                                           | 説明                                 |
| -------------------------------------------------- | ------------------------------------ |
| [SKILL.md](SKILL.md)                               | AIエージェント向けエントリーポイント |
| [docs/SETUP.ja.md](docs/SETUP.ja.md)               | 完全インストールガイド               |
| [references/](references/)                         | Datalog構文、ストレージエンジン      |
| [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) | セキュリティガイドライン             |

## スクリプト

| スクリプト                  | 目的                            |
| --------------------------- | ------------------------------- |
| `scripts/cozo-wrapper.js`   | 関数型ラッパー + マルチテナント |
| `scripts/memory-monitor.js` | WASMメモリ追跡                  |
| `scripts/sync-helper.js`    | 双方向同期                      |

## ライセンス

MIT
