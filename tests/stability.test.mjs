import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
const fs={readFileSync};
const html=readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const ctxMock=()=>new Proxy({},{get:(t,k)=>{
  if(k==='measureText')return s=>({width:String(s).length*6.2});
  if(['font','fillStyle','strokeStyle','lineWidth','textAlign','textBaseline'].includes(k))return t[k]||'';
  return ()=>{}},set:(t,k,v)=>{t[k]=v;return true}});
const errors=[];let W=390;
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.HTMLCanvasElement.prototype.getContext=function(){return ctxMock()};
  w.Element.prototype.getBoundingClientRect=function(){
    let h=250;
    if(this.style&&this.style.height)h=parseFloat(this.style.height);
    else if(this.id==='spectrum')h=112;
    else if(String(this.className).indexOf('specwrap')>=0){const c=this.querySelector('canvas');
      h=((c&&c.style.height?parseFloat(c.style.height):112))+22}
    return{left:0,top:0,width:W,height:h,right:W,bottom:h}};
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return W}});
  Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 250}});
  w.HTMLElement.prototype.scrollIntoView=function(){};w.scrollTo=()=>{};
  // addEventListener の呼び出し回数を記録（リスナー多重登録の検出）
  const orig=w.EventTarget.prototype.addEventListener;
  w.__listeners=0;
  w.EventTarget.prototype.addEventListener=function(...a){w.__listeners++;
    try{return orig.apply(this,a)}catch(e){return orig.apply(w,a)}};
  w.addEventListener('error',e=>errors.push(e.error&&e.error.stack||e.message));
  w.console.error=(...a)=>errors.push('console.error: '+a.join(' '));
}});
const w=dom.window,d=w.document;
const snap=()=>{
  const o={listeners:w.__listeners};
  ['kpis','plist','plays','valCard','leedCard','bnav','vtabs','selWrap','hpn'].forEach(id=>{
    const e=d.getElementById(id);o[id]=e?(e.innerHTML.length+'/'+e.children.length):'-'});
  d.querySelectorAll('.seg').forEach(s=>o['seg:'+s.id]=s.children.length);
  d.querySelectorAll('canvas').forEach(c=>o['cv:'+c.id]=c.width+'x'+c.height);
  ['selUse','selArea','selCorp','selAge','selCert','selEvl','vCorp','vUse','vSel'].forEach(id=>{
    const e=d.getElementById(id);o['opt:'+id]=e?e.options.length:'-'});
  return o};
setTimeout(()=>{
  const navs=[...d.querySelectorAll('#bnav button')];
  // ウォームアップ: 全ビュー・全ペインを一度描画してから基準を取る
  navs.forEach(b=>b.click());
  [...d.querySelectorAll('#subtabs button')].forEach(b=>b.click());
  navs.forEach(b=>b.click());
  {const hb=d.querySelector('.hlp[data-h]');hb&&hb.click();const c=d.getElementById('hclose');c&&c.click();}
  const A=snap();
  // 高頻度操作を反復（ビュー往復・サブタブ・セグメント・プルダウン・ヘルプ・リサイズ）
  for(let r=0;r<20;r++){
    navs.forEach(b=>b.click());
    [...d.querySelectorAll('#subtabs button')].forEach(b=>b.click());
    [...d.querySelectorAll('.view.on .seg button')].forEach(b=>b.click());
    /* 上部の絞込は用途スコープに置き換えたため、スコープの往復で状態蓄積を検査する */
    [...d.querySelectorAll('#segScope button')].forEach(b=>b.click());
    [...d.querySelectorAll('#segScope button')][0].click();
    const hb=d.querySelector('.hlp[data-h]');hb&&hb.click();
    const c=d.getElementById('hclose');c&&c.click();
    const fb=d.getElementById('fbtn');if(fb){fb.click();fb.click()}
    W=(r%2)?768:390;w.dispatchEvent(new w.Event('resize'));
  }
  W=390;w.dispatchEvent(new w.Event('resize'));
  navs[0].click();
  const B=snap();
  console.log('=== 反復操作(20巡)前後の比較 ===');
  let ng=0;
  Object.keys(A).forEach(k=>{
    if(k==='listeners')return;
    if(String(A[k])!==String(B[k])){console.log('  差分 '+k+': '+A[k]+' → '+B[k]);ng++}});
  console.log(ng?'  ↑ 上記が蓄積の疑い':'  すべての要素・canvasが同一寸法/同一構造で安定');
  console.log('  イベントリスナー登録数: 初期'+A.listeners+' → 反復後'+B.listeners+
    '（増加 '+(B.listeners-A.listeners)+'）');
  console.log('  インラインstyle付きcanvas:',[...d.querySelectorAll('canvas')].filter(c=>c.style.width||c.style.height).length);
  console.log('  エラー:',errors.length);
  errors.slice(0,2).forEach(e=>console.log('  '+e.slice(0,200)));
},700);

