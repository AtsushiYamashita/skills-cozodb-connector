# Lessons Learned — CozoDB Connector Skill 開発記録

このドキュメントは、CozoDB Connector Skill開発で遭遇した**実際の失敗・試行錯誤**を記録しています。
同じ轍を踏まないための実践的な教訓集です。

---

## 1. CommonJS / ESM モジュール混在（致命的バグ）

### 何が起きたか

4つのスクリプトすべてで、`module.exports`（CommonJS）と `export {}`（ESM）を
**同一ファイル内に混在**させていた。

```javascript
// ファイル末尾にこの3パターンが全て存在していた
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ... };       // ← CommonJS
}
if (typeof window !== 'undefined') {
    window.CozoWrapper = { ... };   // ← ブラウザ
}
export { ... };                     // ← ESM（これが問題）
```

### なぜ壊れるか

`package.json` に `"type": "commonjs"` が設定されている環境で、
bare `export` 文はNode.jsのパーサーが**構文エラー**として即座に拒否する。
条件分岐で囲んでも回避不可能 — `export` はモジュールレベルの静的構文。

### 教訓

- **1ファイル1モジュール形式**: CommonJSなら`module.exports`のみ、ESMなら`export`のみ
- ユニバーサル対応が必要な場合は `module.exports` + `window.*` の2パターンで十分
- **テストがなければ検出できない**: この問題はテスト追加時に初めて発覚した

---

## 2. `__proto__` プロパティの罠（テスト偽陽性）

### 何が起きたか

SecurityValidatorの `validateParams` は `Object.keys()` でキー名をチェックし、
`__proto__`・`constructor`・`prototype` を検出する設計だった。

テストで以下を書いたが、**常にパスしてしまう**（検出できない）：

```javascript
// テスト: __proto__ を検出できるか？
SecurityValidator.validateParams({ __proto__: {} });
// → 期待: CozoError がスロー
// → 実際: 何も起きない（テスト失敗）
```

### なぜか

JavaScript エンジンは `{ '__proto__': {} }` をオブジェクトリテラルとして評価するとき、
`__proto__` を **プロトタイプセッター** として処理する。
通常のプロパティにはならず、`Object.keys()` に現れない。

### 解決策

`JSON.parse()` 経由で生成すると、`__proto__` が通常のenumerableプロパティになる：

```javascript
const malicious = JSON.parse('{"__proto__":{"polluted":true}}');
Object.keys(malicious); // → ['__proto__']  ← 検出可能
```

### 教訓

- **攻撃ペイロードは `JSON.parse()`経由で来る**: テストも同じ経路で入力を構築すべき
- オブジェクトリテラルの `__proto__` はJSの特殊構文であり、実際の攻撃経路とは異なる

---

## 3. Memory Monitor の閾値スキップ

### 何が起きたか

Memory MonitorはWarning(80%)→Critical(95%)の2段階コールバックを持つ。
テストで「Warning閾値を低く設定すればWarningが発火する」と考え：

```javascript
const monitor = createMemoryMonitor(db, {
  maxBytes: 100, // 100バイト上限
  warningThreshold: 0.1, // 10%（= 10バイト）でWarning
  onWarning: () => {
    warningFired = true;
  },
});
await monitor.run('?[id, data] <- [[1, "large data"]] :put test {id => data}');
// → warningFired は false のまま
```

### なぜか

書き込みデータが小さな `maxBytes` に対して大きすぎるため、
使用率が一気に **Warning（10%）もCritical（95%）も超えてしまう**。

コード側の `getMemoryStatus()` は `critical` を先にチェックするため、
ステータスは `ok → critical` に直行し、`warning` コールバックは発火しない。

### 解決策

`maxBytes` を十分大きく設定し、書き込みデータが
Warning閾値を超え、かつCritical閾値は超えない範囲に収まるようにする：

