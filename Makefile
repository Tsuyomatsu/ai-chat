PROJECT_ID ?= ai-chat-498407
REGION     ?= asia-northeast1
SERVICE    ?= ai-chat
IMAGE      := gcr.io/$(PROJECT_ID)/$(SERVICE)

.PHONY: init dev build start deploy docker-build docker-push help

## 初期化: 依存関係のインストールと .env.local の雛形コピー
init:
	npm install
	@if [ ! -f .env.local ]; then \
		cp .env.local.example .env.local; \
		echo "⚠️  .env.local を作成しました。ANTHROPIC_API_KEY を設定してください。"; \
	fi

## 開発サーバー起動 (http://localhost:3000)
dev:
	npm run dev

## 本番ビルド
build:
	npm run build

## ビルド済みアプリをローカルで起動
start:
	npm run start

## Docker イメージのビルド
docker-build:
	docker build -t $(IMAGE) .

## Docker イメージを GCR にプッシュ
docker-push: docker-build
	docker push $(IMAGE)

## Cloud Run へのデプロイ（ビルド→プッシュ→デプロイを一括実行）
deploy: docker-push
	gcloud run deploy $(SERVICE) \
		--image $(IMAGE) \
		--region $(REGION) \
		--allow-unauthenticated \
		--set-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest

## ヘルプ
help:
	@echo ""
	@echo "使用可能なコマンド:"
	@grep -E '^## ' Makefile | sed 's/## /  make /' | sed 's/: /\t\t/'
	@echo ""
	@echo "デプロイ時は PROJECT_ID を指定してください:"
	@echo "  make deploy PROJECT_ID=my-project"
	@echo ""
