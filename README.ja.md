# CozoDB Connector Skill

AI AgentがCozoDBを統合するためのSkill - Node.jsとブラウザPWA環境でのシームレスなデータベース接続を実現

[English Documentation](README.md)

---

## このSkillの使い方

本リポジトリは**AI Agent Skill**です。AIエージェントのCozoDBデータベース操作能力を拡張するモジュラーパッケージです。

### インストール方法

#### 方法1: 直接クローン（開発時推奨）

AIエージェントのskillsディレクトリに直接クローン:

```bash
# Gemini CLI / Claude Desktop の場合
cd ~/.gemini/antigravity/skills  # またはエージェントのskillsパス
git clone https://github.com/your-org/skills-cozodb-connector.git cozodb
```

エージェントは `SKILL.md` を通じてスキルを認識します。

#### 方法2: シンボリックリンク（複数プロジェクト推奨）

スキルを共有場所に置き、各プロジェクトにシンボリックリンク:

```bash
# 共有場所にクローン
cd ~/packages/skills
git clone https://github.com/your-org/skills-cozodb-connector.git

# 各プロジェクトのskillsディレクトリにリンク
cd ~/.gemini/antigravity/skills
ln -s ~/packages/skills/skills-cozodb-connector cozodb

# Windows（管理者権限のPowerShell）
New-Item -ItemType SymbolicLink -Path "cozodb" -Target "C:\packages\skills\skills-cozodb-connector"
```

**メリット**: 単一ソース、全プロジェクトで簡単に更新
**デメリット**: シンボリックリンク管理、Windowsでのパス問題

#### 方法3: Git サブモジュール（チーム推奨）

プロジェクトにサブモジュールとして追加:

```bash
cd your-project
git submodule add https://github.com/your-org/skills-cozodb-connector.git .agent/skills/cozodb
```

**メリット**: バージョン固定、再現可能なビルド
**デメリット**: サブモジュールの複雑さ

#### 方法4: npm パッケージ（実験的）

```bash
npm install @your-org/cozodb-skill --save-dev
# node_modules/@your-org/cozodb-skill を skills にシンボリックリンク
```

### ディレクトリ構成

インストール後、エージェントは以下を認識:

```
skills/
└── cozodb/
    ├── SKILL.md           # エントリーポイント（エージェントが最初に読む）
    ├── references/        # オンデマンドでロード
    │   ├── datalog-syntax.md
    │   ├── storage-engines.md
    │   └── ...
    └── scripts/           # 実行可能ヘルパー
        ├── cozo-wrapper.js
        ├── memory-monitor.js
        └── sync-helper.js
```

### スキルのトリガー

以下のような質問でスキルが発動:

- 「Node.jsプロジェクトでCozoDBをセットアップして」
- 「オフラインデータベース付きのPWAを作って」
- 「〜を検索するDatalogクエリを書いて」
- 「CozoDB WASMの使い方を教えて」

### プロジェクト向けカスタマイズ

1. **このリポジトリをフォーク**してプロジェクト固有の変更
2. **SKILL.mdを編集**してスキーマ定義を追加
3. **references/**にドメイン固有のDatalogパターンを追加

---

## 概要

CozoDBはグラフクエリ機能を持つ組み込みDatalogデータベースです。本Skillは以下を提供します：

- **Node.js統合** - `cozo-node`（Memory/SQLite/RocksDBバックエンド）
- **ブラウザPWA統合** - `cozo-lib-wasm`（WebAssembly）
- **関数型パターン** - 純粋関数と依存性注入
- **マルチテナント対応** - ユーザー単位のデータベースインスタンス分離
- **i18n対応エラーハンドリング** - 構造化エラーコード

## スコープ

### ⚠️ 重要: WASM揮発性

> **Browser WASMのデータは揮発性です。ページ更新でデータが消失します。**
> 必ず `sync-helper.js` を使用してサーバーに同期してください。

### ✅ できること

- 小〜中規模アプリの組み込みDB（シングルプロセス）
- グラフクエリと再帰的Datalog操作
- オフラインファーストPWAのローカルデータ保存
- マルチテナント分離（ユーザー単位の別DB）
- 全文検索とHNSWベクトルインデックス
- **メモリ使用量監視とサーバーオフロード** (NEW)
- **双方向データ同期** (NEW)

### ❌ できないこと

- 複数サーバー間の分散トランザクション
- クライアント間リアルタイム同期（WebSocket等が別途必要）
- 直接SQL実行（Datalogのみ）

### ⚠️ 向かないケース

- 同時書き込みが多いワークロード → PostgreSQL/MySQLを使用
- 数GB以上のデータ → 専用DBサーバーを使用
- ネットワーク境界を越えたACIDが必要な場合
- Datalog未経験で素早い導入が必要なチーム

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

| スクリプト                  | 用途                                                     |
| --------------------------- | -------------------------------------------------------- |
| `scripts/cozo-errors.js`    | i18nエラーコード + セキュリティ検証                      |
| `scripts/cozo-wrapper.js`   | 関数型ラッパー + マルチテナント管理                      |
| `scripts/memory-monitor.js` | メモリ監視 + オーバーフロー検知 + オフロードコールバック |
| `scripts/sync-helper.js`    | 双方向同期 + 自動同期（blur/beforeunload対応）           |

## セキュリティ

[docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md)を参照：

- クエリインジェクション対策（パラメータ化クエリを使用）
- プロトタイプ汚染対策
- DoS対策（クエリ長制限）

## ライセンス

MIT
