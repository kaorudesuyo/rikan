/* 新機能（PM会社名・スポンサー系判定・用途スコープ・ドリルダウン）の攻撃面を検証 */
const {JSDOM}=require('jsdom');const fs=require('fs');
let html=fs.readFileSync(require('path').join(__dirname,'../public/index.html'),'utf8');
const PAY=[`<img src=x onerror="window.__X1=1">`,`"><script>window.__X2=1<\/script>`,
 `' onmouseover='window.__X3=1`,`<svg onload=window.__X4=1>`,`javascript:window.__X5=1`];
html=html.replace(/window\.__DATA__=(\[[\s\S]*?\]);/,(m,j)=>{
 const arr=JSON.parse(j.replace(/\\u003c/g,'<').replace(/\\u003e/g,'>').replace(/\\u0026/g,'&'));
 // PM会社名・系列・スポンサー判定に攻撃ペイロードを注入
 arr[0].pm_co=PAY[0]; arr[0].pm_gr=PAY[1]; arr[0].pm_sp=PAY[2];
 arr[1].pm_co=PAY[3]; arr[1].pm_sp=PAY[4];
 arr[2].pm_co='__proto__'; arr[2].pm_sp='constructor';
 return 'window.__DATA__='+JSON.stringify(arr).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')+';';});
const ctx=()=>new Proxy({},{get:(t,k)=>{if(k==='measureText')return s=>({width:20});
 if(['font','fillStyle','strokeStyle','lineWidth','textAlign','textBaseline'].includes(k))return t[k]||'';return ()=>{}},set:(t,k,v)=>{t[k]=v;return true}});
const errs=[];const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
 w.HTMLCanvasElement.prototype.getContext=()=>ctx();
 w.Element.prototype.getBoundingClientRect=()=>({left:0,top:0,width:900,height:320,right:900,bottom:320});
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 900}});
 Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 320}});
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};w.addEventListener('error',e=>errs.push(e.message));}});
const w=dom.window,d=w.document;
let NG=0;const ng=m=>{console.log('  NG '+m);NG++};
setTimeout(()=>{
 console.log('=== 第4巡: 新機能の汚染データ耐性 ===');
 // 全ビュー・全ペイン・ドリルダウンを巡回
 [...d.querySelectorAll('#segScope button')].forEach(sb=>{sb.click();
  [...d.querySelectorAll('#bnav button')].forEach(b=>{b.click();
   [...d.querySelectorAll('#subtabs button')].forEach(s=>s.click());});
  const cv=d.getElementById('chPmSpon');
  if(cv)for(let y=20;y<200;y+=25)cv.dispatchEvent(new w.MouseEvent('click',{clientY:y}));});
 // 物件一覧と評価カード
 [...d.querySelectorAll('#bnav button')][2].click();
 [...d.querySelectorAll('#bnav button')][3].click();
 const s=d.getElementById('vSel');[...s.options].slice(0,5).forEach(o=>{s.value=o.value;s.dispatchEvent(new w.Event('change'))});
 const fired=[1,2,3,4,5].filter(i=>w['__X'+i]);
 if(fired.length)ng('XSS発火 '+fired.join(','));
 const inj=d.querySelectorAll('img,iframe,object,embed,svg[onload],[onerror],[onmouseover],[onload]');
 const sc=d.querySelectorAll('script').length;
 if(sc!==4)ng('scriptタグが'+sc+'本（正は4本）');
 console.log('  XSS発火:',fired.length?'あり':'なし','／注入要素:',inj.length,'／scriptタグ:',sc);
 if(({}).polluted!==undefined||Object.prototype.polluted!==undefined)ng('プロトタイプ汚染');
 // 生タグの残存
 ['plist','pmTable','pmDrill','valCard'].forEach(id=>{const e=d.getElementById(id);
  if(e&&/<img|onerror=|onmouseover=|<svg onload/.test(e.innerHTML))ng(id+'に生タグ残存')});
 console.log('=== 第5巡: DOM改ざん耐性 ===');
 // 不正な用途スコープ値を注入
 const btn=d.createElement('button');btn.textContent='X';
 d.getElementById('segScope').appendChild(btn);btn.click();
 // 不正な物件IDを選択
 const o=d.createElement('option');o.value='__proto__';s.appendChild(o);
 s.value='__proto__';s.dispatchEvent(new w.Event('change'));
 const t=d.getElementById('valCard').textContent;
 if(/undefined|NaN/.test(t))ng('不正IDで異常表示');
 if(({}).polluted!==undefined)ng('プロトタイプ汚染(選択経由)');
 console.log('  不正ID選択:',/平均像|の平均/.test(t)?'フォールバックOK':'NG');
 console.log('  実行時エラー:',errs.length);
 if(errs.length)ng('実行時エラー'+errs.length);
 console.log('\n=== 動的検査: 要修正 '+NG+' 件 ===');
 process.exitCode=NG?1:0;
},1000);
