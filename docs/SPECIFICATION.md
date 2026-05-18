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

### 1.3 actualBillingDestinations（最終請求先）

異なる支払い方法の請求先を同一の物理カード・口座としてグルーピングするための独立エンティティ。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | serial | PK | 自動採番ID |
| name | text | NOT NULL | 最終請求先名（例: 楽天カード） |
| color | text | NOT NULL, default `#10b981` | 表示色（HEX） |
| sortOrder | integer | NOT NULL, default `0` | 表示順 |

- 請求先（billingAccounts）から任意で参照される（削除時はbillingAccountsのactualBillingDestinationIdをNULLに設定）
- ダッシュボードで最終請求先別コスト集計に使用

### 1.4 billingAccounts（請求先）

支払い方法の下位概念。同じクレジットカードでも請求先（アカウント）が異なる場合に使用。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | serial | PK | 自動採番ID |
| name | text | NOT NULL | 請求先名 |
| paymentMethodId | integer | NOT NULL, FK → paymentMethods.id | 親の支払い方法 |
| actualBillingDestinationId | integer | nullable, FK → actualBillingDestinations.id | 最終請求先（任意） |

- 支払い方法削除時にカスケード削除される
- 最終請求先削除時はactualBillingDestinationIdがNULLに設定される

### 1.5 serviceGroups（サービスグループ）

同一サービス提供元の複数プランをグルーピングするための分類。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | serial | PK | 自動採番ID |
| name | text | NOT NULL | グループ名 |
| color | text | NOT NULL, default `#6366f1` | 表示色（HEX） |
| sortOrder | integer | NOT NULL, default `0` | 表示順 |

- サブスクリプションとの関係: 1対多（グループ削除時、サブスクのserviceGroupIdはNULLに設定）

### 1.6 exchangeRates（為替レート）

通貨ごとのJPY換算レートを管理。

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | serial | PK | 自動採番ID |
| currency | text | NOT NULL, UNIQUE | 通貨コード（ISO 4217） |
| rateToJpy | real | NOT NULL | 1単位あたりのJPY換算レート |

- JPY自体はレコード不要（暗黙的にレート1として扱われる）
- ExchangeRate-APIから一括更新可能

### 1.7 subscriptions（サブスクリプション）

| カラム | 型 | 制約 | 説明 |
|--------|------|------|------|
| id | serial | PK | 自動採番ID |
| managementId | text | UNIQUE, nullable | 管理ID（8文字英数字、サーバー自動生成、変更不可） |
| serviceName | text | NOT NULL | サービス名 |
| serviceUrl | text | nullable | サービスのURL |
| planName | text | nullable | プラン/コース名 |
| billerName | text | nullable | 請求者名（クレジットカード明細に表示される名称） |
| amount | real | NOT NULL | 課金額（通貨単位） |
| currency | text | NOT NULL, default `JPY` | 通貨コード |
| billingCycle | text | NOT NULL, default `monthly` | 課金サイクル |
| categoryId | integer | nullable, FK → categories.id | カテゴリ |
| paymentMethodId | integer | nullable, FK → paymentMethods.id | 支払い方法 |
| billingAccountId | integer | nullable, FK → billingAccounts.id | 請求先 |
| serviceGroupId | integer | nullable, FK → serviceGroups.id | サービスグループ |
| note | text | nullable | メモ |
| nextBillingDate | date | nullable | 次回課金日 |
| scheduledAmount | real | nullable | 価格変更予約: 変更後の金額 |
| scheduledDate | date | nullable | 価格変更予約: 変更予定日 |
| isActive | integer | NOT NULL, default `1` | 有効フラグ（1=有効, 0=停止） |

#### 管理ID（managementId）の仕様

- サーバーサイドで自動生成される8文字の英小文字+数字のID（例: `ab3x9kq2`）
- APIリクエストで設定することはできない（内部生成のみ）
- CSVエクスポート時に先頭列「管理ID」として出力される
- CSVインポート時の重複判定キーとして使用される
- 既存レコード（ID未設定）はサーバー起動時に自動バックフィルされる

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

### 2.3 最終請求先

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/actual-billing-destinations` | 一覧取得（sortOrder昇順） |
| POST | `/api/actual-billing-destinations` | 新規作成 |
| PATCH | `/api/actual-billing-destinations/:id` | 更新 |
| DELETE | `/api/actual-billing-destinations/:id` | 削除 |
| PUT | `/api/actual-billing-destinations/reorder` | 並び替え |

### 2.4 請求先

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/billing-accounts` | 一覧取得 |
| POST | `/api/billing-accounts` | 新規作成 |
| PATCH | `/api/billing-accounts/:id` | 更新 |
| DELETE | `/api/billing-accounts/:id` | 削除 |

### 2.5 為替レート

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

