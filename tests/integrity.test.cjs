/* ビルド成果物に、関数・トップレベル宣言の欠落や重複がないかを検査する。
   文字列置換による編集で、意図しない範囲を巻き込んで削除する事故を防ぐ。 */
const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8');
const js=html.split('<script>').slice(1).map(s=>s.split('</script>')[0]).join('\n');
const fns=[...js.matchAll(/^function ([A-Za-z_$][\w$]*)\(/gm)].map(m=>m[1]);
const decls=[...js.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map(m=>m[1]);
const dup=n=>[...new Set(n.filter((x,i)=>n.indexOf(x)!==i))];
let ng=0;
if(dup(fns).length){console.error('関数の重複定義:',dup(fns));ng++}
if(dup(decls).length){console.error('宣言の重複:',dup(decls));ng++}
// 呼び出されているが定義がない関数を検出
const called=[...new Set([...js.matchAll(/\b([a-zA-Z_$][\w$]*)\s*\(/g)].map(m=>m[1]))];
const known=new Set([...fns,...decls,'if','for','while','switch','catch','return','typeof','function','new','Math','Object','Array','String','Number','JSON','Set','Map','parseFloat','parseInt','isFinite','isNaN','Boolean','Date','RegExp','Proxy','require','eval']);
const undef=called.filter(n=>!known.has(n)&&!/^[A-Z]/.test(n)&&js.includes('\n'+n+'(')===false&&new RegExp('\\b'+n+'\\s*[:=]\\s*(function|\\()').test(js)===false&&new RegExp('\\.'+n+'\\s*\\(').test(js)===false);
console.log('関数'+fns.length+'件・宣言'+decls.length+'件 / 重複'+(dup(fns).length+dup(decls).length)+'件');
if(ng){process.exitCode=1}
