const {JSDOM}=require('jsdom');const fs=require('fs');
const store={};
const mk=id=>{const d=[];store[id]=d;return new Proxy({},{get:(t,k)=>{
 if(k==='measureText')return s=>({width:String(s).length*(parseFloat(t.font)||10)*0.58});
 if(k==='fillText')return (s,x,y)=>d.push({s:String(s),x,y,f:parseFloat(t.font)||10,a:t.textAlign||'left'});
 if(k==='arc')return (x,y,r)=>d.push({circle:1,x,y,r});
 if(['font','fillStyle','strokeStyle','lineWidth','textAlign','textBaseline'].includes(k))return t[k]||'';
 return ()=>{}},set:(t,k,v)=>{t[k]=v;return true}})};
const box=t=>{const w=t.s.length*t.f*0.58,h=t.f*1.25;
 const x0=t.a==='center'?t.x-w/2:t.a==='right'?t.x-w:t.x;return{s:t.s,x0,x1:x0+w,y0:t.y-h/2,y1:t.y+h/2}};
const hit=(a,b)=>a.x0<b.x1-0.5&&b.x0<a.x1-0.5&&a.y0<b.y1-0.5&&b.y0<a.y1-0.5;
const check=d=>{const T=(d||[]).filter(t=>t.s!==undefined).map(box);const o=[];
 for(let i=0;i<T.length;i++)for(let j=i+1;j<T.length;j++)if(hit(T[i],T[j]))o.push(T[i].s+'×'+T[j].s);return o};
const circ=d=>{const c=(d||[]).filter(t=>t.circle&&t.r>4);let n=0;
 for(let i=0;i<c.length;i++)for(let j=i+1;j<c.length;j++)if(Math.hypot(c[i].x-c[j].x,c[i].y-c[j].y)<c[i].r+c[j].r)n++;return n};
const W=+process.argv[2]||390,H=+process.argv[3]||260;
const dom=new JSDOM(fs.readFileSync(require('path').join(__dirname,'../public/index.html'),'utf8'),{runScripts:'dangerously',pretendToBeVisual:true,beforeParse(w){
 w.HTMLCanvasElement.prototype.getContext=function(){return mk(this.id)};
 w.Element.prototype.getBoundingClientRect=()=>({left:0,top:0,width:W,height:H,right:W,bottom:H});
 Object.defineProperty(w.HTMLElement.prototype,'clientWidth',{get(){return W}});
 Object.defineProperty(w.HTMLElement.prototype,'clientHeight',{get(){return H}});
 w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};}});
setTimeout(()=>{const d=dom.window.document;
 [...d.querySelectorAll('#bnav button')].forEach(b=>b.click());
 [...d.querySelectorAll('#subtabs button')].forEach(b=>b.click());
 let tot=0,cov=0,cases=0;
 const combos=[['chCorp','#segCorpX button'],['chCorp','#segCorpY button'],['chDist','#segDistG button'],
  ['chDist','#segDistM button'],['chStack','#segStackG button'],['chSpread','#segCostK button'],
  ['chCert','#segCertG button'],['chCert','#segCertM button'],['chRank','#segRank button'],
  ['chCov','#segCovG button'],['chCross','#segX button'],['chCross','#segY button']];
 combos.forEach(([id,sel])=>{const bs=[...d.querySelectorAll(sel)];
  bs.forEach(b=>{store[id]=[];b.click();cases++;
   const o=check(store[id]);const c=circ(store[id]);
   if(o.length){tot+=o.length;console.log('  '+id+'['+b.textContent+'] 文字重なり'+o.length+': '+o.slice(0,3).join(' / '))}
   if(c){cov+=c;console.log('  '+id+'['+b.textContent+'] 円の重なり'+c)}})});
 ['spectrum','chBmCov','chBmCo','chRadar'].forEach(id=>{const o=check(store[id]);cases++;
  if(o.length){tot+=o.length;console.log('  '+id+' 文字重なり'+o.length+': '+o.slice(0,3).join(' / '))}});
 console.log('幅'+W+': '+cases+'パターン検査 → 文字重なり'+tot+' / 円の重なり'+cov);
 if(tot||cov){console.error('レイアウト検査に失敗しました');process.exitCode=1}
},1000);
