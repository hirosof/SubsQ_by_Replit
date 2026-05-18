# SubsQ 外部デプロイ手順書

## 目次

1. [前提・必須環境変数](#1-前提必須環境変数)
2. [ビルド・起動コマンド](#2-ビルド起動コマンド)
3. [Replit Deploy（最も簡単）](#3-replit-deploy最も簡単)
4. [Fly.io + Neon（推奨構成）](#4-flyio--neon推奨構成)
5. [Railway](#5-railway)
6. [Render](#6-render)
7. [Ubuntu VPS（自己ホスト）](#7-ubuntu-vps自己ホスト)
8. [Docker / Docker Compose](#8-docker--docker-compose)
9. [トラブルシューティング](#9-トラブルシューティング)

---

## 1. 前提・必須環境変数

### 必須環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `DATABASE_URL` | PostgreSQL 接続 URL | `postgresql://user:pass@host:5432/dbname` |
| `SESSION_SECRET` | セッション署名用の秘密鍵（32文字以上のランダム文字列推奨） | `openssl rand -hex 32` の出力 |
| `ADMIN_USERNAME` | ログイン用ユーザー名 | `admin` |
| `ADMIN_PASSWORD` | ログイン用パスワード（平文で設定） | `your-secure-password` |

### オプション環境変数

| 変数名 | 説明 |
|--------|------|
| `PORT` | サーバーのリスンポート（デフォルト: `5000`） |
| `ExchangeRate_API_KEY` | ExchangeRate-API.com の API キー（為替レート自動更新に必要） |

> **注意**: `ADMIN_PASSWORD` は平文で設定してください。サーバー起動時に bcrypt でハッシュ化してメモリに保持し、ログイン時に比較します。データベースには保存されません。

### SESSION_SECRET の生成

```bash
# Linux / macOS
openssl rand -hex 32

# Node.js で生成する場合
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. ビルド・起動コマンド

```bash
# 1. 依存パッケージインストール
npm install

# 2. 環境変数を設定（.env ファイルまたはシェル変数）
export DATABASE_URL="postgresql://..."
export SESSION_SECRET="..."
export ADMIN_USERNAME="admin"
export ADMIN_PASSWORD="your-password"

# 3. データベーススキーマ適用（初回・スキーマ変更時のみ）
npm run db:push

# 4. ビルド（フロントエンド + バックエンド → dist/ に出力）
npm run build

# 5. 起動
npm run start
# → ポート5000（または $PORT）でサーバーが起動します
```

ビルド成果物は `dist/` 以下に出力されます：
- `dist/index.cjs` — バックエンド（Expressサーバー）
- `dist/public/` — フロントエンド静的ファイル

---

## 3. Replit Deploy（最も簡単）

Replit 上でそのまま公開できる最もシンプルな方法です。`.replit.app` ドメインが付与されます。

### 手順

1. Replit の画面右上の **「Deploy」** ボタンをクリック
2. 「Autoscale」または「Reserved VM」を選択
3. 環境変数が Secrets に設定済みであることを確認（`SESSION_SECRET`・`ADMIN_USERNAME`・`ADMIN_PASSWORD`）
4. **「Deploy」** を実行

### 注意点

- `DATABASE_URL` は Replit 付属の PostgreSQL が自動設定されます
- デプロイ後は `https://your-app-name.replit.app` でアクセス可能
- 独自ドメインの設定は Replit の「Custom domain」から可能

---

## 4. Fly.io + Neon（推奨構成）

**Fly.io**（アプリホスティング）＋ **Neon**（サーバーレスPostgreSQL）の組み合わせ。両サービスとも無料枠があり、本番運用にも適した構成です。

### 4-1. Neon でデータベースを作成

1. [neon.tech](https://neon.tech) にアクセスしてアカウント作成（GitHub ログイン可）
2. 「New Project」をクリック → プロジェクト名を入力 → リージョンを選択（`Asia Pacific - Singapore` 推奨）
3. プロジェクトが作成されたら「Connection string」をコピー

```
postgresql://username:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

4. この接続文字列を `DATABASE_URL` として保存しておく

> Neon の無料枠: 0.5 GB ストレージ、コンピュートは使用時のみ課金（月10時間まで無料）

### 4-2. flyctl のインストールとログイン

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows（PowerShell）
iwr https://fly.io/install.ps1 -useb | iex

# ログイン
fly auth login
```

### 4-3. Fly.io アプリの作成

リポジトリのルートで実行します。

```bash
fly launch
```

対話形式で設定します：
- **App name**: 任意の名前（例: `subsq-myapp`）
- **Region**: `nrt`（東京）推奨
- **Postgres**: `No`（Neon を使うため）
- **Deploy now**: `No`（先に設定を完了させる）

`fly.toml` が生成されます。内容を以下のように編集してください：

```toml
# fly.toml
app = "subsq-myapp"
primary_region = "nrt"

[build]

[env]
  PORT = "8080"
  NODE_ENV = "production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

> **ポートについて**: Fly.io は内部ポート `8080` を使用します。`PORT=8080` を `[env]` に設定することで、アプリが自動的にそのポートを使用します。

### 4-4. シークレット（環境変数）の設定

```bash
fly secrets set \
  DATABASE_URL="postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" \
  SESSION_SECRET="ここに32文字以上のランダム文字列" \
  ADMIN_USERNAME="admin" \
  ADMIN_PASSWORD="your-secure-password"

# 為替レート機能を使う場合（任意）
fly secrets set ExchangeRate_API_KEY="your-api-key"
```

設定済みシークレットの確認：
```bash
fly secrets list
```

### 4-5. データベーススキーマの適用

**ローカルから Neon に直接接続して実行します**（最も簡単）：

```bash
# ローカルで DATABASE_URL を設定して db:push を実行
DATABASE_URL="postgresql://username:password@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require" npm run db:push
```

> **注意**: `fly ssh console` 経由でコンテナ内から `npm run db:push` を実行しようとすると、ビルド方式によっては `drizzle-kit` が同梱されておらず失敗する場合があります。上記のローカルから Neon へ直接接続して実行する方法を第一推奨とします。

Fly.io 上にデプロイ済みで、ローカルに接続文字列がない場合のみ SSH 経由で試みてください：

```bash
fly ssh console
# コンソール内で（drizzle-kit が使える場合のみ）:
cd /app && npm run db:push
exit
```

### 4-6. デプロイ

```bash
fly deploy
```

初回デプロイ時はビルドに数分かかります。

### 4-7. 動作確認・ログ確認

```bash
# アプリを開く
fly open

# リアルタイムログ確認
fly logs

# アプリの状態確認
fly status
```

### 4-8. スケールダウン（コスト節約）

```bash
# 最小インスタンス数を0にする（アクセスがないときは停止）
fly scale count 0 --region nrt

# 最小メモリに設定
fly scale memory 256
```

---

## 5. Railway

[Railway](https://railway.app) は PostgreSQL 内蔵で環境変数の設定も GUI から行えます。

### 手順

1. [railway.app](https://railway.app) にアクセス → GitHub でログイン
2. 「New Project」→「Deploy from GitHub repo」でリポジトリを選択
3. 「Add a service」→「Database」→「Add PostgreSQL」でDB追加
4. PostgreSQL の「Variables」タブから `DATABASE_URL` をコピー
5. アプリの「Variables」タブで以下を設定：

```
SESSION_SECRET=（32文字以上のランダム文字列）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
DATABASE_URL=（PostgreSQLサービスからコピーした値）
```

6. 「Deployments」タブで自動デプロイが実行される

### データベーススキーマの適用

**推奨**: Railway の「Shell」機能から手動で1回だけ実行します：

```bash
npm run db:push
```

> **注意**: `npm run db:push && npm run start` を Custom Start Command に設定すると、毎デプロイ・毎再起動のたびにスキーマ適用が走ります。通常は初回のみ実行すれば十分なため、Shell からの手動実行を推奨します。スキーマを変更した際だけ再実行してください。

### 注意点

- Railway の無料枠（Hobby）は月 $5 のクレジット付き
- `npm run build` は Railway がビルドステップとして自動実行（`package.json` の `build` スクリプトを検出）

---

## 6. Render

[Render](https://render.com) は無料プランがあります（スリープあり）。

### 手順

1. [render.com](https://render.com) にアクセス → GitHub でログイン
2. 「New +」→「Web Service」→ リポジトリを選択
3. 以下を設定：

| 項目 | 値 |
|------|-----|
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start` |
| Instance Type | Free または Starter |

4. 「Environment Variables」に以下を追加：

```
DATABASE_URL=（後で設定）
SESSION_SECRET=（32文字以上のランダム文字列）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
NODE_ENV=production
```

5. 「New +」→「PostgreSQL」でデータベースを作成し、「Internal Database URL」をコピー
6. Web Service の環境変数 `DATABASE_URL` に設定

### データベーススキーマの適用

Render の「Shell」タブから：

```bash
npm run db:push
```

### 注意点

- 無料プランは15分間アクセスがないとスリープ（初回アクセスが遅い）
- Render PostgreSQL の無料プランは90日で削除されるため、本番運用は有料プランを推奨

---

## 7. Ubuntu VPS（自己ホスト）

最もコントロールが効く方法です。月数百円のVPS（Hetzner・さくらVPS・ConoHaなど）で運用できます。

### 7-1. サーバー初期設定

```bash
# Ubuntu 22.04 LTS を想定
sudo apt update && sudo apt upgrade -y

# Node.js 20 のインストール
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PM2（プロセスマネージャー）のインストール
sudo npm install -g pm2

# PostgreSQL のインストール
sudo apt install -y postgresql postgresql-contrib

# nginx のインストール
sudo apt install -y nginx
```

### 7-2. PostgreSQL の設定

```bash
# postgres ユーザーに切り替え
sudo -u postgres psql

# データベースとユーザー作成
CREATE USER subsq_user WITH PASSWORD 'your-db-password';
CREATE DATABASE subsq_db OWNER subsq_user;
GRANT ALL PRIVILEGES ON DATABASE subsq_db TO subsq_user;
\q
```

### 7-3. アプリのデプロイ

```bash
# アプリ用ディレクトリ作成
sudo mkdir -p /var/www/subsq
sudo chown $USER:$USER /var/www/subsq

# リポジトリをクローン（または SCP でファイルを転送）
cd /var/www/subsq
git clone https://github.com/your-username/subsq.git .

# 環境変数ファイルの作成
cat > .env << 'EOF'
DATABASE_URL=postgresql://subsq_user:your-db-password@localhost:5432/subsq_db
SESSION_SECRET=（openssl rand -hex 32 の出力）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
NODE_ENV=production
PORT=5000
EOF

chmod 600 .env

# 依存パッケージインストール
npm install

# データベーススキーマ適用
export $(cat .env | xargs) && npm run db:push

# ビルド
npm run build
```

### 7-4. PM2 でプロセス管理

```bash
# PM2 でアプリ起動（環境変数ファイルを読み込む）
pm2 start dist/index.cjs --name subsq --env production \
  --env-file /var/www/subsq/.env

# システム起動時に自動起動
pm2 startup
pm2 save

# 状態確認
pm2 status
pm2 logs subsq
```

### 7-5. nginx リバースプロキシの設定

```bash
sudo nano /etc/nginx/sites-available/subsq
```

以下を記述：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # ドメイン名に変更

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 設定を有効化
sudo ln -s /etc/nginx/sites-available/subsq /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7-6. Let's Encrypt で HTTPS 化

```bash
# Certbot のインストール
sudo apt install -y certbot python3-certbot-nginx

# 証明書取得と nginx 設定の自動更新
sudo certbot --nginx -d your-domain.com

# 自動更新の確認
sudo certbot renew --dry-run
```

HTTPS 化後は `SESSION_SECRET` が安全に機能します。

---

## 8. Docker / Docker Compose

### 8-1. Dockerfile

```dockerfile
# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
```

### 8-2. docker-compose.yml（PostgreSQL 込み）

```yaml
services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      DATABASE_URL: postgresql://subsq_user:subsq_password@db:5432/subsq_db
      SESSION_SECRET: ${SESSION_SECRET}
      ADMIN_USERNAME: ${ADMIN_USERNAME}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    ports:
      - "5432:5432"   # スキーマ適用（npm run db:push）をホスト側から実行するために公開
    environment:
      POSTGRES_USER: subsq_user
      POSTGRES_PASSWORD: subsq_password
      POSTGRES_DB: subsq_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U subsq_user -d subsq_db"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_data:
```

### 8-3. `.env` ファイル（Docker Compose 用）

```bash
# .env ファイルを作成（git にコミットしないこと）
SESSION_SECRET=（openssl rand -hex 32 の出力）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

### 8-4. 起動手順

```bash
# イメージビルド＆起動
docker compose up -d --build

# データベーススキーマの適用（初回のみ）
# drizzle-kit は devDependency のため、ホスト側（コンテナ外）から実行します
DATABASE_URL="postgresql://subsq_user:subsq_password@localhost:5432/subsq_db" npm run db:push
# ※ PostgreSQL コンテナが起動してから実行してください（docker compose up db -d で先に起動しても可）

# ログ確認
docker compose logs -f app

# 停止
docker compose down
```

> **補足**: `docker compose exec app` で `drizzle-kit` を実行しようとすると、ランタイムイメージには devDependency がインストールされていないため失敗します。スキーマ適用は必ずホスト側（`node_modules` が揃っている作業ディレクトリ）から実行してください。PostgreSQL コンテナのポートは `5432` でホストに公開されているため、`localhost:5432` で接続できます。

### 8-5. データのバックアップ

```bash
# PostgreSQL データのバックアップ
docker compose exec db pg_dump -U subsq_user subsq_db > backup_$(date +%Y%m%d).sql

# 復元
docker compose exec -T db psql -U subsq_user subsq_db < backup_YYYYMMDD.sql
```

---

## 9. トラブルシューティング

### SESSION_SECRET が未設定で起動しない

```
Error: SESSION_SECRET 環境変数が設定されていません。起動できません。
```

→ `SESSION_SECRET` 環境変数を設定してください（32文字以上のランダム文字列推奨）。

```bash
openssl rand -hex 32
```

### ADMIN_USERNAME / ADMIN_PASSWORD が未設定で起動しない

```
Error: ADMIN_USERNAME / ADMIN_PASSWORD 環境変数が設定されていません。起動できません。
```

→ 両方の環境変数を設定してください。

### データベース接続エラー

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

→ `DATABASE_URL` が正しいか確認してください。ローカルで PostgreSQL が起動しているか、またはクラウドDB（Neon 等）の接続文字列が正しいか確認してください。

### Neon / SSL 関連エラー

```
Error: self signed certificate in certificate chain
```

→ Neon の接続文字列に `?sslmode=require` が含まれているか確認してください：

```
postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
```

### ポートが使用中

```
Error: listen EADDRINUSE: address already in use :::5000
```

→ 別のポートを指定してください：

```bash
PORT=3000 npm run start
```

### ログインできない

- `ADMIN_USERNAME` と `ADMIN_PASSWORD` が正しく設定されているか確認
- 環境変数の変更後はサーバーを再起動してください（起動時にパスワードハッシュを生成するため）
- ブラウザのキャッシュ・Cookie をクリアして再試行
- **Docker / HTTP 環境でログインが通らない場合**: `NODE_ENV=production` のとき、セッション Cookie に `secure: true` が設定されます。HTTPS 経由でないと Cookie が送信されないため、ログインが機能しません。Docker Compose でのローカル動作確認時は `NODE_ENV=development` を設定するか、nginx + Let's Encrypt などで HTTPS を構成してからアクセスしてください。

### db:push が失敗する

```
Error: column "xxx" of relation "yyy" does not exist
```

→ `DATABASE_URL` が正しい接続先を指しているか確認し、再実行してください：

```bash
npm run db:push
```

---

## デプロイ先選択ガイド

| 要件 | 推奨 |
|------|------|
| 今すぐ試したい・Replit から離れたくない | **Replit Deploy** |
| 無料でずっと動かしたい・操作が簡単 | **Fly.io + Neon** |
| 管理画面が使いやすい・既存のRailwayアカウントがある | **Railway** |
| とにかく安く・自分でサーバー管理できる | **Ubuntu VPS** |
| 既存の Docker 環境に組み込みたい | **Docker Compose** |
