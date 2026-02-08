# Rule of Skills

## Abstract

- スキルはエージェントの能力を拡張するモジュール化された自己完結型パッケージ
- 特定のドメインやタスクに対する専門知識、ワークフロー、ツール統合を提供
- プログレッシブディスクロージャ設計により、コンテキストウィンドウを効率的に管理

## Workflow Overview

- 発見:会話が始まると、エージェントは利用可能なスキルのリストとその名前と説明を見ることができます。
- アクティベーション:スキルがタスクに関連していると思われる場合、エージェントはSKILL.md全文を読み上げます
- 実行:エージェントはタスクに取り組んでいる間、スキルの指示に従います

## Structure

```
.agent/skills/my-skill/
├─── SKILL.md       # Main instructions (required)
├─── scripts/       # Helper scripts (optional)
├─── examples/      # Reference implementations (optional)
└─── resources/     # Templates and other assets (optional)
```

### Required Components

- **SKILL.md** (必須)
  - YAML frontmatter: `name`(Optional), `description` (必須)
  - Markdown instructions: スキルの使用方法とガイダンス
  - (ex) ./agent/skills/name-caller.md

### Optional Components

- **scripts/** - 決定論的な信頼性が必要なタスク用の実行可能コード
  - 繰り返し書き直されるコードを保存
  - トークン効率的で決定論的
  - コンテキストに読み込まずに実行可能
- **references/** - 必要に応じてコンテキストに読み込まれるドキュメント
  - データベーススキーマ、API仕様、ドメイン知識、ポリシー
  - SKILL.md を簡潔に保つ
  - 大きなファイル(>10k words)には grep 検索パターンを含める
- **assets/** - 出力に使用されるファイル (コンテキストには読み込まれない)
  - テンプレート、画像、アイコン、ボイラープレート、フォント
  - 出力リソースとドキュメントを分離

### Best Practices

- Focus 1 task
- Declare description
  - When, Hhy use this skill
  - What is the output of this skill
- Order using skill for focusing on the task
  - Don't write 'You have to use `exec --help`'
  - Write 'Use `exec something-command`'looks like a blackbox
- Regarding complex task
  - Use workflow with checklist or decision trees

# Reference

- Google Antigravity Documentation
  - https://antigravity.google/docs/skills
