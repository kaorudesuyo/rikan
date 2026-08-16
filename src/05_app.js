window.onerror=function(m,s,l,c,e){const b=document.getElementById('errbar');
  if(b){b.style.display='block';b.textContent='描画エラー: '+(e&&e.message||m)+(l?' (行'+l+')':'')}return false};
const D=window.__DATA__;
const USE_L={OF:'オフィス',RS:'住宅',RT:'商業',HT:'ホテル',HC:'ヘルスケア',LG:'物流',MX:'複合',OT:'その他'};
const USE_C={OF:'#7fa8c9',RS:'#a3b18a',RT:'#c9897f',HT:'#b08bbb',HC:'#d0b060',LG:'#8d99ae',MX:'#9aa5b1',OT:'#6f7480'};
const AREA_L={C5:'都心5区',T23:'他23区',TKN:'東京圏',M3:'他3大都市圏',RG:'地方圏',US:'米国',OT:'他'};
const AREA_O=['C5','T23','TKN','M3','RG','US','OT'];
const CORP_L={NBF:'日本ビルファンド',JRE:'ジャパンリアルエステイト',GOR:'グローバル・ワン',DOI:'大和証券オフィス',ICG:'いちごオフィス',JEI:'ジャパンエクセレント',MHR:'森ヒルズリート',JPR:'日本プライムリアルティ',TRE:'東急リアル・エステート',HLC:'ヒューリックリート',NUD:'NTT都市開発リート',HFR:'平和不動産リート',SHR:'積水ハウス・リート',MTR:'森トラストリート',SKR:'サンケイリアルエステート',KDX:'ＫＤＸ不動産',CTR:'セントラル・リート',ORI:'Oneリート'};
const CORP_O=Object.keys(CORP_L);
/* 投資法人の識別色（アプリ全体で共通）。暗背景で判別できる16色を、
   オフィス特化=寒色系、住宅主体=緑系、複合・その他=暖色系という括りで割り当てる。 */
const CORP_C={NBF:'#c8a35f',JRE:'#7fa8c9',GOR:'#8fbcd4',DOI:'#5f8fb0',ICG:'#9ec4d8',
 JEI:'#6f9fc0',MHR:'#d9b06a',JPR:'#c9897f',TRE:'#b08bbb',HLC:'#d0876a',
 NUD:'#a3b18a',HFR:'#8aa87c',SHR:'#6f9e78',MTR:'#e0c07a',SKR:'#c0a0d0',KDX:'#8d99ae',CTR:'#c9a0b8',ORI:'#7fb3a8'};
const AGE_B=[['a1','築10年未満',0,10],['a2','築10〜20年',10,20],['a3','築20〜30年',20,30],['a4','築30年以上',30,999]];
const q=(a,p)=>{if(!a||!a.length)return null;const s=[...a].sort((x,y)=>x-y);const i=(s.length-1)*p;const f=Math.floor(i);
  return s[f]+(s[Math.min(f+1,s.length-1)]-s[f])*(i-f)};
const med=a=>q((a||[]).filter(v=>v!=null&&isFinite(v)),.5);
/* ---- 統計ユーティリティ ----
   中央値の点推定だけでは差の有無を判断できないため、
   ブートストラップ信頼区間・層別調整・順位ベースの効果量を用意する。 */
function rng(seed){let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296}}
function bootCI(a,f,B){if(!a||a.length<8)return null;const r=rng(20260809),out=[];B=B||600;
  for(let b=0;b<B;b++){const s=new Array(a.length);
    for(let i=0;i<a.length;i++)s[i]=a[(r()*a.length)|0];out.push(f(s))}
  out.sort((x,y)=>x-y);return[out[Math.floor(B*0.025)],out[Math.floor(B*0.975)]]}
function bootDiffCI(a,b,B){if(!a||!b||a.length<8||b.length<8)return null;const r=rng(20260810),out=[];B=B||600;
  for(let k=0;k<B;k++){const sa=new Array(a.length),sb=new Array(b.length);
    for(let i=0;i<a.length;i++)sa[i]=a[(r()*a.length)|0];
    for(let i=0;i<b.length;i++)sb[i]=b[(r()*b.length)|0];
    out.push(med(sa)-med(sb))}
  out.sort((x,y)=>x-y);return[out[Math.floor(B*0.025)],out[Math.floor(B*0.975)]]}
/* 共通言語効果量: 無作為に選んだ1件同士でaがbを上回る確率（0.5=差なし） */
function cles(a,b){if(!a.length||!b.length)return null;let c=0,t=0;
  const sb=[...b].sort((x,y)=>x-y);
  for(const x of a){let lo=0,hi=sb.length;while(lo<hi){const m=(lo+hi)>>1;sb[m]<x?lo=m+1:hi=m}
    let lo2=0,hi2=sb.length;while(lo2<hi2){const m=(lo2+hi2)>>1;sb[m]<=x?lo2=m+1:hi2=m}
    c+=lo+(lo2-lo)/2;t+=sb.length}
  return t?c/t:null}
/* 層別調整: エリア×用途の層ごとに差を取り、層サイズで加重平均（Cochran–Mantel–Haenszel型） */
function stratDiff(rows,mf,split,minN){minN=minN||5;const st={};
  rows.forEach(d=>{const v=mf(d);if(v==null||!isFinite(v))return;const k=d.a+'/'+d.u;(st[k]=st[k]||[[],[]])[split(d)?0:1].push(v)});
  let W=0,S=0,k=0;const det=[];
  Object.keys(st).forEach(key=>{const[x,y]=st[key];
    if(x.length>=minN&&y.length>=minN){const w=x.length+y.length;S+=(med(x)-med(y))*w;W+=w;k++;
      det.push({k:key,n1:x.length,n0:y.length,d:med(x)-med(y)})}});
  return W?{diff:S/W,n:W,strata:k,det}:null}
