# SubsQ 機能仕様書

## 1. データモデル

### 1.1 categories（カテゴリ）

サブスクリプションを分類するためのカテゴリ。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | serial | PK | 自動採番ID |
| name | text | NOT NULL | カテゴリ名 |
| color | text | NOT NULL, default `#3b82f6` | 表示色（HEX） |
| icon | text | NOT NULL, default `folder` | アイコン名 |
| sortOrder | integer | NOT NULL, default `0` | 表示順 |

- サブスクリプションとの関係: 1対多（カテゴリ削除時、サブスクのcategoryIdはNULLに設定）

### 1.2 paymentMethods（支払い方法）

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | serial | PK | 自動採番ID |
| name | text | NOT NULL | 支払い方法名 |
| icon | text | NOT NULL, default `credit-card` | アイコン名 |

- 請求先（billingAccounts）との関係: 1対多（支払い方法削除時、紐づく請求先もカスケード削除）

### 1.3 billingAccounts（請求先）

支払い方法の下位概念。同じクレジットカードでも請求先（アカウント）が異なる場合に使用。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | serial | PK | 自動採番ID |
| name | text | NOT NULL | 請求先名 |
| paymentMethodId | integer | NOT NULL, FK → paymentMethods.id | 親の支払い方法 |

- 支払い方法削除時にカスケード削除される

### 1.4 serviceGroups（サービスグループ）

同一サービス提供元の複数プランをグルーピングするための分類。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | serial | PK | 自動採番ID |
| name | text | NOT NULL | グループ名 |
| color | text | NOT NULL, default `#6366f1` | 表示色（HEX） |
| sortOrder | integer | NOT NULL, default `0` | 表示順 |

- サブスクリプションとの関係: 1対多（グループ削除時、サブスクのserviceGroupIdはNULLに設定）

### 1.5 exchangeRates（為替レート）

通貨ごとのJPY換算レートを管理。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | serial | PK | 自動採番ID |
| currency | text | NOT NULL, UNIQUE | 通貨コード（ISO 4217） |
| rateToJpy | real | NOT NULL | 1単位あたりのJPY換算レート |

- JPY自体はレコード不要（暗黙的にレート1として扱われる）
- ExchangeRate-APIから一括更新可能

### 1.6 subscriptions（サブスクリプション）

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | serial | PK | 自動採番ID |
| serviceName | text | NOT NULL | サービス名 |
| planName | text | nullable | プラン/コース名 |
| amount | real | NOT NULL | 課金額（通貨単位） |
| currency | text | NOT NULL, default `JPY` | 通貨コード |
| billingCycle | text | NOT NULL, default `monthly` | 課金サイクル |
| categoryId | integer | nullable, FK → categories.id | カテゴリ |
| paymentMethodId | integer | nullable, FK → paymentMethods.id | 支払い方法 |
| billingAccountId | integer | nullable, FK → billingAccounts.id | 請求先 |
| serviceGroupId | integer | nullable, FK → serviceGroups.id | サービスグループ |
| note | text | nullable | メモ |
| nextBillingDate | date | nullable | 次回課金日 |
| isActive | integer | NOT NULL, default `1` | 有効フラグ（1=有効, 0=停止） |

#### 課金サイクル（billingCycle）の値

| 値 | 説明 |
|----|------|
| `monthly` | 月額 |
| `annual` | 年額 |
| `{N}_{unit}` | カスタムサイクル |

カスタムサイクルの`unit`は以下のいずれか:
- `days` - 日
- `weeks` - 週
- `months` - ヶ月
- `years` - 年

例: `3_months` = 3ヶ月ごと、`2_years` = 2年ごと

#### 月額換算ロジック

全サブスクリプションの金額を月額に換算する際の乗数:

| サイクル | 月額換算乗数 |
|----------|-------------|
| monthly | 1 |
| annual | 1/12 |
| N days | 30/N |
| N weeks | 4.33/N |
| N months | 1/N |
| N years | 1/(N*12) |

年額換算 = 月額換算 * 12

---

## 2. API エンドポイント

全エンドポイントはReplit Auth認証が必要。未認証の場合は `401 Unauthorized` を返す。