```javascript
const monitor = createMemoryMonitor(db, {
  maxBytes: 500, // 500バイト上限
  warningThreshold: 0.1, // 50バイトでWarning
  criticalThreshold: 0.95, // 475バイトでCritical
  // 実際の書き込み ≈ 100バイト → Warning発火、Critical未到達
});
```

### 教訓

- 閾値テストでは**中間状態**に落ちるようデータサイズを制御すること
- 多段階コールバック設計では「飛び越し」エッジケースを常に考慮する

---

## 4. CDN経由 WASM import のメモリ問題

### 何が起きたか

```javascript
import init, { CozoDb } from "https://esm.run/cozo-lib-wasm";
```

ブラウザで実行すると `RuntimeError: memory access out of bounds` が断続的に発生。
特に、複数のクエリを連続実行すると頻度が上がる。

### 原因の推定

CDNのESMバンドラが WASM バイナリのメモリ管理に干渉している可能性。
`cozo-lib-wasm` の WASM メモリ確保は初期化時に行われるが、
CDN経由のダイナミックインポートではメモリリージョンが適切に確保されない場合がある。

### 解決策

ローカルバンドル（npm install + webpack/vite）を使用：

```bash
npm install cozo-lib-wasm
# vite.config.js で WASM をバンドル
```

### 教訓

- WASM はCDN経由での使用が不安定な場合がある
- プロダクション用途では**必ずローカルバンドル**する
- 検証時にCDN版で動作確認が取れても、安定性は保証されない

---

## 5. MCP Inspector のプロキシ設定問題

### 何が起きたか

`npx @modelcontextprotocol/inspector` でMCPサーバーの動作検証を試みたが、
Inspectorがプロキシポートでリッスンした後、実際のMCPサーバーとの通信に失敗した。

### 原因

Inspector は内部でプロキシサーバーを起動し、ブラウザUIとMCPサーバー間を中継する。
環境変数 `HTTP_PROXY` / `HTTPS_PROXY` が設定されている企業ネットワーク環境では、
このプロキシが**二重プロキシ**になりルーティングが破綻する。

### 解決策

検証時にプロキシ環境変数を一時的にクリアする：

```powershell
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
npx @modelcontextprotocol/inspector node dist/index.js
```

あるいは `--no-proxy` オプションが使えるか確認する。

### 教訓

- MCP Inspector はローカルプロキシを使用するため、企業プロキシ環境と衝突しうる
- MCP Inspector が使えない場合の代替検証手段（直接 stdio テスト）を用意しておく

---

## 6. SKILL.md の肥大化

### 何が起きたか

機能追加のたびに SKILL.md に「HNSW例」「集計例」「MCPサーバー設定」を追記した結果、
215行に膨張。AI Agent がスキルを読み込む際にコンテキストウィンドウを圧迫。

### なぜ問題か

SKILL.md は **AI Agent がスキルを認識するためのエントリーポイント** であり、
リファレンスマニュアルではない。詳細は `references/` に分離すべき。

### 解決策

- HNSW、Aggregation → `references/datalog-syntax.md` に既存
- MCP Server → gitignored 別プロジェクトのため参照自体を削除
- 215行 → 140行（本文127行）に圧縮

### 教訓

- SKILL.md は**120行前後を上限**とする
- 新セクション追加前に「これは references/ に置くべきか？」を自問する
- Agent向けドキュメントと人間向けドキュメントの目的を混同しない

---

## まとめ: チェックリスト

今後の開発で確認すべき項目：

- [ ] `module.exports` と `export` を混在させていないか
- [ ] テストの入力データは**実際の攻撃/使用経路**を模倣しているか
- [ ] 多段階の閾値/状態遷移で「飛び越し」ケースを考慮しているか
- [ ] WASM をCDN経由で使う場合のメモリ安定性を検証したか
- [ ] SKILL.md が120行を超えていないか
- [ ] 外部プロジェクトへの参照がリンク切れになっていないか
