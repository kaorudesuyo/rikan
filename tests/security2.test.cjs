const fs=require('fs'),crypto=require('crypto'),path=require('path');
const R=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const h=R('public/index.html'), hdr=R('public/_headers');
let NG=0; const ng=m=>{console.log('  NG '+m);NG++};
console.log('=== 第1巡: CSPハッシュとスクリプト実行制御 ===');
const scripts=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const meta=(h.match(/Content-Security-Policy" content="([^"]+)"/)||[])[1]||'';
scripts.forEach((s,i)=>{const x="'sha256-"+crypto.createHash('sha256').update(s,'utf8').digest('base64')+"'";
 if(!meta.includes(x))ng('metaのCSPハッシュ不一致 #'+(i+1));
 if(!hdr.includes(x))ng('HTTPヘッダーのCSPハッシュ不一致 #'+(i+1));});
console.log('  インラインスクリプト'+scripts.length+'本');
if(/script-src[^;]*'unsafe-inline'/.test(meta))ng("script-srcにunsafe-inline");
if(/'unsafe-eval'/.test(meta))ng("unsafe-evalが有効");
['default-src','script-src','connect-src','frame-ancestors','base-uri','object-src','form-action']
 .forEach(k=>{if(!meta.includes(k+' '))ng('CSPに'+k+'がない')});
console.log('=== 第2巡: 危険なコードパターン ===');
const pats=[[/\beval\s*\(/,'eval'],[/new\s+Function\s*\(/,'new Function'],[/document\.write/,'document.write'],
 [/\.innerHTML\s*=\s*[a-zA-Z_$][\w$]*\s*[;)]/,'innerHTMLに変数を直接代入'],
 [/localStorage|sessionStorage|document\.cookie/,'ブラウザストレージ'],
 [/\bfetch\s*\(|XMLHttpRequest|WebSocket/,'外部通信'],
 [/https?:\/\/(?!www\.w3\.org)/,'外部URL'],[/<iframe|srcdoc/,'iframe'],[/\son(click|error|load|mouse\w+)=/,'インラインイベント属性']];
pats.forEach(([re,l])=>{const m=h.match(new RegExp(re.source,'g'));if(m)ng(l+' '+m.length+'件: '+m.slice(0,2).join(','))});
console.log('=== 第3巡: HTTPセキュリティヘッダー ===');
['Strict-Transport-Security','X-Content-Type-Options','X-Frame-Options','Referrer-Policy',
 'Permissions-Policy','Cross-Origin-Opener-Policy','Cross-Origin-Resource-Policy'].forEach(k=>{
 if(!hdr.includes(k))ng('ヘッダー欠落: '+k)});
console.log('  _headers行数:',hdr.split('\n').filter(x=>x.trim()).length);
console.log('\n=== 静的検査: 要修正 '+NG+' 件 ===');
process.exitCode=NG?1:0;
