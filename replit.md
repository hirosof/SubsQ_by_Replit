# SubsQ - サブスクリプション管理アプリ

## Overview
サブスクリプションをカテゴリ別に管理し、多通貨対応で課金総額を把握できる日本語Webアプリケーション。

## Recent Changes
- 2026-05-18: [Task #25] 外部デプロイ手順書（docs/DEPLOY.md）を作成 - Replit Deploy・Fly.io+Neon・Railway・Render・Ubuntu VPS・Docker Compose の6パターンを網羅
- 2026-05-18: [Task #23] Replit固有OIDC認証をパスワード認証に置き換え（環境変数 ADMIN_USERNAME/ADMIN_PASSWORD + bcrypt検証、express-session維持）
- 2026-04-29: ドキュメント（docs/SPECIFICATION.md・README.md・replit.md）を最新実装状態に更新
- 2026-04-23: ダッシュボードに「今月の実請求予定」セクション追加（月額は常に含む、その他は nextBillingDate が今月のもの、未設定の非月額は件数警告表示、コラプシブル）
- 2026-04-23: [Task #19] CSVインポート前プレビュー機能追加（/api/subscriptions/import-preview ドライランAPI、ファイル選択時に自動実行、確認ダイアログ付きインポートフロー）
- 2026-04-23: [Task #18] サブスクリプションに管理ID（managementId）付与 - 8文字英数字のサーバー自動生成ID、CSVエクスポート先頭列に出力、インポート時の重複判定キーとして使用
- 2026-04-23: データ管理ページ（/data）追加 - JSONバックアップ/復元、CSVエクスポート/インポート機能
- 2026-03-02: [Task #13] サブスクにサービスURL・請求者名フィールド追加（URL設定時はサービス名がリンク表示、請求者名はサブ情報として表示）
- 2026-03-02: [Task #13] 最終請求先（actualBillingDestinations）機能追加 - 異なる支払い方法の請求先を同一カード/口座として紐づけ、ダッシュボードで最終請求先別コスト表示、サブスク一覧での最終請求先フィルター対応
- 2026-02-22: 価格変更予約のフィルター追加（サブスク一覧に「予約あり/なし」フィルター、ダッシュボードから予約付き一覧への遷移ボタン）
- 2026-02-22: 価格変更予約機能追加（scheduledAmount/scheduledDate、フォーム入力、一覧表示、ダッシュボード「価格変更予定」セクション、適用APIとボタン）
- 2026-02-21: カテゴリ・サービスグループの並び替え機能追加（sortOrderカラム、上下ボタンUI、フィルター順反映）
- 2026-02-21: サブスク追加時にフィルター状態をフォーム初期値に反映
- 2026-02-21: 次回課金日（nextBillingDate）機能追加 - サブスクに任意の日付入力、一覧に列追加（ソート・色付き表示対応）、ダッシュボードに月額以外の支払い予定セクション追加
- 2026-02-21: iPhoneのSafari対応（dvh単位、viewport-fit=cover、safe-area-inset対応）
- 2026-02-21: カテゴリ・サービスグループにカスタムカラー選択機能追加（ColorPickerコンポーネント）
- 2026-02-21: サービスグループ機能追加（テーブル、CRUD API、管理UI、サブスクとの紐づけ、ダッシュボード・一覧でのフィルター/表示対応）
- 2026-02-21: サブスク一覧をテーブル形式に変更、課金額/月額換算/年額換算の3列表示、ソート機能追加
- 2026-02-21: ダッシュボードからサブスク一覧へのナビゲーション機能追加（カテゴリ/支払い方法/請求先フィルター連動）
- 2026-02-21: ExchangeRate-API連携追加（為替レートのAPI一括更新機能）
- 2026-02-21: 為替レートをサブスクから独立したテーブルに分離、為替レート管理ページ追加
- 2026-02-20: 初期MVP構築完了 - カテゴリ管理、サブスク登録、支払い方法の2階層管理、ダッシュボード

## User Preferences
- UI言語: 日本語
- 会話言語: 日本語
- 為替レート: 手動入力 + ExchangeRate-API.comによる一括更新（APIキー: ExchangeRate_API_KEY）
- 支払い方法階層: 2階層（支払い方法 → 請求先）

## Project Architecture

### Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: Express.js
- Database: PostgreSQL + Drizzle ORM
- Routing: wouter

### Data Models
- **categories**: サブスクのカテゴリ分け（名前、カラー、sortOrder）
- **paymentMethods**: 支払い方法（名前）
- **actualBillingDestinations**: 最終請求先（実際の物理カード/口座を表す独立エンティティ、名前、カラー、sortOrder）
- **billingAccounts**: 請求先（支払い方法に紐づく子要素、オプションで actualBillingDestinationId で最終請求先に紐づけ可能）
- **exchangeRates**: 為替レート（通貨コード、JPYレート）- 通貨ごとに1レコード
- **serviceGroups**: サービスグループ（同一プロバイダの複数プランをグループ化、sortOrder）
- **subscriptions**: サブスク情報（managementId[自動生成8文字ID]、サービス名、サービスURL、コース名、請求者名、金額、通貨、課金サイクル、次回課金日、予約金額、変更予定日、カテゴリ、支払い方法、請求先、サービスグループ）- 為替レートはexchangeRatesテーブルから参照

### Pages
- `/` - ダッシュボード（月額/年額合計、通貨別内訳、カテゴリ別コスト、最終請求先別コスト、月額以外の支払い予定）
- `/subscriptions` - サブスクリプション一覧・CRUD（管理ID表示、フィルター・ソート）
- `/categories` - カテゴリ一覧・CRUD
- `/payment-methods` - 支払い方法・請求先の階層管理・最終請求先管理
- `/service-groups` - サービスグループ管理
- `/exchange-rates` - 為替レート管理
- `/data` - データ管理（JSONバックアップ/復元、CSVエクスポート/インポート）

### Key Files
- `shared/schema.ts` - Drizzle ORMスキーマ定義
- `server/routes.ts` - APIエンドポイント
- `server/storage.ts` - DatabaseStorage実装
- `server/seed.ts` - シードデータ
- `client/src/App.tsx` - アプリルート（サイドバーレイアウト）
- `client/src/pages/data-management.tsx` - データ管理ページ（バックアップ/復元/CSV）
- `client/src/pages/` - 各ページコンポーネント
