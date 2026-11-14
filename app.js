const $=s=>document.querySelector(s);
const TIMES=['8:30-9:25','9:30-10:25','10:30-11:25','11:30-12:25','12:30-1:25','2:30-3:25','3:30-4:25','4:30-5:25'];
const LABCOLS=[[1,2,3],[5,6,7]],W={red:10,org:5,yel:2};
let D,OCC,F={cats:new Set(),years:new Set(),branch:'',q:''},SEL=null;
try{D=JSON.parse(localStorage.getItem('sp_data'))}catch(e){}
D=D&&D.courses?D:window.DEFAULT_DATA;
D.courses.forEach((c,i)=>c.id=i);
function build(){OCC={};D.tt.days.forEach((d,di)=>{
  d.lec.forEach((l,ci)=>(OCC[l]=OCC[l]||[]).push({day:di,col:ci}));
  d.labs.forEach((l,k)=>(OCC[l]=OCC[l]||[]).push({day:di,cols:LABCOLS[k]}))})}
const isLab=l=>/[N-W]/.test(l);
const core=c=>c.cat==='PC',elec=c=>c.cat==='PE'||c.cat==='OE'||c.cat==='PL';
function atoms(slots){const a=new Set;for(const s of slots){const o=OCC[s.l];if(!o||s.flex)continue;
  o.forEach((x,i)=>{if(s.d&&!s.d.includes(i+1))return;
    if(x.cols)x.cols.forEach(k=>a.add(x.day+'.'+k));else a.add(x.day+'.'+x.col)})}return a}
function related(a,b){if(a===b||a.code===b.code&&a.name===b.name)return false;
  if(a.prog&&b.prog&&a.prog!==b.prog)return false;
  if(a.year!=null&&b.year!=null&&a.year!==b.year)return false;
  return a.branches.includes('*')||b.branches.includes('*')||a.branches.some(x=>b.branches.includes(x))}
function kind(a,b){if(core(a)&&core(b))return'red';if(elec(a)&&elec(b))return'yel';
  if((core(a)&&elec(b))||(core(b)&&elec(a)))return'org';return null}
function conflicts(a,aSlots,pool){const A=atoms(aSlots),r=[];
  for(const b of pool){if(!related(a,b))continue;const k=kind(a,b);if(!k)continue;
    const sh=[...atoms(b.slots)].filter(x=>A.has(x));if(sh.length)r.push({a,b,k,sh})}return r}
function visible(){const q=F.q.toLowerCase();return D.courses.filter(c=>{
  if(!c.slots.length)return false;
  if(F.cats.size&&!(F.cats.has(c.cat)||(F.cats.has('PL')&&c.pl)))return false;
  if(F.years.size&&!(F.years.has(c.year)||(c.year==null&&!core(c))))return false;
  if(F.branch&&!(c.branches.includes('*')||c.branches.includes(F.branch)))return false;
  return !q||(c.code+' '+c.name).toLowerCase().includes(q)})}
function color(c){let h=0;for(const ch of c.code+c.name)h=(h*31+ch.charCodeAt(0))>>>0;
  const base={PC:205,PE:18,OE:42,PL:95}[c.cat]??270;
  return`hsl(${base+(h%25)-12},${28+h%12}%,${26+(h>>3)%9}%)`}