const fmt=(v,d=2)=>(v==null||!isFinite(v))?'—':v.toFixed(d);
const jn=v=>v==null?'—':Math.round(v).toLocaleString('ja-JP');
const el=id=>document.getElementById(id);
/* HTMLエスケープ: テキスト・属性値の双方で安全（引用符・スラッシュも変換） */
const ESCMAP={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#47;','`':'&#96;','=':'&#61;'};
const esc=s=>String(s==null?'':s).replace(/[&<>"'\/`=]/g,c=>ESCMAP[c]);

const BASE=D.filter(d=>d.a!=='XX');
const STRAT=[{"l": "NBF", "nm": "日本ビルファンド投資法人", "pos": "超大型コア・オフィス特化型", "ax": "規模の優位で「都心の象徴的資産」を押さえる", "mo": "1物件あたり平均254億円（鑑定評価額ベース）はMHR(460億円)に次ぐ規模。三井不動産の開発物件を継続取得し、都心5区44%・東京圏74%に集中。オフィス100%で用途分散を放棄する代わり、テナント信用力と立地で下方リスクを抑える設計。", "rk": "オフィス市況の一方向リスクを丸ごと負う。上位5物件で32.5%を占め、大型1棟の稼働変動が全体に効く。", "ed": "認証保有率97.1%は全法人最高。ESG適格性を資金調達コストと出口価格に転嫁する戦略が最も徹底している。", "n": 70, "aum": 1.78, "avg": 25403, "t5": 32.5, "yr": 6.25, "occ": 100, "c5": 44.3, "use": "オフィス100%", "area": "都心5区44% / 他23区19% / 他3大都市圏14%", "cert": 97.1, "prc": 100, "ny": 54, "no": 69}, {"l": "JRE", "nm": "ジャパンリアルエステイト投資法人", "pos": "大型コア・オフィス特化型（全国分散併用）", "ax": "都心の質と地方中核都市の利回りを両建てする", "mo": "都心5区49%と最も都心比率が高い一方、地方圏19%を明示的に組み込む。1物件平均183億円。三菱地所の開発力を背景に、丸の内型のプライム物件と地方中核都市のランドマークを組み合わせ、キャップレート差を収益源にする。", "rk": "地方物件は流動性が低く、出口が限られる。テナント集中度の管理が生命線。", "ed": "認証91.1%。管理は三菱地所プロパティマネジメントに集約するが、物件名を非開示とする情報統制型。", "n": 79, "aum": 1.45, "avg": 18320, "t5": 29.5, "yr": 5.74, "occ": 100, "c5": 49.4, "use": "オフィス100%", "area": "都心5区49% / 地方圏19% / 他3大都市圏14%", "cert": 91.1, "prc": 100, "ny": 73, "no": 78}, {"l": "GOR", "nm": "グローバル・ワン不動産投資法人", "pos": "少数精鋭・大型オフィス型", "ax": "18物件に絞り、1棟あたりの質で勝負する", "mo": "保有18物件で1物件平均158億円。上位5物件で48.9%と集中度が高い。複数スポンサー（明治安田生命・近鉄・農林中金・三菱UFJ信託）の物件供給を受ける独立系に近い構造。粗利回り4.60%（鑑定評価額ベース）はMHR(4.44%)に次ぐ16法人で2番目の低さで、価格の高い優良物件を保有していることを示す。", "rk": "物件数が少なく、1棟の退去がポートフォリオ全体の稼働に直結する。スポンサー単独の開発パイプラインに依存できない。", "ed": "認証77.8%。規模の制約を質で補う典型。", "n": 18, "aum": 0.25, "avg": 15788, "t5": 48.9, "yr": 4.6, "occ": 100, "c5": 22.2, "use": "オフィス100%", "area": "他3大都市圏33% / 都心5区22% / 他23区17%", "cert": 77.8, "prc": 94.4, "ny": 15, "no": 16}, {"l": "DOI", "nm": "大和証券オフィス投資法人", "pos": "都心集中・中規模オフィス型", "ax": "都心5区に83%を集中させ、立地だけで選別する", "mo": "都心5区82.8%・東京圏98.3%は16法人で突出。1物件平均108億円・賃貸面積中央値3,794㎡と中規模に振り、築年中央値28.7年の既存ビルを取得してバリューアップする発想。", "rk": "築古比率が高く、修繕・設備更新の資本的支出が構造的に重い。エリア分散が事実上ないため、都心オフィス需給の変調を直撃で受ける。", "ed": "認証63.8%は都心特化型として低め。築古ストックへの認証後付けが今後の課題。", "n": 58, "aum": 0.63, "avg": 10828, "t5": 34.3, "yr": 5.2, "occ": 100, "c5": 82.8, "use": "オフィス100%", "area": "都心5区83% / 他23区12% / 東京圏3%", "cert": 63.8, "prc": 96.7, "ny": 50, "no": 58}, {"l": "ICG", "nm": "いちごオフィスリート投資法人", "pos": "中小型ビルの再生（バリューアッド）型", "ax": "市場に埋もれた中小ビルを買い、手を入れて価値を上げる", "mo": "87物件・1物件平均33億円・賃貸面積中央値2,765㎡と小型の部類（HFR 2,078㎡・SHR 2,306㎡に次ぐ小ささ）。都心5区41%だが他23区25%・地方20%と広く拾う。大型プライム市場では価格競争に勝てないため、競合の少ない中小ビル市場で「心築（再生）」により利回りを作る。", "rk": "物件数が多く1棟あたりが小さいため、管理オペレーションの効率が収益を左右する。テナントは中小企業中心で信用力が相対的に低い。", "ed": "認証21.8%は最低水準。中小ビルは認証取得の費用対効果が出にくく、ESG評価では構造的に不利。", "n": 87, "aum": 0.29, "avg": 3319, "t5": 14.9, "yr": 5.64, "occ": 100, "c5": 41.4, "use": "オフィス98% / 商業2%", "area": "都心5区41% / 他23区25% / 他3大都市圏20%", "cert": 21.8, "prc": 0, "ny": 87, "no": 87}, {"l": "JEI", "nm": "ジャパンエクセレント投資法人", "pos": "大型オフィス・準コア型", "ax": "東京圏の大型物件を軸に、地方中核都市で利回りを補完", "mo": "33物件・1物件平均107億円。都心5区39%に対し東京圏21%・地方18%と分散。粗利回り7.06%（鑑定評価額ベース）は16法人で最高水準で、価格に対して収益の厚い物件を選好していることを示す。", "rk": "高利回りは市場が求めたリスクプレミアムでもある。地方大型物件の出口戦略が問われる。", "ed": "認証78.8%。日鉄興和不動産系の開発物件を受け皿とする構造。", "n": 33, "aum": 0.35, "avg": 10655, "t5": 40, "yr": 7.06, "occ": 100, "c5": 39.4, "use": "オフィス100%", "area": "都心5区39% / 東京圏21% / 地方圏18%", "cert": 78.8, "prc": 97.1, "ny": 25, "no": 33}, {"l": "MHR", "nm": "森ヒルズリート投資法人", "pos": "都心プレミアム集中型（最も極端な集中戦略）", "ax": "森ビルの都心大規模再開発に100%張る", "mo": "11物件すべてが都心5区。1物件平均460億円は16法人で最大、上位5物件で79.9%を占める。六本木ヒルズ・虎ノ門ヒルズ・アーク森ビルといった街区型再開発の持分を保有し、オフィス73%に住宅18%・商業9%を混ぜた複合用途で単一用途リスクを緩和。", "rk": "集中度79.9%は16法人で最高。1物件の稼働・賃料改定が分配金に直結する。全物件が都心5区かつ森ビルの開発物件であり、単一デベロッパーへの依存度が最も高い部類。", "ed": "粗利回り4.44%（鑑定評価額ベース）は最低水準。市場が最も低いキャップレートで評価している＝資産価値が最も高く評価されている裏返し。", "n": 11, "aum": 0.51, "avg": 46000, "t5": 79.9, "yr": 4.44, "occ": 100, "c5": 100, "use": "オフィス73% / 住宅18% / 商業9%", "area": "都心5区100%", "cert": 72.7, "prc": 100, "ny": 10, "no": 11}, {"l": "JPR", "nm": "日本プライムリアルティ投資法人", "pos": "オフィス＋商業のバランス型", "ax": "用途と地域の二軸で分散し、変動を平準化する", "mo": "オフィス75%・商業22%。都心5区45%に東京圏21%を組み合わせ、上位5物件の集中度30.8%は低位。1物件平均100億円。東京建物の開発物件を軸にしつつ、特定用途・特定物件への依存を意図的に避けた設計。", "rk": "分散は変動を抑える一方で突出した成長も生みにくい。商業施設は個別のテナント業績に業績が連動する。", "ed": "築年中央値30.1年と築古。認証71.6%。計画修繕の巧拙が長期のNOIを決める帯にある。", "n": 67, "aum": 0.67, "avg": 10015, "t5": 30.8, "yr": 6.12, "occ": 100, "c5": 44.8, "use": "オフィス75% / 商業22% / ホテル3%", "area": "都心5区45% / 東京圏21% / 他23区12%", "cert": 71.6, "prc": 98.5, "ny": 50, "no": 67}, {"l": "TRE", "nm": "東急リアル・エステート投資法人", "pos": "沿線集中・複合用途型", "ax": "東急沿線という「面」に投資し、街の成長を取り込む", "mo": "28物件すべてが東京圏、都心5区71%。1物件平均117億円。オフィス64%・商業21%・住宅11%の複合。渋谷・二子玉川など東急が開発を主導するエリアに集中し、街づくりの果実を賃料成長として回収する構造。", "rk": "沿線集中は地域経済の変調に対する分散が効かない。築年中央値31.4年と築古で、更新投資の負担が重い。", "ed": "LEED ND（まちづくり部門）を取得した二子玉川ライズを保有。街区単位でのESG評価という他法人にない資産を持つ。", "n": 28, "aum": 0.33, "avg": 11676, "t5": 43.5, "yr": null, "occ": 100, "c5": 71.4, "use": "オフィス64% / 商業21% / 住宅11%", "area": "都心5区71% / 他23区21% / 東京圏7%", "cert": 75, "prc": 0, "ny": 0, "no": 28}, {"l": "HLC", "nm": "ヒューリックリート投資法人", "pos": "用途分散・駅前立地特化型", "ax": "駅前という立地条件を共通項に、用途を跨いで分散する", "mo": "オフィス51%・ヘルスケア21%・商業12%。東京圏92.5%だが他23区45%が都心5区40%を上回る。1物件平均73億円。ヒューリックの「駅前・駅近」戦略を継承し、用途ではなく立地で選別する点が他法人と決定的に異なる。ヘルスケア21%は高齢化を捉えた長期契約型キャッシュフロー。", "rk": "ヘルスケアはオペレーター信用力に依存し、代替が難しい。用途分散はモニタリング負荷を高める。", "ed": "管理をヒューリックビルマネジメントに内製集約。グループ内で運営品質を統制する垂直統合型。", "n": 67, "aum": 0.49, "avg": 7259, "t5": 34.6, "yr": 5.48, "occ": 100, "c5": 40.3, "use": "オフィス51% / ヘルスケア21% / 商業12%", "area": "他23区45% / 都心5区40% / 東京圏7%", "cert": 41.8, "prc": 97.1, "ny": 44, "no": 67}, {"l": "NUD", "nm": "NTT都市開発リート投資法人", "pos": "住宅・オフィス二本柱型", "ax": "変動の大きいオフィスを、安定的な住宅で中和する", "mo": "住宅58%・オフィス40%。都心5区56.5%と都心比率は高い。1物件平均55億円と中規模。オフィスの景気連動性を、賃料変動の小さい都心住宅で打ち消すポートフォリオ設計。", "rk": "住宅は個別の賃料上昇余地が限られ、成長エンジンにはなりにくい。稼働率中央値99.2%と既に高位で、稼働改善の余地が乏しい。", "ed": "認証71.0%。住宅系でのDBJ認証取得（23件）を積極化しており、オフィス偏重になりがちな認証取得を住宅にも広げている点が特徴。", "n": 62, "aum": 0.34, "avg": 5497, "t5": 31.5, "yr": 5.3, "occ": 99.2, "c5": 56.5, "use": "住宅58% / オフィス40% / その他2%", "area": "都心5区56% / 他23区31% / 他3大都市圏8%", "cert": 71, "prc": 98.4, "ny": 52, "no": 61}, {"l": "HFR", "nm": "平和不動産リート投資法人", "pos": "小口分散・住宅主体型", "ax": "小さく多く持ち、1棟の失敗が効かない構造をつくる", "mo": "151物件・1物件平均24億円は16法人で最小。上位5物件の集中度11.9%も最小で、極端な分散型。住宅66%・オフィス34%、他23区38%と都心外の実需エリアが中心。", "rk": "1棟あたりが小さいため管理コストの比率が上がりやすい。物件数の多さは運営負荷とデータ管理の難易度を高める。", "ed": "認証22.8%と低位。小規模物件は認証取得の採算が合わず、ESG面では構造的な制約を抱える。", "n": 136, "aum": 0.33, "avg": 2436, "t5": 11.9, "yr": 5.41, "occ": 99.25, "c5": 22.8, "use": "住宅66% / オフィス34%", "area": "他23区38% / 都心5区23% / 他3大都市圏15%", "cert": 22.8, "prc": 98.6, "ny": 135, "no": 136}, {"l": "SHR", "nm": "積水ハウス・リート投資法人", "pos": "住宅特化・スポンサー開発直結型", "ax": "積水ハウスの開発供給を受け皿として安定成長する", "mo": "住宅96%。他23区46%・都心5区18%と、都心よりも実需の厚いエリアに展開。1物件平均48億円。築年中央値16.8年と16法人で最も築浅で、スポンサーの新築供給を継続的に取得している証左。米国物件も保有し地理分散を試行。", "rk": "稼働率中央値96.4%は16法人で最低。住宅は入退去が常態で、稼働の底上げ余地が最大の改善テーマ。", "ed": "認証81.2%と住宅系では突出。CASBEE不動産103件・BELS★5×9件で、ZEH水準の新築供給がそのまま認証率に直結している。", "n": 138, "aum": 0.67, "avg": 4823, "t5": 36.9, "yr": 4.83, "occ": 96.4, "c5": 18.1, "use": "住宅96% / オフィス4%", "area": "他23区46% / 都心5区18% / 東京圏14%", "cert": 81.2, "prc": 92, "ny": 136, "no": 138}, {"l": "MTR", "nm": "森トラストリート投資法人", "pos": "大型・複合（オフィス＋ホテル）型", "ax": "オフィスの安定とホテルの変動を意図的に組み合わせる", "mo": "20物件・1物件平均268億円と大型。オフィス50%・ホテル30%・商業15%。上位5物件で57.3%と集中度が高い。森トラストの大型開発とホテル運営力を背景に、景気拡大局面ではホテルが伸び、後退局面ではオフィスが支える設計。", "rk": "ホテルは変動費型で業績連動性が高く、外的ショックに脆い。集中度の高さがそれを増幅する。", "ed": "認証95.0%は最高水準。DBJ18件で、評価語（国内トップクラス等）ベースの高位認証を多数保有。", "n": 20, "aum": 0.54, "avg": 26821, "t5": 57.3, "yr": 5.09, "occ": 100, "c5": 45, "use": "オフィス50% / ホテル30% / 商業15%", "area": "都心5区45% / 東京圏20% / 他3大都市圏15%", "cert": 95, "prc": 100, "ny": 18, "no": 20}, {"l": "SKR", "nm": "サンケイリアルエステート投資法人", "pos": "総合型への転換途上", "ax": "オフィス単独から用途分散へ舵を切っている最中", "mo": "16物件・オフィス56%・ホテル38%・物流6%。築年中央値8.85年と16法人で最も築浅。2023年に運用ガイドラインを変更し総合型REITへ転換しており、現在のポートフォリオは移行途上の姿。", "rk": "規模が小さく上位5物件で51.1%を占める。2026年に非公開化を目的としたTOBが実施され不成立に終わっており、資本政策の不確実性を抱える。", "ed": "認証25.0%と低位。ただし築浅比率が高く、今後の認証取得余地は大きい。", "n": 16, "aum": 0.1, "avg": 6041, "t5": 51.1, "yr": null, "occ": 100, "c5": 37.5, "use": "オフィス56% / ホテル38% / 物流6%", "area": "都心5区38% / 地方圏25% / 他3大都市圏19%", "cert": 25, "prc": 100, "ny": 0, "no": 16}, {"l": "KDX", "nm": "ＫＤＸ不動産投資法人", "pos": "超分散・独立系マルチアセット型", "ax": "スポンサー系列に依存せず、市場から広く買い集める", "mo": "343物件は16法人で最多、1物件平均39億円・上位5物件の集中度9.0%は最小。住宅39%・オフィス25%・商業17%と用途を広く分散し、東京圏68%・地方圏32%。特定の開発会社の供給に依存せず、市場全体を調達源とする独立系の典型。", "rk": "物件数の多さは管理・情報開示の負荷を高める。分散は下振れを抑えるが、個別物件のバリューアップ効果は薄まる。", "ed": "管理をケネディクス・プロパティ・デザインに集約し、183棟を実名公開。16法人で最も管理体制の透明性が高い。", "n": 343, "aum": 1.34, "avg": 3913, "t5": 9, "yr": 5.33, "occ": 100, "c5": 0, "use": "住宅39% / オフィス25% / 商業17%", "area": "東京圏68% / 地方圏32%", "cert": 56.6, "prc": 99.4, "ny": 243, "no": 343}, {"l": "CTR", "nm": "セントラル・リート投資法人", "pos": "小型総合型・中部圏シフト途上", "ax": "PM実績を持つスポンサーの運営力で中小型物件の収益を引き上げる", "mo": "20物件・1物件平均32億円と16法人中で最小の部類。オフィス55%・商業30%・ホテル10%の総合型で、都心5区25%・他3大都市圏35%と地方分散が進む。スポンサーのザイマックスはJ-REITのPM受託で実績首位であり、自ら運営する物件を組み入れることで、中小型ビルでも管理品質を担保する構造。2025年10月に名鉄都市開発が51%を取得しダブルスポンサー体制へ移行、2026年3月に名古屋の2物件を取得し中部圏へのシフトを開始した。", "rk": "資産規模506億円は16法人で最小級で、1物件の稼働変動が分配金に直結する。オフィス・商業・ホテル・住宅と用途が分散する一方、各用途の物件数が少なく用途別の運営ノウハウの蓄積が限定的。スポンサー交代に伴う投資方針の変化も不確実性となる。", "ed": "認証取得は12物件・延床面積ベース76.1%。CASBEE不動産8物件（うちSランク7）とBELS4物件を保有し、エニシオ名駅はBELS★5。保有オフィス9物件すべてで再生可能エネルギー100%電力を導入。GRESBリアルエステイト評価で4スター・グリーンスター、開示評価はAレベル。", "n": 20, "aum": 0.06, "avg": 3231, "t5": 46.7, "yr": null, "occ": null, "c5": 25, "use": "オフィス55% / 商業30% / ホテル10%", "area": "他3大都市圏35% / 都心5区25% / 東京圏25%", "cert": 60, "prc": 100, "ny": 0, "no": 0}, {"l": "ORI", "nm": "Oneリート投資法人", "pos": "中小型オフィス特化からホテル併走型への転換途上", "ax": "みずほの情報網で中小型ビルを仕入れ、運営改善で価値を引き上げる", "mo": "34物件・1物件平均51億円。延床概ね33,000㎡未満の中小規模オフィスを重点対象とし、都心5区は17.6%と低く、その他23区・東京周辺都市部・地方中核市に分散する。2025年5月に用途無限定の総合型へ規約変更し、2026年3月にホテル5物件（286億円）を一括取得してホテル比率を約25%へ引き上げた。物件入替を継続的に行い、2025年以降だけで南品川3物件・MY熊本・ONEST南大塚・新川一丁目を売却、京都烏丸スクエアも東京建物へ4回分割で譲渡中。中長期の資産規模目標は2,000億円。", "rk": "中小型ビルは大企業の集約移転の受け皿になりにくく、テナント数が多いぶん個別の退去が積み上がりやすい。築年中央値34.5年と16法人で最も古い部類にあり、資本的支出が重い（第25期は533百万円で修繕費131百万円と合わせ664百万円）。ホテルへの急速な傾斜は収益の変動性を高める可能性があり、運営ノウハウの蓄積も途上。", "ed": "認証取得は25物件（CASBEE不動産21件・DBJ Green Building 3件・BELS 2件）。CASBEEはAランクが18件と中心で、Sランクは立川錦町ビルと大同生命水戸ビルの2件。ONEST箱崎ビルはBELS6つ星。延床面積ベースのグリーンビル認証取得割合を2030年度に90%とするKPIを掲げる。GRESBリアルエステイト評価で4スター・Green Starを8年連続獲得。", "n": 34, "aum": 0.17, "avg": 5081, "t5": 32, "yr": null, "occ": 100, "c5": 17.6, "use": "オフィス79% / ホテル21%", "area": "その他23区24% / 東京周辺都市部21% / その他3大都市圏21% / 都心5区18% / 政令市12% / 地方6%", "cert": 73.5, "prc": 100, "ny": null, "no": 28}];
const PMCORP=[];   /* 有価証券報告書ベースのPM会社データ（未取込） */
/* 含み損益率は開示定義（期末鑑定評価額 − 期末帳簿価額）に合わせる。
   取得価格は取得諸費用を含まず、減価償却も反映されないため、含み益の基準としては不適切。 */
const gain=d=>(d.ug!=null?d.ug:null);
/* ============ 環境・省エネ性能スコア ============
   第三者認証（設計・仕様の裏付け）と、実測のエネルギー効率（運用の実力）を
   50:50で合成する。認証だけでは「取ったが使い方は悪い」建物を高く評価してしまい、
   効率だけでは設備更新やZEB化といった投資の裏付けを評価できないため。 */

/* ① 認証スコア（0〜20点）: 制度ごとの到達水準を点数化し、重複取得は加点 */
function certScore(d){
  let s=0;
  if(d.zeb==='Ready')s+=6; else if(d.zeb==='Oriented')s+=4;      /* ZEBは省エネ性能の最上位指標 */
  if(d.bels)s+=Math.min(d.bels,6)*0.8;                            /* BELS ★1〜6 */
  if(d.dbj)s+=d.dbj*0.8;                                          /* DBJ ★1〜5（総合評価） */
  if(d.casn)s+=d.casn*0.9;                                        /* CASBEE S=4/A=3/B+=2/B=1 */
  if(d.leed)s+=d.leed*0.8;                                        /* LEED Platinum=4/Gold=3 */
  if(d.well)s+=1;                                                 /* CASBEEウェルネスオフィス */
  return Math.min(s,20)}

/* ② エネルギー効率: 水道光熱費の原単位（円/㎡/年）。低いほど良いので符号を反転。
   賃料水準の高低に左右されないよう、対収入比ではなく面積あたりで測る。
   ただしオーナー負担の範囲は用途で大きく異なるため、比較は同一用途内に限定する。 */
function energyIntensity(d){
  if(d.ut==null||!d.nla||!d.ap||d.yra==null)return null;
  if(d.ut<=0)return null;              /* 0は「省エネ」ではなく非開示・テナント直接契約の可能性が高い */
  const revYen=d.yra/100*d.ap*1e6;     /* 年間賃貸事業収入（円） */
  return d.ut/100*revYen/d.nla}        /* 円/㎡/年 */

/* 用途内での相対評価（偏差値）に変換してから合成する */
let EIPOOL={};
function eiPool(u){if(EIPOOL[u])return EIPOOL[u];
  EIPOOL[u]=scopeEL().map(energyIntensity).filter(v=>v!=null&&isFinite(v));
  return EIPOOL[u]}
let CSPOOL=null;
function csPool(){if(!CSPOOL)CSPOOL=scopeEL().map(certScore);return CSPOOL}
function greenScore(d){
  const tc=pct(certScore(d),csPool());
  const ei=energyIntensity(d), p=eiPool(d.u);
  /* 原単位を算定できない物件（面積非開示・光熱費0）は認証のみで評価する。
     推定値で埋めると、実測していない物件を実測物件と同列に並べることになるため。 */
  if(ei==null||p.length<8)return tc;
  const te=100-pct(ei,p);              /* 低いほど高評価になるよう反転（偏差値の対称性を利用） */
  return (tc+te)/2}
function greenParts(d){
  const ei=energyIntensity(d),p=eiPool(d.u);
  return{cs:certScore(d),tc:pct(certScore(d),csPool()),ei,
    te:(ei!=null&&p.length>=8)?100-pct(ei,p):null,n:p.length}}
/* 評価母集団: 5軸（収益性・規模流動性・費用効率・資産価値・環境省エネ）の算定に必要な項目が
   すべて揃い、かつ期を通じて保有していた物件。稼働率は評価軸ではなくなったため条件から外す。 */
const EL=BASE.filter(d=>!d.pt&&d.yra!=null&&d.yna!=null&&d.oer!=null&&d.ug!=null&&d.ap!=null);
const ELS=new Set(EL.map(d=>d.id));
const AX=[
 {k:'inc',l:'収益性',en:'INCOME',u:'%',hk:'ax_inc',f:d=>d.yra,d:2,
  act:'AM: 賃料改定余地の棚卸しと、稼働ロス・フリーレントの回収設計から着手する。'},
 {k:'liq',l:'規模・流動性',en:'LIQUIDITY',u:'百万円',hk:'ax_liq',f:d=>d.ap,d:0,
  act:'AM: 小型物件は売却時の買い手が限られる。ポートフォリオ全体の平均規模を意識し、小型物件は複数棟をまとめて売却するなど出口の設計を先に決めておく。'},
 {k:'mgn',l:'費用効率',en:'MARGIN',u:'%',hk:'ax_mgn',f:d=>(d.yra&&d.yna!=null?d.yna/d.yra*100:null),d:1,
  act:'PM×BM: 委託仕様の再入札とバンドル発注、清掃・警備頻度の最適化、水光熱のエネマネで経費率を中央値まで寄せる。'},
 {k:'val',l:'資産価値',en:'APPRAISAL',u:'%',hk:'ax_val',f:d=>gain(d),d:1,
  act:'AM: 鑑定の前提（想定NOI・還元利回り）を確認し、含み益が薄い要因が賃料か費用かキャップレートかを切り分ける。'},
 {k:'grn',l:'環境・省エネ',en:'GREEN',u:'',hk:'ax_grn',f:d=>greenScore(d),d:0,
  act:'建築/AM: 認証が低いなら、既存ビルでもBELS・CASBEE不動産の後付け取得が低コストで効く。エネルギー効率が低いなら、熱源の台数制御・LED化・外気冷房・契約電力の見直しといったBM施策が先。どちらが弱いかで打ち手が変わる。'}];
/* 標準正規分布の逆関数（Acklamの有理近似）。偏差値への変換に用いる。 */
function invNorm(p){if(p<=0||p>=1)return 0;
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00];
  const b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01];
  const c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00];
  const dd=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00];
  const pl=0.02425;let q,r;
  if(p<pl){q=Math.sqrt(-2*Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((dd[0]*q+dd[1])*q+dd[2])*q+dd[3])*q+1)}
  if(p>1-pl){q=Math.sqrt(-2*Math.log(1-p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((dd[0]*q+dd[1])*q+dd[2])*q+dd[3])*q+1)}
  q=p-0.5;r=q*q;
  return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)}
/* 偏差値（平均50・標準偏差10）。
   平均と標準偏差から直接算出すると、NOIマージンの-207%のような外れ値に引きずられ
   他の物件が中央へ潰れてしまうため、順位を正規分布に写像する正規スコア法を用いる。 */
function pct(v,arr){if(v==null||!isFinite(v)||!arr.length)return null;
  let b=0,e=0;for(const x of arr){if(x<v)b++;else if(x===v)e++}
  const n=arr.length, r=(b+e/2)/n;
  const p=Math.min(Math.max(r,0.5/n),1-0.5/n);
  return 50+10*invNorm(p)}
let POOL={};
function poolOf(list){const key=list===EL?'ALL':'U'+(list[0]?list[0].u:'x')+list.length;
  if(POOL[key])return POOL[key];const p={};AX.forEach(a=>p[a.k]=list.map(a.f).filter(v=>v!=null));POOL[key]=p;return p}
/* 採点母集団: 既定は評価対象全体。用途構成が偏る（オフィス68%）ため、
   同用途内での採点にも切り替えられるようにする（n>=15の用途のみ）。 */
/* 採点母集団は用途スコープ内の評価対象に固定する。
   オフィスと住宅では費用構造も稼働の意味も異なり、混ぜた偏差値は解釈できないため。 */
function scopeEL(){return EL.filter(d=>d.u===ST.scope)}
function scorePool(d){return scopeEL()}
/* 5軸の偏差値を平均すると中心極限効果で中央に圧縮される（実測36.8〜58.5）。
   総合も「母集団内での位置」を表す偏差値にそろえるため、平均値をもう一度偏差値化する。 */
let RAWT={};
function rawTotals(pool){const key=pool===EL?'ALL':'U'+(pool[0]?pool[0].u:'x')+pool.length;
  if(RAWT[key])return RAWT[key];const p=poolOf(pool);
  RAWT[key]=pool.map(x=>{const v=AX.map(a=>pct(a.f(x),p[a.k])).filter(y=>y!=null&&isFinite(y));
    return v.length?v.reduce((s,y)=>s+y,0)/v.length:null}).filter(x=>x!=null);
  return RAWT[key]}
function scoreOf(d,list){const pool=list||scorePool(d);const p=poolOf(pool);
  const s=AX.map(a=>({a,v:a.f(d),p:pct(a.f(d),p[a.k])}));
  const ok=s.filter(x=>x.p!=null);
  const raw=ok.length?ok.reduce((t,x)=>t+x.p,0)/ok.length:null;
  return{s,raw,total:raw==null?null:pct(raw,rawTotals(pool))}}
