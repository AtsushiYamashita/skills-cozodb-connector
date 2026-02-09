# CozoDB Connector Skill

AI AgentがCozoDBを統合するためのSkill - Node.jsとブラウザPWA環境でのシームレスなデータベース接続を実現

[English Documentation](README.md)

## 概要

CozoDBはグラフクエリ機能を持つ組み込みDatalogデータベースです。本Skillは以下を提供します：

- **Node.js統合** - `cozo-node`（Memory/SQLite/RocksDBバックエンド）
- **ブラウザPWA統合** - `cozo-lib-wasm`（WebAssembly）
- **関数型パターン** - 純粋関数と依存性注入
- **マルチテナント対応** - ユーザー単位のデータベースインスタンス分離
- **i18n対応エラーハンドリング** - 構造化エラーコード

## クイックスタート

### Node.js

```bash
npm install cozo-node
```

```javascript
const { CozoDb } = require("cozo-node");

// インメモリ（デフォルト）
const db = new CozoDb();

// SQLite（永続化）
const db = new CozoDb("sqlite", "./data.db");

// クエリ実行
const result = await db.run(`?[x, y] <- [[1, 'hello'], [2, 'world']]`);
console.log(result.rows); // [[1, 'hello'], [2, 'world']]
```

### ブラウザ (PWA)

```javascript
import init, { CozoDb } from "cozo-lib-wasm";

await init();
const db = CozoDb.new();

// 重要: WASMでは第2引数が必須
const result = db.run(`?[x] <- [[1], [2], [3]]`, "{}");
console.log(JSON.parse(result));
```

## ドキュメント

| ファイル                                                             | 説明                      |
| -------------------------------------------------------------------- | ------------------------- |
| [SKILL.md](SKILL.md)                                                 | AI Agent向けメイン説明書  |
| [references/nodejs-setup.md](references/nodejs-setup.md)             | Node.jsセットアップ       |
| [references/browser-wasm-setup.md](references/browser-wasm-setup.md) | ブラウザWASMセットアップ  |
| [references/datalog-syntax.md](references/datalog-syntax.md)         | Datalogクエリリファレンス |
| [references/storage-engines.md](references/storage-engines.md)       | バックエンド比較ガイド    |
| [references/edge-cases.md](references/edge-cases.md)                 | 既知の問題と回避策        |

## サンプル

### テストランナー

```bash
# Node.js（Memoryバックエンド）
node examples/nodejs-spike/test-runner.js --backend=memory

# Node.js（SQLiteバックエンド）
node examples/nodejs-spike/test-runner.js --backend=sqlite

# ブラウザPWA
npx serve examples/browser-spike -l 3457
# http://localhost:3457/test-runner.html を開く
```

### ユーザージャーニー例

| ジャーニー          | コマンド                                          | 説明                   |
| ------------------- | ------------------------------------------------- | ---------------------- |
| 1. Node.js単独      | `node examples/journeys/journey1-node-only.js`    | REST APIパターン       |
| 2. PWA単独          | `journey2-pwa-only.html`をサーブ                  | オフラインノートアプリ |
| 3. マルチテナント   | `node examples/journeys/journey3-multi-tenant.js` | ユーザー単位DB         |
| 4. ハイブリッド同期 | `node examples/journeys/journey4-sync-server.js`  | PWA+Node同期           |

## スクリプト

| スクリプト                | 用途                                |
| ------------------------- | ----------------------------------- |
| `scripts/cozo-errors.js`  | i18nエラーコード + セキュリティ検証 |
| `scripts/cozo-wrapper.js` | 関数型ラッパー + マルチテナント管理 |

## セキュリティ

[docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md)を参照：

- クエリインジェクション対策（パラメータ化クエリを使用）
- プロトタイプ汚染対策
- DoS対策（クエリ長制限）

## ライセンス

MIT
