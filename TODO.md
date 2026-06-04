# AI チャットアプリ 実装計画

## Phase 1: プロジェクト初期化

- [x] ディレクトリ構成を作成（`app/` `components/` `lib/`）
- [x] `package.json` 作成（next, react, @anthropic-ai/sdk, tailwindcss など）
- [x] `tsconfig.json` 作成
- [x] `next.config.ts` 作成（`output: 'standalone'` を含む）
- [x] `postcss.config.mjs` 作成（Tailwind v4 用）
- [ ] `.env.local` を作成し `ANTHROPIC_API_KEY` を設定 ※手動で設定が必要
- [x] `.env.local.example` を作成（キーの雛形）
- [x] `.gitignore` に `.env.local` を追加
- [x] `npm install` で依存関係をインストール

## Phase 2: 型・定数定義

- [x] `types.ts`：`Message` 型（`role: 'user' | 'assistant'`、`content: string`）を定義
- [x] `lib/systemPrompt.ts`：Claude へのシステムプロンプトを定義（丁寧な敬語・日本語固定）

## Phase 3: API ルート実装

- [x] `app/api/chat/route.ts` を作成
  - [x] `POST` ハンドラーで `messages` を受け取る
  - [x] `ANTHROPIC_API_KEY` 未設定時に 500 エラーを返す
  - [x] `anthropic.messages.stream()` でストリーミングリクエスト
  - [x] `ReadableStream` を使って SSE としてクライアントに返す
  - [x] レート制限・認証エラーを適切なステータスコードで返す

## Phase 4: UI 実装

- [x] `app/globals.css` 作成（`@import "tailwindcss"`）
- [x] `app/layout.tsx` 作成（メタデータ・日本語設定）
- [x] `app/page.tsx` 作成（`ChatApp` を呼び出すだけ）
- [x] `components/ChatApp.tsx` を作成（`'use client'`）
  - [x] `messages` 状態管理（`useState`）
  - [x] ストリーミングレスポンスを読み取り文字を順次 UI に反映
  - [x] メッセージ一覧の表示（ユーザー／AI で吹き出しを出し分け）
  - [x] テキスト入力フォーム（Enter 送信・Shift+Enter 改行）
  - [x] 送信中は入力・ボタンを無効化
  - [x] 会話リセットボタン
  - [x] 最新メッセージへの自動スクロール

## Phase 5: デプロイ準備

- [x] `Dockerfile` 作成（Node.js standalone ビルド用）
- [ ] Cloud Run デプロイ手順を確認・ドキュメント化 ※デプロイ時に実施

## Phase 6: 動作確認

- [ ] `npm run dev` でローカル起動確認 ※ANTHROPIC_API_KEY 設定後に実施
- [ ] チャットの送受信が正常に動作するか確認
- [ ] ストリーミング表示が正しく動作するか確認
- [ ] リセットボタンで履歴がクリアされるか確認
- [x] `npm run build` でビルドエラーがないか確認

---

## 残タスク（不足している実装）

### 🔴 クリティカル（動作・セキュリティに影響）

- [ ] `public/` ディレクトリを作成する
  - Dockerfile の `COPY --from=builder /app/public ./public` が `public/` 未存在でビルドエラーになる
- [ ] `.dockerignore` を作成する
  - 未設定だと `.env.local`（APIキー）や `node_modules/` が Docker イメージに混入するリスクがある
  - 除外すべき対象: `.env.local`, `node_modules/`, `.next/`, `.git/`
- [ ] API ルートのリクエストパースに try/catch を追加する
  - `request.json()` が不正 JSON を受け取ると未処理の例外で 500 エラーになる
  - バリデーション: `messages` が配列かどうかの確認も追加する

### 🟠 重要（本番運用・UX に影響）

- [ ] ストリーミング中断ボタン（Stop ボタン）を実装する
  - `AbortController` を使い、クライアント・サーバー双方でキャンセルできるようにする
  - `fetch('/api/chat', { signal: controller.signal })` でフロント側を中断
  - API ルートで `request.signal` を Claude SDK に渡してサーバー側も中断する
- [ ] 会話履歴の上限を設ける（トークン管理）
  - 現状は無制限に蓄積し、全履歴を毎回 API に送信するためトークン上限に達するリスクがある
  - 直近 N 件（例: 20件）のみ送信する、または合計トークン数を推定して切り詰める
- [ ] API ルートに簡易レート制限を追加する
  - 制限なしでは API クレジットが無制限に消費される
  - IP ベースの簡易制限（例: 1分間に 10 リクエストまで）を `Map` + タイムスタンプで実装する
- [ ] HTTP エラーレスポンスの内容をユーザーに表示する
  - 現状: `res.ok` が `false` のとき固定文字列のみ表示
  - 改善: `await res.json()` で `{ error: '...' }` を取得してユーザーに表示する

### 🟡 UX 改善

- [ ] メッセージ送信後にテキストエリアへフォーカスを戻す
  - `handleSend` の末尾で `textareaRef.current?.focus()` を呼ぶ
- [ ] エラーメッセージを通常のAI返答と視覚的に区別する
  - エラー時の吹き出しを赤系のスタイル（例: `bg-red-50 text-red-600 border-red-200`）にする
  - `Message` 型に `isError?: boolean` フィールドを追加するか、別途 `error` フィールドで管理する
- [ ] メッセージキーをインデックスから一意 ID に変更する
  - 現状: `key={i}`（配列インデックス）はリスト操作時に React の差分検出が誤る可能性がある
  - 改善: `Message` 型に `id: string` を追加し `crypto.randomUUID()` で生成する

### 🔵 本番対応

- [ ] Cloud Run デプロイ手順を CLAUDE.md に詳細化する
  - Secret Manager への API キー登録手順
  - `gcloud` CLI の前提条件（認証・プロジェクト設定）
  - Artifact Registry への移行（GCR は非推奨）を検討する
- [ ] `make deploy` に `PROJECT_ID` 未設定時のガード処理を追加する
  - デフォルト値 `your-gcp-project-id` のままデプロイされないよう、変数チェックを入れる
