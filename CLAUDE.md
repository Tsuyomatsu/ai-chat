# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

日本語対応の雑談・トーク相手 AI チャットボット。Claude API（Anthropic）を使いストリーミングで応答する Web アプリ。ログイン不要・会話履歴はセッション内のみ保持。

## 技術スタック

| 用途 | 採用技術 |
|------|---------|
| フレームワーク | Next.js 15（App Router） |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| AI | Claude API（`@anthropic-ai/sdk`） |
| デプロイ | Google Cloud Run |

## アーキテクチャ

```
app/
├── api/chat/route.ts      # Streaming API エンドポイント（Server）
├── layout.tsx             # ルートレイアウト
├── page.tsx               # エントリポイント → ChatApp を描画
└── globals.css            # Tailwind インポート
components/
└── ChatApp.tsx            # 'use client' チャット UI 全体
lib/
└── systemPrompt.ts        # Claude へのシステムプロンプト定義
types.ts                   # Message 型定義
```

### データフロー

1. ユーザーがメッセージ送信 → `ChatApp.tsx` が `POST /api/chat` を呼ぶ
2. `app/api/chat/route.ts` が Claude API へストリーミングリクエスト
3. `ReadableStream` で SSE としてクライアントに返す
4. `ChatApp.tsx` が `ReadableStream` を読み取り、文字を順次 UI に反映

会話履歴は `ChatApp.tsx` の `useState` で管理。ページリロードでリセット。

## AI 設定

- **モデル**: `claude-sonnet-4-6`（最新モデルに変更可）
- **口調**: 丁寧な敬語（システムプロンプトで指定）
- **言語**: 日本語固定（システムプロンプトで指定）
- **ストリーミング**: 有効（`stream: true`）

システムプロンプトは `lib/systemPrompt.ts` に集約し、変更しやすくする。

## 環境変数

```bash
ANTHROPIC_API_KEY=sk-ant-...   # 必須
```

`.env.local` に記載。本番は Cloud Run のシークレットマネージャーで管理。

## 開発コマンド

```bash
npm install          # 依存関係インストール
npm run dev          # 開発サーバー起動 → http://localhost:3000
npm run build        # 本番ビルド
npm run start        # 本番サーバー起動
```

## デプロイ（Cloud Run）

```bash
# Docker ビルド & プッシュ
docker build -t gcr.io/<PROJECT_ID>/ai-chat .
docker push gcr.io/<PROJECT_ID>/ai-chat

# Cloud Run にデプロイ
gcloud run deploy ai-chat \
  --image gcr.io/<PROJECT_ID>/ai-chat \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest
```

`Dockerfile` は Node.js の standalone 出力を使用（`output: 'standalone'` in `next.config.ts`）。

## 実装上の注意

- ストリーミングレスポンスは `Response` に `ReadableStream` を渡す形で実装（`StreamingTextResponse` ヘルパーは使わない）
- Claude API のエラー（レート制限・認証エラー）は `api/chat/route.ts` でキャッチし、適切なステータスコードで返す
- `ANTHROPIC_API_KEY` が未設定の場合は起動時にわかりやすいエラーを出す
