# 利瞰 RIKAN — J-REIT Yield Anatomy

J-REITオフィス系16法人・1,257物件の開示データベースを、AM・PM・BM・建築の視点で解剖する分析ダッシュボード。

外部CDN・外部フォント・外部APIを一切使用しない**完全自己完結型の静的サイト**です。ビルド成果物は `public/index.html` の1ファイルのみ（約395KB）で、通信は初回のHTML取得だけで完結します。

---

## 構成

```
rikan-app/
├── build.mjs              ビルド（結合・CSPハッシュ生成・自己検証）
├── netlify.toml           Netlifyのビルド設定とリダイレクト
├── src/
│   ├── 01_head.html       <head>・CSS・アイコン（データURI）
│   ├── 02_body.html       画面構造（5タブ）
│   ├── 03_chart.js        自前の描画エンジン（Canvas）
│   ├── 04_help.js         用語ヘルプ38項目
│   ├── 05_app.js          アプリ本体（状態管理・集計・描画）
│   └── data.json          1,257物件の分析用データセット
├── public/                ← ビルド生成物（コミット対象）
│   ├── index.html
│   ├── _headers           セキュリティヘッダー（CSPを含む・自動生成）
│   └── robots.txt
└── tests/                 実DOM（jsdom）による自動テスト
```

## 開発

```bash
npm install          # jsdom（テスト用）のみ
npm run build        # public/index.html と public/_headers を生成
npm test             # 全11本の自動テストを実行
npm run check        # 生成物のCSPハッシュ整合を検証
```

### 自動テストの構成

| テスト | 検査内容 |
|---|---|
| functional | 機能17項目（ナビ・用途スコープ・評価セレクタ・ヘルプ・一覧など） |
| stability | 20巡の反復操作で状態やリスナーが蓄積しないか |
| security | 汚染データ経由のXSS・プロトタイプ汚染 |
| security2 | CSPハッシュ整合・危険なコードパターン・HTTPヘッダー |
| security3 | PM会社名など新規フィールドの攻撃面・DOM改ざん耐性 |
| accuracy | ビルド前後のデータ同一性・欠損・数値範囲・PM判定・期中取得の無効化 |
| integrity | 関数と宣言の重複・欠落（置換ミスの検出） |
| docs | 説明文の数値と実データの照合・旧仕様の残存 |
| consistencyA/B | KPI・評価基準・提言・PMペインなど全10観点の整合性 |
| layout | 文字とバブルの重なり（複数画面幅） |

`src/` を編集したら **必ず `npm run build` を実行**してください。インラインスクリプトのSHA-256ハッシュをCSPに埋め込んでいるため、ビルドせずに `public/index.html` を直接編集すると、ブラウザがスクリプトを拒否して画面が表示されなくなります。ビルドはハッシュの再計算と整合検証を自動で行います。

---

## デプロイ手順

### 1. GitHubへ公開

```bash
cd rikan-app
git init
git add .
git commit -m "利瞰 RIKAN 初期リリース"
git branch -M main
git remote add origin https://github.com/<ユーザー名>/rikan-app.git
git push -u origin main
```

`public/` はビルド生成物ですが、**コミット対象に含めています**。Netlifyのビルドが失敗しても直前の成果物で配信を継続できるようにするためです。

### 2. Netlifyと連携

