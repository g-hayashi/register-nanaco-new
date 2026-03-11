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
node register-nanaco-gift.mjs <giftTextFile> <nanacoNumber> [--encoding <name>]
```

またはシェルラッパー:

```bash
./register-nanaco-gift.sh <giftTextFile> <nanacoNumber> [--encoding <name>]
```

## 引数

- `<giftTextFile>`: ギフトURLを含むテキスト
- `<nanacoNumber>`: 16桁のnanaco番号
- `--encoding <name>`: 入力ファイルの文字コードを指定（`utf-8`, `utf-16le`, `utf-16be`, `unicode`, `bigendianunicode`）

### `<giftTextFile>` のフォーマット

- 1行1URLでなくてもOKです。
- メール本文のような自由形式テキストから、登録URLを自動で抽出して処理します。
- 抽出対象は `https://www.nanaco-net.jp/pc/emServlet?gid=...` 形式のURLです。

例:

```text
いつもありがとうございます。
以下のURLから登録してください。
https://www.nanaco-net.jp/pc/emServlet?gid=0EkMX$S1%h8A76A
このメールは自動送信です。
```

## 環境変数

以下のどちらか一方だけを設定してください。

- `NANACO_PASSWORD`: nanacoモバイルログインのパスワード
- `NANACO_CARD_NUMBER`: nanacoカードログイン用の7桁カード番号

## 例

パスワードログイン:

```bash
export NANACO_PASSWORD='your-password'
node register-nanaco-gift.mjs mail-text.txt 1234567890123456
```

カード番号ログイン:

```bash
export NANACO_CARD_NUMBER='1234567'
./register-nanaco-gift.sh mail-text.txt 1234567890123456
```

## 補足

- すでに登録済みのギフトIDはスキップされます。
- 入力ファイル内に有効なギフトURL/IDが見つからない場合はエラー終了します。
