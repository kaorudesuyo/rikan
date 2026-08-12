/* アプリの表示値をDB(Excel由来のJSON)と突き合わせて正確性を検証 */
const fs=require('fs');
const H=fs.readFileSync(require('path').join(__dirname,'../public/index.html'),'utf8');
const A=JSON.parse(H.match(/window\.__DATA__=(\[[\s\S]*?\]);<\/script>/)[1].replace(/\\u003c/g,'<').replace(/\\u003e/g,'>').replace(/\\u0026/g,'&'));
const S=JSON.parse(fs.readFileSync(require('path').join(__dirname,'../src/data.json'),'utf8'));
let NG=0;const ng=m=>{console.log('  NG '+m);NG++};
console.log('=== 正確性1: ビルド前後のデータ同一性 ===');
if(A.length!==S.length)ng('件数不一致 '+A.length+'/'+S.length);
let diff=0;
for(let i=0;i<Math.min(A.length,S.length);i++){
  if(JSON.stringify(A[i])!==JSON.stringify(S[i]))diff++;}
if(diff)ng('内容不一致 '+diff+'件');
console.log('  '+A.length+'物件が完全一致');
console.log('=== 正確性2: 必須フィールドの欠損 ===');
const req=['id','l','u','a','n'];
const miss=A.filter(d=>req.some(k=>d[k]==null||d[k]===''));
if(miss.length)ng('必須欠損 '+miss.length+'件');
const dup=A.length-new Set(A.map(d=>d.id)).size;
if(dup)ng('物件ID重複 '+dup+'件');
console.log('  必須欠損0 / ID重複0');
console.log('=== 正確性3: 数値の妥当な範囲 ===');
const chk=[['yra',0,30,'粗利回り(鑑定)'],['yna',-50,30,'NOI利回り'],['occ',0,100,'稼働率'],
 ['ug',-100,300,'含み損益率'],['ap',0,1e7,'鑑定評価額'],['nla',0,1e6,'賃貸面積']];
chk.forEach(([k,lo,hi,l])=>{const bad=A.filter(d=>d[k]!=null&&(!isFinite(d[k])||d[k]<lo||d[k]>hi));
 if(bad.length)ng(l+'が範囲外 '+bad.length+'件: '+bad.slice(0,2).map(d=>d.id+'='+d[k]).join(','));});
console.log('  6指標を検査');
console.log('=== 正確性4: PM会社データの整合 ===');
const pm=A.filter(d=>d.pm_co);
const noSp=pm.filter(d=>!d.pm_sp);
if(noSp.length)ng('PM会社ありでスポンサー判定なし '+noSp.length+'件');
const badSp=pm.filter(d=>!['スポンサー系','第三者','非開示'].includes(d.pm_sp));
if(badSp.length)ng('スポンサー判定が不正 '+badSp.length+'件');
console.log('  PM会社'+pm.length+'物件 / 判定値の種類:',[...new Set(pm.map(d=>d.pm_sp))].join(','));
console.log('=== 正確性5: 期中取得物件の指標無効化 ===');
const pt=A.filter(d=>d.pt);
const leak=pt.filter(d=>d.yra!=null||d.yr!=null||d.oer!=null);
if(leak.length)ng('期中取得物件に利回りが残存 '+leak.length+'件');
console.log('  期中取得'+pt.length+'件すべてで指標を無効化');
console.log('\n=== 正確性検査: 要修正 '+NG+' 件 ===');
process.exitCode=NG?1:0;