### 2.1 カテゴリ

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/categories` | 一覧取得（sortOrder昇順） |
| POST | `/api/categories` | 新規作成 |
| PATCH | `/api/categories/:id` | 更新 |
| DELETE | `/api/categories/:id` | 削除 |
| PUT | `/api/categories/reorder` | 並び替え |

**PUT /api/categories/reorder**
- リクエスト: `{ ids: number[] }` - 新しい順番のID配列
- レスポンス: 並び替え後のカテゴリ一覧

### 2.2 支払い方法

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/payment-methods` | 一覧取得 |
| POST | `/api/payment-methods` | 新規作成 |
| PATCH | `/api/payment-methods/:id` | 更新 |
| DELETE | `/api/payment-methods/:id` | 削除 |

### 2.3 請求先

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/billing-accounts` | 一覧取得 |
| POST | `/api/billing-accounts` | 新規作成 |
| PATCH | `/api/billing-accounts/:id` | 更新 |
| DELETE | `/api/billing-accounts/:id` | 削除 |

### 2.4 為替レート

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/exchange-rates` | 一覧取得 |
| POST | `/api/exchange-rates` | 新規作成 |
| PATCH | `/api/exchange-rates/:id` | 更新 |
| DELETE | `/api/exchange-rates/:id` | 削除 |
| POST | `/api/exchange-rates/fetch` | ExchangeRate-APIから一括更新 |

**POST /api/exchange-rates/fetch**
- ExchangeRate-API.comのAPIを使用して、登録済み通貨のレートをJPY基準で一括更新
- `ExchangeRate_API_KEY` 環境変数が必要
- レスポンス: `{ updated: [{currency, rateToJpy}], count: number, skipped: string[] }`

### 2.5 サービスグループ

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/service-groups` | 一覧取得（sortOrder昇順） |
| POST | `/api/service-groups` | 新規作成 |
| PATCH | `/api/service-groups/:id` | 更新 |
| DELETE | `/api/service-groups/:id` | 削除 |
| PUT | `/api/service-groups/reorder` | 並び替え |

### 2.6 サブスクリプション

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/subscriptions` | 一覧取得 |
| POST | `/api/subscriptions` | 新規作成 |
| PATCH | `/api/subscriptions/:id` | 更新 |
| DELETE | `/api/subscriptions/:id` | 削除 |

---

## 3. ページ仕様

### 3.1 ダッシュボード（`/`）

ログイン後の初期画面。契約状況の概要を表示。

#### 表示セクション

1. **合計金額カード**
   - 月額合計（JPY換算）
   - 年額合計（JPY換算）
   - 有効なサブスクリプション数
   - 通貨別の月額内訳

2. **カテゴリ別コスト**
   - 各カテゴリの月額合計をカードで表示
   - カテゴリカラーを反映
   - 未分類サブスクリプションの合計も表示
   - カード押下でサブスク一覧にカテゴリフィルター付きで遷移

3. **支払い方法別コスト**
   - 支払い方法ごとの月額合計
   - 請求先の内訳も表示
   - カード押下でサブスク一覧にフィルター付きで遷移

4. **サービスグループ別コスト**
   - グループごとの月額合計（グループカラー表示）
   - カード押下でサブスク一覧にフィルター付きで遷移

5. **支払い予定（月額以外）**
   - 日次・週次を除く、月額より長い課金サイクルのサブスクリプションが対象
   - 今月中・来月中に次回課金日があるものを表示
   - 課金日が近いものから順に表示

### 3.2 サブスクリプション一覧（`/subscriptions`）

#### フィルター機能

以下の条件で絞り込み可能（複数条件AND）:
- カテゴリ（すべて / 未分類 / 特定カテゴリ）
- 支払い方法（すべて / 未設定 / 特定の方法）
- 請求先（支払い方法選択時のみ表示、すべて / 未設定 / 特定の請求先）
- サービスグループ（すべて / 未設定 / 特定グループ）
- 通貨（複数通貨がある場合のみ表示）
- ステータス（すべて / 有効 / 停止中）

カテゴリ・サービスグループのフィルター選択肢はsortOrder順で表示される。