/* 総合点は5軸の偏差値の平均のため、中心極限効果で中央に圧縮される
   （実測: 最小14.8・最大74.7で、90点以上や80点以上は構造的に発生しない）。
   絶対値の閾値でグレードを切ると上位グレードが永久に空席になるため、
   母集団内での相対順位（上位何%か）でグレードを定義する。 */
/* グレードは順位そのものから決める。偏差値を閾値と比較する方式だと、
   同じ偏差値の物件が境界をまたいで別グレードになり、順位表示と食い違うため。 */
function gradeByRank(rank,n){const q=rank/n;
  return q<=0.05?['AAA','上位5%']:q<=0.15?['AA','上位15%']:q<=0.30?['A','上位30%']:
         q<=0.50?['BBB','上位50%']:q<=0.70?['BB','上位70%']:q<=0.85?['B','上位85%']:['C','下位15%']}

const ST={scope:'OF',use:'ALL',q:'',evl:'ALL',vPool:'all',vCorp:'ALL',area:'ALL',corp:'ALL',age:'ALL',cert:'ALL',sel:null,valG:'all',
  corpY:'yra',corpX:'c5',distG:'area',distM:'yra',x:'age',y:'yra',mode:'scatter',stackG:'use',costK:'ut',
  certM:'yra',certG:'area',covBase:'n',pmSel:null,grComp:'pc',prCorp:'ALL',prCert:'ALL',prPm:'ALL',rank:'type',covG:'area',sort:'yr',sortDir:-1,page:1};
/* 用途スコープ: アプリ全体をオフィス／住宅のどちらかに絞る。
   用途が違うと費用構造も稼働の意味も異なり、混ぜて比較しても解釈できないため、
   絞込の一項目ではなく全ページ共通の前提として扱う。 */
/* 用途スコープ: アプリ全体をオフィス／住宅のどちらかに絞る。
   用途が違うと費用構造も稼働の意味も異なり、混ぜて比較しても解釈できないため、
   絞込の一項目ではなく全ページ共通の前提として扱う。 */
function match(d){
  if(d.u!==ST.scope)return false;
  if(ST.area!=='ALL'&&d.a!==ST.area)return false;
  if(ST.corp!=='ALL'&&d.l!==ST.corp)return false;
  if(ST.age!=='ALL'){const b=AGE_B.find(b=>b[0]===ST.age);if(!(d.age!=null&&d.age>=b[2]&&d.age<b[3]))return false}
  if(ST.cert==='Y'&&!d.cn)return false;
  if(ST.cert==='N'&&d.cn)return false;
  if(ST.evl==='Y'&&!ELS.has(d.id))return false;
  if(ST.evl==='N'&&ELS.has(d.id))return false;
  return true}
/* 物件タブ専用の絞込。一覧のみに効き、概況・分析・評価の母集団は変えない。 */
function matchPr(d){
  if(ST.prCorp!=='ALL'&&d.l!==ST.prCorp)return false;
  if(ST.prCert==='Y'&&!d.cn)return false;
  if(ST.prCert==='N'&&d.cn)return false;
  if(ST.prCert&&ST.prCert.indexOf('K:')===0&&(d.ck||'').indexOf(ST.prCert.slice(2))<0)return false;
  if(ST.prPm!=='ALL'&&d.pm_co!==ST.prPm)return false;
  return true}
function matchExceptCert(d){const s=ST.cert;ST.cert='ALL';const r=match(d);ST.cert=s;return r}
let F=[],FY=[],FO=[];
function refilter(){F=BASE.filter(match);FY=F.filter(d=>d.yra>0&&d.yra<15);FO=F.filter(d=>d.oer!=null&&d.oer>0&&d.oer<95)}