1. [Netlify](https://app.netlify.com/) にGitHubアカウントでログイン
2. **Add new site → Import an existing project → GitHub** を選び、`rikan-app` を選択
3. ビルド設定は `netlify.toml` から自動で読み込まれます（手入力は不要）
   - Build command: `node build.mjs`
   - Publish directory: `public`
4. **Deploy site** を押すと、1〜2分で `https://<ランダム名>.netlify.app` に公開されます

以降は `main` ブランチへpushするたびに自動で再ビルド・再デプロイされます。プルリクエストにはプレビューURLが自動発行されます。

### 3. 独自ドメインの紐付け

Netlifyの **Site configuration → Domain management → Add a domain** で取得済みドメインを入力し、DNSを設定します。

**A. ドメインをNetlify DNSで管理する場合（推奨）**

Netlifyが表示する4つのネームサーバー（例 `dns1.p01.nsone.net` 〜 `dns4.p01.nsone.net`）を、レジストラ（お名前.com、Cloudflare、Google Domainsなど）のネームサーバー設定に登録します。反映まで数分〜48時間。

**B. 外部DNSのままにする場合**

レジストラのDNSに以下を追加します。

| 種別 | ホスト | 値 |
|---|---|---|
| A | `@`（apex） | `75.2.60.5` |
| CNAME | `www` | `<サイト名>.netlify.app` |

※ apexのA レコードのIPはNetlifyの案内画面に表示される値を使用してください（変更される場合があります）。ALIAS/ANAMEに対応しているDNSであれば、Aレコードの代わりに apex を `<サイト名>.netlify.app` へ向けるほうが堅牢です。

**C. HTTPS**

ドメイン検証が完了すると Let's Encrypt 証明書が自動発行されます。**Domain management → HTTPS → Force HTTPS** を有効化してください。`netlify.toml` の設定により `www` は apex へ301リダイレクトされ、`Strict-Transport-Security` によって以降のアクセスは常にHTTPSになります。

> HSTSの `preload` を有効にしたまま公開すると、ブラウザのプリロードリストに登録申請できる状態になります。**サブドメインを含めて常時HTTPS化する確証がない場合は、`build.mjs` の `writeHeaders()` から `preload` と `includeSubDomains` を外してください。** 一度プリロードされると取り消しに数か月かかります。

---

## セキュリティ設計

| 脅威 | 対策 |
|---|---|
| XSS（保存型・DOM型） | データ由来の文字列はすべて `esc()` でHTMLエスケープ（`& < > " ' / \` =`）。ツールチップは `innerHTML` を使わずDOM APIで構築。`innerHTML` に変数を直接代入する箇所はゼロ |
| スクリプト注入 | CSP `script-src` はインライン4本のSHA-256ハッシュのみ許可。`'unsafe-inline'` `'unsafe-eval'` を使用せず、`eval` / `new Function` / `document.write` も不使用 |
| データ持ち出し | CSP `connect-src 'none'` / `default-src 'none'`。fetch・XHR・WebSocket・postMessageのコードも存在しない |
| クリックジャッキング | CSP `frame-ancestors 'none'` ＋ `X-Frame-Options: DENY` |
| URL書き換え | CSP `base-uri 'none'`（`<base>`注入の無効化）、`form-action 'none'` |
| MIMEスニッフィング | `X-Content-Type-Options: nosniff` |
| 中間者攻撃 | `Strict-Transport-Security`（2年・サブドメイン含む）、`upgrade-insecure-requests` |
| 情報漏えい | `Referrer-Policy: no-referrer`、`Cross-Origin-Opener-Policy`、`Cross-Origin-Resource-Policy` |
| 端末機能の悪用 | `Permissions-Policy` でカメラ・マイク・位置情報など全機能を無効化 |
| プロトタイプ汚染 | `data-h` 属性は正規表現と `hasOwnProperty` で検証。物件IDは既知集合との照合を通過した値のみ採用 |
| 個人情報 | Cookie・localStorage・sessionStorageを一切使用せず、収集・保存する情報なし |

### スコープ外（既知の受容リスク）

- `style-src 'unsafe-inline'`：グラフのバー幅などをstyle属性で表現しているため必要です。CSSからのスクリプト実行は不可能で、`connect-src 'none'` により外部送信もできないため、実害はありません。
- 本アプリは公開情報のみを扱い、認証・入力フォーム・サーバーサイド処理を持ちません。攻撃対象領域は「HTMLの配信」のみです。

---

## データの出典と限界

各投資法人の決算短信・決算説明資料・有価証券報告書・ESG開示（2024年11月末〜2026年6月末時点、法人により異なる）。利回りは直近開示期の年換算値÷取得価格による簡便値で、鑑定NOI利回りや実勢キャップレートとは異なります。物件別収支の開示方針は法人ごとに違い、テナントの同意が得られない物件は非開示です。したがって本アプリは「開示されている範囲での比較」であり、母集団は市場全体を代表するものではありません。

本アプリは情報提供を目的としたものであり、投資勧誘ではありません。

---

© 利瞰 RIKAN