#### ソート機能

以下のキーでソート可能（昇順/降順切り替え）:
- サービス名
- 課金額（JPY換算）
- 月額換算
- 年額換算
- 次回課金日

#### テーブル表示（デスクトップ）

| 列 | 内容 |
|----|------|
| サービス | サービス名、プラン名、カテゴリ色、支払い方法、サービスグループバッジ、メモ |
| 課金額 | 元通貨での金額 + 課金サイクル表示 |
| 月額換算 | JPY換算の月額 |
| 年額換算 | JPY換算の年額 |
| 次回課金日 | 日付表示（色付き警告あり） |
| 操作 | 編集・削除ボタン |

#### カード表示（モバイル）

各サブスクリプションをカード形式で表示。ソート切り替え用のセレクトボックスあり。

#### 次回課金日の色分け

| 条件 | 色 |
|------|------|
| 過去の日付 | 赤 |
| 3日以内 | 濃いアンバー（太字） |
| 7日以内 | アンバー |
| それ以外 | 通常色 |

#### 新規追加時のフィルター反映

フィルターが設定された状態で「追加」ボタンを押すと、以下のフィルター値がフォームの初期値として設定される:
- カテゴリ
- 支払い方法
- 請求先
- サービスグループ
- 通貨

### 3.3 カテゴリ管理（`/categories`）

- カテゴリ一覧の表示（sortOrder順）
- 追加・編集・削除のCRUD操作
- カスタムカラー選択（プリセットカラー + カスタム入力）
- ドラッグ&ドロップによる並び替え
  - 「並び替え」ボタンで並び替えモードに切り替え
  - 並び替えモード中はドラッグハンドル表示、編集・削除ボタンは非表示
  - 「完了」ボタンで通常モードに復帰
  - タッチデバイスでは150msの長押しでドラッグ開始

### 3.4 支払い方法・請求先管理（`/payment-methods`）

- 支払い方法の一覧（アコーディオン形式）
- 各支払い方法の下に請求先一覧を展開表示
- 支払い方法・請求先それぞれのCRUD操作
- 支払い方法削除時は紐づく請求先も削除される旨を確認ダイアログで表示

### 3.5 サービスグループ管理（`/service-groups`）

- カテゴリ管理と同様のUI構成
- カスタムカラー選択
- ドラッグ&ドロップによる並び替え（カテゴリと同じ仕組み）

### 3.6 為替レート管理（`/exchange-rates`）

- 登録済み通貨レートの一覧
- 手動でのレート追加・編集・削除
- 「APIから一括更新」ボタンでExchangeRate-APIからレートを取得・更新
  - 登録済みの通貨のみ更新対象（新規通貨は追加しない）
  - 更新結果（更新件数・スキップ通貨）をトースト通知で表示

---

## 4. 認証

- Replit Authを使用
- ログイン画面でReplitアカウントによる認証を実施
- 全APIエンドポイントに `isAuthenticated` ミドルウェアを適用
- 未認証時はログイン画面を表示

---

## 5. 為替レート管理仕様

### レート定義
- `rateToJpy`: 対象通貨1単位あたりの日本円換算値
  - 例: USD の rateToJpy が 150 → 1 USD = 150 JPY

### JPY換算計算
```
JPY金額 = 元金額 * rateToJpy
```

### ExchangeRate-API連携
- エンドポイント: `https://v6.exchangerate-api.com/v6/{API_KEY}/latest/JPY`
- APIはJPYを基準通貨として各通貨のレートを返す（JPY → 対象通貨）
- 変換: `rateToJpy = 1 / (APIレスポンスの対象通貨レート)`
- 登録済みの通貨コードに一致するもののみ更新

---

## 6. モバイル対応

- レスポンシブデザイン（Tailwind CSSのブレークポイント使用）
- デスクトップ: テーブル形式のサブスク一覧、サイドバーナビゲーション
- モバイル: カード形式のサブスク一覧、ハンバーガーメニュー
- iPhone Safari対応:
  - `dvh` 単位による動的ビューポート高さ
  - `viewport-fit=cover` メタタグ
  - `safe-area-inset` パディングでノッチ/ホームバー対応