### 2.6 サービスグループ

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/service-groups` | 一覧取得（sortOrder昇順） |
| POST | `/api/service-groups` | 新規作成 |
| PATCH | `/api/service-groups/:id` | 更新 |
| DELETE | `/api/service-groups/:id` | 削除 |
| PUT | `/api/service-groups/reorder` | 並び替え |

### 2.7 サブスクリプション

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/subscriptions` | 一覧取得 |
| POST | `/api/subscriptions` | 新規作成 |
| PATCH | `/api/subscriptions/:id` | 更新 |
| DELETE | `/api/subscriptions/:id` | 削除 |
| POST | `/api/subscriptions/:id/apply-scheduled` | 価格変更予約を適用 |
| POST | `/api/subscriptions/advance-billing-dates` | 次回課金日を一括更新 |
| GET | `/api/subscriptions/export` | CSV形式でエクスポート |
| POST | `/api/subscriptions/import-preview` | CSVインポートのドライラン |
| POST | `/api/subscriptions/import` | CSVからインポート |

**POST /api/subscriptions/:id/apply-scheduled**
- 予約金額（scheduledAmount）を現在の金額（amount）に反映
- 予約情報（scheduledAmount, scheduledDate）をクリア
- 予約が存在しない場合は400エラー

**POST /api/subscriptions/advance-billing-dates**
- 次回課金日が過去のサブスクリプションを対象に、今月以降の日付まで自動繰り越し
- レスポンス: `{ count: number }` - 更新件数

**GET /api/subscriptions/export**
- 全サブスクリプションをCSV形式でダウンロード
- エンコーディング: BOM付きUTF-8（Excelで文字化けしない）
- ヘッダー列（順番）: `管理ID, サービス名, コース名, 金額, 通貨, 課金サイクル, 次回課金日, カテゴリ, 支払い方法, 請求先, サービスグループ, 請求者名, サービスURL, メモ, ステータス`
- カテゴリ・支払い方法・請求先・サービスグループは名前で出力される
- ステータスは `有効` / `停止中` のテキストで出力

**POST /api/subscriptions/import-preview** (ドライラン)
- リクエスト: `{ csv: string }` - CSVテキスト
- DBへの書き込みは行わず、実際に実行した場合の件数のみ返す
- レスポンス: `{ added: number, updated: number, skipped: number, errors: string[] }`

**POST /api/subscriptions/import**
- リクエスト: `{ csv: string }` - CSVテキスト
- 管理IDベースの重複判定ロジック（下記参照）でインポートを実行
- カテゴリ・支払い方法・請求先・サービスグループは名前で照合し、存在しない場合は自動作成
- レスポンス: `{ added: number, updated: number, skipped: number, errors: string[] }`

#### CSVインポートの重複判定ロジック

| 条件 | 動作 |
|------|------|
| 管理ID列が存在しない、または空白 | 新規ID生成して新規作成（added） |
| 管理IDが既存レコードと一致し、内容も同じ | スキップ（skipped） |
| 管理IDが既存レコードと一致し、内容が異なる | 既存レコードを更新（updated） |
| 管理IDが既存レコードと一致しない | その管理IDを使って新規作成（added） |

「内容が同じ」の比較対象: サービス名, コース名, 請求者名, サービスURL, メモ, 金額, 通貨, 課金サイクル, 次回課金日, カテゴリ, 支払い方法, 請求先, サービスグループ, ステータス

### 2.8 データ管理

| メソッド | パス | 説明 |
|----------|------|------|
| GET | `/api/data/backup` | 全データをJSON形式でダウンロード |
| POST | `/api/data/restore` | バックアップJSONでDB全データを上書き復元 |

**GET /api/data/backup**
- 全テーブル（categories, paymentMethods, actualBillingDestinations, billingAccounts, serviceGroups, exchangeRates, subscriptions）をJSON形式で返す
- レスポンス形式: `{ version: "1", exportedAt: string, data: { ... } }`

**POST /api/data/restore**
- リクエスト: バックアップJSONの内容（`{ version: "1", data: { ... } }`）
- DBトランザクション内で全テーブルを削除後、マスタ→子テーブルの順で再挿入
- IDは新規採番し、外部キー参照は新IDに自動再マップ
- managementIdはバックアップに含まれていればそのまま使用し、なければ新規生成
- `version` フィールドが `"1"` でない場合は400エラー

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

4. **最終請求先別コスト**
   - 最終請求先ごとの月額合計（登録がある場合のみ表示）
   - カード押下でサブスク一覧に最終請求先フィルター付きで遷移

5. **サービスグループ別コスト**
   - グループごとの月額合計（グループカラー表示）
   - カード押下でサブスク一覧にフィルター付きで遷移

6. **価格変更予定**
   - 価格変更予約が設定されているサブスクリプションを表示
   - 変更予定日を過ぎたもの: 赤色の警告表示 + 「適用」ボタン
   - 今後の予定: 変更予定日順に表示（色付き警告）
   - 「適用」ボタン: 予約金額を現在の金額に反映し、予約情報をクリア

7. **今月の実請求予定**
   - 月額サブスクリプションは常に含む
   - 月額以外は nextBillingDate が今月のものを表示
   - 次回課金日未設定の非月額サブスクがある場合は件数を警告表示
   - コラプシブル（開閉可能）

