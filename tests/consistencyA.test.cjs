const {JSDOM}=require('jsdom');const fs=require('fs');
const H=fs.readFileSync(__dirname+'/../public/index.html','utf8');
const D=JSON.parse(H.match(/window\.__DATA__=(\[[\s\S]*?\]);<\/script>/)[1].replace(/\\u003c/g,'<').replace(/\\u003e/g,'>'));
const ctx=()=>new Proxy({},{get:(t,k)=>{if(k==='measureText')return s=>({width:20});
 if(['font','fillStyle','strokeStyle','lineWidth','textAlign','textBaseline'].includes(k))return t[k]||'';return ()=>{}},set:(t,k,v)=>{t[k]=v;return true}});
const errs=[];const dom=new JSDOM(H,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
 w.HTMLCanvasElement.prototype.getContext=()=>ctx();
 w.Element.prototype.getBoundingClientRect=()=>({left:0,top:0,width:900,height:320,right:900,bottom:320});
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 900}});
 Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 320}});
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};w.addEventListener('error',e=>errs.push(e.message));}});
const w=dom.window,d=w.document;
/* アプリと同じ中央値定義（偶数個は中央2値の平均）を使う */
const med=a=>{a=[...a].sort((x,y)=>x-y);const n=a.length;
  return n?(n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2):null};
let NG=0;const ng=m=>{console.log('  NG '+m);NG++};
setTimeout(()=>{
 const B=D.filter(x=>x.a!=='XX');
 const bs=[...d.querySelectorAll('#segScope button')];
 console.log('【監査1】KPIの数値が実データと一致するか');
 [['OF',0],['RS',1]].forEach(([u,i])=>{
  bs[i].click();[...d.querySelectorAll('#bnav button')][0].click();
  const t=d.getElementById('kpis').textContent.replace(/\s+/g,'');
  const V=B.filter(x=>x.u===u);
  const m=t.match(/^([\d,]+)物件/);
  if(!m||m[1].replace(/,/g,'')!==String(V.length))ng(u+' 物件数 表示'+(m?m[1]:'—')+' 実'+V.length);
  const yv=V.filter(x=>x.yra>0&&x.yra<15).map(x=>x.yra);
  const my=t.match(/([\d.]+)%粗利回り中央値/);
  if(!my||Math.abs(+my[1]-med(yv))>0.005)ng(u+' 粗利回り 表示'+(my?my[1]:'—')+' 実'+med(yv).toFixed(2));
 });
 console.log('  検査2用途×2指標');
 console.log('【監査2】評価タブ: 基準線=各軸50 / 順位・グレード整合');
 let bad=0,tot=0;
 [0,1].forEach(i=>{bs[i].click();[...d.querySelectorAll('#bnav button')][3].click();
  const v=[...d.querySelectorAll('#valCard .kpitab tbody tr')].map(r=>+r.querySelector('.pbar .p').textContent);
  if(!v.every(x=>x===50))ng('基準線が50でない: '+v.join(','));
  const s=d.getElementById('vSel');
  [...s.options].slice(1).forEach(o=>{s.value=o.value;s.dispatchEvent(new w.Event('change'));tot++;
   const t=d.getElementById('valCard').textContent.replace(/\s+/g,' ');
   const m=t.match(/(\d+)物件中 (\d+)位/);
   if(!m||+m[2]<1||+m[2]>+m[1]){bad++;return}
   const g=(t.match(/(AAA|AA|BBB|BB|CCC|A|B|C)・/)||[])[1];
   const q=+m[2]/+m[1];
   const exp=q<=0.05?'AAA':q<=0.15?'AA':q<=0.30?'A':q<=0.50?'BBB':q<=0.70?'BB':q<=0.85?'B':'C';
   if(g!==exp)bad++;
   if(/undefined|NaN/.test(t))bad++;});});
 if(bad)ng('評価カードの不整合 '+bad+'/'+tot);
 console.log('  '+tot+'物件を検査');
 console.log('【監査3】削除した機能の残存');
 if(d.getElementById('leedCard'))ng('LEEDカードが残存');
 if(d.getElementById('vUse'))ng('用途プルダウンが残存');
 [['#segCertG','用途'],['#segCovG','用途']].forEach(([sel,lab])=>{
  if([...d.querySelectorAll(sel+' button')].some(b=>b.textContent===lab))ng(sel+'に「'+lab+'」が残存')});
 if(H.includes('LEED取得物件 vs'))ng('LEED比較の文言が残存');
 console.log('【監査4】全ビュー×全セグメント×両用途で異常表記');
 let e0=errs.length,bad2=0,n=0;
 [0,1].forEach(i=>{bs[i].click();
  [...d.querySelectorAll('#bnav button')].forEach(b=>{b.click();
   [...d.querySelectorAll('#subtabs button')].forEach(s=>s.click());
   [...d.querySelectorAll('.view.on .seg button, .pane.on .seg button')].forEach(x=>{x.click();n++;
    const t=d.querySelector('.view.on').textContent;
    if(/undefined|NaN|null|n=0\)/.test(t))bad2++;});});});
 if(bad2)ng('異常表記 '+bad2+'件');
 if(errs.length>e0)ng('実行時エラー '+(errs.length-e0));
 console.log('  '+n+'操作を検査');
 console.log('【監査5】ヘルプの参照整合と陳腐化');
 const help=fs.readFileSync(__dirname+'/../src/04_help.js','utf8');
 const def=new Set([...help.matchAll(/^([a-z_]+):\{c:'/gm)].map(m=>m[1]));
 [...new Set([...H.matchAll(/data-h="([a-z_]+)"/g)].map(m=>m[1]))].forEach(k=>{if(!def.has(k))ng('未定義ヘルプ '+k)});
 [[/認証数＋DBJ星数/,'旧環境スコア'],[/稼働安定(?!（期末稼働率）)/,'旧軸名'],[/203物件|198物件/,'旧物件数']]
  .forEach(([re,l])=>{if(re.test(help))ng(l+'が残存')});
 console.log('\n=== 監査結果: 要修正 '+NG+' 件 / エラー '+errs.length+' ===');if(NG||errs.length)process.exitCode=1;
},1000);