function render(){
  const V=visible(),flag=new Map(),pairs=[],rank={red:3,org:2,yel:1},seen=new Set;
  for(const c of V)for(const x of conflicts(c,c.slots,V)){const key=Math.min(x.a.id,x.b.id)+'-'+Math.max(x.a.id,x.b.id);
    for(const z of[x.a,x.b])if(!flag.has(z.id)||rank[x.k]>rank[flag.get(z.id)])flag.set(z.id,x.k);
    if(!seen.has(key)){seen.add(key);pairs.push(x)}}
  const chip=c=>`<span class="c ${flag.get(c.id)||''} ${SEL===c.id?'sel':''}" style="background:${color(c)}" data-id="${c.id}" title="${c.name}">${c.code} ${c.name}</span>`;
  const cell=(day,col)=>V.filter(c=>{const A=atoms(c.slots);return A.has(day+'.'+col)}).map(chip).join('');
  let h='<tr><th>Day</th>'+TIMES.map(t=>`<th>${t}</th>`).join('')+'<th>Lab AM</th><th>Lab PM</th></tr>';
  D.tt.days.forEach((d,di)=>{h+=`<tr><td class="day">${d.name.slice(0,3)}</td>`;
    d.lec.forEach((l,ci)=>{h+=`<td><span class="sl">${l}</span>${V.filter(c=>c.slots.some(s=>s.l===l&&!s.flex&&(!s.d||s.d.includes(OCC[l].findIndex(o=>o.day===di&&o.col===ci)+1)))).map(chip).join('')}</td>`});
    d.labs.forEach(l=>{h+=`<td class="lab"><span class="sl">${l}</span>${V.filter(c=>c.slots.some(s=>s.l===l&&!s.flex)).map(chip).join('')}</td>`});
    h+='</tr>'});
  $('#tt').innerHTML=h;
  $('#sp').style.width=$('#tt').scrollWidth+'px';
  const G={PC:'Core (PC)',PE:'Program electives (PE)',OE:'Open electives (OE)',PL:'Program linked (PL)'};
  const grp={};V.forEach(c=>{const k=G[c.cat]?c.cat:'Other';(grp[k]=grp[k]||[]).push(c)});
  $('#lst').innerHTML='<h3>Courses on timetable ('+V.length+')</h3>'+Object.keys(grp).map(k=>`<div class="lg">${G[k]||'Other'} (${grp[k].length})</div>`+grp[k].sort((x,y)=>x.code.localeCompare(y.code)).map(c=>`<span class="li ${flag.get(c.id)||''}" style="background:${color(c)}" data-id="${c.id}" title="${c.name}">${c.code} ${c.name} [${c.slots.map(s=>s.l+(s.d?s.d.join(''):'')).join(',')}]</span>`).join('')).join('');
  const names={red:'Core clash',yel:'Elective clash',org:'Core/elective clash'};
  $('#cf').innerHTML=pairs.length?pairs.sort((p,q)=>rank[q.k]-rank[p.k]).map(x=>`<div class="f ${x.k}"><b>${names[x.k]}</b><br>${x.a.code} / ${x.b.code}<br><small>${x.a.name} | ${x.b.name}</small></div>`).join(''):'<small>No conflicts in current view</small>';
  $('#cnt').textContent=V.length+' courses shown, '+pairs.length+' conflicts';
  if(SEL!=null)detail(D.courses[SEL])}
function shift(c){
  const all=D.courses.filter(x=>x.slots.length),cur=conflicts(c,c.slots,all),res=[];
  const letters=[...new Set(c.slots.filter(s=>!s.flex).map(s=>s.l))].filter(l=>l!=='X');
  for(const L of letters)for(const C of Object.keys(OCC)){
    if(C==='X'||isLab(C)!==isLab(L)||letters.includes(C))continue;
    const ns=c.slots.map(s=>s.l===L?{...s,l:C}:s),cf=conflicts(c,ns,all);
    res.push({L,C,cf,score:cf.reduce((a,x)=>a+W[x.k],0),pm:!isLab(C)&&/[I-M]/.test(C)?1:0})}
  res.sort((a,b)=>a.score-b.score||a.pm-b.pm||a.C.localeCompare(b.C));
  return{cur,res:res.slice(0,5)}}
