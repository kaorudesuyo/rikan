/* ============================================================
   MC — 軽量チャート描画エンジン（外部ライブラリ不使用）
   ============================================================ */
const MC=(()=>{
const MONO="ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace";
const SANS="-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP','Yu Gothic',sans-serif";
const C={grid:'#26282c',axis:'#34373d',tx:'#e8e6e1',mut:'#8a8f98',dim:'#5a5f68',acc:'#c8a35f'};
/* 表示サイズはCSSが決める。JSは内部解像度だけを設定する（インラインstyleを書かない）。
   親要素の高さを測って自分に反映すると、親が自分の高さで決まる場合に再描画のたびに膨張するため。 */
function setup(cv){const dpr=Math.min(devicePixelRatio||1,2);
  const r=cv.getBoundingClientRect?cv.getBoundingClientRect():null;
  let w=Math.round((r&&r.width)||0),h=Math.round((r&&r.height)||0);
  if(!w){const p=cv.parentNode;w=Math.round((p&&p.clientWidth)||320)}
  if(!h)h=250;
  w=Math.max(w,80);h=Math.max(h,60);
  const iw=Math.max(Math.round(w*dpr),1),ih=Math.max(Math.round(h*dpr),1);
  if(cv.width!==iw)cv.width=iw;
  if(cv.height!==ih)cv.height=ih;
  const ctx=cv.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  ctx.textBaseline='middle';return{ctx,w,h,sm:w<420}}
function tw(ctx,t,f){ctx.font=f;const m=ctx.measureText(String(t));return (m&&m.width)||String(t).length*6}
function nice(min,max,n){if(!isFinite(min)||!isFinite(max))return{lo:0,hi:1,step:1};
  if(min===max){min=Math.min(0,min);max=max||1}
  const r=max-min||1,raw=r/Math.max(n,2),p=Math.pow(10,Math.floor(Math.log10(raw)));
  const s=[1,2,2.5,5,10].map(x=>x*p).find(x=>x>=raw)||10*p;
  return{lo:Math.floor(min/s)*s,hi:Math.ceil(max/s)*s,step:s}}
function ticks(lo,hi,step){const o=[];for(let v=lo;v<=hi+step/2;v+=step)o.push(+v.toFixed(10));return o}
function fmtTick(v){const a=Math.abs(v);
  if(a>=1e8)return (v/1e8).toFixed(1)+'億';if(a>=1e4)return (v/1e4).toFixed(a>=1e5?0:1)+'万';
  if(a>=1000)return v.toLocaleString('ja-JP');if(a>=10)return String(Math.round(v));
  return String(+v.toFixed(a<1?2:1))}
function wrapLbl(ctx,t,max,f,lines){t=String(t);lines=lines||2;
  if(tw(ctx,t,f)<=max)return[t];
  if(lines===1){let cur='';for(const ch of t){if(tw(ctx,cur+ch+'…',f)>max)break;cur+=ch}return[cur+'…']}
  const out=[];let cur='';for(const ch of t){if(tw(ctx,cur+ch,f)>max){out.push(cur);cur=ch;if(out.length>=2)break}else cur+=ch}
  if(out.length<2)out.push(cur);else out[1]=out[1].slice(0,-1)+'…';return out}
function legend(ctx,w,h,items){let tot=0;const f='10px '+MONO;
  items.forEach(i=>tot+=tw(ctx,i.l,f)+20);
  let x=Math.max((w-tot)/2,4),y=h-9;
  items.forEach(i=>{ctx.fillStyle=i.c;ctx.fillRect(x,y-4,9,9);x+=13;
    ctx.fillStyle=C.mut;ctx.font=f;ctx.textAlign='left';ctx.fillText(i.l,x,y);x+=tw(ctx,i.l,f)+7})}

/* ---- 横棒（中央値＋IQRひげ） ---- */
function hbar(o){const s0=setup(o.cv),{ctx,w,h}=s0;const f=(s0.sm?9:10)+'px '+MONO;
  const rows=o.rows;if(!rows.length)return empty(ctx,w,h);
  const dense=rows.length>=11,lf=(dense?(s0.sm?8.5:9.5):(s0.sm?10:11))+'px '+SANS;
  const txt=r=>r.k+(r.n?' ('+r.n+')':'');
  let lw=0;rows.forEach(r=>lw=Math.max(lw,tw(ctx,txt(r),lf)));
  const L=Math.min(Math.max(lw+10,52),Math.min(w*0.44,160)),R=w-Math.max(w*0.13,38),T=6,B=h-(o.xTitle?30:18);
  const vs=rows.flatMap(r=>[r.m,r.p25,r.p75].filter(v=>v!=null));
  const{lo,hi,step}=nice(Math.min(0,...vs),Math.max(...vs),4);
  const X=v=>L+(v-lo)/(hi-lo||1)*(R-L);
  ctx.font=f;ctx.textAlign='center';
  ticks(lo,hi,step).forEach(t=>{const x=X(t);ctx.strokeStyle=C.grid;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,B);ctx.stroke();
    ctx.fillStyle=C.dim;ctx.fillText(fmtTick(t),x,B+9)});
  const bh=Math.min((B-T)/rows.length*0.62,26),gap=(B-T)/rows.length;
  rows.forEach((r,i)=>{const y=T+gap*i+gap/2;
    const bc=(o.colors&&o.colors[i])||o.color||C.acc;
    ctx.fillStyle=bc+'88';ctx.strokeStyle=bc;ctx.lineWidth=1;
    const x0=X(Math.max(lo,0)),x1=X(r.m);
    ctx.fillRect(Math.min(x0,x1),y-bh/2,Math.abs(x1-x0),bh);
    ctx.strokeRect(Math.min(x0,x1)+.5,y-bh/2+.5,Math.max(Math.abs(x1-x0)-1,0),bh-1);
    if(r.p25!=null&&r.p75!=null){ctx.strokeStyle=C.tx;ctx.lineWidth=1.2;const hh=bh*0.34;
      const a=X(r.p25),b=X(r.p75);ctx.beginPath();
      ctx.moveTo(a,y-hh);ctx.lineTo(a,y+hh);ctx.moveTo(b,y-hh);ctx.lineTo(b,y+hh);ctx.moveTo(a,y);ctx.lineTo(b,y);ctx.stroke()}
    const vt=o.fmt(r.m);const anchor=Math.max(X(r.m),r.p75!=null?X(r.p75):X(r.m));
    ctx.font=f;
    if(anchor+tw(ctx,vt,f)+8<=w-2){ctx.fillStyle=C.tx;ctx.textAlign='left';ctx.fillText(vt,anchor+6,y)}
    else{ctx.fillStyle='#0a0a0a';ctx.textAlign='right';ctx.fillText(vt,X(r.m)-5,y)}
    ctx.fillStyle=C.mut;ctx.font=lf;ctx.textAlign='right';
    const lh=dense?10:12;
    const ls=wrapLbl(ctx,txt(r),L-8,lf,gap<lh*2+6?1:2);
    ls.forEach((s,j)=>ctx.fillText(s,L-8,y+(j-(ls.length-1)/2)*lh))});
  if(o.xTitle){ctx.fillStyle=C.dim;ctx.font=f;ctx.textAlign='center';ctx.fillText(o.xTitle,(L+R)/2,h-7)}
  /* 行をタップできるようにする（ドリルダウン用）。
     再描画のたびに addEventListener するとリスナーが増え続けるため、
     リスナーは一度だけ登録し、当たり判定に必要な情報を要素に保持して差し替える。 */
  o.cv.__hit={rows,T,gap,h,cb:o.onPick||null};
  if(o.onPick){
    o.cv.style.cursor='pointer';
    if(!o.cv.__bound){o.cv.__bound=true;
      o.cv.addEventListener('click',e=>{const s=o.cv.__hit;if(!s||!s.cb)return;
        const b=o.cv.getBoundingClientRect();
        const y=(e.clientY-b.top)*(s.h/(b.height||s.h));
        const i=Math.floor((y-s.T)/s.gap);
        if(i>=0&&i<s.rows.length)s.cb(s.rows[i])})}}
  else o.cv.style.cursor='';}

/* ---- 縦棒（1〜2系列） ---- */
function vbar(o){const s0=setup(o.cv),{ctx,w,h}=s0;const f=(s0.sm?9:10)+'px '+MONO,lf=(s0.sm?9.5:10)+'px '+SANS;
  const L=44,R=w-8,T=16,B=h-(o.series.length>1?52:40);
  const vals=o.series.flatMap(s=>s.values.filter(v=>v!=null));
  if(!vals.length)return empty(ctx,w,h);
  const{lo,hi,step}=nice(Math.min(0,...vals),Math.max(...vals),4);
  const Y=v=>B-(v-lo)/(hi-lo||1)*(B-T);
  ctx.font=f;ctx.textAlign='right';
  ticks(lo,hi,step).forEach(t=>{const y=Y(t);ctx.strokeStyle=C.grid;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(R,y);ctx.stroke();
    ctx.fillStyle=C.dim;ctx.fillText(fmtTick(t),L-6,y)});
  const n=o.labels.length,gap=(R-L)/n,ns=o.series.length;
  const bw=Math.min(gap*0.68/ns,46);
  o.labels.forEach((lb,i)=>{const cx=L+gap*i+gap/2;
    o.series.forEach((s,j)=>{const v=s.values[i];if(v==null)return;
      const x=cx-(ns*bw)/2+j*bw,y=Y(v);
      ctx.fillStyle=s.color+'99';ctx.fillRect(x,y,bw-2,B-y);
      ctx.strokeStyle=s.color;ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,bw-3,Math.max(B-y-1,0));
      const vt=o.fmt(v);ctx.font='9px '+MONO;
      /* 値ラベルはスロット幅に収まる場合のみ描く（隣のバーの値と衝突するのを防ぐ） */
      if(bw>24&&tw(ctx,vt,'9px '+MONO)<gap-6){ctx.fillStyle=C.tx;ctx.textAlign='center';
        ctx.fillText(vt,x+(bw-2)/2,y-7)}});
    ctx.fillStyle=C.mut;ctx.font=lf;ctx.textAlign='center';
    const lw3=Math.max(gap-12,16);
    const ls=wrapLbl(ctx,lb,lw3,lf,1);
    ls.forEach((s,k)=>ctx.fillText(s,cx,B+11+k*11))});
  if(o.series.length>1)legend(ctx,w,h,o.series.map(s=>({l:s.name,c:s.color})));
  /* y軸タイトルは回転配置だと最上段の目盛と衝突するため、上端に水平で置く */
  /* y軸タイトルは上端だとバー上の値ラベルと衝突するため、左下（x軸ラベルの下）に置く */
  if(o.yTitle){ctx.fillStyle=C.dim;ctx.font=f;ctx.textAlign='left';ctx.fillText(o.yTitle,2,h-4)}}

