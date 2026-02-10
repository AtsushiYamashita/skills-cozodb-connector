---
name: cozodb-connector
description: |
  AI Agent向けCozoDB統合スペシャリスト。Node.jsサーバー（cozo-node: Memory/SQLite/RocksDB
  バックエンド）またはブラウザPWA（cozo-lib-wasm: インメモリ）でのCozoDBセットアップ時に使用。
  Datalogクエリパターン、導入手順、ストレージバックエンド選定、永続化戦略を提供。

  トリガー条件: CozoDBの導入、Datalogクエリ、AIエージェント用グラフDB、
  CozoDBのベクトル検索、JavaScript/Node.js/ブラウザからのCozoDB接続に関する質問。
---

# CozoDB Connector Skill

CozoDBは、Datalogクエリを使用するトランザクショナルな関係-グラフ-ベクトルデータベースです。
AI Agentの「海馬」（長期記憶）として機能し、構造化データ、グラフトラバーサル、ベクトル検索を
単一の組み込み可能エンジンで統合します。

## クイックスタート

### Node.js（永続化推奨）

```javascript
const { CozoDb } = require("cozo-node");

// Memoryバックエンド（非永続、最速）
const memDb = new CozoDb();

// SQLiteバックエンド（永続、ポータブル）
const sqliteDb = new CozoDb("sqlite", "./data.db");

// RocksDBバックエンド（永続、高性能）
const rocksDb = new CozoDb("rocksdb", "./rocksdb-data");

// Datalogクエリ実行
const result = await db.run(`?[greeting] <- [['Hello CozoDB!']]`);
console.log(result.rows); // [['Hello CozoDB!']]
```

### ブラウザ WASM

```javascript
import init, { CozoDb } from "cozo-lib-wasm";
await init();
const db = CozoDb.new();
const result = JSON.parse(db.run("?[a] <- [[1]]"));
```

> **注意**: ブラウザWASMはインメモリのみ。ページリロードでデータ消失。
> IndexedDB永続化パターンは [browser-wasm-setup.md](references/browser-wasm-setup.md) 参照。

## ストレージバックエンド選択

| バックエンド | 永続化 | 最適な用途           | 導入方法             |
| ------------ | ------ | -------------------- | -------------------- |
| **Memory**   | ❌     | テスト、一時作業     | デフォルト           |
| **SQLite**   | ✅     | 可搬性、バックアップ | 組み込み             |
| **RocksDB**  | ✅     | 本番サーバー         | Rustツールチェーン要 |
| **WASM**     | ❌     | クライアント側デモ   | npm/CDN              |

## Datalogクエリパターン

### スキーマ定義

```datalog
:create users {
    id: Int
    =>
    name: String,
    email: String,
    age: Int default 0
}
```

`=>` より前がキー（複合主キー）、後が値。

### CRUD操作

```datalog
# 挿入 / 更新（Put）
?[id, name, email, age] <- [[1, 'Alice', 'alice@example.com', 30]]
:put users {id => name, email, age}

# フィルタ付きクエリ
?[name] := *users{name, age}, age > 25

# 削除
?[id, name, email] <- [[1, 'Alice Smith', 'alice@example.com']]
:rm users {id, name, email}
```

### JOINとグラフトラバーサル

```datalog
# JOIN: 共有変数 'user_id' がリレーションを接続
?[user_name, order_total] :=
    *users{id: user_id, name: user_name},
    *orders{user_id, total: order_total}

# 再帰: ノード1から到達可能な全ノードを探索
reachable[to] := *follows{from: 1, to}
reachable[to] := reachable[mid], *follows{from: mid, to}
?[name] := reachable[id], *users{id, name}
```

### パラメータ

```javascript
await db.run(`?[name] := *users{name, department}, department == $dept`, {
  dept: "Engineering",
});
```

## システムコマンド

```datalog
::relations           # 全リレーション一覧
::columns users       # リレーションスキーマ表示
::explain <query>     # クエリ実行計画
```

## 参照資料

詳細は以下を参照:

- [references/datalog-syntax.md](references/datalog-syntax.md) — Datalogクエリ完全リファレンス（HNSW、集計、組み込み関数）
- [references/nodejs-setup.md](references/nodejs-setup.md) — Node.js導入とバックエンド設定
- [references/browser-wasm-setup.md](references/browser-wasm-setup.md) — ブラウザWASM + IndexedDB永続化
- [references/storage-engines.md](references/storage-engines.md) — バックエンド比較とチューニング
- [references/edge-cases.md](references/edge-cases.md) — 既知の問題と回避策
- [references/lessons-learned.md](references/lessons-learned.md) — 開発失敗記録と教訓

## 使用例

動作する例は `examples/` に収録:

- `nodejs-spike/` — Node.js: Memory, SQLite, RocksDBバックエンド
- `browser-spike/` — ブラウザWASM + IndexedDB永続化PoC
- `journeys/` — エンドツーエンド統合パターン（REST API、マルチテナント、同期）
