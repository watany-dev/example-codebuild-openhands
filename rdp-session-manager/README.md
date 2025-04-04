# RDP Session Manager

このプロジェクトは、AWS Session Managerを使用してRDPアクセスするためのEC2インスタンス、VPC、および特定のインスタンスにのみアクセスできるIAMユーザーをAWS CDKで作成します。

## アーキテクチャ

- VPC（パブリックサブネットとプライベートサブネット）
- プライベートサブネットに配置されたWindows Server EC2インスタンス
- 特定のEC2インスタンスにのみSession Managerでアクセスできるように制限されたIAMユーザー
- 必要最小限のアウトバウンドトラフィックのみを許可するセキュリティグループ

## デプロイ方法

1. 依存関係をインストール

```bash
npm install
```

2. CDKアプリケーションをビルド

```bash
npm run build
```

3. CDKアプリケーションをデプロイ

```bash
cdk deploy
```

## 使用方法

1. デプロイ後、出力されるIAMユーザー名を確認し、AWS Management Consoleでアクセスキーを作成します。

2. AWS CLIとSession Managerプラグインをインストールします。

3. 出力されるRDPコマンドを使用して、Session Manager経由でRDPポートフォワーディングを開始します：

```bash
aws ssm start-session --target i-xxxxxxxxx --document-name AWS-StartPortForwardingSession --parameters "portNumber=3389,localPortNumber=13389"
```

4. RDPクライアントを使用して、`localhost:13389`に接続します。

## セキュリティ

- EC2インスタンスはプライベートサブネットに配置され、インターネットからの直接アクセスはできません
- IAMユーザーは特定のEC2インスタンスにのみSession Managerでアクセスできるように制限されています
- セキュリティグループは必要最小限のアウトバウンドトラフィックのみを許可しています
