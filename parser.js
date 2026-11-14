// Shared parser (browser + node). Pure text parsing, no AI.
const DISC='All|BSBM/BMD|BSBM|CSE/DSAI|CSE|CY|DSAI|ECE - CSP|ECE - MV|ECE|EE/ME/MT|EE/MT|EVT&EE&CY|EVT|EE|LA|MA|ME/MT|ME|MSME|MT|PH';
const DR=new RegExp('^(.*?)\\s('+DISC+')(?=\\s|$)\\s?(.*)$');
const CODE=/^([A-Z]{2,4}\s?[0-9Xx]{3}(?:\s?\/\s?[A-Z]{2,4}\s?[0-9]{3})?)\s+(.*)$/;
function parseCourses(text){
  const rows=[];let cur=null;
  for(const raw of text.split('\n')){
    const l=raw.trim().replace(/\s+/g,' ');
    if(!l||/^Course code/.test(l))continue;
    const m=l.match(CODE);
    if(m&&DR.test(m[2])){cur={code:m[1].replace(/\s/g,''),rest:m[2],extra:''};rows.push(cur)}
    else if(cur)cur.extra+=' '+l;
  }
  return rows.map(r=>{
    const m=r.rest.match(DR);let s=m[1],credits='',ltp='';
    const cm=s.match(/\s([\d.]+(?:\s?(?:to|–|-|\/)\s?[\d.]+)?)$/);if(cm){credits=cm[1];s=s.slice(0,cm.index)}
    const lm=s.match(/\s([0-9X.]+[-_][0-9X.]+[-_][0-9X.]+|TBD)$/);if(lm){ltp=lm[1];s=s.slice(0,lm.index)}
    const t=m[3].split(' ');let i=0,prog='',sem='',cat='';
    if(/^(BTech|MTech|MSc|PhD|Prep|Preparatory)$/i.test(t[i])){prog=/prep/i.test(t[i])?'Prep':t[i].replace(/^btech$/i,'BTech');i++;if(/^btech$/i.test(t[i])&&prog==='Prep')i++}
    if(/^(\d|Prep)$/.test(t[i]))sem=t[i++];
    if(t[i]==='PE/OE'){cat='OE';i++;if(t[i]==='for')i+=2}
    else if(/^(PC\/PE|PC|PE|OE|PL|TC|NCN|NAN|Project|LA)$/.test(t[i])){cat=t[i++]}
    if(cat==='PC/PE')cat='PC';if(cat==='LA')cat='OE';
    const slots=[];
    for(;i<t.length;i++){
      const k=t[i].replace(/,$/,'');if(k==='&'||k===','||(k==='NA'&&!slots.length))continue;
      let ok=true;const tmp=[];
      for(const p of k.split(',').filter(Boolean)){
        const q=p.match(/^([A-X]{1,5})([1-3]{0,3})$/);
        if(!q||/^(NA|TBD|D[PU]GC)/.test(p)){ok=false;break}
        if(q[2]===''&&q[1].length>1)for(const ch of q[1])tmp.push({l:ch,flex:q[1].length>2});
        else tmp.push({l:q[1],d:q[2]?q[2].split('').map(Number):null});
      }
      if(!ok)break;slots.push(...tmp);
    }
    const dsc=m[2];
    const branches=dsc==='All'?['*']:dsc.split(/\/|&| - /).map(x=>x.trim());
    const semN=parseInt(sem);
    return {code:r.code,name:s.replace(/\s*\*$/,''),ltp,credits,disc:dsc,prog,sem,cat,slots,
      inst:(t.slice(i).join(' ')+r.extra).trim(),branches,
      year:isNaN(semN)?(sem==='Prep'?0:null):Math.ceil(semN/2),
      pl:/[\/&]| - /.test(dsc)};
  });
}
function parseTT(text){
  const L=text.split('\n'),s=L.findIndex(x=>/Schedule for classes/i.test(x));
  const days=[],D=/^(Monday|Tuesday|Wednesday|Thursday|Friday)\b/;let pend=[];
  for(const raw of L.slice(s+1)){
    const l=raw.trim();if(!l)continue;
    const dm=l.match(D);
    const tk=l.replace(D,'').split(/\s+/).filter(x=>/^[A-X]$/.test(x));
    const lab=tk.filter(x=>/[N-W]/.test(x)),lec=tk.filter(x=>/[A-MX]/.test(x));
    if(dm){days.push({name:dm[1],lec:[],labs:pend});pend=[]}
    if(!days.length){if(lab.length&&!dm)pend=lab;continue}
    if(lec.length)days[days.length-1].lec.push(...lec);
    if(lab.length){if(dm)days[days.length-1].labs.push(...lab);else pend=lab}
  }
  return {days};
}
if(typeof module!=='undefined')module.exports={parseCourses,parseTT};
