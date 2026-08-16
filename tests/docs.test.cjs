const fs=require('fs'),path=require('path');
const R=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=R('public/index.html'), help=R('src/04_help.js'), app=R('src/05_app.js'), body=R('src/02_body.html');
const D=JSON.parse(html.match(/window\.__DATA__=(\[[\s\S]*?\]);<\/script>/)[1].replace(/\\u003c/g,'<').replace(/\\u003e/g,'>'));
const B=D.filter(d=>d.a!=='XX');
const EL=B.filter(d=>!d.pt&&d.yra!=null&&d.yna!=null&&d.oer!=null&&d.ug!=null&&d.ap!=null);
let ng=0; const NG=(m)=>{console.log('  NG '+m);ng++};
console.log('【第1巡】数値の実データ照合');
const nums={'1,257':D.length,'1,233':B.length,'199物件':EL.length,'162物件':B.filter(d=>d.bm).length,
 '136物件':EL.filter(d=>d.occ===100).length,'116物件':EL.filter(d=>d.ut!=null&&d.ut>0&&d.nla&&d.ap).length,
 '55物件':EL.filter(d=>d.ut===0).length,'193物件':B.filter(d=>d.oer!=null&&d.oer>0&&d.oer<95).length};
Object.entries(nums).forEach(([s,v])=>{const cnt=(help.match(new RegExp(s.replace(',','\\,'),'g'))||[]).length;
 const exp=String(v).replace(/\B(?=(\d{3})+(?!\d))/g,',');
 if(cnt&&!s.startsWith(exp))NG('"'+s+'" が実データ '+exp+' と不一致');});
console.log('  照合'+Object.keys(nums).length+'項目');
console.log('【第2巡】ヘルプキーの参照整合');
const def=new Set([...help.matchAll(/^([a-z_]+):\{c:'/gm)].map(m=>m[1]));
[...new Set([...html.matchAll(/data-h="([a-z_]+)"/g)].map(m=>m[1]))].forEach(k=>{if(!def.has(k))NG('未定義キー '+k)});
[...new Set([...app.matchAll(/HB\('([a-z_]+)'/g)].map(m=>m[1]))].forEach(k=>{if(!def.has(k))NG('HB未定義 '+k)});
console.log('  定義'+def.size+'項目');
console.log('【第3巡】旧仕様の残存');
[[/稼働安定(?!（期末稼働率）)/g,'旧軸名'],[/segX[^)]*延床面積/g,'削除指標（軸の選択肢）'],[/203物件|198物件/g,'旧物件数'],
 [/認証数＋DBJ星数/g,'旧環境スコア'],[/0\.279/g,'旧相関値'],[/横軸が築年数/g,'旧軸固定'],
 [/取得価格<\/b>ベースの実績値/g,'旧利回り基準']].forEach(([re,l])=>{
 [[help,'help'],[body,'body'],[app,'app']].forEach(([s,n])=>{const m=s.match(re);if(m)NG(l+' in '+n+' ×'+m.length)})});
console.log('【第4巡】必須項目の充足');
const items=[...help.matchAll(/^([a-z_]+):\{c:'([A-Z]+)',t:'([^']*)'([\s\S]*?)\n(?=[a-z_]+:\{c:'|\};)/gm)];
items.forEach(m=>{if(!/d:\[/.test(m[4]))NG(m[1]+' に本文なし');
 if(m[3].length<3)NG(m[1]+' のタイトルが短すぎ');
 const d=(m[4].match(/'[^']{20,}'/g)||[]);if(d.length<1)NG(m[1]+' の説明が不十分')});
console.log('  '+items.length+'項目を検査');
console.log('【第5巡】文言の一貫性');
/* 「標準偏差」「当初は取得価格ベースだった」といった正当な記述は除外する */
const pairs=[['偏差値',/(?<!標準)偏差(?!値)/g,'偏差の単独使用'],
 ['環境・省エネ',/環境性能(?!評価|に加え)/g,'旧軸名'],
 ['鑑定評価額',/(?<!当初は|以前は)取得価格を分母と(?!していました)/g,'取得価格を現行基準と誤記']];
pairs.forEach(([good,bad,l])=>{const m=help.match(bad);if(m)NG(l+' ×'+m.length+' : '+m.slice(0,2).join(','))});
console.log('\n=== 総合: 要修正 '+ng+' 件 ===');
process.exitCode=ng?1:0;
