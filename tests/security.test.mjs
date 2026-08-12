/* セキュリティ検証: 汚染データ・DOM改ざん・不正属性でのXSS成立可否を実DOMで確認 */
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
let html=readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');

// ① データ層に攻撃ペイロードを混入（実際の運用では起こらないが、防御の実効性を検証）
const PAY=[`<img src=x onerror="window.__XSS1=1">`,
           `"><script>window.__XSS2=1<\/script>`,
           `' onmouseover='window.__XSS3=1`,
           `javascript:window.__XSS4=1`];
html=html.replace(/window\.__DATA__=(\[[\s\S]*?\]);/, (m,json)=>{
  const arr=JSON.parse(json.replace(/\\u003c/g,'<').replace(/\\u003e/g,'>').replace(/\\u0026/g,'&'));
  arr[0].n=PAY[0]; arr[0].loc=PAY[1]; arr[1].n=PAY[2]; arr[1].loc=PAY[3];
  arr[0].id=`x" onload="window.__XSS5=1`;                     // 属性文脈への注入
  arr[1].ck=`Z"><img src=x onerror=window.__XSS6=1>`;         // バッジへの注入
  return 'window.__DATA__='+JSON.stringify(arr).replace(/</g,'\\u003c').replace(/>/g,'\\u003e')+';';
});
const ctx=()=>new Proxy({},{get:(t,k)=>{
  if(k==='measureText')return s=>({width:String(s).length*6});
  if(['font','fillStyle','strokeStyle','lineWidth','textAlign','textBaseline'].includes(k))return t[k]||'';
  return ()=>{}},set:(t,k,v)=>{t[k]=v;return true}});
const errs=[];
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
  w.HTMLCanvasElement.prototype.getContext=()=>ctx();
  w.Element.prototype.getBoundingClientRect=function(){return{left:0,top:0,width:390,height:250,right:390,bottom:250}};
  Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return 390}});
  Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return 250}});
  w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};
  w.addEventListener('error',e=>errs.push(e.message));
}});
const w=dom.window,d=w.document;
setTimeout(()=>{
  const navs=[...d.querySelectorAll('#bnav button')];
  navs.forEach(b=>b.click());                       // 全ビューを描画
  d.getElementById('vSel').value=d.getElementById('vSel').options[1]?.value||'';
  d.getElementById('vSel').dispatchEvent(new w.Event('change'));
  const rows=[...d.querySelectorAll('.prow')]; rows[0]?.click();
  navs.forEach(b=>b.click());

  const fired=[1,2,3,4,5,6].filter(i=>w['__XSS'+i]);
  console.log('【1】汚染データ経由のXSS発火:',fired.length? '発火 '+fired.join(','):'なし（全て無害化）');
  // 生成DOMに実行可能要素が混入していないか
  const inj=d.querySelectorAll('script:not([nonce]), img[onerror], [onmouseover], [onload], iframe, object, embed');
  const injected=[...inj].filter(e=>!e.textContent||e.tagName!=='SCRIPT'||!e.textContent.includes('window.__DATA__'));
  console.log('【2】注入された実行要素:', d.querySelectorAll('img,iframe,object,embed,[onerror],[onmouseover],[onload]').length,'個');
  console.log('    scriptタグ総数:',d.querySelectorAll('script').length,'（ビルド時の4本のみが正）');
  // ペイロードがエスケープされて表示されているか
  const listHTML=d.getElementById('plist').innerHTML;
  console.log('【3】一覧に生タグが残存:', /<img|onerror=|onmouseover=/.test(listHTML)?'あり':'なし');
  console.log('    エスケープ表示の例:', (listHTML.match(/&lt;img[^<]{0,30}/)||['(該当なし)'])[0]);

  // ② data-h 属性の細工（プロトタイプ汚染・意図せぬ参照）
  const b=d.createElement('button'); b.setAttribute('data-h','constructor'); d.body.appendChild(b); b.click();
  const b2=d.createElement('button'); b2.setAttribute('data-h','__proto__'); d.body.appendChild(b2); b2.click();
  console.log('【4】data-h="constructor"/"__proto__" でのヘルプ表示:',
    d.getElementById('hsheet').className.includes('open')?'開いた（NG）':'無視（OK）');

  // ③ 物件選択の値改ざん
  const s=d.getElementById('vSel');
  const opt=d.createElement('option'); opt.value='__proto__'; s.appendChild(opt);
  s.value='__proto__'; s.dispatchEvent(new w.Event('change'));
  console.log('【5】未知IDの選択:', d.getElementById('valCard').textContent.includes('平均像')?'平均表示にフォールバック（OK）':'不正状態（NG）');
  console.log('    Object.prototype汚染:', ({}).polluted===undefined?'なし':'あり（NG）');

  console.log('【6】実行時エラー:',errs.length);
},700);

