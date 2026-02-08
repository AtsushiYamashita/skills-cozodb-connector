# Rule of Rules

## Abstruct

- ルールはプロンプト レベルで永続的かつ再利用可能なコンテキストを提供する
- ワークフローは軌跡レベルで構造化された一連のステップまたはプロンプトを提供

## @memtion to anything

- ルールファイル内で @filename を使用して他のファイルを参照できます。
- filename が相対パスの場合、ルールファイルの場所を基準として解釈されます。
- filename が絶対パスの場合、真の絶対パスとして解決されます。
- それ以外の場合は、リポジトリを基準として解決されます

## Feature

### Workflow

- エージェントが繰り返し実行する一連のタスクをガイドする一連のステップを定義できます。
  - サービスのデプロイやPRコメントへの返信など、
- How to make
  - In right side bar's '...' dropdown upside from pane.
  - Move to workflor pane.
  - You can add the Global or workspace.
- How to use
  - /workflow-name 形式のスラッシュコマンドを使用してエージェントから呼び出すことができます。
  - 一連の相互接続されたタスクまたはアクションを通じてモデルをガイドします。
  - 例えば/workflow-1 に「/workflow-2 を呼び出す」といった指示を含めることができます。
  - ワークフローはマークダウンファイルとして保存され、タイトル、説明、エージェントが実行すべき具体的な指示を含む一連の手順が含まれます。
  - それぞれ12,000文字までに制限されています。

### References

- Google Antigravity Documentation
  - https://antigravity.google/docs/skills