/* ---- 横積み上げ ---- */
function hstack(o){const s0=setup(o.cv),{ctx,w,h}=s0;const f=(s0.sm?9:10)+'px '+MONO;
  const rows=o.rows;if(!rows.length)return empty(ctx,w,h);
  const dense=rows.length>=11,lf=(dense?(s0.sm?8.5:9.5):(s0.sm?10:11))+'px '+SANS;
  const txt=r=>r.k+(r.n?' ('+r.n+')':'');
  let lw=0;rows.forEach(r=>lw=Math.max(lw,tw(ctx,txt(r),lf)));
  const L=Math.min(Math.max(lw+10,54),Math.min(w*0.4,140)),R=w-10,T=6,B=h-46;
  const max=o.max||Math.max(...rows.map(r=>r.v.reduce((a,b)=>a+b,0)))*1.05;
  const X=v=>L+v/max*(R-L);
  ctx.font=f;ctx.textAlign='center';
  ticks(0,max,max/4).forEach(t=>{const x=X(t);ctx.strokeStyle=C.grid;
    ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,B);ctx.stroke();
    ctx.fillStyle=C.dim;ctx.fillText(fmtTick(t),x,B+9)});
  const gap=(B-T)/rows.length,bh=Math.min(gap*0.6,30);
  rows.forEach((r,i)=>{const y=T+gap*i+gap/2;let acc=0;
    r.v.forEach((v,j)=>{if(v<=0)return;const x0=X(acc),x1=X(acc+v);
      ctx.fillStyle=o.series[j].color+'aa';ctx.fillRect(x0,y-bh/2,x1-x0,bh);
      ctx.strokeStyle=o.series[j].color;ctx.lineWidth=.8;ctx.strokeRect(x0+.5,y-bh/2+.5,Math.max(x1-x0-1,0),bh-1);
      if(x1-x0>26){ctx.fillStyle='#0a0a0a';ctx.font='9px '+MONO;ctx.textAlign='center';
        ctx.fillText(v.toFixed(0),(x0+x1)/2,y)}
      acc+=v});
    ctx.fillStyle=C.mut;ctx.font=lf;ctx.textAlign='right';
    const lh=dense?10:12;
    const ls=wrapLbl(ctx,txt(r),L-8,lf,gap<lh*2+6?1:2);
    ls.forEach((s,k)=>ctx.fillText(s,L-8,y+(k-(ls.length-1)/2)*lh))});
  legend(ctx,w,h,o.series.map(s=>({l:s.name,c:s.color})));
  if(o.xTitle){ctx.fillStyle=C.dim;ctx.font=f;ctx.textAlign='center';ctx.fillText(o.xTitle,(L+R)/2,B+22)}}