/* ---- controls ---- */
function seg(id,opts,key,cb){const c=el(id);if(!c)return;c.innerHTML='';
  opts.forEach(([v,l])=>{const b=document.createElement('button');b.textContent=l;b.className=ST[key]===v?'on':'';
    b.onclick=()=>{ST[key]=v;[...c.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');cb()};c.appendChild(b)})}
function fillSel(id,opts,key,cb){const s=el(id);if(!s)return;s.innerHTML='';
  opts.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;s.appendChild(o)});
  s.value=ST[key];s.onchange=()=>{ST[key]=s.value;ST.page=1;syncCtl();cb()}}
const cnt=f=>BASE.filter(f).length;
/* 上部の絞込UIは用途スコープに置き換えたため、要素があるときだけ同期する */
function syncCtl(){ if(!el('selArea'))return;
  [['wArea','area'],['wCorp','corp'],['wAge','age'],['wCert','cert']].forEach(([w,k])=>{
    const e=el(w);if(e)e.classList.toggle('on',ST[k]!=='ALL')});}
/* 上部の絞込UIは用途スコープに置き換えたため、存在する場合のみ結線する */
if(el('fbtn'))el('fbtn').onclick=()=>{const o=el('selWrap').classList.toggle('open');
  el('fbtn').classList.toggle('on',o);el('fbtn').setAttribute('aria-expanded',o);
  el('fbtn').textContent=o?'絞込条件を閉じる':'絞込条件を開く'};
if(el('reset'))el('reset').onclick=()=>{Object.assign(ST,{area:'ALL',corp:'ALL',age:'ALL',cert:'ALL',evl:'ALL',q:'',page:1});
  ['selArea','selCorp','selAge','selCert','selEvl'].forEach(id=>{const e=el(id);if(e)e.value='ALL'});syncCtl();render()};

/* ---- 評価タブ用セレクタ ---- */
/* 物件をタップして評価タブへ。用途が違う場合はスコープも切り替える。 */
function pick(d){if(!d)return;
  if(d.u!==ST.scope&&(d.u==='OF'||d.u==='RS')){ST.scope=d.u;GTHR={};EIPOOL={};CSPOOL=null;RAWT={};POOL={};
    const bs=[...document.querySelectorAll('#segScope button')];
    bs.forEach(b=>b.classList.toggle('on',b.textContent===USE_L[d.u]))}
  ST.sel=d.id;ST.vCorp='ALL';fillVPick();refilter();drawHits();go('va')}
/* ---- metrics / groups ---- */
const METRIC={yra:['粗利回り(鑑定)','%',d=>d.yra,2],yna:['NOI利回り(鑑定)','%',d=>d.yna,2],yr:['粗利回り(取得価格)','%',d=>d.yr,2],yn:['NOI利回り(取得価格)','%',d=>d.yn,2],oer:['経費率(償却込)','%',d=>d.oer,1],mgn:['NOIマージン','%',d=>(d.yra&&d.yna!=null?d.yna/d.yra*100:null),1],
  occ:['稼働率','%',d=>d.occ,1],age:['築年数','年',d=>d.age,1],nla:['賃貸可能面積','㎡',d=>d.nla,0],
  pr:['取得価格','百万円',d=>d.pr,0],ap:['鑑定評価額','百万円',d=>d.ap,0],ug:['含み損益率','%',d=>d.ug,1]};
const CORPX={
  c5:['都心5区の比率（%）',v=>v.length?v.filter(d=>d.a==='C5').length/v.length*100:null,1,'%'],
  size:['1物件平均の鑑定評価額（百万円）',v=>{const a=v.filter(d=>d.ap!=null);return a.length?a.reduce((s,d)=>s+d.ap,0)/a.length:null},0,''],
  tokyo:['東京圏の比率（%）',v=>v.length?v.filter(d=>['C5','T23','TKN'].indexOf(d.a)>=0).length/v.length*100:null,1,'%'],
  of:['オフィス比率（%）',v=>v.length?v.filter(d=>d.u==='OF').length/v.length*100:null,1,'%'],
  cert:['環境認証の保有率（%）',v=>v.length?v.filter(d=>d.cn).length/v.length*100:null,1,'%'],
  age:['築年数 中央値（年）',v=>{const a=v.filter(d=>d.age!=null).map(d=>d.age);return a.length>=3?med(a):null},1,'年']};
const GROUP={area:['エリア',d=>AREA_L[d.a],AREA_O.map(a=>AREA_L[a])],
  use:['用途',d=>USE_L[d.u],['オフィス','住宅','商業','ホテル','ヘルスケア','物流','複合','その他']],
  corp:['投資法人',d=>d.l,CORP_O],
  age:['築年帯',d=>{const b=AGE_B.find(b=>d.age!=null&&d.age>=b[2]&&d.age<b[3]);return b?b[1]:null},AGE_B.map(b=>b[1])],
  size:['規模',d=>d.nla?(d.nla<3000?'S 3千㎡未満':d.nla<10000?'M 3千–1万':d.nla<30000?'L 1–3万':'XL 3万㎡+'):null,['S 3千㎡未満','M 3千–1万','L 1–3万','XL 3万㎡+']],
  cert:['認証',d=>d.cn?'認証あり':'認証なし',['認証あり','認証なし']],
  occ:['稼働',d=>d.occ==null?null:(d.occ<95?'95%未満':d.occ<98?'95–98%':d.occ<100?'98–100%':'満室'),['95%未満','95–98%','98–100%','満室']]};
function groupStats(rows,gk,mk,minN=5){const g0=GROUP[gk],gf=g0[1],order=g0[2],mf=METRIC[mk][2];const g={};
  rows.forEach(d=>{const k=gf(d),v=mf(d);if(k==null||v==null||!isFinite(v))return;(g[k]=g[k]||[]).push(v)});
  return order.filter(k=>g[k]&&g[k].length>=minN).map(k=>{const v=g[k];const ci=bootCI(v,med);
    return{k,n:v.length,m:med(v),p25:q(v,.25),p75:q(v,.75),ci}})}
const CK=[['pm','外注委託費','#7fa8c9'],['ut','水道光熱費','#d0b060'],['tx','公租公課','#c9897f'],
  ['rp','修繕費','#a3b18a'],['dp','減価償却費','#8d99ae'],['in','保険料','#b08bbb'],['ot','その他費用','#6f7480']];

/* ---- 00 valuation ---- */
const EL_CORPS=[];EL.forEach(d=>{if(EL_CORPS.indexOf(d.l)<0)EL_CORPS.push(d.l)});
const EL_USES=[];EL.forEach(d=>{if(EL_USES.indexOf(d.u)<0)EL_USES.push(d.u)});
/* 投資法人の選択は物件を探すための絞込にのみ用い、基準線には反映しない。
   基準線は常に「その用途の平均像（偏差値50）」とする。 */
function vGroup(){return scopeEL()}
function groupLabel(){return USE_L[ST.scope]}
function groupLabelOld(){const a=[];if(ST.vCorp!=='ALL')a.push(CORP_L[ST.vCorp]);if(ST.vUse!=='ALL')a.push(USE_L[ST.vUse]);
  return a.length?a.join('／'):'評価対象 全体'}
/* 偏差は「採点母集団(pool)の中での順位」。基準線も同じpoolで算定しないと
   物件の偏差と基準線の偏差が別々の物差しになり、差分(pt)が意味を失う。 */
function avgScores(list,pool){const p=poolOf(pool||EL);
  return AX.map(a=>{const ps=list.map(d=>pct(a.f(d),p[a.k])).filter(v=>v!=null&&isFinite(v));
    const vs=list.map(a.f).filter(v=>v!=null&&isFinite(v));
    return{a,p:ps.length?ps.reduce((s,x)=>s+x,0)/ps.length:50,v:vs.length?med(vs):null}})}
/* 評価タブのセレクタ。用途は上部の用途スコープで固定されるため、
   ここでは投資法人で物件を絞り込み、物件を選ぶだけの役割とする。 */
function fillVPick(){
  const s1=el('vCorp'),s3=el('vSel');const P=scopeEL();
  const corps=[...new Set(P.map(d=>d.l))].filter(c=>CORP_O.indexOf(c)>=0)
    .sort((x,y)=>CORP_O.indexOf(x)-CORP_O.indexOf(y));
  s1.innerHTML='<option value="ALL">すべて（'+P.length+'物件）</option>'+
    corps.map(c=>'<option value="'+c+'">'+CORP_L[c]+'（'+P.filter(d=>d.l===c).length+'）</option>').join('');
  if(corps.indexOf(ST.vCorp)<0)ST.vCorp='ALL';
  s1.value=ST.vCorp;
  const g=P.filter(d=>ST.vCorp==='ALL'||d.l===ST.vCorp).slice().sort((a,b)=>(b.ap||0)-(a.ap||0));
  if(ST.sel&&g.every(d=>d.id!==ST.sel))ST.sel=null;
  s3.innerHTML='<option value="">— '+groupLabel()+'の平均を表示（'+g.length+'物件） —</option>'+
    g.map(d=>'<option value="'+esc(d.id)+'">'+esc(d.n)+'（'+esc(d.l)+'・'+fmt(d.yna)+'%）</option>').join('');
  s3.value=ST.sel||'';
  el('wVCorp').classList.toggle('on',ST.vCorp!=='ALL');
  el('wVSel').classList.toggle('on',!!ST.sel)}
function bindVPick(){
  el('vCorp').onchange=e=>{ST.vCorp=e.target.value;ST.sel=null;fillVPick();drawVal()};
  el('vSel').onchange=e=>{const v=e.target.value;
    ST.sel=(v&&scopeEL().some(x=>x.id===v))?v:null;fillVPick();drawVal()}}
function drawVal(){const c=el('valCard');
  const dSel=ST.sel?D.filter(x=>x.id===ST.sel)[0]:null;
  const VPOOL=scopeEL();   /* 採点母集団は用途スコープ内に固定（偏差値・基準線・順位・グレードで共通） */
  const pl=VPOOL;
  const base=scopeEL();
  const bs=avgScores(base,VPOOL);
  const d=ST.sel?D.filter(x=>x.id===ST.sel)[0]:null;
  const medAll={};AX.forEach(a=>medAll[a.k]=med(EL.map(a.f).filter(v=>v!=null)));
  const col=p=>p>=60?'#9ec49a':p>=45?'#c8a35f':'#c98c8c';
  const barW=p=>Math.max(0,Math.min(100,(p-25)/(75-25)*100));   /* 偏差値25〜75を0〜100%に写像 */
  let head,sc=null,total=null,rank=null;

  if(d){const r0=scoreOf(d);sc=r0.s;total=r0.total;
    rank=pl.filter(x=>scoreOf(x).total>total).length+1;
    const gr=gradeByRank(rank,pl.length);
    head='<div class="vhead"><div class="vname">'+esc(d.n)+'</div><div class="vmeta">'+
      esc(CORP_L[d.l])+'（'+esc(d.l)+'） / '+esc(USE_L[d.u])+' / '+esc(d.loc||AREA_L[d.a]||'—')+
      (d.age!=null?' / 築'+fmt(d.age,1)+'年':'')+'</div>'+
      '<div class="vscore"><span class="n">'+Math.round(total)+'<small>総合偏差値</small></span>'+
      '<span class="g">'+gr[0]+'・'+gr[1]+'<br>'+(pl===EL?'評価対象'+EL.length+'物件中':USE_L[d.u]+pl.length+'物件中')+' '+rank+'位</span></div>'+
      '<div class="vmeta" style="margin-top:9px">合成指標: 粗利回り '+fmt(d.yra)+'% × NOIマージン '+fmt(d.yna/d.yra*100,1)+'% ＝ NOI利回り '+fmt(d.yna)+'%（いずれも鑑定評価額ベース）'+HB('base')+'</div></div>'}
  else{const bt=bs.reduce((s,x)=>s+x.p,0)/bs.length;
    head='<div class="vhead"><div class="vname">'+groupLabel()+' の平均像</div>'+
      '<div class="vmeta">'+base.length+'物件の平均 / 全'+EL.length+'物件を母数とした偏差</div>'+
      '<div class="vscore"><span class="n">'+Math.round(bt)+'<small>平均偏差値</small></span>'+
      '<span class="g">'+USE_L[ST.scope]+' '+base.length+'物件の平均（各軸50）</span></div>'+
      '<div class="vmeta" style="margin-top:9px">合成指標: 粗利回り '+fmt(med(base.map(x=>x.yra)))+'% × NOIマージン '+fmt(med(base.map(x=>x.yna/x.yra*100)),1)+'% ＝ NOI利回り '+fmt(med(base.map(x=>x.yna)))+'%（各中央値・鑑定ベース）'+HB('yn')+'</div></div>'}
  const rows=bs.map((b,i)=>{const x=d?sc[i]:null;
    const diff=x?x.p-b.p:null;
    const dc=diff==null?'z':(diff>=3?'u':diff<=-3?'d':'z');
    const ds=diff==null?'—':(diff>0?'+':'')+diff.toFixed(0);
    const tie=(b.p<49.5||b.p>50.5)&&base.length===pl.length;
    return '<tr><td>'+b.a.l+HB(b.a.hk)+(tie?HB('tiebase'):'')+'<span class="sm">'+b.a.en+'</span></td>'+
      (d?'<td class="v">'+(b.a.k==='grn'?fmt(certScore(dSel),1)+'<span class="sm">認証スコア</span>'
        :(b.a.k==='liq'?jn(x.v)+'<span class="sm">百万円</span>':fmt(x.v,b.a.d)+'<span style="color:#5a5f68">'+b.a.u+'</span>'))+'</td>':'')+
      '<td class="md">'+(b.a.k==='grn'?greenMedianLabel():(b.a.k==='liq'?jn(b.v)+'百万円':fmt(b.v,b.a.d)+b.a.u))+'</td>'+
      '<td><div class="pbar"><span class="t"><span class="f" style="width:'+barW(d?x.p:b.p)+'%;background:'+col(d?x.p:b.p)+'"></span></span>'+
      '<span class="p" style="color:'+col(d?x.p:b.p)+'">'+Math.round(d?x.p:b.p)+'</span></div>'+
      (d?'<div class="vdiff '+dc+'">'+ds+'pt</div>':'')+'</td></tr>'}).join('');
  const costs=d?CK.filter(k=>d[k[0]]!=null):[];
  const mx=costs.length?Math.max.apply(null,costs.map(k=>d[k[0]]).concat([1])):1;
  c.innerHTML=head+

    '<div class="vgrid"><div><div class="cw radar"><canvas id="chRadar"></canvas></div>'+
    '<div class="lgnd"><span><i style="border-color:#7fa8c9;border-top-style:dashed"></i>'+groupLabel()+'の平均（'+base.length+'物件）</span>'+
    (d?'<span><i style="border-color:#c8a35f"></i>'+esc(d.n)+'</span>':'')+'</div></div>'+
    '<div><table class="kpitab"><colgroup><col class="c1"><col class="c2"><col class="c3"><col class="c4"></colgroup>'+
    '<thead><tr><th>評価軸</th>'+(d?'<th style="text-align:right">この物件</th>':'')+
    '<th style="text-align:right">'+USE_L[ST.scope]+'の中央値'+'</th><th>偏差値'+HB('pctile')+(d?' / 差分'+HB('diff'):'')+'</th></tr></thead>'+
    '<tbody>'+rows+'</tbody></table>'+
    (d&&d.pm_co?'<div class="seglab">PM COMPANY</div><p class="note" style="margin-top:4px">PM会社: <b>'+esc(d.pm_co)+'</b>'+HB('pmdata')+'</p>':'')+
    (d&&d.yn/d.yr*100<25?'<div class="cav" style="margin-top:12px;padding:10px 12px;border:1px dashed var(--line2);border-radius:8px;font-size:11.5px;color:var(--dim);line-height:1.8">注意: 当期のNOIマージンが'+fmt(d.yn/d.yr*100,1)+'%と極端に低く、一時的な大規模修繕等が計上されている可能性があります。費用効率の偏差はこの単年断面を反映しています'+HB('ax_mgn')+'</div>':'')+
    (costs.length?'<div class="seglab">COST BREAKDOWN — 対収入比</div><div class="bars">'+
      costs.map(k=>'<div class="bar"><span>'+k[1]+'</span><span class="t"><span class="f" style="width:'+(d[k[0]]/mx*100)+'%;background:'+k[2]+'"></span></span><span class="p">'+fmt(d[k[0]],1)+'%</span></div>').join('')+'</div>':'')+
    '</div></div>'+
    '<div class="verdict"><div class="t">総評 / OVERALL ASSESSMENT</div>'+
    (d?verdict(d,sc,total,rank,bs,base,pl):baseVerdict(base,bs,medAll))+'</div>'+
    (d?'<p class="note">この物件の順位の頑健性: '+robust(d)+HB('sens')+'</p>':'')+
    (d?(()=>{const g=greenParts(d);
      return '<div class="stblk" style="margin-top:14px"><div class="t">GREEN / 環境・省エネ性能の内訳'+HB('ax_grn')+'</div>'+
      '<p style="font-size:12.5px;color:var(--mut);line-height:1.9">'+
      '<b>認証</b> '+fmt(g.cs,1)+'点（偏差値 '+fmt(g.tc,0)+'）'+
      (d.zeb?'／ZEB '+esc(d.zeb):'')+(d.bels?'／BELS ★'+d.bels:'')+(d.dbj?'／DBJ '+'★'.repeat(d.dbj):'')+
      (d.casn?'／CASBEE '+['','B','B+','A','S'][d.casn]:'')+(d.leed?'／LEED '+['','認証','Silver','Gold','Platinum'][d.leed]:'')+
      (g.cs===0?'（認証なし）':'')+'<br>'+
      '<b>エネルギー効率</b> '+(g.ei!=null?jn(g.ei)+' 円/㎡/年（'+USE_L[d.u]+g.n+'物件中の偏差値 '+fmt(g.te,0)+'）':
        '<span style="color:#5a5f68">算定不可（水道光熱費または賃貸可能面積が非開示、あるいは光熱費の計上がテナント側）。認証のみで評価しています</span>')+
      '</p></div>'})():'')+
    (d?'<p class="note">参考: この物件の期末稼働率は <b>'+(d.occ!=null?fmt(d.occ,1)+'%':'非開示')+'</b>（評価対象の約7割が100%で判別力がないため、評価軸からは外しています'+HB('ceiling')+'）</p>':'')+
    '<p class="note">各軸の性質: <b>規模・流動性</b>は鑑定評価額で測ります'+HB('ax_liq')+
    '　<b>環境・省エネ</b>は認証と実測エネルギー効率の合成です'+HB('ax_grn')+
    '　<b>収益性と費用効率は逆相関</b>（ρ=−0.44）で、高利回り物件ほど費用率が高い傾向があります'+HB('axcorr')+'</p>'+
    '<p class="note">偏差は<b>'+USE_L[ST.scope]+' '+pl.length+'物件'+
    '</b>における<b>偏差値</b>（平均50・標準偏差10）'+HB('pctile')+'。基準線（青い破線）も同じ母集団で算定しているため、差分（pt）はそのまま比較できます。<b>収益性</b>＝粗利回り（鑑定評価額ベース）、<b>規模・流動性</b>＝期末鑑定評価額、<b>費用効率</b>＝NOIマージン（NOI÷賃貸事業収入）、<b>資産価値</b>＝含み損益率（鑑定評価額÷帳簿価額−1）、<b>環境・省エネ</b>＝認証スコアと実測エネルギー効率の合成。収益性×費用効率＝NOI利回りに分解される関係で、トップラインとコストのどちらで差がついたかを切り分けられます'+HB('fiveaxis')+'。母集団の構成と限界'+HB('pool')+'。</p>';
  /* 偏差値の実レンジ（母集団により概ね22〜78）に合わせて軸を取る。
     min=25/max=75だと両端がクリップされ、外れ値のプロットが枠外に出てしまう。
     また中心を0ではなく20起点にすることで、偏差値30と50の差が視覚的に潰れないようにする。 */
  const allP=bs.map(b=>b.p).concat(d?sc.map(x=>x.p||50):[]);
  const lo=Math.min(20,Math.floor(Math.min(...allP)/5)*5), hi=Math.max(80,Math.ceil(Math.max(...allP)/5)*5);
  MC.radar({cv:el('chRadar'),min:lo,max:hi,rings:[30,40,50,60,70],labels:AX.map(a=>a.l),base:bs.map(b=>b.p),
    values:d?sc.map(x=>x.p||0):null})}

/* 5軸のうち1軸を外したときに順位がどれだけ動くかを示す（等ウェイトの妥当性検証） */
function robust(d){const P=scopeEL();const p=poolOf(P);
  const full=P.map(x=>({id:x.id,t:AX.reduce((s,a)=>s+(pct(a.f(x),p[a.k])||50),0)/5}));
  full.sort((x,y)=>y.t-x.t);
  const r0=full.findIndex(x=>x.id===d.id)+1;
  let mn=r0,mx=r0;
  AX.forEach((_,k)=>{const sub=P.map(x=>({id:x.id,
      t:AX.filter((_,i)=>i!==k).reduce((s,a)=>s+(pct(a.f(x),p[a.k])||50),0)/4}));
    sub.sort((x,y)=>y.t-x.t);const r=sub.findIndex(x=>x.id===d.id)+1;
    if(r<mn)mn=r;if(r>mx)mx=r});
  return '総合'+r0+'位。5軸のうちどれか1つを除いても <b>'+mn+'〜'+mx+'位</b> の範囲に収まります'+
    (mx-mn>P.length*0.15?'（変動が大きく、特定の軸に順位が依存しています）':'（順位は特定の軸に依存していません）');}

function baseVerdict(base,bs,medAll){
  const srt=bs.slice().sort((a,b)=>b.p-a.p),hi=srt[0],lo=srt[srt.length-1];
  const isAll=base.length===EL.length;
  const g=k=>bs.filter(x=>x.a.k===k)[0];
  const ei=med(EL.filter(x=>x.u==='OF').map(energyIntensity).filter(v=>v!=null&&isFinite(v)));
  if(isAll){
    const p1='評価対象'+EL.length+'物件（費用内訳まで開示するJRE・MHR・HLC・NUD・MTR・ORIの6法人）の平均像です。'+
      '粗利回り <b>'+fmt(g('inc').v)+'%</b>、鑑定評価額 <b>'+jn(g('liq').v)+'百万円</b>、'+
      'NOIマージン <b>'+fmt(g('mgn').v,1)+'%</b>、含み損益率 <b>'+fmt(g('val').v,1)+'%</b>、'+
      '認証スコア <b>'+fmt(med(EL.map(certScore)),1)+'点</b>（オフィスの光熱費原単位は '+(ei!=null?jn(ei)+'円/㎡/年':'—')+'）。'+
      'この水準が偏差値50の基準線になります。';
    const p2='<b>軸ごとに「差の付きやすさ」が違います。</b>収益性と費用効率は掛け合わせるとNOI利回りになる関係で、'+
      'トップラインとコストのどちらで負けているかを切り分けられます。資産価値（含み損益率）は取得時期の巧拙が最も色濃く出る軸で、'+
      '規模・流動性は運用では動かせない、資産そのものの性格を示します。';
    const p3='<b>環境・省エネ性能は認証と実測エネルギー効率の合成です。</b>両者の順位相関はρ=−0.012とほぼ無関係で、'+
      '認証を持っていても光熱費が重い物件、認証はないが効率の良い物件がそれぞれ存在します。どちらが弱いかで打ち手が変わります。';
    const p4='上のプルダウンで投資法人を選ぶと物件を絞り込めます。物件を選ぶと、その物件の五角形が金色で重なり、軸ごとの差分（pt）と個別の総評が表示されます。';
    return '<p>'+p1+'</p><p>'+p2+'</p><p>'+p3+'</p><p>'+p4+'</p>'}
  const diff=x=>((x.p-50>=0?'+':'')+(x.p-50).toFixed(0));
  const p1=groupLabel()+'に該当する'+base.length+'物件の平均像です。評価対象全体（各軸50）に対し、'+
    '<b>'+hi.a.l+'が'+Math.round(hi.p)+'（'+diff(hi)+'pt）</b>と最も高く、'+
    '<b>'+lo.a.l+'が'+Math.round(lo.p)+'（'+diff(lo)+'pt）</b>と最も低い構成です。';
  const p2='実数では、粗利回り '+fmt(g('inc').v)+'%、鑑定評価額 '+jn(g('liq').v)+'百万円、NOIマージン '+
    fmt(g('mgn').v,1)+'%、含み損益率 '+fmt(g('val').v,1)+'%。'+
    'この偏りは、当グループの取得エリア・用途構成・取得時期がそのまま5軸に表れたものです。';
  const p3='個別物件を選ぶと、この平均線に対する各物件の位置が金色で重なって表示されます。';
  return '<p>'+p1+'</p><p>'+p2+'</p><p>'+p3+'</p>'}

/* 環境・省エネ性能は「認証スコアの偏差値」と「エネルギー効率の偏差値」の合成のため、
   その中央値を数値で出しても意味を持たない。構成する実データの中央値を示す。 */
function greenMedianLabel(){const P=scopeEL();
  const cs=med(P.map(certScore));
  const ei=med(P.map(energyIntensity).filter(v=>v!=null&&isFinite(v)));
  return '認証'+fmt(cs,1)+'点<span class="sm">光熱費'+(ei!=null?jn(ei)+'円/㎡':'算定不可')+'</span>'}

function verdict(d,s,total,rank,bs,base,pool){const gr=gradeByRank(rank,(pool||EL).length);
  const srt=s.filter(x=>x.p!=null).slice().sort((a,b)=>b.p-a.p);
  const hi=srt[0],lo=srt[srt.length-1];
  const bp={};bs.forEach(b=>bp[b.a.k]=b);
  const val=x=>x.a.k==='liq'?jn(x.v)+'百万円':x.a.k==='grn'?'認証'+fmt(certScore(d),1)+'点':fmt(x.v,x.a.d)+x.a.u;
  const cmp=x=>x.a.l+' '+val(x)+'（偏差値'+Math.round(x.p)+'／基準'+Math.round(bp[x.a.k].p)+'に対し'+((x.p-bp[x.a.k].p)>=0?'+':'')+(x.p-bp[x.a.k].p).toFixed(0)+'pt）';
  const shape=(hi.p-lo.p)>=45?'軸ごとの強弱がはっきり分かれた尖った物件':(hi.p-lo.p)<=18?'5軸が揃った平準型の物件':'強みと弱みが穏やかに分かれた物件';
  const pn=(pool||EL).length, pname=(pool&&pool.length!==EL.length)?USE_L[d.u]+pn+'物件':'評価対象'+pn+'物件';
  const p1='総合偏差値 <b>'+Math.round(total)+'（'+gr[0]+'・'+gr[1]+'）</b>、'+pname+'中 <b>'+rank+'位</b>。'+
    shape+'で、基準線（'+groupLabel()+'の平均）に対して最も上振れしているのは<b>'+cmp(hi)+'</b>。';
  const p2='逆に下振れが大きいのは<b>'+cmp(lo)+'</b>。'+lo.a.act;
  const noi=d.yna/d.yra*100;const parts=[];
  /* 0%は「費用が無い」ではなく、テナント直接負担や他費目への合算による計上なし。
     そのまま並べると費用が軽い物件に見えるため、区別して表示する。 */
  const cf=(v,l)=>v==null?null:(v>0?l+' '+fmt(v,1)+'%':l+' 計上なし');
  [cf(d.ut,'水道光熱費率'),cf(d.pm,'外注委託費率'),cf(d.rp,'修繕費率')].forEach(x=>{if(x)parts.push(x)});
  const mu=med(base.filter(x=>x.ut!=null).map(x=>x.ut)),mp=med(base.filter(x=>x.pm!=null).map(x=>x.pm));
  const gapU=(d.ut!=null&&mu!=null)?d.ut-mu:null,gapP=(d.pm!=null&&mp!=null)?d.pm-mp:null;
  let p3=parts.length?'費用面では'+parts.join('・')+'（NOIマージン '+fmt(noi,1)+'%）。'+
    ((d.ut===0||d.pm===0||d.rp===0)?'<span style="color:#5a5f68">「計上なし」はテナント直接負担または他費目への合算によるもので、費用が発生していないという意味ではありません。</span>':''):'';
  if(noi<25)p3+='<b>NOIマージンが極端に低く、当期に一時的な大規模修繕等が計上されている可能性が高い</b>点に注意が必要です（本評価は直近1期の断面）。恒常的な費用体質かどうかは複数期の推移で確認してください。';
  if(gapU!=null&&gapU>1.5)p3+='水光熱がグループ中央値より <b>'+fmt(gapU,1)+'pt</b> 重く、熱源制御・契約電力・照明更新に直接の削減余地がある。';
  else if(gapP!=null&&gapP>2)p3+='委託費がグループ中央値より <b>'+fmt(gapP,1)+'pt</b> 高く、仕様の見直しと再入札で圧縮できる可能性が高い。';
  else p3+='費目構成に突出した歪みはなく、費用側の伸びしろは限定的。収益側（賃料改定・稼働）に軸足を置くのが合理的。';
  const vv=s.filter(x=>x.a.k==='val')[0];
  const gp=greenParts(d);
  const gtxt=(()=>{
    const cert=gp.cs>0?'認証スコア '+fmt(gp.cs,1)+'点（偏差値'+fmt(gp.tc,0)+'）':'環境認証は未取得';
    if(gp.te==null)return cert+'。光熱費または賃貸可能面積が非開示のためエネルギー効率は算定できず、環境・省エネ性能は認証のみで評価しています。';
    if(gp.tc>=55&&gp.te<45)return cert+'を持ちながら、光熱費原単位は '+jn(gp.ei)+'円/㎡/年（偏差値'+fmt(gp.te,0)+'）と重い。<b>認証は取ったが運用が追いついていない典型</b>で、熱源制御・契約電力の見直しなどBM側の改善余地が大きい。';
    if(gp.tc<45&&gp.te>=55)return cert+'だが、光熱費原単位は '+jn(gp.ei)+'円/㎡/年（偏差値'+fmt(gp.te,0)+'）と良好。<b>実力はあるが第三者評価がない状態</b>で、BELSやCASBEE不動産の後付け取得は費用対効果が高い。';
    return cert+'、光熱費原単位 '+jn(gp.ei)+'円/㎡/年（偏差値'+fmt(gp.te,0)+'）。認証と実績の方向はおおむね揃っている。'})();
  const occt=d.occ!=null?'期末稼働率は '+fmt(d.occ,1)+'%（評価軸には含めていません）。':'';
  const vtxt=vv.p>=60?'含み損益率 '+fmt(vv.v,1)+'% は上位で、売却によるキャピタルゲイン実現も選択肢に入る。'
    :vv.p<=30?'含み損益率 '+fmt(vv.v,1)+'% は下位。取得価格が高値掴みか、NOIの回復が鑑定に織り込まれていない可能性があり、まずNOIの引き上げで評価を追いつかせたい。'
    :'含み損益率 '+fmt(vv.v,1)+'% は平均圏で、保有継続が基本線。';
  return '<p>'+p1+'</p><p>'+p2+'</p><p>'+p3+'</p><p>'+gtxt+'</p><p>'+vtxt+occt+'</p>'}

/* ---- charts ---- */
/* ---- ヒーロー: 賃料収入100からNOIまでの分解（利回りが「どこで失われるか」） ---- */
function drawSpectrum(){
  const V=F.filter(d=>!d.pt&&d.oer!=null&&d.yra!=null&&d.ap!=null&&d.yna!=null);
  if(V.length<10){MC.waterfall({cv:el('spectrum'),items:[]});
    el('specmid').textContent='費用内訳を開示する物件が少なく、分解を表示できません';
    if(el('heroNote'))el('heroNote').textContent='';return}
  /* 収入額を復元（年間収入＝粗利回り×鑑定評価額）して資産規模で加重集計する。
     各物件の比率を単純平均すると小規模物件が過大に効くため。 */
  let rev=0,noi=0;const c={pm:0,ut:0,tx:0,rp:0,in:0,ot:0};
  V.forEach(d=>{const r=d.yra/100*d.ap;rev+=r;noi+=d.yna/100*d.ap;
    Object.keys(c).forEach(k=>{if(d[k]!=null)c[k]+=d[k]/100*r})});
  const p=k=>c[k]/rev*100, noiM=noi/rev*100;
  const named=Object.keys(c).reduce((s,k)=>s+p(k),0);
  const resid=Math.max(100-noiM-named,0);   /* 内訳に区分されていない費用（法人により費目区分が異なる） */
  const items=[{k:'賃貸事業収入',v:100,type:'total',c:'#c8a35f'},
    {k:'外注委託費',v:p('pm'),c:'#7fa8c9'},{k:'水道光熱費',v:p('ut'),c:'#d0b060'},
    {k:'公租公課',v:p('tx'),c:'#c9897f'},{k:'修繕費',v:p('rp'),c:'#a3b18a'},
    {k:'保険料',v:p('in'),c:'#b08bbb'},{k:'その他',v:p('ot')+resid,c:'#6f7480'},
    {k:'NOI',v:noiM,type:'total',c:'#9ec49a'}];
  MC.waterfall({cv:el('spectrum'),items});
  el('specmid').textContent='賃貸事業収入を100とした内訳（%）／費用内訳を開示する '+V.length+' 物件・年間賃貸事業収入 '+fmt(rev/1e6,2)+' 兆円ベース（鑑定評価額で加重）';
  const nt=el('heroNote');
  if(nt)nt.innerHTML='<b>賃料として入ってきた100円のうち、手元にNOIとして残るのは '+fmt(noiM,1)+'円</b>。'+
    '最大の流出は外注委託費（PM・BM・清掃・警備・設備管理）の '+fmt(p('pm'),1)+'円と公租公課の '+fmt(p('tx'),1)+
    '円で、両者だけで '+fmt(p('pm')+p('tx'),1)+'円が出ていきます。'+
    'このうち<b>運用でコントロールできるのは外注委託費・水道光熱費・修繕費の '+fmt(p('pm')+p('ut')+p('rp'),1)+'円</b>'+
    'であり、本アプリはこの部分をどう削るかを分析します'+HB('hero')+'。'+
    '<br><span style="color:#5a5f68">減価償却費（収入比 '+fmt(V.reduce((s,d)=>s+(d.dp!=null?d.dp/100*(d.yra/100*d.ap):0),0)/rev*100,1)+
    '円）は現金支出を伴わないためNOIには含めません。「その他」には各法人の費目区分の違いにより主要費目に配分されない費用を含みます。</span>'}

function drawKPI(){const cert=F.filter(d=>d.cn>0).length;
  const exc=F.filter(d=>d.pt).length, noy=F.filter(d=>d.yra==null&&!d.pt).length;
  const apAll=F.filter(d=>d.ap).reduce((s,d)=>s+d.ap,0), apC=F.filter(d=>d.cn&&d.ap).reduce((s,d)=>s+d.ap,0);
  const it=[[jn(F.length),'物件','対象物件数（期中譲渡'+(D.length-BASE.length)+'件を除く）'+HB('universe')],
    [fmt(med(FY.map(d=>d.yra))),'%','粗利回り中央値・鑑定ベース（n='+FY.length+'／収入非開示'+noy+'件・期中取得'+exc+'件を除く）'+HB('base')],
    [fmt(med(F.filter(d=>d.yna!=null).map(d=>d.yna))),'%','NOI利回り中央値・鑑定ベース（n='+F.filter(d=>d.yna!=null).length+'）'+HB('yn')],
    [F.length?Math.round(cert/F.length*100):0,'%','環境認証の保有率・物件数ベース（'+cert+'物件／評価額ベースなら'+
      (apAll?Math.round(apC/apAll*100):0)+'%）'+HB('certbase')]];
  el('kpis').innerHTML=it.map(x=>'<div class="kpi"><div class="v">'+x[0]+'<small>'+x[1]+'</small></div><div class="k">'+x[2]+'</div></div>').join('')}
function drawCorp(){const M=METRIC[ST.corpY],mf=M[2];const X=CORPX[ST.corpX];
  const by={};F.forEach(d=>{(by[d.l]=by[d.l]||[]).push(d)});
  const all=Object.keys(by).map(l=>{const v=by[l];
    const ys=v.map(mf).filter(x=>x!=null);
    return{l,n:v.length,x:X[1](v),y:ys.length>=3?med(ys):null,ny:ys.length,
      ap:v.reduce((s,d)=>s+(d.ap||0),0),napr:v.filter(d=>d.ap!=null).length}});
  const pts=all.filter(p=>p.x!=null&&p.y!=null&&p.ap>0);
  const dx=all.filter(p=>p.x==null).map(p=>p.l);
  const dy=all.filter(p=>p.x!=null&&p.y==null).map(p=>p.l);
  if(!pts.length)return MC.hbar({cv:el('chCorp'),rows:[],xTitle:'',fmt:v=>v});
  const mx=Math.max.apply(null,pts.map(p=>p.ap));
  const rmin=6,rspan=(s=>s)(1);
  MC.bubble({cv:el('chCorp'),noLabel:true,
    points:pts.map(p=>({x:p.x,y:p.y,rel:p.ap/mx,color:CORP_C[p.l]||'#8d99ae',label:p.l,d:p})),
    xTitle:X[0],yTitle:M[0]+' 中央値（'+M[1]+'）',
    tip:p=>({t:CORP_L[p.l],l:[X[0]+' '+fmt(p.x,X[2])+X[3],M[0]+' '+fmt(p.y)+M[1]+'（n='+p.ny+'）',
      '資産規模 '+fmt(p.ap/1e6,2)+' 兆円（鑑定評価額・'+p.napr+'/'+p.n+'物件で算定）',
      '※バブルの大きさは全保有物件、縦軸は指標を算定できた'+p.ny+'物件で算定']})});
  const lg=el('corpLegend');
  if(lg)lg.innerHTML=pts.slice().sort((a,b)=>b.ap-a.ap).map(p=>
    '<span class="lgi"><i style="background:'+(CORP_C[p.l]||'#8d99ae')+'"></i>'+esc(p.l)+
    '<b>'+fmt(p.ap/1e6,2)+'兆円</b></span>').join('');
  const nt=el('corpNote');
  if(nt)nt.innerHTML='バブルの大きさ＝<b>期末鑑定評価額の合計</b>（18法人すべてで算定可能）。表示 <b>'+pts.length+'/'+all.length+'法人</b>'+
    (dx.length?'　／　横軸「'+esc(X[0])+'」が算定できず非表示: <b>'+esc(dx.join('・'))+'</b>':'')+
    (dy.length?'　／　縦軸「'+esc(M[0])+'」が算定できず非表示: <b>'+esc(dy.join('・'))+'</b>（当該法人が算定に必要な項目を物件別に開示していないため）':'')+
    HB('corpmap')}

const corpColors=rows=>rows.map(r=>CORP_C[r.k]||null);
function drawDist(){const rows=groupStats(F,ST.distG,ST.distM);const M=METRIC[ST.distM];
  const G0=GROUP[ST.distG],gf=G0[1],all={};
  F.forEach(d=>{const k=gf(d),v=M[2](d);if(k==null)return;(all[k]=all[k]||[0,0]);all[k][0]++;if(v!=null)all[k][1]++});
  const shown=rows.map(r=>r.k);
  const hidden=Object.keys(all).filter(k=>shown.indexOf(k)<0).map(k=>k+'（'+all[k][1]+'/'+all[k][0]+'件）');
  MC.hbar({cv:el('chDist'),rows,xTitle:M[0]+'（'+M[1]+'）',fmt:v=>fmt(v,M[3]),
    colors:ST.distG==='corp'?corpColors(rows):null});
  const e=el('distNote');if(!e)return;
  const w=rows.filter(r=>r.n<15);
  e.innerHTML='バー＝中央値、白い縦線＝25%・75%タイル。括弧内は<b>指標を算定できた物件数</b>（グループ全体の物件数とは異なります）。'+
    (hidden.length?'<br><span style="color:#c98c8c">n&lt;5のため非表示: <b>'+esc(hidden.join('・'))+'</b></span>':'')+
    (w.length?'<br><span style="color:#c98c8c">n&lt;15 のグループ（'+esc(w.map(r=>r.k+' n='+r.n).join('・'))+
      '）は中央値が不安定です。差を読み取る際は幅を持って解釈してください</span>'+HB('stats'):'')+
    (rows.length?'<br>中央値の95%信頼区間: '+rows.slice(0,4).map(r=>esc(r.k)+' '+(r.ci?fmt(r.ci[0],M[3])+'–'+fmt(r.ci[1],M[3]):'—')).join('　'):'')}
function drawCross(){
  if(ST.x===ST.y)ST.y=(ST.x==='ug')?'yra':'yra';   /* 同一指標同士は無意味なので回避 */
  const MX=METRIC[ST.x],MY=METRIC[ST.y],xf=MX[2],yf=MY[2];
  const fin=x=>x!=null&&isFinite(x);
  const v=F.filter(d=>fin(xf(d))&&fin(yf(d))&&!((ST.y==='yr'||ST.y==='yra')&&(MY[2](d)<=0||MY[2](d)>=15)));
  const logx=['nla','gfa','pr'].indexOf(ST.x)>=0;
  const bins={};v.forEach(d=>{const x=xf(d);if(logx&&x<=0)return;
    const b=logx?Math.floor(Math.log10(x)*3)/3:Math.floor(x/(ST.x==='occ'?2:5))*(ST.x==='occ'?2:5);
    (bins[b]=bins[b]||[]).push(yf(d))});
  const bl=Object.keys(bins).map(Number).sort((a,b)=>a-b).filter(b=>bins[b].length>=5);
  const line=bl.map(b=>({x:logx?Math.pow(10,b+1/6):b+(ST.x==='occ'?1:2.5),y:med(bins[b])}));
  MC.scatter({cv:el('chCross'),logX:logx,xNonNeg:true,yNonNeg:['yra','yr','yna','oer','occ','nla','gfa','ap','pr'].indexOf(ST.y)>=0,line:ST.mode==='line'?line:line,
    points:ST.mode==='line'?[]:v.map(d=>({x:xf(d),y:yf(d),d,
      fill:d.id===ST.sel?'#e8e6e1':USE_C[d.u]+'55',
      stroke:d.id===ST.sel?'#e8e6e1':(d.cn?'#c8a35fcc':USE_C[d.u]+'88'),
      r:d.id===ST.sel?7:(v.length>500?2.4:3.4)})),
    xTitle:MX[0]+'（'+MX[1]+'）',yTitle:MY[0]+'（'+MY[1]+'）',
    tip:d=>({t:d.n,l:[CORP_L[d.l]+' / '+USE_L[d.u]+' / '+(AREA_L[d.a]||''),
      MX[0]+' '+jn(xf(d))+MX[1]+'　'+MY[0]+' '+fmt(yf(d),MY[3])+MY[1],'タップで評価を表示']}),
    onPick:d=>pick(d)});
  const e=el('crossNote');
  if(e){const nx=F.filter(d=>xf(d)!=null).length, ny=F.filter(d=>yf(d)!=null).length;
    const corps=[...new Set(v.map(d=>d.l))];
    e.innerHTML='対象 <b>'+v.length+'物件</b>（'+USE_L[ST.scope]+'全'+F.length+'物件のうち、横軸「'+esc(MX[0])+'」を算定できるのが '+nx+
      '件、縦軸「'+esc(MY[0])+'」が '+ny+'件、両方揃うのが '+v.length+'件）／'+corps.length+'法人'+
      (ST.x==='age'?'<br><span style="color:#c98c8c">築年数は竣工年月を開示する9法人のみが対象です。NBF・JRE・KDX・ICG・NUD・HFRは横軸を算定できず、この図から除外されています</span>'+HB('agebias'):'')+
      (['yna','mgn'].indexOf(ST.y)>=0||['yna','mgn'].indexOf(ST.x)>=0?'<br><span style="color:#c98c8c">NOI関連の指標は費用内訳を開示する5法人のみが対象です</span>':'')+
      '<br>金色の線は横軸のビンごとの中央値（各ビンn≥5）。ビン幅は'+(logx?'対数目盛':(ST.x==='occ'?'2':'5')+'刻み')+'です'+HB('binning')}}
function drawStack(){const G=GROUP[ST.stackG],gf=G[1],order=G[2];const g={};
  FO.forEach(d=>{const k=gf(d);if(k==null||d.yra==null||d.ap==null)return;(g[k]=g[k]||[]).push(d)});
  /* 各物件の比率を単純平均すると小規模物件が過大に効くため、収入額で加重して集計する。
     収入額は粗利回り×鑑定評価額で復元（ヒーローの分解図と同一の方法）。 */
  const rows=order.filter(k=>g[k]&&g[k].length>=5).map(k=>{const v=g[k];
    let rev=0,noi=0;const c={};CK.forEach(x=>c[x[0]]=0);
    v.forEach(d=>{const r=d.yra/100*d.ap;rev+=r;if(d.yna!=null)noi+=d.yna/100*d.ap;
      CK.forEach(x=>{if(d[x[0]]!=null)c[x[0]]+=d[x[0]]/100*r})});
    const vals=CK.map(x=>c[x[0]]/rev*100);
    /* 内訳の合計が経費率に届かない分（法人ごとの費目区分の差）は「未区分」として明示 */
    const named=vals.reduce((s,x)=>s+x,0);
    const oer=v.reduce((s,d)=>s+d.oer/100*(d.yra/100*d.ap),0)/rev*100;
    return{k,n:v.length,v:vals.concat([Math.max(oer-named,0)])}});
  if(!rows.length)return MC.hstack({cv:el('chStack'),rows:[],series:[],xTitle:''});
  MC.hstack({cv:el('chStack'),rows,
    series:CK.map(c=>({name:c[1],color:c[2]})).concat([{name:'未区分',color:'#4a4d55'}]),
    max:75,xTitle:'対 賃貸事業収入比（%・収入で加重）'});
  const e=el('stackNote');
  if(e)e.innerHTML='費用内訳を物件別に開示する <b>'+FO.length+'物件</b>（JRE・MHR・HLC・NUD・MTR）が対象。'+
    '各物件の比率の単純平均ではなく<b>収入額で加重</b>して集計しています'+HB('hero')+'。'+
    '「未区分」は、法人により費目の区分方法が異なるため主要費目に配分できない費用です。'}

function drawSpread(){const ck=ST.costK,G=GROUP.use,gf=G[1],order=G[2];const g={},zero={};
  /* 0%は「費用が軽い」ではなくテナント直接負担・他費目への合算による非計上。
     分位に混ぜると分布が下に引っ張られるため除外し、件数を注記する。 */
  FO.forEach(d=>{if(d[ck]==null)return;const k=gf(d);if(k==null)return;
    if(d[ck]>0)(g[k]=g[k]||[]).push(d[ck]);else zero[k]=(zero[k]||0)+1});
  const rows=order.filter(k=>g[k]&&g[k].length>=5).map(k=>({k,n:g[k].length,p10:q(g[k],.1),p25:q(g[k],.25),
    m:med(g[k]),p75:q(g[k],.75),p90:q(g[k],.9)}));
  const meta=CK.filter(c=>c[0]===ck)[0]||['','','#c8a35f'];
  MC.hrange({cv:el('chSpread'),rows,color:meta[2],xTitle:meta[1]+' 対収入比（%・計上ありのみ）'});
  const e=el('spreadNote');if(!e)return;
  const z=Object.keys(zero).map(k=>k+' '+zero[k]+'件').join('・');
  const hid=order.filter(k=>(g[k]||[]).length>0&&(g[k]||[]).length<5).map(k=>k+'（n='+g[k].length+'）');
  e.innerHTML='薄い帯＝10〜90%タイル、濃い帯＝25〜75%タイル、白線＝中央値。括弧内は算定物件数。'+
    (z?'<br><span style="color:#5a5f68">計上なし（0%）を除外: '+esc(z)+'。テナント直接負担または他費目への合算によるもので、費用が発生していない意味ではありません</span>':'')+
    (hid.length?'<br><span style="color:#c98c8c">n&lt;5のため非表示: '+esc(hid.join('・'))+'</span>':'')}

function drawCert(){const M=METRIC[ST.certM],mf=M[2],G=GROUP[ST.certG],gf=G[1],order=G[2];const g={};
  F.forEach(d=>{const k=gf(d),v=mf(d);if(k==null||v==null)return;
    const o=g[k]=g[k]||{y:[],n:[]};o[d.cn?'y':'n'].push(v)});
  const rows=order.filter(k=>g[k]&&(g[k].y.length>=3||g[k].n.length>=3)).map(k=>({k,
    y:g[k].y.length>=3?med(g[k].y):null,n:g[k].n.length>=3?med(g[k].n):null}));
  MC.vbar({cv:el('chCert'),labels:rows.map(r=>r.k),yTitle:M[0]+' 中央値（'+M[1]+'）',fmt:v=>fmt(v,M[3]),
    series:[{name:'認証あり',color:'#c8a35f',values:rows.map(r=>r.y)},
      {name:'認証なし',color:'#8a8f98',values:rows.map(r=>r.n)}]});
  const A=F.filter(d=>d.cn&&mf(d)!=null&&isFinite(mf(d))).map(mf), Bn=F.filter(d=>!d.cn&&mf(d)!=null&&isFinite(mf(d))).map(mf);
  const cy=med(A),cn=med(Bn);
  const ci=bootDiffCI(A,Bn), sd=stratDiff(F.filter(d=>mf(d)!=null&&isFinite(mf(d))),mf,d=>!!d.cn), cl=cles(A,Bn);
  const sig=ci?(ci[0]>0||ci[1]<0):null;
  const fmtCI=c=>c?('['+(c[0]>0?'+':'')+fmt(c[0],2)+', '+(c[1]>0?'+':'')+fmt(c[1],2)+']'):'算定不可';
  el('certNote').innerHTML=
    '<b>単純比較</b>: 認証あり '+fmt(cy,M[3])+M[1]+'（n='+A.length+'） ⇄ なし '+fmt(cn,M[3])+M[1]+'（n='+Bn.length+'）／差 <b>'+
    (cy-cn>0?'+':'')+fmt(cy-cn,2)+M[1]+'</b>　95%信頼区間 '+fmtCI(ci)+HB('stats')+
    '<br><b>層別調整後</b>（エリア×用途を揃えた加重平均）: 差 <b>'+(sd?((sd.diff>0?'+':'')+fmt(sd.diff,2)+M[1]):'算定不可')+'</b>'+
    (sd?'（'+sd.strata+'層・'+sd.n+'物件）':'')+HB('confound')+
    '<br><b>効果量</b>: 無作為に1件ずつ選んだとき認証ありが上回る確率 '+(cl!=null?fmt(cl*100,1)+'%':'—')+'（50%＝差なし）'+
    '<br>'+(sig===false?'<span style="color:#9ec49a">信頼区間が0をまたぐため、この差は<b>統計的に有意とはいえません</b>。</span>':
      sig===true?'信頼区間は0をまたぎません。ただし観察データであり因果を示すものではありません。':'')+
    (sd&&Math.abs(sd.diff)<Math.abs(cy-cn)*0.5?'<span style="color:#c98c8c">単純比較の差は層別調整でほぼ消えます。認証物件は非認証物件より規模が大きく（賃貸面積で約2.3倍）都心・オフィスに偏在しており、<b>単純比較の差の大部分はこの偏りによるもの</b>です。</span>':'');
}

function drawRank(){const rows=[];let note='';
  if(ST.rank==='dbj'){[2,3,4,5].forEach(s=>{const v=FY.filter(d=>d.dbj===s).map(d=>d.yra);
    if(v.length>=3)rows.push({k:'★'.repeat(s),n:v.length,m:med(v)})});
    note='DBJ Green Building認証の星数別。上位ほど利回りが低い＝価格が高く評価されている。'}
  else if(ST.rank==='cas'){['S','A','B+'].forEach(s=>{const v=FY.filter(d=>d.cas===s).map(d=>d.yra);
    if(v.length>=3)rows.push({k:'CASBEE '+s,n:v.length,m:med(v)})});
    note='CASBEE不動産評価認証のランク別。'}
  else{const K=[['Z','ZEB・BELS'],['D','DBJ'],['C','CASBEE'],['L','LEED']];
    K.forEach(x=>{const v=FY.filter(d=>(d.ck||'').indexOf(x[0])>=0).map(d=>d.yra);
      rows.push({k:x[1],n:v.length,m:v.length>=3?med(v):null})});
    const v0=FY.filter(d=>!d.cn).map(d=>d.yra);
    rows.push({k:'認証なし',n:v0.length,m:v0.length>=3?med(v0):null});
    const leed=rows.filter(r=>r.k==='LEED')[0];
    note=leed&&!leed.m?'LEEDは利回りを算定できる物件が'+leed.n+'件のため、バーを表示していません（後述）。':'認証種別ごとの粗利回り中央値。'}
  const rr=rows.filter(r=>r.m!=null);
  MC.vbar({cv:el('chRank'),labels:rr.map(r=>r.k+' ('+r.n+')'),yTitle:'粗利回り 中央値（%）',fmt:v=>fmt(v),
    series:[{name:'粗利回り',color:'#c8a35f',values:rr.map(r=>r.m)}]});
  const e=el('rankNote');
  if(e){let extra='';
    if(ST.rank==='dbj'){
      const g=[2,3,4,5].map(s=>{const v=FY.filter(d=>d.dbj===s);
        return{s,n:v.length,c5:v.length?v.filter(d=>d.a==='C5').length/v.length*100:null}}).filter(x=>x.n>=3);
      if(g.length>=2)extra='<br><span style="color:#c98c8c"><b>この比較は交絡しています。</b>星数が上がるほど都心5区の比率が上がり（'+
        g.map(x=>'★'+x.s+' '+fmt(x.c5,0)+'%').join(' → ')+'）、利回りの差は認証ランクではなく立地の差を映している可能性が高い。</span>'+HB('confound');
    }
    const sd=stratDiff(FY.filter(d=>d.yra!=null),d=>d.yra,d=>!!d.cn);
    e.innerHTML=esc(note)+extra}}

/* ---- LEED 個別分析 ---- */
function drawCov(){const G=GROUP[ST.covG],gf=G[1],order=G[2];const g={};
  F.forEach(d=>{const k=gf(d);if(k==null)return;const o=g[k]=g[k]||{t:0,c:0,ap:0,apc:0};
    o.t++;if(d.cn)o.c++;
    if(d.ap!=null){o.ap+=d.ap;if(d.cn)o.apc+=d.ap}});
  const wt=ST.covBase==='ap';
  const rows=order.filter(k=>g[k]&&g[k].t>=5&&(!wt||g[k].ap>0)).map(k=>({k,n:g[k].t,
    m:wt?g[k].apc/g[k].ap*100:g[k].c/g[k].t*100}));
  MC.hbar({cv:el('chCov'),rows,color:'#7fa8c9',
    xTitle:'環境認証の保有率（%・'+(wt?'鑑定評価額ベース':'物件数ベース')+'）',fmt:v=>fmt(v,0)+'%',
    colors:ST.covG==='corp'?corpColors(rows):null});
  const e=el('covNote');if(!e)return;
  const tot=F.length?F.filter(d=>d.cn).length/F.length*100:0;
  const apAll=F.filter(d=>d.ap).reduce((s,d)=>s+d.ap,0),apC=F.filter(d=>d.cn&&d.ap).reduce((s,d)=>s+d.ap,0);
  e.innerHTML='全体の保有率は<b>物件数ベース '+fmt(tot,1)+'%</b>／<b>鑑定評価額ベース '+fmt(apAll?apC/apAll*100:0,1)+'%</b>。'+
    '認証は大型物件に偏るため、分母の取り方で20ポイント前後変わります'+HB('certbase')+
    '<br>都心・大型・築浅への偏在が、認証と利回りの単純比較を歪める原因になります。'}


/* ---- PM会社 ----
   PM（プロパティマネジメント）会社は、物件の収益最大化を担う受託者。
   テナント募集・賃料改定・収支計画の策定・BM会社の選定と統括を行う。
   建物設備の維持を担うBM（ビルマネジメント）会社とは業務範囲が異なる。
   データは各投資法人の有価証券報告書の記載のみを一次情報として採用する。 */
function drawPm(){const SC=BASE.filter(d=>d.u===ST.scope);
  const have=SC.filter(d=>d.pm_co);
  const e=el('pmNote');
  if(!have.length){
    if(e)e.innerHTML='<b>有価証券報告書からのPM会社データを取込中です。</b>'+
      '各投資法人の最新の有価証券報告書に記載されたPM会社を、物件単位で収録します'+HB('pmdata')+
      '<br><span style="color:#5a5f68">旧版では管理会社側が公表する実績一覧に依拠していましたが、'+
      'カバー率が13.1%と低く、PMとBMの区別も曖昧だったため、一次情報である有価証券報告書ベースに全面的に切り替えます。</span>';
    ['chPmCov','chPmCo'].forEach(id=>{const cv=el(id);if(cv){const c=cv.getContext('2d');
      const w=cv.clientWidth||300,h=cv.clientHeight||200;c.clearRect(0,0,w,h);
      c.fillStyle='#5a5f68';c.font="13px -apple-system,BlinkMacSystemFont,'Hiragino Sans',sans-serif";
      c.textAlign='center';c.fillText('データ取込中',w/2,h/2)}});
    const t=el('pmTable');if(t)t.innerHTML='';
    return}
  /* 以下はデータ取込後に機能する */
  const byL={};have.forEach(d=>{(byL[d.l]=byL[d.l]||[]).push(d)});
  const hold={};SC.forEach(d=>hold[d.l]=(hold[d.l]||0)+1);
  const rows=Object.keys(byL).map(l=>({k:l,n:hold[l],m:byL[l].length/hold[l]*100})).sort((a,b)=>b.m-a.m);
  MC.hbar({cv:el('chPmCov'),rows,color:'#7fa8c9',xTitle:'PM会社を特定できた物件の割合（%）',
    fmt:v=>fmt(v,1)+'%',colors:corpColors(rows)});
  const g={};have.forEach(d=>g[d.pm_co]=(g[d.pm_co]||0)+1);
  const co=Object.keys(g).map(k=>({k,n:g[k],m:g[k]})).sort((a,b)=>b.m-a.m).slice(0,14);
  MC.hbar({cv:el('chPmCo'),rows:co,color:'#c8a35f',xTitle:'受託物件数（件）',fmt:v=>fmt(v,0)+'件'});
  const ov=SC.filter(d=>d.pm_co&&d.oer!=null);
  if(e)e.innerHTML='有価証券報告書に記載されたPM会社を収録した <b>'+have.length+'物件</b>'+
    '（'+USE_L[ST.scope]+'全'+SC.length+'物件の'+fmt(have.length/SC.length*100,1)+'%）。PM会社は <b>'+Object.keys(g).length+'社</b>'+HB('pmdata')+
    '<br>うち費用内訳も開示されている物件は <b>'+ov.length+'件</b>で、'+
    (ov.length>=30?'<b>PM会社ごとの運営コストを比較できます</b>'+HB('pmperf'):'比較には数が不足しています');
  /* ① スポンサー系PMの選定比率
     PM会社をスポンサーのグループ企業に置くか、第三者に委託するかは
     「運営品質の統制」と「委託費の市場競争」のどちらを優先するかの経営判断であり、
     投資法人ごとの運営思想が最も端的に表れる指標。 */
  const sp=el('chPmSpon');
  if(sp){const g2={};BASE.forEach(d=>{if(!d.pm_sp||d.pm_sp==='非開示')return;
      const o=g2[d.l]=g2[d.l]||{s:0,t:0};o.t++;if(d.pm_sp==='スポンサー系')o.s++});
    const rows2=Object.keys(g2).filter(k=>g2[k].t>=5)
      .map(k=>({k,n:g2[k].t,m:g2[k].s/g2[k].t*100})).sort((a,b)=>b.m-a.m);
    MC.hbar({cv:sp,rows:rows2,xTitle:'スポンサー系PM会社への委託比率（%）',fmt:v=>fmt(v,1)+'%',
      colors:corpColors(rows2),onPick:r=>{ST.pmSel=(ST.pmSel===r.k?null:r.k);drawPm()}});
    const n1=el('pmSponNote');
    if(n1){const all=SC.filter(d=>d.pm_sp&&d.pm_sp!=='非開示');
      const s=all.filter(d=>d.pm_sp==='スポンサー系').length;
      /* 系列内製と第三者委託で運営コストに差があるかを実測する */
      const eiF=d=>(d.ut==null||d.ut<=0||!d.nla||!d.ap||d.yra==null)?null:d.ut/100*(d.yra/100*d.ap*1e6)/d.nla;
      const of_=SC.filter(d=>d.pm_sp&&d.pm_sp!=='非開示'&&eiF(d)!=null);
      const sp1=of_.filter(d=>d.pm_sp==='スポンサー系'),tp1=of_.filter(d=>d.pm_sp==='第三者');
      const pmS=sp1.filter(d=>d.pm>0).map(d=>d.pm),pmT=tp1.filter(d=>d.pm>0).map(d=>d.pm);
      /* バーをタップした法人のPM会社内訳を表示する */
      const dd=el('pmDrill');
      if(dd){
        if(!ST.pmSel)dd.innerHTML='<p class="note">バーをタップすると、その投資法人が<b>どのPM会社に何%委託しているか</b>の内訳を表示します。</p>';
        else{const v=SC.filter(d=>d.l===ST.pmSel&&d.pm_co);
          const cc={};v.forEach(d=>{const k=d.pm_co;cc[k]=cc[k]||{n:0,sp:d.pm_sp};cc[k].n++});
          const list=Object.keys(cc).sort((x,y)=>cc[y].n-cc[x].n);
          dd.innerHTML='<div class="seglab">'+esc(CORP_L[ST.pmSel]||ST.pmSel)+' のPM会社内訳（'+v.length+'物件）'+
            '<button class="hlp" data-h="pmspon">?</button></div>'+
            '<table class="kpitab" style="table-layout:auto;margin-top:6px"><thead><tr><th>PM会社</th>'+
            '<th style="text-align:right">物件数</th><th style="text-align:right">比率</th><th>区分</th></tr></thead><tbody>'+
            list.map(k=>{const o=cc[k],pc=o.n/v.length*100;
              const col=o.sp==='スポンサー系'?'#c8a35f':o.sp==='非開示'?'#5a5f68':'#7fa8c9';
              return '<tr><td style="font-size:12px">'+esc(k)+'</td><td class="v">'+o.n+'</td>'+
              '<td class="v"><span class="pbar"><span class="t" style="width:56px"><span class="f" style="width:'+
              Math.round(pc)+'%;background:'+col+'"></span></span><span class="p" style="color:'+col+'">'+fmt(pc,1)+'%</span></span></td>'+
              '<td style="font-size:11px;color:'+col+'">'+esc(o.sp||'—')+'</td></tr>'}).join('')+
            '</tbody></table><p class="note">もう一度バーをタップすると閉じます。金色＝スポンサー系、青＝第三者。</p>'}}
      n1.innerHTML='全体では判明分 '+all.length+'物件のうち <b>'+fmt(s/all.length*100,1)+'%</b> がスポンサー系PM会社への委託です。'+
        '<br><b>系列内製型</b>（比率が高い）は運営品質の統制とグループ内の知見蓄積に有利な一方、委託費が市場競争にさらされにくい。'+
        '<b>第三者委託型</b>（比率が低い）はその逆で、相見積もりによる価格競争が働きます'+HB('pmspon')+
        (sp1.length>=15&&tp1.length>=15
          ?'<br>'+USE_L[ST.scope]+'で実測すると、<b>外注委託費率</b>はスポンサー系 '+fmt(med(pmS),1)+'% ⇄ 第三者 '+fmt(med(pmT),1)+'%'+
            '<span style="color:#5a5f68">（n='+pmS.length+'／'+pmT.length+'）</span>、'+
            '<b>水道光熱費の原単位</b>はスポンサー系 '+jn(med(sp1.map(eiF)))+' ⇄ 第三者 '+jn(med(tp1.map(eiF)))+' 円/㎡/年。'+
            '<br><span style="color:#c98c8c">ただしスポンサー系に委託される物件は<b>都心5区'+
            fmt(sp1.filter(d=>d.a==='C5').length/sp1.length*100,0)+'%・鑑定評価額中央値'+jn(med(sp1.map(d=>d.ap)))+
            '百万円</b>、第三者は<b>'+fmt(tp1.filter(d=>d.a==='C5').length/tp1.length*100,0)+'%・'+
            jn(med(tp1.map(d=>d.ap)))+'百万円</b>と、都心の大型物件ほど系列に委託される傾向があります。'+
            'この差には立地と規模の違いが混ざっており、委託形態の優劣を示すものではありません</span>'+HB('confound')
          :'')}}

  /* ② PM会社別の運営コスト（オフィス・n>=5） */
  const pf=el('chPmPerf');
  if(pf){const gg={};ov.filter(d=>d.u==='OF').forEach(d=>{(gg[d.pm_co]=gg[d.pm_co]||[]).push(d)});
    const eiF=d=>(d.ut==null||d.ut<=0||!d.nla||!d.ap||d.yra==null)?null:d.ut/100*(d.yra/100*d.ap*1e6)/d.nla;
    const rows=Object.keys(gg).map(k=>{const v=gg[k].map(eiF).filter(x=>x!=null&&isFinite(x));
      return v.length>=5?{k:k.replace(/^株式会社/,'').slice(0,16),n:v.length,m:med(v),
        p25:q(v,.25),p75:q(v,.75),p10:q(v,.1),p90:q(v,.9)}:null}).filter(Boolean).sort((a,b)=>a.m-b.m);
    if(rows.length>=2){MC.hrange({cv:pf,rows,color:'#c8a35f',xTitle:'水道光熱費の原単位（円/㎡/年・'+USE_L[ST.scope]+'）'});
      const n2=el('pmPerfNote');
      if(n2)n2.innerHTML=USE_L[ST.scope]+'で<b>n≥5</b>のPM会社のみを表示しています（'+rows.length+'社）。'+
        '薄い帯＝10〜90%タイル、濃い帯＝25〜75%タイル、白線＝中央値。'+
        '<span style="color:#c98c8c">同じPM会社でも物件ごとのばらつきが大きく、'+
        'この差はPM会社の優劣ではなく建物の設備仕様・築年・テナント業種の違いを多く含みます</span>'+HB('pmperf')}
    else{const c=pf.getContext('2d'),w=pf.clientWidth||300,h2=pf.clientHeight||200;
      c.clearRect(0,0,w,h2);c.fillStyle='#5a5f68';c.font="13px sans-serif";c.textAlign='center';
      c.fillText('この条件では比較できません',w/2,h2/2)}}
  const t=el('pmTable');if(!t)return;
  t.innerHTML='<table class="kpitab" style="table-layout:auto"><thead><tr><th>法人</th><th>主なPM会社</th>'+
    '<th style="text-align:right">判明</th><th style="text-align:right">社数</th></tr></thead><tbody>'+
    Object.keys(byL).sort((x,y)=>byL[y].length-byL[x].length).map(l=>{
      const cc={};byL[l].forEach(d=>cc[d.pm_co]=(cc[d.pm_co]||0)+1);
      const top=Object.keys(cc).sort((x,y)=>cc[y]-cc[x]).slice(0,2).map(k=>esc(k)+'('+cc[k]+')').join('／');
      return '<tr><td><i class="cdot" style="background:'+(CORP_C[l]||'#8d99ae')+'"></i>'+esc(l)+'</td>'+
      '<td style="font-size:11.5px;line-height:1.55">'+top+'</td>'+
      '<td class="v">'+byL[l].length+'／'+hold[l]+'</td><td class="v">'+Object.keys(cc).length+'</td></tr>'}).join('')+
    '</tbody></table>'}

let STSEL=null;
function drawStrat(){fillStrat();const t=el('stratBody');if(!t)return;
  if(!STSEL)STSEL=(ST.corp!=='ALL'?ST.corp:STRAT[0].l);
  if(ST.corp!=='ALL'&&STRAT.some(x=>x.l===ST.corp))STSEL=ST.corp;
  const s=el('selStrat');if(s)s.value=STSEL;
  const x=STRAT.filter(y=>y.l===STSEL)[0];if(!x)return;
  const num=[['物件数',x.n+' 件'],['資産規模（鑑定評価額）',x.aum+' 兆円'],['1物件平均（鑑定）',jn(x.avg)+' 百万円'],
    ['上位5物件集中度',fmt(x.t5,1)+'%'],['粗利回り中央値',fmt(x.yr)+'%'],['稼働率中央値',fmt(x.occ,1)+'%'],
    ['都心5区比率',fmt(x.c5,1)+'%'],['環境認証保有率',fmt(x.cert,1)+'%']];
  t.innerHTML='<div class="stpos">'+esc(x.pos)+'</div><div class="stax">戦略の軸: '+esc(x.ax)+'</div>'+
    '<div class="stnum">'+num.map(k=>'<div><div class="k">'+k[0]+'</div><div class="v">'+k[1]+'</div></div>').join('')+'</div>'+
    '<div class="stblk"><div class="t">MODEL / モデルの構造</div><p>'+esc(x.mo)+'</p></div>'+
    '<div class="stblk r"><div class="t">RISK / 主要リスク</div><p>'+esc(x.rk)+'</p></div>'+
    '<div class="stblk"><div class="t">ESG &amp; MANAGEMENT</div><p>'+esc(x.ed)+'</p></div>'+
    '<p class="note">用途構成: '+esc(x.use)+'　／　エリア構成: '+esc(x.area)+
    '<br>資産規模は<b>期末鑑定評価額</b>の合計です（取得価格は物件別開示が'+fmt(x.prc,1)+'%のため、法人間で比較できる鑑定評価額を採用）'+HB('aum')+'</p>'}

function fillStrat(){const s=el('selStrat');if(!s||s.options.length)return;
  s.innerHTML=STRAT.map(x=>'<option value="'+esc(x.l)+'">'+esc(x.nm)+'（'+esc(x.l)+'）</option>').join('');
  s.onchange=()=>{STSEL=s.value;drawStrat()}}
/* ---- list ---- */
/* 並び替えは3つの軸で構成し、方向（昇順・降順）は同じボタンのタップで切り替える。
   「高い順」「低い順」を別ボタンにすると数が倍になり、選択状態も分かりにくいため。 */
const SORT_AX=[['yr','利回り',d=>d.yra],['occ','稼働率',d=>d.occ],['age','築年数',d=>d.age]];
const SORT_DIR={yr:-1,occ:-1,age:1};   /* 既定の向き。利回り・稼働率は高い順、築年数は新しい順 */
const PAGE=25;
function sorted(){const s=SORT_AX.filter(x=>x[0]===ST.sort)[0]||SORT_AX[0];
  const dir=ST.sortDir;
  return F.filter(matchPr).sort((a,b)=>{const x=s[2](a),y=s[2](b);
    if(x==null&&y==null)return 0;if(x==null)return 1;if(y==null)return -1;return (x-y)*dir})}
/* 物件タブの絞込3種。互いに掛け合わせでき、件数は他の絞込を反映した実数を表示する。
   一覧のみに作用し、概況・分析・評価の母集団は変えない。 */
function fillPrCorp(){
  const mk=(id,key,opts,base)=>{const s=el(id);if(!s)return;
    s.innerHTML=opts.map(o=>'<option value="'+o[0]+'">'+esc(o[1])+'</option>').join('');
    if(!opts.some(o=>o[0]===ST[key]))ST[key]='ALL';
    s.value=ST[key];
    const wr=el('w'+id.charAt(0).toUpperCase()+id.slice(1));
    if(wr)wr.classList.toggle('on',ST[key]!=='ALL');
    if(!s.__b){s.__b=1;s.onchange=e=>{ST[key]=e.target.value;ST.page=1;drawList()}}};
  /* 各プルダウンの件数は「自分以外の絞込を効かせた集合」で数える */
  const cnt=(exclude,f)=>{const sv=ST[exclude];ST[exclude]='ALL';
    const n=F.filter(d=>matchPr(d)&&f(d)).length;ST[exclude]=sv;return n};
  const cc={};F.forEach(d=>{cc[d.l]=1});
  mk('prCorp','prCorp',[['ALL','すべて（'+jn(cnt('prCorp',()=>true))+'物件）']].concat(
    CORP_O.filter(k=>cc[k]).map(k=>[k,CORP_L[k]+'（'+cnt('prCorp',d=>d.l===k)+'）'])
      .filter(o=>/（[1-9]/.test(o[1]))));
  const CK=[['Z','ZEB・BELS'],['D','DBJ Green Building'],['C','CASBEE'],['L','LEED']];
  mk('prCert','prCert',[['ALL','すべて（'+jn(cnt('prCert',()=>true))+'物件）'],
    ['Y','認証あり（'+cnt('prCert',d=>!!d.cn)+'）'],['N','認証なし（'+cnt('prCert',d=>!d.cn)+'）']].concat(
    CK.map(([k,l])=>[('K:'+k),l+'（'+cnt('prCert',d=>(d.ck||'').indexOf(k)>=0)+'）'])
      .filter(o=>/（[1-9]/.test(o[1]))));
  const pc={};F.forEach(d=>{if(d.pm_co)pc[d.pm_co]=(pc[d.pm_co]||0)+1});
  const top=Object.keys(pc).sort((x,y)=>pc[y]-pc[x]);
  mk('prPm','prPm',[['ALL','すべて（'+jn(cnt('prPm',()=>true))+'物件）']].concat(
    top.map(k=>[k,(k.length>22?k.slice(0,22)+'…':k)+'（'+cnt('prPm',d=>d.pm_co===k)+'）'])
      .filter(o=>/（[1-9]/.test(o[1]))));
}
function drawList(){fillPrCorp();const rows=sorted(),c=el('plist');
  if(!rows.length){c.innerHTML='<div class="empty"><b>該当する物件がありません</b>検索語を短くするか、プルダウンの条件を「すべて」に戻してください。</div>';
    el('more').style.display='none';return}
  const show=rows.slice(0,ST.page*PAGE);
  const hd=el('prHits');
  if(hd)hd.textContent=(ST.prCorp==='ALL'?'':CORP_L[ST.prCorp]+' ')+jn(rows.length)+'物件';
  c.innerHTML=show.map(d=>'<div class="prow" tabindex="0" data-id="'+esc(d.id)+'">'+
    '<div><div class="nm">'+esc(d.n)+(ELS.has(d.id)?'<span class="badge ev">評価</span>':'')+
    (d.cn?'<span class="badge">'+esc(d.ck||'認証')+'</span>':'')+'</div>'+
    '<div class="mt"><i class="cdot" style="background:'+(CORP_C[d.l]||'#8d99ae')+'"></i>'+esc(d.l)+' / '+esc(USE_L[d.u])+' / '+esc(d.loc||AREA_L[d.a]||'—')+
    (d.pm_co?'<br><span style="color:#5a5f68">PM: </span>'+esc(d.pm_co)+
      (d.pm_sp==='スポンサー系'?'<span class="badge" style="border-color:#c8a35f;color:#c8a35f">系列</span>':''):'')+(d.age!=null?' / 築'+fmt(d.age,0)+'年':'')+'</div></div>'+
    '<div class="val">'+fmt(d.yra)+'<small>粗利回り%</small></div>'+
    '<div class="val">'+(d.occ!=null?fmt(d.occ,1):'—')+'<small>稼働%</small></div></div>').join('');
  c.querySelectorAll('.prow').forEach(r=>{const d=D.filter(x=>x.id===r.dataset.id)[0];
    if(!d)return;r.onclick=()=>pick(d);r.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(d)}}});
  el('more').style.display=show.length<rows.length?'block':'none';
  el('more').textContent='さらに表示（残り '+(rows.length-show.length)+' 物件）'}
el('more').onclick=()=>{ST.page++;drawList()};

/* ---- playbook / reading / hits ---- */

/* ============ GRESB ============
   オフィス系J-REITが受審するのはスタンディング・インベストメント・ベンチマーク
   （MC30点＋PC70点＝100点）。開発案件を対象とするディベロップメント・
   コンポーネント（DC70点）は本アプリの対象外のため扱わない。 */
const GR_MC=[
 ['リーダーシップ','LE2','ESG目標',1,'G'],['リーダーシップ','LE3','ESG責任者',2,'G'],
 ['リーダーシップ','LE4','ESGタスクフォース/委員会',1,'G'],['リーダーシップ','LE5','上級意思決定者',1,'G'],
 ['リーダーシップ','LE6','従業員ESG業績目標',2,'G'],
 ['方針','PO1','環境方針',1.5,'G'],['方針','PO2','社会方針',1.5,'G'],['方針','PO3','ガバナンス方針',1.5,'G'],
 ['報告','RP1','ESG報告',3.5,'G'],['報告','RP2.1','インシデント監視',0.25,'G'],
 ['リスク管理','RM1','環境マネジメントシステム(EMS)',1.25,'G'],['リスク管理','RM2','ガバナンス方針の実施プロセス',0.25,'G'],
 ['リスク管理','RM3.1','社会リスク評価',0.25,'S'],['リスク管理','RM3.2','ガバナンスリスク評価',0.25,'G'],
 ['リスク管理','RM4.1','新規取得時のESG DD',0.25,'G'],['リスク管理','RM5','気候レジリエンス',0.5,'G'],
 ['リスク管理','RM6.1','移行リスクの特定',0.5,'G'],['リスク管理','RM6.2','移行リスクの影響評価',0.5,'G'],
 ['リスク管理','RM6.3','物理リスクの特定',0.5,'G'],['リスク管理','RM6.4','物理リスクの影響評価',0.5,'G'],
 ['ステークホルダー','SE1','従業員研修',1,'S'],['ステークホルダー','SE2.1','従業員満足度調査',1,'S'],
 ['ステークホルダー','SE2.2','従業員エンゲージメント',1,'S'],['ステークホルダー','SE3.1','健康・福祉プログラム',0.75,'S'],
 ['ステークホルダー','SE3.2','健康・福祉施策',1.25,'S'],['ステークホルダー','SE4','従業員安全指標',0.5,'S'],
 ['ステークホルダー','SE5','人的資本',0.5,'S'],['ステークホルダー','SE6','サプライチェーン',1.5,'S'],
 ['ステークホルダー','SE7.1','PM/AMのモニタリング',1,'S'],['ステークホルダー','SE7.2','外部サプライヤー監視',1,'S'],
 ['ステークホルダー','SE8','苦情処理プロセス',0.5,'S']];
const GR_PC=[
 ['リスク評価','RA1','ポートフォリオのリスク評価',3,'静的','E'],['リスク評価','RA2','技術的建物診断',3,'静的','E'],
 ['リスク評価','RA3','省エネ施策',1.5,'静的','E'],['リスク評価','RA4','節水施策',1,'静的','E'],
 ['リスク評価','RA5','廃棄物管理施策',0.5,'静的','E'],
 ['目標','T1.1','ポートフォリオ改善目標',1,'静的','E'],['目標','T1.2','ネットゼロ目標',1,'静的','E'],
 ['テナント＆コミュニティ','TC1','テナント・エンゲージメント',1,'静的','S'],
 ['テナント＆コミュニティ','TC2.1','テナント満足度調査',1,'静的','S'],
 ['テナント＆コミュニティ','TC2.2','満足度改善プログラム',1,'静的','S'],
 ['テナント＆コミュニティ','TC3','テナント内装・改修',1.5,'静的','E'],
 ['テナント＆コミュニティ','TC4','グリーンリース',1.5,'静的','E'],
 ['テナント＆コミュニティ','TC5.1','テナントの健康・福祉PG',0.75,'静的','S'],
 ['テナント＆コミュニティ','TC5.2','テナントの健康・福祉施策',1.25,'静的','S'],
 ['テナント＆コミュニティ','TC6.1','コミュニティ・エンゲージメント',2,'静的','S'],
 ['テナント＆コミュニティ','TC6.2','コミュニティ影響モニタリング',1,'静的','S'],
 ['エネルギー','EN1','エネルギー消費',14,'相対','E'],['GHG','GH1','GHG排出量',7,'相対','E'],
 ['水','WT1','水使用量',7,'相対','E'],['廃棄物','WS1','廃棄物管理',4,'相対','E'],
 ['データ監視','MR1','ESGデータの検証・保証',1.75,'静的','E'],['データ監視','MR2','検証範囲の拡大',1.25,'静的','E'],
 ['データ監視','MR3','検証範囲の拡大',1.25,'静的','E'],['データ監視','MR4','検証範囲の拡大',1.25,'静的','E'],
 ['建物認証','BC1','建物認証（設計時＋運用時）',8.5,'相対','E'],['建物認証','BC2','省エネ格付',2,'相対','E']];

function drawGresb(){
  /* ① 18法人の星数 */
  const e1=el('grStars');
  if(e1){const g=GRESB.slice().sort((a,b)=>b.s-a.s||CORP_O.indexOf(a.l)-CORP_O.indexOf(b.l));
    e1.innerHTML='<table class="kpitab" style="table-layout:auto"><thead><tr><th>投資法人</th>'+
      '<th>星数</th><th>Green Star</th><th>開示評価</th></tr></thead><tbody>'+
      g.map(x=>'<tr><td><i class="cdot" style="background:'+(CORP_C[x.l]||'#8d99ae')+'"></i>'+esc(CORP_L[x.l]||x.l)+'</td>'+
        '<td style="color:#c8a35f;letter-spacing:1px;white-space:nowrap">'+'★'.repeat(x.s)+
        '<span style="color:#2a2a2a">'+'★'.repeat(5-x.s)+'</span></td>'+
        
        '<td style="font-size:11.5px">'+esc(x.gs||'—')+'</td>'+
        '<td style="font-size:11.5px">'+esc(x.dc||'—')+'</td></tr>').join('')+'</tbody></table>';
    const n=el('grStarNote');
    if(n){const c={};GRESB.forEach(x=>c[x.s]=(c[x.s]||0)+1);
      const av=GRESB.reduce((s,x)=>s+x.s,0)/GRESB.length;
      n.innerHTML='18法人の内訳は '+[5,4,3,2,1].filter(k=>c[k]).map(k=>'★'+k+'が'+c[k]+'法人').join('・')+
        '、平均 <b>'+fmt(av,1)+'</b>。'+
        '星は<b>参加者全体でのスコア順位</b>で決まるため、点数が上がっても他社がそれ以上に上げれば星は落ちます'+HB('gr_star')+
        '<br><span style="color:#5a5f68">Green Starは星数とは別概念で、MCとPCの双方で50%超という絶対評価。開示評価（A〜E）はさらに別軸で、開示の充実度を測ります</span>'}}
  /* ② 100点の構成 */
  const c1=el('chGrStruct');
  if(c1)MC.hbar({cv:c1,rows:[{k:'パフォーマンス(PC)',n:26,m:70},{k:'マネジメント(MC)',n:31,m:30}],
    color:'#7fa8c9',xTitle:'配点（点）',fmt:v=>fmt(v,0)+'点'});
  /* ③ 静的採点と相対採点 */
  const c2=el('chGrCtrl');
  if(c2){MC.hbar({cv:c2,rows:[
      {k:'静的（自力で満点可）',n:0,m:57.5},{k:'相対（他社比較）',n:0,m:42.5}],
    color:'#c8a35f',xTitle:'配点（点）',fmt:v=>fmt(v,1)+'点'});
    const n=el('grCtrlNote');
    if(n)n.innerHTML='100点のうち <b>57.5点は静的採点</b>（MC30点全部＋PC27.5点）で、所定の基準を満たせば満点に到達できます。'+
      '残る <b>42.5点は相対採点</b>で、物件サブタイプ×国のベンチマーク分布との比較で決まります'+HB('gr_score')+
      '<br><span style="color:#c98c8c">相対採点の対象はEN1・GH1・WT1・WS1・BC1・BC2の6指標。'+
      'ベンチマーク値はGRESBの専有データのため事前推定ができず、<b>自社が何もしなくても点数が動きます</b></span>'}
  /* ④ 指標別の配点 */
  const c3=el('chGrInd');
  if(c3){const isMC=ST.grComp==='mc';
    const src=isMC?GR_MC.map(x=>({k:x[2],n:null,m:x[3],asp:x[0],id:x[1]}))
                  :GR_PC.map(x=>({k:x[2],n:null,m:x[3],asp:x[0],id:x[1]}));
    const rows=src.filter(x=>x.m>0).sort((a,b)=>b.m-a.m).slice(0,14);
    MC.hbar({cv:c3,rows,color:isMC?'#9ec49a':'#c8a35f',xTitle:'配点（点）',fmt:v=>fmt(v,2).replace(/\.?0+$/,'')+'点'});
    const n=el('grIndNote');
    if(n)n.innerHTML=isMC
      ?'MC30点は<b>全指標が静的採点</b>。最大配点はRP1（ESG報告）の3.5点で、統合報告書とサステナビリティ報告書の両方が必要です。'+
       '次いでLE3（ESG責任者）とLE6（従業員ESG業績目標）が各2点。<b>環境実績は一切問われません</b>'
      :'PC70点の最大配点は<b>EN1（エネルギー消費）の14点</b>でPC全体の20%。次いでBC1（建物認証）8.5点、GH1（GHG排出量）とWT1（水使用量）が各7点。'+
       '<b>上位4指標だけで36.5点</b>を占め、いずれも相対採点です'}
  /* ⑤ ESG次元の配分 */
  const e5=el('grEsg');
  if(e5)e5.innerHTML='<table class="kpitab" style="table-layout:auto"><thead><tr><th>コンポーネント</th>'+
    '<th style="text-align:right">E（環境）</th><th style="text-align:right">S（社会）</th><th style="text-align:right">G（ガバナンス）</th><th>性質</th></tr></thead><tbody>'+
    '<tr><td>マネジメント（30点）</td><td class="v">0%</td><td class="v">34%</td><td class="v" style="color:#c8a35f">66%</td>'+
    '<td style="font-size:11.5px">実質的にガバナンス評価。環境実績は問われない</td></tr>'+
    '<tr><td>パフォーマンス（70点）</td><td class="v" style="color:#c8a35f">89%</td><td class="v">11%</td><td class="v">0%</td>'+
    '<td style="font-size:11.5px">実質的に環境評価。ガバナンス項目はゼロ</td></tr>'+
    '</tbody></table><p class="note">同じESG評価という名前でも、<b>2つのコンポーネントは正反対の性格</b>を持ちます。'+
    'MCは「体制と文書が整っているか」、PCは「実際にエネルギーを減らせているか」を見ています'+HB('gr_esg')+'</p>';
  /* ⑥ 打ち手 */
  const e6=el('grLever');
  if(e6)e6.innerHTML=[
    ['建物認証を積む','BC1（8.5点）＋BC2（2点）＝10.5点','認証を受けた<b>延床面積の割合</b>で採点されるため、大型物件から取るのが効率的。'+
      'ただし<b>取得後の経過年数で得点が減衰</b>し（4年経過した運用時認証は50%）、CASBEE不動産5年・DBJ Green Building 3年の有効期限内での再取得が前提になります。'+
      '国内認証は2028年基準で扱いが変わる予定です'],
    ['エネルギーデータの網羅率を上げる','EN1（14点）のうちデータカバー率が8.5点','EN1は単一指標でPC最大。'+
      '<b>まず全物件でデータを揃えること</b>が最大の得点源で、性能改善（2.5点）や再エネ（3点）はその後です。'+
      'テナント直接契約でオーナーが検針できない部分をどう捕捉するかが実務の焦点になります'],
    ['MC30点は文書化で満点を狙う','静的採点30点すべて','MCは相対採点がゼロなので、<b>他社と関係なく満点に到達できます</b>。'+
      'RP1（3.5点）は統合報告書とサステナビリティ報告書の両方、RM1（1.25点）はISO14001の第三者認証が要件。'+
      'エビデンスが不受理だと選択内容が正しくても得点は半分または0になります'],
    ['カバー率の乗数を意識する','SE1・SE3.2・SE4・TC2.1・RA1・RA2など','これらは<b>実施率がそのまま乗数</b>になります。'+
      '研修を80%の従業員にしか行っていなければ得点も80%。'+
      'TC1・TC3はドロップダウン選択のため<b>75%を超えれば100%扱い</b>で、そこが実務的な到達目標になります'],
    ['連動制約に注意する','SE2.2←SE2.1／SE3.2←SE3.1／TC2.2←TC2.1','先行指標が0点だと後続も自動的に0点になります。'+
      '調査（満足度調査）やプログラムの土台を作らないと、改善施策の点数がまるごと消えます']
  ].map((x,i)=>'<div class="play" data-n="'+String(i+1).padStart(2,'0')+'">'+
    '<div class="role">'+esc(x[1])+'</div><h3>'+esc(x[0])+'</h3><p>'+x[2]+'</p></div>').join('');
  /* ⑦ 2026年の変更 */
  const e7=el('grNext');
  if(e7){const CH=[['MC','LE3','ESG責任者',2,0],['MC','SE2.2','従業員エンゲージメント',1,0],
      ['MC','RM6.1〜6.4','気候リスク管理（4指標）',2,4],['MC','SE5','人的資本',0.5,1.5],
      ['PC','T1.2','ネットゼロ目標',1,2],['PC','TC3','テナント内装・改修',1.5,2.5],
      ['PC','TC4','グリーンリース',1.5,2.5],['PC','RA2','技術的建物診断',3,2],
      ['PC','RA3','省エネ施策',1.5,0.5],['PC','RA4','節水施策',1,0.25],['PC','RA5','廃棄物管理施策',0.5,0.25]];
    e7.innerHTML='<table class="kpitab" style="table-layout:auto"><thead><tr><th>区分</th><th>指標</th>'+
      '<th style="text-align:right">2025</th><th style="text-align:right">2026</th><th style="text-align:right">増減</th></tr></thead><tbody>'+
      CH.map(x=>{const d=x[4]-x[3];const col=d>0?'#9ec49a':d<0?'#c98c8c':'#5a5f68';
        return '<tr><td style="font-size:11px;color:#5a5f68">'+x[0]+'</td><td style="font-size:12px">'+esc(x[2])+
        '<span class="sm">'+esc(x[1])+'</span></td><td class="v">'+x[3]+'</td><td class="v">'+x[4]+'</td>'+
        '<td class="v" style="color:'+col+'">'+(d>0?'+':'')+d+'</td></tr>'}).join('')+
      '</tbody></table><p class="note">合計は100点で不変ですが、配分が動きます。'+
      '<b>気候リスク管理（RM6.1〜6.4）が2点→4点</b>とMC最大の増点領域になり、'+
      '省エネ・節水・廃棄物の施策報告（RA3〜RA5）は3点→1点に圧縮されます。'+
      'GRESB公式の試算では参加者あたり▲4.0点〜+2.8点の影響があるとされ、'+
      '<b>自社が何もしなくてもスコアが動く</b>点に注意が必要です'+HB('gr_2026')+'</p>'}
}
const CKH={pm:'pm',ut:'ut',tx:'tx',rp:'rp',dp:'dp',in:'ins',ot:'oth'};
const MONOF="var(--mono)";
function buildSelects(){
  fillSel('selUse',[['ALL','すべて（'+BASE.length+'）'],...['OF','RS','RT','HT','HC','LG'].filter(u=>cnt(d=>d.u===u)).map(u=>[u,USE_L[u]+'（'+cnt(d=>d.u===u)+'）'])],'use',render);
  fillSel('selArea',[['ALL','すべて'],...AREA_O.filter(a=>cnt(d=>d.a===a)).map(a=>[a,AREA_L[a]+'（'+cnt(d=>d.a===a)+'）'])],'area',render);
  fillSel('selCorp',[['ALL','すべて'],...CORP_O.map(c=>[c,CORP_L[c]+'（'+cnt(d=>d.l===c)+'）'])],'corp',render);
  fillSel('selAge',[['ALL','すべて'],...AGE_B.map(b=>[b[0],b[1]+'（'+cnt(d=>d.age!=null&&d.age>=b[2]&&d.age<b[3])+'）'])],'age',render);
  fillSel('selCert',[['ALL','すべて'],['Y','認証あり（'+cnt(d=>d.cn>0)+'）'],['N','認証なし（'+cnt(d=>!d.cn)+'）']],'cert',render);
  fillSel('selEvl',[['ALL','すべて'],['Y','評価対象のみ（'+EL.length+'）'],['N','評価対象外（'+(BASE.length-EL.length)+'）']],'evl',render);
}
function closeSplash(){const s=el('splash');if(!s||s.classList.contains('done'))return;
  s.classList.add('done');setTimeout(()=>{if(s&&s.parentNode)s.parentNode.removeChild(s)},450)}

function drawHits(){const e=el('hits');if(!e)return;
  const fl=[['area',AREA_L],['corp',CORP_L],['age',null],['cert',null],['evl',null]]
    .filter(([k])=>ST[k]&&ST[k]!=='ALL').length;
  e.textContent=USE_L[ST.scope]+' '+jn(F.length)+' 物件'+'';}

function drawRead(){const V=FY,lab=ST.use==='ALL'?'全用途':USE_L[ST.use];
  const c5=med(V.filter(d=>d.a==='C5').map(d=>d.yra)),rg=med(V.filter(d=>d.a==='RG'||d.a==='M3').map(d=>d.yra));
  const yg=med(V.filter(d=>d.age!=null&&d.age<10).map(d=>d.yra)),ol=med(V.filter(d=>d.age>=25).map(d=>d.yra));
  el('driverRead').innerHTML=V.length<5?'該当データが少なく、傾向を読める水準にありません。条件を緩めてください。':
   'いまの条件（'+lab+'・n='+V.length+'）では、都心5区の粗利回り中央値 <b>'+fmt(c5)+'%</b> に対し地方・他大都市圏は <b>'+fmt(rg)+
   '%</b>。築10年未満 <b>'+fmt(yg)+'%</b> → 築25年以上 <b>'+fmt(ol)+'%</b> と、築年で約 <b>'+
   ((ol!=null&&yg!=null)?fmt(ol-yg,1):'—')+'pt</b> の差を市場が要求している。この差の大半は劣化ではなく<b>立地とスペックに対するキャップレート差</b>で、運用施策で動かせるのはここから先の上積み分。'+
   '<br><span style="color:#5a5f68">※築年数は竣工年月を開示する9法人419物件が母数（NBF・JRE・KDX・ICG・NUDは物件別の竣工年月が未開示）。</span>'}
const GRESB=[{"l": "KDX", "s": 5, "gs": "あり", "dc": null}, {"l": "GOR", "s": 5, "gs": null, "dc": null}, {"l": "JRE", "s": 5, "gs": "10年連続", "dc": null}, {"l": "NBF", "s": 5, "gs": "あり", "dc": "A（8年連続）"}, {"l": "JPR", "s": 5, "gs": null, "dc": null}, {"l": "NUD", "s": 4, "gs": null, "dc": "A（6年連続）"}, {"l": "ORI", "s": 4, "gs": null, "dc": null}, {"l": "CTR", "s": 4, "gs": null, "dc": null}, {"l": "JEI", "s": 4, "gs": "11年連続", "dc": null}, {"l": "HLC", "s": 4, "gs": "9年連続", "dc": "A（7年連続）"}, {"l": "DOI", "s": 4, "gs": "14年連続", "dc": null}, {"l": "HFR", "s": 4, "gs": null, "dc": null}, {"l": "TRE", "s": 4, "gs": null, "dc": null}, {"l": "MTR", "s": 4, "gs": null, "dc": null}, {"l": "MHR", "s": 4, "gs": "14年連続", "dc": null}, {"l": "ICG", "s": 3, "gs": "継続取得", "dc": null}, {"l": "SHR", "s": 3, "gs": null, "dc": "A（6年連続）"}, {"l": "SKR", "s": 2, "gs": null, "dc": null}];
const VIEWS=[['ov','概況','OVERVIEW'],['an','分析','ANALYSIS'],['pr','物件','FINDER'],['va','評価','VALUE'],['gr','GRESB','ESG']];
ST.view='ov';ST.pane='drv';
function buildNav(){const bn=el('bnav'),vt=el('vtabs');bn.innerHTML='';vt.innerHTML='';
  VIEWS.forEach(v=>{
    const b=document.createElement('button');b.dataset.v=v[0];b.className=ST.view===v[0]?'on':'';
    b.innerHTML='<span class="j">'+v[1]+'</span><span class="e">'+v[2]+'</span>';
    b.onclick=()=>go(v[0]);bn.appendChild(b);
    const t=document.createElement('button');t.dataset.v=v[0];t.className=ST.view===v[0]?'on':'';
    t.textContent=v[1];t.onclick=()=>go(v[0]);vt.appendChild(t)})}
function go(v,keepScroll){ST.view=v;
  document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on',s.id==='v-'+v));
  document.querySelectorAll('#bnav button,#vtabs button').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
  if(!keepScroll)scrollTo({top:0,behavior:'auto'});
  paint()}
function goPane(p){ST.pane=p;
  document.querySelectorAll('#subtabs button').forEach(b=>b.classList.toggle('on',b.dataset.p===p));
  document.querySelectorAll('#v-an .pane').forEach(s=>s.classList.toggle('on',s.id==='p-'+p));
  paint()}
function measure(){}
document.querySelectorAll('#subtabs button').forEach(b=>b.onclick=()=>goPane(b.dataset.p));
function paint(){const v=ST.view;
  if(v==='ov'){drawSpectrum();drawKPI();drawCorp();drawDist();drawStrat()}
  else if(v==='an'){if(ST.pane==='drv'){drawCross();drawRead()}
    else if(ST.pane==='cost'){drawStack();drawSpread()}
    else if(ST.pane==='grn'){drawCert();drawRank();drawCov();}
    else{drawPm()}}
  else if(v==='pr')drawList();
  else if(v==='va')drawVal();
  else if(v==='gr')drawGresb()}
function render(){refilter();drawHits();paint()}

seg('segCorpX',[['c5','都心5区比率'],['size','1物件平均規模'],['tokyo','東京圏比率'],['of','オフィス比率'],['cert','認証保有率'],['age','築年数(9法人のみ)']],'corpX',drawCorp);
seg('segCorpY',[['yra','粗利回り(鑑定)'],['yr','粗利回り(取得価格)'],['yna','NOI利回り(鑑定)'],['occ','稼働率'],['ug','含み損益率']],'corpY',drawCorp);
seg('segDistG',[['area','エリア'],['use','用途'],['corp','投資法人'],['age','築年帯'],['size','規模'],['cert','認証'],['occ','稼働']],'distG',drawDist);
seg('segDistM',[['yra','粗利回り(鑑定)'],['yna','NOI利回り(鑑定)'],['mgn','NOIマージン'],['occ','稼働率'],['oer','経費率(償却込)'],['ug','含み損益率'],['ap','鑑定評価額']],'distM',drawDist);
seg('segX',[['age','築年数'],['nla','賃貸可能面積'],['ap','鑑定評価額'],['occ','稼働率']],'x',()=>{drawCross();drawRead()});
seg('segY',[['yra','粗利回り(鑑定)'],['yna','NOI利回り(鑑定)'],['mgn','NOIマージン'],['ug','含み損益率']],'y',drawCross);
seg('segMode',[['scatter','散布＋中央値'],['line','中央値のみ']],'mode',drawCross);
seg('segStackG',[['use','用途'],['area','エリア'],['corp','投資法人'],['age','築年帯'],['size','規模']],'stackG',drawStack);
seg('segCostK',CK.map(c=>[c[0],c[1]]),'costK',()=>{drawSpread();updCostHelp()});
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(paint,200)});
addEventListener('orientationchange',()=>setTimeout(paint,300));
function updCostHelp(){const e=el('costHelp');if(e)e.innerHTML='費目の定義: '+(CK.filter(c=>c[0]===ST.costK)[0]||[])[1]+HB(CKH[ST.costK])}
/* 稼働率はオフィスの72%が100%で判別力がなく、認証の有無で差が出ない（両群とも中央値100.0%）。
   ラベルも重なるため指標から外し、代わりに規模（鑑定評価額）を置く。 */