function detail(c){
  const{cur,res}=shift(c),f=x=>x.map(y=>`<div class="f ${y.k}">${y.b.code} ${y.b.name}</div>`).join('')||'<small>none</small>';
  $('#dt').innerHTML=`<b>${c.code}</b> ${c.name}<br><small>${c.ltp} | ${c.credits} cr | ${c.disc} | ${c.prog||'-'} sem ${c.sem||'-'} | ${c.cat}<br>Slots: ${c.slots.map(s=>s.l+(s.d?s.d.join(''):'')).join(', ')}<br>${c.inst}</small>
  <h3 style="margin-top:10px">Current clashes (${cur.length})</h3>${f(cur)}
  <h3 style="margin-top:10px">Best shifts</h3>`+(res.length?res.map(r=>`<div><b>${r.L} to ${r.C}</b> ${r.pm?'(afternoon)':''} score ${r.score}${r.cf.length?f(r.cf):' no clashes'}</div>`).join(''):'<small>No alternative</small>')}
function init(){build();
  $('#fc').innerHTML=['PC','PE','OE','PL'].map(x=>`<span class="chip" data-c="${x}">${x}</span>`).join('');
  $('#fy').innerHTML=[0,1,2,3,4].map(x=>`<span class="chip" data-y="${x}">${x?'Year '+x:'Prep'}</span>`).join('');
  const br=[...new Set(D.courses.flatMap(c=>c.branches).filter(x=>x!=='*'))].sort();
  $('#fb').innerHTML='<option value="">All branches</option>'+br.map(b=>`<option>${b}</option>`).join('');render()}
document.addEventListener('click',e=>{const t=e.target;
  if(t.dataset.c){F.cats.has(t.dataset.c)?F.cats.delete(t.dataset.c):F.cats.add(t.dataset.c);t.classList.toggle('on');render()}
  else if(t.dataset.y){const y=+t.dataset.y;F.years.has(y)?F.years.delete(y):F.years.add(y);t.classList.toggle('on');render()}
  else if(t.dataset.id){SEL=+t.dataset.id;render()}});
$('#q').oninput=e=>{F.q=e.target.value;render()};$('#fb').onchange=e=>{F.branch=e.target.value;render()};
$('#set').onclick=()=>$('#dlg').showModal();$('#cl').onclick=()=>$('#dlg').close();
$('#rs').onclick=()=>{try{localStorage.removeItem('sp_data')}catch(e){}location.reload()};
async function toText(f){if(!/pdf$/i.test(f.name))return f.text();
  if(!window.pdfjsLib){await new Promise((r,j)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';s.onload=r;s.onerror=j;document.head.appendChild(s)});
    pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'}
  const pdf=await pdfjsLib.getDocument({data:await f.arrayBuffer()}).promise;let out='';
  for(let p=1;p<=pdf.numPages;p++){const items=(await(await pdf.getPage(p)).getTextContent()).items,g={};
    items.forEach(i=>{const y=Math.round(i.transform[5]/3);(g[y]=g[y]||[]).push(i)});
    Object.keys(g).sort((a,b)=>b-a).forEach(y=>out+=g[y].sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ')+'\n')}
  return out}
async function load(inp,kind){const f=inp.files[0];if(!f)return;
  try{const t=await toText(f);
    if(kind==='c'){const c=parseCourses(t);if(!c.length)throw'No courses found';D.courses=c;$('#msg').textContent=c.length+' courses loaded'}
    else{const tt=parseTT(t);if(tt.days.length<5)throw'Timetable not recognised';D.tt=tt;$('#msg').textContent='Timetable loaded'}
    D.courses.forEach((c,i)=>c.id=i);try{localStorage.setItem('sp_data',JSON.stringify(D))}catch(e){}SEL=null;init()}
  catch(e){$('#msg').textContent='Failed: '+e}}
$('#fcl').onchange=e=>load(e.target,'c');$('#ftt').onchange=e=>load(e.target,'t');
init();

{const t=$('#top'),m=$('#mn');let l=0;t.onscroll=()=>{if(!l){l=1;m.scrollLeft=t.scrollLeft;l=0}};m.onscroll=()=>{if(!l){l=1;t.scrollLeft=m.scrollLeft;l=0}}}
addEventListener('resize',()=>{$('#sp').style.width=$('#tt').scrollWidth+'px'});
