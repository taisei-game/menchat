# menchat

8人限定のモバイルファーストコミュニケーションWebアプリです。LINE LIFFで認証し、Firebase AuthenticationとFirestore、Cloudflare WorkersとR2を組み合わせて利用します。

## 現在の状態

コードは外部サービスの実値を含まない状態です。次の機能のコード基盤があります。

- LINE ID Token検証とFirebase Custom Token連携
- FirestoreによるTalk、掲示板、Shortsの購読・投稿
- Web Push購読保存とWorker送信APIの基盤
- manifestとService Worker

Firebase、LINE Developers、Cloudflare、R2、Vercelの実環境設定とデプロイはまだ行っていません。外部サービスを設定しない状態で、ログイン成功を偽装する処理はありません。

## 開発環境

- Node.js 20以上を推奨
- npm
- Next.js 16
- TypeScript
- Firebase SDK
- Cloudflare Wrangler

## 起動

```bash
npm install
cp .env.example .env.local
npm run dev
```

環境変数が未設定の場合、ログインは利用できず、アプリは設定不足を日本語で表示します。

## 検証コマンド

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run worker:typecheck
```

Firebase EmulatorのRulesテストはまだ構成していません。現在のVitestは入力検証と公開設定検証を対象にしています。

## 環境変数

### Next.jsの公開設定

`.env.local`へ設定します。`NEXT_PUBLIC_`の値はブラウザへ公開されるため、秘密情報を入れません。

```text
NEXT_PUBLIC_API_BASE_URL
NEXT_PUBLIC_MAX_UPLOAD_BYTES
NEXT_PUBLIC_VAPID_PUBLIC_KEY
NEXT_PUBLIC_LIFF_ID
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

写真・動画・ファイル送信は現在停止しています。Shortsの画面は残っていますが、現在作業中として利用できません。

### Cloudflare Workerの設定

Worker VariablesまたはSecretsへ設定します。

```text
CORS_ORIGIN
FIREBASE_PROJECT_ID
LINE_CHANNEL_ID
MAX_UPLOAD_BYTES
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
PUSH_TRIGGER_SECRET
VAPID_PRIVATE_KEY
VAPID_SUBJECT
```

次の値はSecretsとして登録します。

- `FIREBASE_PRIVATE_KEY`
- `PUSH_TRIGGER_SECRET`
- `VAPID_PRIVATE_KEY`

実際の鍵、ID、メールアドレスはリポジトリへ保存しません。

## Firebase設定

1. Firebaseプロジェクトを作成します。
2. Authenticationを有効化します。
3. Firestore Databaseを作成します。
4. Web Appの公開設定を`.env.local`へ設定します。
5. `firebase/firestore.rules`をデプロイします。
6. 必要な場合だけ`firebase/firestore.indexes.json`をデプロイします。

許可メンバーはFirestoreの次のドキュメントで管理します。

```text
members/line:{LINEのsub}
```

最低限、次を登録します。

```text
isActive: true
```

表示名、プロフィール画像、最終ログイン時刻はLINE認証時にWorkerが既存メンバーへ同期します。8人の実IDはコードやREADMEへ記載しません。

## LINE Developers / LIFF

1. LINE DevelopersでLIFFアプリを作成します。
2. LIFFのEndpoint URLをNext.js本番URLにします。
3. LIFF IDを`NEXT_PUBLIC_LIFF_ID`へ設定します。
4. Workerの`LINE_CHANNEL_ID`へ対応するチャネルIDを設定します。
5. 本番URLがHTTPSであることを確認します。

コードはLIFFからID Tokenを取得し、WorkerがLINE公式検証APIで`sub`を検証します。許可されたメンバーだけにFirebase Custom Tokenを発行します。表示名は主キーに使いません。

LINEプロフィール情報が取得できない場合でも、許可判定と認証が成功すればログインは継続します。

## Cloudflare Worker

Workerのローカル開発・デプロイコマンドです。

```bash
npm run worker:dev
npm run worker:deploy
```

Worker APIは次を提供します。

- `GET /health`
- `POST /auth/line`
- `POST /notifications/send`
- `POST /notifications/dispatch`

WorkerはLINE認証、Firebase Custom Token、メンバー認証、通知、health checkを担当します。R2接続やファイルアップロードAPIは現在ありません。

## Web Push

設定画面からPush購読を取得し、Firestoreの`notificationSubscriptions`へ保存します。通知設定は`notificationSettings/{uid}`へ保存します。

Workerの`POST /notifications/send`は、`PUSH_TRIGGER_SECRET`で保護された送信APIです。VAPID秘密鍵はWorkerだけが保持し、ブラウザには公開鍵だけを渡します。

Talk、掲示板、Shortsの投稿成功後にクライアントがWorkerの`/notifications/dispatch`を呼びます。WorkerはFirebase ID Tokenと投稿所有者を再検証してから、送信者以外の購読端末へ通知します。通知送信失敗は投稿失敗にはしません。

iPhone/iPadは、対応OSのSafariでホーム画面へ追加したPWAとして利用する必要があります。AndroidもHTTPS、Service Worker、通知許可が必要です。ブラウザやOSがPush非対応の場合は利用できません。

## デプロイ

GitHub Actions、GitHub Pages、Vercel、Cloudflare Pagesのデプロイ設定はリポジトリにありません。

Next.jsはVercelへのデプロイを推奨します。GitHub PagesはNext.jsの動的ルートと通常のNext.jsサーバー処理をそのまま実行できないため、現在の構成には適しません。

Vercel側で次の公開環境変数を設定します。

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_MAX_UPLOAD_BYTES`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_LIFF_ID`
- Firebaseの`NEXT_PUBLIC_`設定一式

公開後、Firebase Authorized Domains、LINE LIFF Endpoint URL、Workerの`CORS_ORIGIN`を本番URLに合わせます。

## コード側と外部設定の境界

### コード側にあるもの

- LINE Token検証とFirebase Custom Token連携
- Firebase Auth状態管理
- Talk、掲示板、ShortsのFirestore処理
- 共通multipartアップロード
- Web Push購読保存とWorker送信API
- Service Worker通知表示
- Firestore Rules

### コード側で追加確認・改善が必要なもの

- Firestore EmulatorによるRulesテスト
- Firestore書き込みから通知送信を呼ぶイベント処理
- Shortsの写真・動画共有機能

### 外部設定が必要なもの

- Firebaseプロジェクト、Authentication、Firestore
- 8人の`members`登録
- LINE Developers / LIFF
- Cloudflare Worker VariablesとSecrets
- Vercelまたは別のHTTPSホスティング
- VAPID鍵
- 本番ドメインを使う場合のDNS
# menchat