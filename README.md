# register-nanaco

nanacoギフトをまとめて登録するためのPlaywrightスクリプトです。

## 前提

- Node.js 18 以上
- Google Chrome

## セットアップ

```bash
npm install
npx playwright install chrome
```

## 使い方

```bash
node register-nanaco-gift.mjs <giftTextFile> <nanacoNumber> [--card-number <7digits>] [--encoding <name>]
```

またはシェルラッパー:

```bash
./register-nanaco-gift.sh <giftTextFile> <nanacoNumber> [--card-number <7digits>] [--encoding <name>]
```

## 引数

- `<giftTextFile>`: ギフトURLを含むテキスト
- `<nanacoNumber>`: 16桁のnanaco番号
- `--card-number <7digits>`: nanacoカードログイン用の7桁カード番号
- `--encoding <name>`: 入力ファイルの文字コードを指定（`utf-8`, `utf-16le`, `utf-16be`, `unicode`, `bigendianunicode`）

## 環境変数

以下を必要に応じて設定してください。

- `NANACO_PASSWORD`: nanacoモバイルログインのパスワード

## 例

パスワードログイン:

```bash
export NANACO_PASSWORD='your-password'
./register-nanaco-gift.sh mail-text.txt 1234567890123456
```

カード番号ログイン:

```bash
./register-nanaco-gift.sh mail-text.txt 1234567890123456 --card-number 1234567
```

## 補足

- すでに登録済みのギフトIDはスキップされます。
- 入力ファイル内に有効なギフトURL/IDが見つからない場合はエラー終了します。