seg('segCertM',[['yra','粗利回り(鑑定)'],['mgn','NOIマージン'],['ug','含み損益率'],['ap','規模（鑑定）']],'certM',drawCert);
seg('segCertG',[['area','エリア'],['age','築年帯'],['size','規模'],['corp','投資法人']],'certG',drawCert);
seg('segRank',[['dbj','DBJ 星数'],['cas','CASBEE'],['type','認証種別']],'rank',drawRank);
seg('segCovBase',[['n','物件数ベース'],['ap','鑑定評価額ベース']],'covBase',drawCov);
seg('segCovG',[['area','エリア'],['age','築年帯'],['size','規模'],['corp','投資法人']],'covG',drawCov);
/* 並び替えボタン。選択中の軸をもう一度タップすると昇順・降順が反転する。 */
function buildSort(){const e=el('segSort');if(!e)return;
  const arrow=(k)=>{const asc=(ST.sort===k?ST.sortDir:SORT_DIR[k])===1;
    return k==='age'?(asc?'新しい順':'古い順'):(asc?'低い順':'高い順')};
  e.innerHTML=SORT_AX.map(([k,l])=>{const on=ST.sort===k;
    const dir=on?ST.sortDir:SORT_DIR[k];
    return '<button class="sortbtn'+(on?' on':'')+'" data-k="'+k+'" '+
      'aria-pressed="'+on+'" title="'+esc(l+' '+arrow(k))+(on?'（タップで反転）':'')+'">'+
      esc(l)+'<span class="dir">'+(dir===1?'↑':'↓')+'</span></button>'}).join('');
  [...e.querySelectorAll('.sortbtn')].forEach(b=>b.onclick=()=>{
    const k=b.dataset.k;
    if(ST.sort===k)ST.sortDir=-ST.sortDir;      /* 同じ軸なら方向を反転 */
    else{ST.sort=k;ST.sortDir=SORT_DIR[k]}      /* 別の軸なら既定の向きから */
    ST.page=1;buildSort();drawList()})}
buildSort();

function buildScope(){
  seg('segGrComp',[['pc','パフォーマンス（70点）'],['mc','マネジメント（30点）']],'grComp',drawGresb);
seg('segScope',[['OF','オフィス'],['RS','住宅']],'scope',()=>{
    ST.sel=null;ST.vCorp='ALL';ST.pmSel=null;GTHR={};EIPOOL={};CSPOOL=null;RAWT={};POOL={};
    fillVPick();render();updCostHelp()})}
buildNav();buildScope();buildSelects();syncCtl();fillVPick();bindVPick();render();updCostHelp();
setTimeout(closeSplash,1150);setTimeout(closeSplash,1600);