/* ---- 分位レンジ（10-25-50-75-90） ---- */
function hrange(o){const s0=setup(o.cv),{ctx,w,h}=s0;const f=(s0.sm?9:10)+'px '+MONO;
  const rows=o.rows;if(!rows.length)return empty(ctx,w,h);
  const dense=rows.length>=11,lf=(dense?(s0.sm?8.5:9.5):(s0.sm?10:11))+'px '+SANS;
  const txt=r=>r.k+(r.n?' ('+r.n+')':'');
  let lw=0;rows.forEach(r=>lw=Math.max(lw,tw(ctx,txt(r),lf)));
  const L=Math.min(Math.max(lw+10,54),Math.min(w*0.4,140)),R=w-14,T=10,B=h-(o.xTitle?28:16);
  const vs=rows.flatMap(r=>[r.p10,r.p90]);
  const{lo,hi,step}=nice(Math.min(0,...vs),Math.max(...vs),4);
  const X=v=>L+(v-lo)/(hi-lo||1)*(R-L);
  ctx.font=f;ctx.textAlign='center';
  ticks(lo,hi,step).forEach(t=>{const x=X(t);ctx.strokeStyle=C.grid;
    ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,B);ctx.stroke();
    ctx.fillStyle=C.dim;ctx.fillText(fmtTick(t),x,B+9)});
  const gap=(B-T)/rows.length,bh=Math.min(gap*0.5,26),col=o.color||C.acc;
  rows.forEach((r,i)=>{const y=T+gap*i+gap/2;
    ctx.fillStyle=col+'33';ctx.fillRect(X(r.p10),y-bh/2,X(r.p90)-X(r.p10),bh);
    ctx.fillStyle=col+'99';ctx.fillRect(X(r.p25),y-bh/2,X(r.p75)-X(r.p25),bh);
    ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(X(r.p25)+.5,y-bh/2+.5,Math.max(X(r.p75)-X(r.p25)-1,0),bh-1);
    ctx.strokeStyle=C.tx;ctx.lineWidth=1.8;ctx.beginPath();
    ctx.moveTo(X(r.m),y-bh*0.62);ctx.lineTo(X(r.m),y+bh*0.62);ctx.stroke();
    ctx.fillStyle=C.tx;ctx.font='9.5px '+MONO;ctx.textAlign='center';ctx.fillText(r.m.toFixed(1),X(r.m),y-bh*0.62-7);
    ctx.fillStyle=C.mut;ctx.font=lf;ctx.textAlign='right';
    const lh=dense?10:12;
    const ls=wrapLbl(ctx,txt(r),L-8,lf,gap<lh*2+6?1:2);
    ls.forEach((s,k)=>ctx.fillText(s,L-8,y+(k-(ls.length-1)/2)*lh))});
  if(o.xTitle){ctx.fillStyle=C.dim;ctx.font=f;ctx.textAlign='center';ctx.fillText(o.xTitle,(L+R)/2,h-6)}}

