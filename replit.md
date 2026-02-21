# SubsQ - サブスクリプション管理アプリ

## Overview
サブスクリプションをカテゴリ別に管理し、多通貨対応で課金総額を把握できる日本語Webアプリケーション。

## Recent Changes
- 2026-02-21: 為替レートをサブスクから独立したテーブルに分離、為替レート管理ページ追加
- 2026-02-20: 初期MVP構築完了 - カテゴリ管理、サブスク登録、支払い方法の2階層管理、ダッシュボード

## User Preferences
- UI言語: 日本語
- 会話言語: 日本語
- 為替レート: 手動入力（通貨ごとに一元管理）
- 支払い方法階層: 2階層（支払い方法 → 請求先）

## Project Architecture

### Tech Stack
- Frontend: React + Tailwind CSS + Shadcn UI
- Backend: Express.js
- Database: PostgreSQL + Drizzle ORM
- Routing: wouter

### Data Models
- **categories**: サブスクのカテゴリ分け（名前、カラー）
- **paymentMethods**: 支払い方法（名前）
- **billingAccounts**: 請求先（支払い方法に紐づく子要素）
- **exchangeRates**: 為替レート（通貨コード、JPYレート）- 通貨ごとに1レコード
- **subscriptions**: サブスク情報（サービス名、コース名、金額、通貨、課金サイクル、カテゴリ、支払い方法、請求先）- 為替レートはexchangeRatesテーブルから参照

### Pages
- `/` - ダッシュボード（月額/年額合計、通貨別内訳、カテゴリ別コスト）
- `/subscriptions` - サブスクリプション一覧・CRUD
- `/categories` - カテゴリ一覧・CRUD
- `/payment-methods` - 支払い方法・請求先の階層管理
- `/exchange-rates` - 為替レート管理

### Key Files
- `shared/schema.ts` - Drizzle ORMスキーマ定義
- `server/routes.ts` - APIエンドポイント
- `server/storage.ts` - DatabaseStorage実装
- `server/seed.ts` - シードデータ
- `client/src/App.tsx` - アプリルート（サイドバーレイアウト）
- `client/src/pages/` - 各ページコンポーネント
