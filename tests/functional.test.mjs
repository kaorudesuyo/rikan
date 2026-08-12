import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const fs={readFileSync};
const html=readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const ctxMock=()=>new Proxy({},{get:(t,k)=>{
  if(k==='measureText')return s=>({width:String(s).length*6.2});
  if(['font','fillStyle','strokeStyle','lineWidth','textAlign','textBaseline'].includes(k))return t[k]||'';
  return ()=>{}},set:(t,k,v)=>{t[k]=v;return true}});
const errors=[];let W=390;
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,
  beforeParse(w){
    w.HTMLCanvasElement.prototype.getContext=function(){return ctxMock()};
    Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return W}});
    Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 250}});
    w.HTMLElement.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:W,height:250,right:W,bottom:250}};
    w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
    w.addEventListener('error',e=>errors.push((e.error&&e.error.stack||e.message)));
    w.console.error=(...a)=>errors.push('console.error: '+a.join(' '));
  }});
const w=dom.window,d=w.document;
const click=id=>{const e=d.getElementById(id);e&&e.dispatchEvent(new w.MouseEvent('click',{bubbles:true}))};
const setSel=(id,v)=>{const s=d.getElementById(id);s.value=v;s.dispatchEvent(new w.Event('change'))};
setTimeout(()=>{
 const R=[];
 // 1) 初期化
 R.push(['初期化エラー',errors.length===0]);
 R.push(['下部ナビ5項目',d.getElementById('bnav').children.length===5]);
 /* 上部の絞込プルダウンは用途スコープに置き換えたため、スコープの存在を検査する */
 R.push(['用途スコープ2種',d.querySelectorAll('#segScope button').length===2]);
 R.push(['評価タブの物件セレクタ',!!d.getElementById('vSel')&&d.getElementById('vSel').options.length>1]);
 // 2) 全ビュー巡回（ナビをクリック）
 const navs=[...d.querySelectorAll('#bnav button')];
 navs.forEach(b=>b.dispatchEvent(new w.MouseEvent('click',{bubbles:true})));
 R.push(['全ビュー遷移',errors.length===0]);
 // 3) 分析サブタブ
 navs[1].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 [...d.querySelectorAll('#subtabs button')].forEach(b=>b.dispatchEvent(new w.MouseEvent('click',{bubbles:true})));
 R.push(['サブタブ3種',errors.length===0]);
 // 4) 全セグメントボタンを総当たりクリック
 let segs=0;
 [...d.querySelectorAll('.seg button')].forEach(b=>{b.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));segs++});
 R.push(['セグメント'+segs+'個クリック',errors.length===0]);
 // 5) 絞込プルダウン総当たり
 let combos=0;
 [['selArea'],['selCorp'],['selAge'],['selCert'],['selEvl']].forEach(([id])=>{
   const s=d.getElementById(id);if(!s)return;[...s.options].forEach(o=>{setSel(id,o.value);combos++});setSel(id,'ALL')});
 [...d.querySelectorAll('#segScope button')].forEach(b=>{b.click();combos++});
 [...d.querySelectorAll('#segScope button')][0].click();
 R.push(['プルダウン'+combos+'通り',errors.length===0]);
 // 6) 評価タブ: 法人・用途・物件を総当たり
 navs[3].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 const vc=d.getElementById('vCorp');let vn=0;
 [...vc.options].forEach(o=>{setSel('vCorp',o.value);vn++});
 setSel('vCorp','ALL');
 /* 用途プルダウンは用途スコープ切替に置き換えたため、こちらを検査する */
 [...d.querySelectorAll('#segScope button')].forEach(b=>{b.click();vn++});
 [...d.querySelectorAll('#segScope button')][0].click();
 const vs=d.getElementById('vSel');const opts=[...vs.options].map(o=>o.value);
 opts.forEach(v=>{setSel('vSel',v);vn++});
 R.push(['評価セレクタ'+vn+'通り（物件'+(opts.length-1)+'件）',errors.length===0]);
 R.push(['評価カード描画',d.getElementById('valCard').textContent.indexOf('総評')>=0]);
 setSel('vSel','');
 R.push(['デフォルト=平均像',d.getElementById('valCard').textContent.indexOf('平均像')>=0]);
 // 7) ヘルプ: 全?ボタン
 let hb=0;[...d.querySelectorAll('.hlp')].forEach(b=>{b.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
   if(d.getElementById('hsheet').className.indexOf('open')<0)errors.push('help未開: '+(b.id||b.getAttribute('data-h'))+' / '+b.outerHTML.slice(0,80));hb++;
   const c=d.getElementById('hclose');c&&c.dispatchEvent(new w.MouseEvent('click',{bubbles:true}))});
 R.push(['ヘルプ'+hb+'個',errors.length===0]);
 // 用語集内のリンク
 click('glossBtn');
 const gl=[...d.querySelectorAll('#hpn button[data-h]')];
 gl.forEach(b=>b.dispatchEvent(new w.MouseEvent('click',{bubbles:true})));
 R.push(['用語集'+gl.length+'項目',errors.length===0]);
 click('hclose');
 // 8) 物件一覧: 並び替え・さらに表示・行クリック
 navs[2].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 [...d.querySelectorAll('#segSort button')].forEach(b=>b.dispatchEvent(new w.MouseEvent('click',{bubbles:true})));
 click('more');click('more');
 const rows=[...d.querySelectorAll('.prow')];
 R.push(['一覧'+rows.length+'行',rows.length>0]);
 rows[0].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
 R.push(['行クリック→評価へ',d.getElementById('v-va').className.indexOf('on')>=0]);
 // 9) 画面幅を変えて再描画
 [360,768,1280].forEach(px=>{W=px;w.dispatchEvent(new w.Event('resize'))});
 R.push(['画面幅3種リサイズ',errors.length===0]);
 // 10) 絞込パネル開閉・リセット
 click('fbtn');click('fbtn');click('reset');
 R.push(['絞込開閉・リセット',errors.length===0]);
 // 出力
 R.forEach(([n,ok])=>console.log((ok?'  OK  ':'  NG  ')+n));
 console.log('\n総エラー数:',errors.length);
 errors.slice(0,3).forEach(e=>console.log('---\n'+e.slice(0,500)));
 console.log('errbar:',d.getElementById('errbar').textContent||'(空)');
},800);
// 追加: 全組み合わせのクロス総当たり（実DOM）
setTimeout(()=>{
 const errs2=[];const before=errors.length;
 const navs=[...d.querySelectorAll('#bnav button')];
 // 各ビュー × 各プルダウン全値 × 各セグメント
 navs.forEach(nb=>{nb.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  ['selArea','selCorp','selAge','selCert','selEvl'].forEach(id=>{
    const s=d.getElementById(id);if(!s)return;
    [...s.options].forEach(o=>{s.value=o.value;s.dispatchEvent(new w.Event('change'))});
    s.value='ALL';s.dispatchEvent(new w.Event('change'))});
  [...d.querySelectorAll('#segScope button')].forEach(b=>b.click());
  [...d.querySelectorAll('#segScope button')][0].click();
  [...d.querySelectorAll('.view.on .seg button')].forEach(b=>b.dispatchEvent(new w.MouseEvent('click',{bubbles:true})));
 });
 console.log('\n【追加検証】ビュー×全プルダウン×全セグメント 総当たり後のエラー:',errors.length-before);
 console.log('errbar:',d.getElementById('errbar').textContent||'(空)');
},1600);