/* ---- 散布＋折れ線 ---- */
function scatter(o){const s=setup(o.cv),{ctx,w,h}=s;const f=(s.sm?9:10)+'px '+MONO;
  const pts=o.points||[],line=o.line||[];
  if(!pts.length&&!line.length)return empty(ctx,w,h);
  const L=44,R=w-12,T=20,B=h-30;
  const xs=[...pts.map(p=>p.x),...line.map(p=>p.x)].filter(v=>v!=null&&(!o.logX||v>0));
  const ys=[...pts.map(p=>p.y),...line.map(p=>p.y)].filter(v=>v!=null);
  let X,xt;
  if(o.logX){const l0=Math.log10(Math.min(...xs)),l1=Math.log10(Math.max(...xs));
    const lo=Math.floor(l0),hi=Math.ceil(l1);X=v=>L+(Math.log10(v)-lo)/((hi-lo)||1)*(R-L);
    xt=[];for(let e=lo;e<=hi;e++)xt.push(Math.pow(10,e))}
  else{const mn0=Math.min(...xs),nn=nice(o.xNonNeg&&mn0>=0?0:mn0,Math.max(...xs),4);
    X=v=>L+(v-nn.lo)/((nn.hi-nn.lo)||1)*(R-L);xt=ticks(nn.lo,nn.hi,nn.step)}
  const myn=Math.min(...ys);
  const ny=nice(o.yNonNeg&&myn>=0?0:myn,Math.max(...ys),4);const Y=v=>B-(v-ny.lo)/((ny.hi-ny.lo)||1)*(B-T);
  ctx.font=f;
  ticks(ny.lo,ny.hi,ny.step).forEach(t=>{const y=Y(t);ctx.strokeStyle=C.grid;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(R,y);ctx.stroke();
    ctx.fillStyle=C.dim;ctx.textAlign='right';ctx.fillText(fmtTick(t),L-6,y)});
  xt.forEach(t=>{const x=X(t);if(x<L-1||x>R+1)return;ctx.strokeStyle=C.grid;
    ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,B);ctx.stroke();
    /* y軸の目盛ラベルと重なる左端付近では、x軸ラベルを描かない */
    if(x-L<14)return;
    ctx.fillStyle=C.dim;ctx.textAlign='center';ctx.fillText(fmtTick(t),x,B+10)});
  const hit=[];
  pts.forEach(p=>{if(p.x==null||p.y==null||(o.logX&&p.x<=0))return;
    const x=X(p.x),y=Y(p.y);hit.push({x,y,d:p.d});
    ctx.beginPath();ctx.arc(x,y,p.r||3,0,7);ctx.fillStyle=p.fill;ctx.fill();
    ctx.lineWidth=1;ctx.strokeStyle=p.stroke;ctx.stroke()});
  if(line.length>1){ctx.strokeStyle=C.acc;ctx.lineWidth=2;ctx.beginPath();
    line.forEach((p,i)=>{const x=X(p.x),y=Y(p.y);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();
    line.forEach(p=>{ctx.beginPath();ctx.arc(X(p.x),Y(p.y),3,0,7);ctx.fillStyle=C.acc;ctx.fill()})}
  ctx.fillStyle=C.dim;ctx.font=f;
  if(o.xTitle){ctx.textAlign='right';ctx.fillText(o.xTitle,R,h-5)}
  if(o.yTitle){ctx.textAlign='left';ctx.fillText(o.yTitle,2,6)}
  bindHit(o.cv,hit,o.onPick,o.tip)}

/* ---- バブル（ラベル付き） ---- */
function bubble(o){const s0=setup(o.cv),{ctx,w,h}=s0;const f=(s0.sm?9:10)+'px '+MONO;
  const pts=o.points;if(!pts.length)return empty(ctx,w,h);
  const L=42,R=w-14,T=26,B=h-32;
  /* 半径は「面積が値に比例」するよう rel の平方根で決める。
     最小 rmin・最大 rmax に線形写像するため、上限で頭打ちにならず大小差が保たれる。 */
  const rmax=Math.max(Math.min((R-L)/9,(B-T)/7,s0.sm?18:30),8),rmin=Math.max(rmax*0.28,5);
  const rels=pts.map(p=>(p.rel!=null?p.rel:1));
  const rlo=Math.min(...rels),rhi=Math.max(...rels);
  pts.forEach((p,i)=>{const t=(rhi-rlo)>1e-9?(Math.sqrt(rels[i])-Math.sqrt(rlo))/(Math.sqrt(rhi)-Math.sqrt(rlo)):1;
    p.r=p.r!=null&&p.rel==null?Math.min(p.r,rmax):rmin+(rmax-rmin)*t});
  const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y);
  const padx=(Math.max(...xs)-Math.min(...xs)||1)*0.18,pady=(Math.max(...ys)-Math.min(...ys)||1)*0.22;
  /* 比率(%)や金額は負値を取らないため、軸の下限を0で止める。
     余白を取った結果 -50% のような無意味な目盛が出るのを防ぐ。 */
  const lo0=o.nonNegative===false?null:0;
  const xmin=Math.max(Math.min(...xs)-padx,lo0==null?-Infinity:lo0);
  const ymin=Math.max(Math.min(...ys)-pady,lo0==null?-Infinity:lo0);
  const nx=nice(xmin,Math.max(...xs)+padx,4);
  const ny=nice(ymin,Math.max(...ys)+pady*1.4,4);
  const X=v=>L+(v-nx.lo)/((nx.hi-nx.lo)||1)*(R-L),Y=v=>B-(v-ny.lo)/((ny.hi-ny.lo)||1)*(B-T);
  ctx.font=f;
  ticks(ny.lo,ny.hi,ny.step).forEach(t=>{const y=Y(t);ctx.strokeStyle=C.grid;
    ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(R,y);ctx.stroke();
    ctx.fillStyle=C.dim;ctx.textAlign='right';ctx.fillText(fmtTick(t),L-6,y)});
  ticks(nx.lo,nx.hi,nx.step).forEach(t=>{const x=X(t);ctx.strokeStyle=C.grid;
    ctx.beginPath();ctx.moveTo(x,T);ctx.lineTo(x,B);ctx.stroke();
    if(x-L<14)return;
    ctx.fillStyle=C.dim;ctx.textAlign='center';ctx.fillText(fmtTick(t),x,B+10)});
  const hit=[];
  /* バブルが重なると個々の法人が識別できないため、
     描画座標を基準に軽い押し出し(force)を数回かけて重なりを緩和する。
     元の座標からの移動量は半径の範囲に制限し、位置関係が崩れないようにする。 */
  const nodes=pts.map(p=>({p,ox:X(p.x),oy:Y(p.y),x:X(p.x),y:Y(p.y),r:p.r}));
  /* 同一座標に完全に重なると反発方向が定まらないため、初期位置を微小にずらす */
  nodes.forEach((n,i)=>{n.x+=Math.cos(i*2.4)*0.6;n.y+=Math.sin(i*2.4)*0.6});
  for(let it=0;it<400;it++){let moved=false;
    for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
      const a=nodes[i],b=nodes[j];let dx=b.x-a.x,dy=b.y-a.y;
      let dist=Math.hypot(dx,dy)||0.01;const min=a.r+b.r+2.5;
      if(dist<min){const push=(min-dist)/2*0.95;dx/=dist;dy/=dist;
        a.x-=dx*push;a.y-=dy*push;b.x+=dx*push;b.y+=dy*push;moved=true}}
    nodes.forEach(n=>{const lim=n.r*3.2+26;
      const dx=n.x-n.ox,dy=n.y-n.oy,d=Math.hypot(dx,dy);
      if(d>lim){n.x=n.ox+dx/d*lim;n.y=n.oy+dy/d*lim}
      n.x=Math.max(L+n.r,Math.min(n.x,R-n.r));n.y=Math.max(T+n.r,Math.min(n.y,B-n.r))});
    if(!moved)break}
  const placed=[];
  nodes.slice().sort((a,b)=>b.r-a.r).forEach(nd=>{const p=nd.p,x=nd.x,y=nd.y,r=nd.r;hit.push({x,y,d:p.d});
    const col=p.color||C.acc;
    ctx.beginPath();ctx.arc(x,y,r,0,7);
    ctx.fillStyle=col+'55';ctx.fill();
    ctx.strokeStyle=col;ctx.lineWidth=1.6;ctx.stroke();
    if(o.noLabel)return;
    const lf=(s0.sm?9:9.5)+'px '+MONO,lw2=tw(ctx,p.label,lf);
    /* ラベルの衝突回避: 上に逃がす→下に逃がす→左右にずらす、の順で空き位置を探す */
    let lx=Math.max(L+lw2/2,Math.min(x,R-lw2/2)),ly=y-r-6;
    const hits=(px,py)=>placed.some(q=>Math.abs(q.y-py)<12.5&&Math.abs(q.x-px)<(q.w+lw2)/2+6);
    const cands=[];
    for(let k=0;k<6;k++)cands.push([lx,y-r-7-k*13]);
    for(let k=0;k<6;k++)cands.push([lx,y+r+11+k*13]);
    for(let k=1;k<=4;k++){cands.push([lx-lw2*0.75*k,y-r-7]);cands.push([lx+lw2*0.75*k,y-r-7]);
      cands.push([lx-lw2*0.75*k,y+r+11]);cands.push([lx+lw2*0.75*k,y+r+11])}
    const ok=cands.find(([px,py])=>py>T+6&&py<B-4&&px-lw2/2>=L&&px+lw2/2<=R&&!hits(px,py));
    if(ok){lx=ok[0];ly=ok[1]}else{ly=Math.max(T+8,y-r-6)}
    placed.push({x:lx,y:ly,w:lw2});
    ctx.fillStyle=C.tx;ctx.font=lf;ctx.textAlign='center';ctx.fillText(p.label,lx,ly)});
  ctx.fillStyle=C.dim;ctx.font=f;
  if(o.xTitle){ctx.textAlign='right';ctx.fillText(o.xTitle,R,h-5)}
  if(o.yTitle){ctx.textAlign='left';ctx.fillText(o.yTitle,2,6)}
  bindHit(o.cv,hit,null,o.tip)}