8. **支払い予定（月額以外）**
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
- 最終請求先（登録がある場合のみ表示、すべて / 特定の最終請求先）
- 通貨（複数通貨がある場合のみ表示）
- 価格変更予約（すべて / 予約あり / 予約なし）
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
| サービス | サービス名（URLがあればリンク）、プラン名、カテゴリ色ドット、支払い方法、サービスグループバッジ、請求者名、メモ、管理ID（クリックでコピー） |
| 課金額 | 元通貨での金額 + 課金サイクル表示 + 価格変更予約表示（あれば） |
| 月額換算 | JPY換算の月額 |
| 年額換算 | JPY換算の年額 |
| 次回課金日 | 日付表示（色付き警告あり） |
| 操作 | 編集・削除ボタン |

#### カード表示（モバイル）

各サブスクリプションをカード形式で表示。ソート切り替え用のボタン群あり。管理IDも表示（クリックでコピー）。

#### 管理IDの表示

- 各サービス名の下の情報行（カテゴリ名・支払い方法等と同列）に小さなモノスペースフォントで表示
- クリックするとクリップボードにコピーされ、コピー済みアイコンに一時的に変化する

#### 次回課金日の色分け

| 条件 | 色 |
|------|------|
| 過去の日付 | 赤 |
| 3日以内 | 濃いアンバー（太字） |
| 7日以内 | アンバー |
| それ以外 | 通常色 |

#### 価格変更予約の表示

課金額セルに価格変更予約がある場合、変更予定日と変更後金額を表示。「適用」ボタンで即時反映可能。

| 条件 | 色 |
|------|------|
| 変更予定日が過去 | 赤（太字） |
| 3日以内 | 濃いアンバー（太字） |
| 7日以内 | アンバー |
| それ以降 | 青 |

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

### 3.4 支払い方法・請求先・最終請求先管理（`/payment-methods`）

- 支払い方法の一覧（アコーディオン形式）
- 各支払い方法の下に請求先一覧を展開表示
- 支払い方法・請求先それぞれのCRUD操作
- 支払い方法削除時は紐づく請求先も削除される旨を確認ダイアログで表示
- 最終請求先のCRUD管理（請求先と独立したセクション）
- 最終請求先のカスタムカラー選択、ドラッグ&ドロップによる並び替え
- 請求先に最終請求先を紐づけることで異なる支払い方法の請求先を同一カードとして管理可能

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

### 3.7 データ管理（`/data`）

全データのバックアップ・復元・CSV エクスポート・インポートを行うページ。

#### バックアップ（JSON）

- 「バックアップをダウンロード」ボタンでJSONファイルをダウンロード
- 全テーブルのデータを含む（サブスク・カテゴリ・支払い方法・請求先・最終請求先・サービスグループ・為替レート）
- ファイル名: `subsq-backup-YYYY-MM-DD.json`

#### 復元（JSON）

- JSONファイルを選択して「復元する」を押すと確認ダイアログが表示される
- 確認後、現在の全データが削除されてバックアップファイルの内容で上書きされる
- DB全置換はトランザクション内で実行（途中失敗時はロールバック）
- 外部キーのIDは新規採番され自動再マップされる

#### CSVエクスポート

- 「CSVをダウンロード」ボタンでCSVファイルをダウンロード
- エンコーディング: BOM付きUTF-8
- 先頭列は「管理ID」、以降はサービス名・金額・カテゴリ等の各フィールド
- ファイル名: `subsq-export-YYYY-MM-DD.csv`

#### CSVインポート

1. CSVファイルを選択するとすぐにプレビュー（ドライラン）が実行される
2. プレビュー結果として「追加: X件 / 更新: Y件 / スキップ: Z件」と行レベルエラー一覧が表示される
3. 「インポートする」ボタンを押すと確認ダイアログが表示される
4. 確認後に実際のインポートが実行され、完了トーストに件数内訳が表示される
5. 管理IDによる重複判定で、同じIDのレコードは内容に応じて更新またはスキップされる

---

## 4. 認証

- ユーザー名 / パスワード認証（環境変数 `ADMIN_USERNAME` / `ADMIN_PASSWORD` で設定）
- サーバー起動時に `ADMIN_PASSWORD` を bcrypt（saltRounds=12）でハッシュ化してメモリに保持
- ログイン時は `bcrypt.compare` で検証、ユーザー名は `timingSafeEqual` で比較
- セッションは `express-session` + `connect-pg-simple`（PostgreSQL の `sessions` テーブル）で管理
- セッション有効期限: 7日間
- 全 API エンドポイントに `isAuthenticated` ミドルウェアを適用（未認証時は 401 を返す）
- 未認証時はログイン画面（ユーザー名 / パスワード入力フォーム）を表示
- `SESSION_SECRET` / `ADMIN_USERNAME` / `ADMIN_PASSWORD` が未設定の場合はサーバー起動時にエラーで停止

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
