#!/usr/bin/env node
/**
 * 利瞰 RIKAN — ビルドスクリプト
 *
 * src/ の各パートを結合して public/index.html を生成する。
 * あわせて、インラインスクリプトの SHA-256 を計算し、
 * Content-Security-Policy の script-src に埋め込む（'unsafe-inline' を使わない）。
 *
 *   node build.mjs          … ビルド
 *   node build.mjs --check  … 生成物のCSPハッシュ整合を検証（CIやデプロイ前の確認用）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'public');
const read = (f) => readFileSync(join(SRC, f), 'utf8');
const sha256 = (s) => "'sha256-" + createHash('sha256').update(s, 'utf8').digest('base64') + "'";

/* ---------- データの安全な埋め込み ----------
   JSON をそのまま <script> 内に置くと、文字列中の "</script" でタグが閉じてしまう。
   HTMLパーサに解釈されうる文字をすべて Unicode エスケープする。 */
function embedJSON(raw) {
  const json = JSON.stringify(JSON.parse(raw)); // 妥当性検証を兼ねる
  const safe = json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  if (/<\/script/i.test(safe)) throw new Error('データ埋め込みの検証に失敗しました');
  return safe;
}

function build() {
  const head = read('01_head.html');
  const body = read('02_body.html');
  const scripts = [
    'window.__DATA__=' + embedJSON(read('data.json')) + ';',
    read('03_chart.js'),
    read('04_help.js'),
    read('05_app.js'),
  ];

  // CSP: インラインスクリプトはハッシュで許可し、それ以外の実行元をすべて遮断する
  const hashes = scripts.map(sha256).join(' ');
  const csp = [
    "default-src 'none'",
    `script-src ${hashes}`,
    "style-src 'unsafe-inline'",      // 生成HTMLのstyle属性に必要（スクリプト実行はできない）
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'none'",             // 外部送信を全面禁止（データ持ち出しの遮断）
    "manifest-src 'self' data:",
    "form-action 'none'",
    "frame-ancestors 'none'",         // クリックジャッキング対策
    "base-uri 'none'",                // <base>注入によるURL書き換え対策
    "object-src 'none'",
    "worker-src 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  const meta = `<meta http-equiv="Content-Security-Policy" content="${csp}">\n`;
  const headWithCSP = head.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">\n' + meta);
  if (headWithCSP === head) throw new Error('CSPメタタグの挿入位置が見つかりません');

  const html =
    headWithCSP +
    body +
    scripts.map((s) => '<script>' + s + '</script>\n').join('') +
    '</body>\n</html>\n';

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'index.html'), html, 'utf8');
  writeHeaders(csp);
  verify(html, scripts);
  console.log(`build: public/index.html  ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
  console.log(`       inline scripts: ${scripts.length} / CSP hashes: ${scripts.length}`);
  return html;
}

/* ---------- HTTPレスポンスヘッダーの生成 ----------
   CSPは meta と HTTP ヘッダーの両方に「同一のハッシュ」で出力する。
   片方だけ古いハッシュになるとスクリプトが全遮断されるため、必ずビルドで同時生成する。 */
function writeHeaders(csp) {
  const h = [
    '/*',
    '  Content-Security-Policy: ' + csp,
    '  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: no-referrer',
    '  Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), usb=(), xr-spatial-tracking=(), interest-cohort=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Cross-Origin-Resource-Policy: same-origin',
    '  X-DNS-Prefetch-Control: off',
    '  X-Permitted-Cross-Domain-Policies: none',
    '',
    '/index.html',
    '  Cache-Control: public, max-age=0, must-revalidate',
    '',
    '/*.png',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n');
  writeFileSync(join(OUT, '_headers'), h, 'utf8');
}

/* ---------- 生成物の自己検証 ----------
   ブラウザと同じ方法（<script>〜</script> の中身）で再抽出してハッシュを再計算し、
   CSPに記載した値と一致することを確かめる。ここが崩れると画面が真っ白になるため必須。 */
function verify(html, expected) {
  const cspMatch = html.match(/Content-Security-Policy" content="([^"]+)"/);
  if (!cspMatch) throw new Error('CSPが見つかりません');
  const declared = (cspMatch[1].match(/'sha256-[A-Za-z0-9+/=]+'/g) || []);
  const found = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (found.length !== expected.length) throw new Error(`スクリプト数の不一致: ${found.length} != ${expected.length}`);
  const actual = found.map(sha256);
  for (const h of actual) {
    if (!declared.includes(h)) throw new Error('CSPハッシュ不一致: ' + h);
  }
  for (const forbidden of ['http://', 'https://cdn', '<script src', 'eval(', 'new Function(']) {
    if (html.includes(forbidden)) throw new Error('禁止パターンを検出: ' + forbidden);
  }
  // HTTPヘッダー側のCSPとも突き合わせる
  const hp = join(OUT, '_headers');
  if (existsSync(hp)) {
    const hdr = readFileSync(hp, 'utf8');
    for (const h of actual) if (!hdr.includes(h)) throw new Error('_headers のCSPハッシュが古い: ' + h);
  }
  console.log('verify: CSPハッシュ ' + actual.length + '件 一致（meta / HTTPヘッダー両方） / 外部参照・動的評価なし');
}

if (process.argv.includes('--check')) {
  const html = readFileSync(join(OUT, 'index.html'), 'utf8');
  const found = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  verify(html, found);
} else {
  build();
}