/* ---- レーダー（母集団平均＋任意で選択物件を重ね描き） ---- */
function radar(o){const s0=setup(o.cv),{ctx,w,h}=s0;
  const lab=(s0.sm?10.5:12)+'px '+SANS,num=(s0.sm?9:10)+'px '+MONO;
  const pad=s0.sm?42:54;
  const cx=w/2,cy=h/2-(o.legend?10:4),R=Math.max(Math.min((w-pad*2)/2,(h-pad*1.7)/2),40);
  const n=o.labels.length,ang=i=>-Math.PI/2+i*2*Math.PI/n;
  /* 値の範囲は min〜max（偏差値なら25〜75）に写像する */
  const V0=o.min!=null?o.min:0, V1=o.max!=null?o.max:100;
  const rr=v=>R*Math.max(0,Math.min(1,(v-V0)/(V1-V0)));
  const rings=o.rings||[25,50,75,100];
  rings.forEach(v=>{ctx.beginPath();
    for(let i=0;i<n;i++){const r=rr(v),x=cx+Math.cos(ang(i))*r,y=cy+Math.sin(ang(i))*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
    ctx.closePath();ctx.strokeStyle=C.grid;ctx.lineWidth=(v===50?1.6:1);ctx.stroke();
  });
  for(let i=0;i<n;i++){ctx.beginPath();ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(ang(i))*R,cy+Math.sin(ang(i))*R);ctx.strokeStyle=C.grid;ctx.stroke()}
  const poly=(vals,stroke,fill,dash,dot)=>{ctx.beginPath();
    vals.forEach((v,i)=>{const r=rr(v),x=cx+Math.cos(ang(i))*r,y=cy+Math.sin(ang(i))*r;
      i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    ctx.setLineDash(dash||[]);ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([]);
    if(dot)vals.forEach((v,i)=>{const r=rr(v);
      ctx.beginPath();ctx.arc(cx+Math.cos(ang(i))*r,cy+Math.sin(ang(i))*r,3,0,7);ctx.fillStyle=stroke;ctx.fill()})};
  poly(o.base,'#7fa8c9','rgba(127,168,201,.16)',[5,4],true);
  if(o.values)poly(o.values,C.acc,'rgba(200,163,95,.22)',null,true);
  o.labels.forEach((l,i)=>{const a=ang(i);
    const x=cx+Math.cos(a)*(R+(s0.sm?17:22)),y=cy+Math.sin(a)*(R+(s0.sm?14:18));
    ctx.fillStyle=C.tx;ctx.font=lab;
    ctx.textAlign=Math.abs(Math.cos(a))<0.25?'center':(Math.cos(a)>0?'left':'right');
    ctx.fillText(l,x,y);
    ctx.font=num;
    /* 軸ラベルと直下の数値が接触しないよう、行間を font サイズから確保する */
    const dy=(s0.sm?10.5:12)*0.62+(s0.sm?9:10)*0.68+3;
    if(o.values){ctx.fillStyle=C.acc;ctx.fillText(Math.round(o.values[i])+' / '+Math.round(o.base[i]),x,y+dy)}
    else{ctx.fillStyle='#7fa8c9';ctx.fillText(Math.round(o.base[i]),x,y+dy)}});
  if(o.legend)legend(ctx,w,h,o.legend)}


/* ---- ウォーターフォール（収入を100として費用を差し引きNOIに至る分解） ---- */
function waterfall(o){const s0=setup(o.cv),{ctx,w,h}=s0;
  const f=(s0.sm?8.5:10)+'px '+MONO, lf=(s0.sm?9:10.5)+'px '+SANS;
  const items=o.items;if(!items.length)return empty(ctx,w,h);
  const L=8,R=w-8,T=(s0.sm?24:28),B=h-(s0.sm?40:44);
  const max=100;
  const Y=v=>B-v/max*(B-T);
  ctx.font=f;ctx.textAlign='right';
  [0,25,50,75,100].forEach(t=>{const y=Y(t);ctx.strokeStyle=C.grid;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(L+22,y);ctx.lineTo(R,y);ctx.stroke();
    ctx.fillStyle=C.dim;ctx.fillText(t,L+18,y)});
  const n=items.length,gap=(R-L-26)/n,bw=Math.min(gap*0.72,s0.sm?26:52);
  let acc=100;
  items.forEach((it,i)=>{const cx=L+26+gap*i+gap/2;
    let y0,y1,col;
    if(it.type==='total'){y0=Y(0);y1=Y(it.v);col=it.c||C.acc;acc=it.v}
    else{y1=Y(acc);acc-=it.v;y0=Y(acc);col=it.c||'#6f7480'}
    const top=Math.min(y0,y1),hh=Math.max(Math.abs(y1-y0),1.5);
    ctx.fillStyle=col+(it.type==='total'?'cc':'aa');ctx.fillRect(cx-bw/2,top,bw,hh);
    ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(cx-bw/2+.5,top+.5,bw-1,Math.max(hh-1,0));
    /* 連結線 */
    if(i<n-1&&items[i+1].type!=='total'){ctx.strokeStyle=C.line2||'#34373d';ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.moveTo(cx+bw/2,Y(acc));ctx.lineTo(cx+gap-bw/2,Y(acc));ctx.stroke();ctx.setLineDash([])}
    /* 値 */
    ctx.fillStyle=it.type==='total'?C.tx:C.mut;ctx.font=f;ctx.textAlign='center';
    ctx.fillText((it.type==='total'?'':'−')+it.v.toFixed(1),cx,top-8);
    /* ラベル（2行まで） */
    ctx.fillStyle=it.type==='total'?C.tx:C.mut;ctx.font=lf;
    const ls=wrapLbl(ctx,it.k,Math.max(gap-8,26),lf,2);
    ls.forEach((t,j)=>ctx.fillText(t,cx,B+13+j*12))});
}

function empty2(){}
/* ---- スペクトラム（縦軸つき） ---- */
function spectrum(cv,rows,selId){const s0=setup(cv),{ctx,w,h}=s0;
  if(!rows.length){ctx.fillStyle=C.dim;ctx.font='11px '+MONO;ctx.textAlign='left';ctx.fillText('該当なし',4,h/2);return}
  const f=(s0.sm?8.5:9.5)+'px '+MONO;
  const L=s0.sm?32:38,R=w-3,T=16,B=h-10;
  const p99=rows[Math.min(Math.floor(rows.length*0.99),rows.length-1)].yr||1;
  const n=nice(0,p99,3);
  const Y=v=>B-Math.min(v,n.hi)/(n.hi||1)*(B-T);
  ctx.font=f;
  ticks(0,n.hi,n.step).forEach(t=>{const y=Y(t);
    ctx.strokeStyle=C.grid;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,y);ctx.lineTo(R,y);ctx.stroke();
    ctx.fillStyle=C.dim;ctx.textAlign='right';ctx.fillText(fmtTick(t),L-5,y)});
  const lw=Math.max((R-L)/rows.length*0.62,0.6);
  rows.forEach((d,i)=>{const x=rows.length>1?L+i/(rows.length-1)*(R-L-2)+1:(L+R)/2;
    ctx.strokeStyle=d.id===selId?'#e8e6e1':(d.cn>0?'rgba(200,163,95,.78)':'rgba(138,143,152,.36)');
    ctx.lineWidth=d.id===selId?Math.max(lw,2.5):lw;
    ctx.beginPath();ctx.moveTo(x,B);ctx.lineTo(x,Y(d.yr));ctx.stroke()});
  ctx.strokeStyle=C.axis;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(L,T-4);ctx.lineTo(L,B);ctx.lineTo(R,B);ctx.stroke();
  ctx.fillStyle=C.dim;ctx.font=f;ctx.textAlign='left';ctx.fillText('粗利回り（%）',L+3,7)}

function empty(ctx,w,h){ctx.fillStyle=C.dim;ctx.font='12px '+SANS;ctx.textAlign='center';
  ctx.fillText('該当するデータがありません',w/2,h/2)}

/* ---- 当たり判定＋ツールチップ ---- */
let tipEl=null;
function tip(){if(!tipEl){tipEl=document.createElement('div');tipEl.className='mtip';document.body.appendChild(tipEl)}return tipEl}
function bindHit(cv,hit,onPick,mk){
  cv.__hit=hit;cv.__pick=onPick;cv.__mk=mk;
  if(cv.__bound)return;cv.__bound=1;
  const find=e=>{const r=cv.getBoundingClientRect();
    const p=e.touches&&e.touches[0]||e;const mx=p.clientX-r.left,my=p.clientY-r.top;
    let best=null,bd=18*18;
    (cv.__hit||[]).forEach(pt=>{const dx=pt.x-mx,dy=pt.y-my,d=dx*dx+dy*dy;if(d<bd){bd=d;best=pt}});
    return{best,cx:p.clientX,cy:p.clientY}};
  /* ツールチップはHTML文字列を受け取らず、{t:見出し, l:[本文行]} を DOM API で組み立てる。
     innerHTML を使わないため、データに何が入っていてもスクリプトとして解釈されない。 */
  const show=e=>{const{best,cx,cy}=find(e);const t=tip();
    if(!best||!cv.__mk){t.classList.remove('on');return}
    const o=cv.__mk(best.d);
    if(!o||typeof o!=='object'){t.classList.remove('on');return}
    while(t.firstChild)t.removeChild(t.firstChild);
    if(o.t){const b=document.createElement('b');b.textContent=String(o.t);t.appendChild(b)}
    (o.l||[]).forEach(s=>{const v=document.createElement('div');v.textContent=String(s);t.appendChild(v)});
    t.classList.add('on');
    const tw2=t.offsetWidth||180,th=t.offsetHeight||60;
    t.style.left=Math.max(6,Math.min(cx-tw2/2,innerWidth-tw2-6))+'px';
    t.style.top=Math.max(6,cy-th-14)+'px'};
  cv.addEventListener('mousemove',show);
  cv.addEventListener('mouseleave',()=>{tip().classList.remove('on')});
  cv.addEventListener('touchstart',e=>{show(e)},{passive:true});
  cv.addEventListener('click',e=>{const{best}=find(e);if(best&&cv.__pick)cv.__pick(best.d);
    setTimeout(()=>tip().classList.remove('on'),1800)})}
return{hbar,vbar,hstack,hrange,scatter,bubble,radar,spectrum,waterfall,MONO,SANS}})();
