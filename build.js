const fs=require('fs'),p=require('./parser.js');
const c=p.parseCourses(fs.readFileSync('/tmp/c.txt','utf8')),t=p.parseTT(fs.readFileSync('/tmp/t.txt','utf8'));
fs.writeFileSync('data.js','window.DEFAULT_DATA='+JSON.stringify({courses:c,tt:t})+';');
console.log(c.length,JSON.stringify(t));
const bad=c.filter(x=>!x.cat||!x.name);console.log('suspect',bad.map(x=>x.code).join(' '));
console.log(c.filter(x=>['EEL206/EE208','CSP352','MEP302','LAN103','MEL214','ECL5XX','PHL020'].includes(x.code)).map(x=>JSON.stringify([x.code,x.name,x.ltp,x.credits,x.prog,x.sem,x.cat,x.slots.map(s=>s.l+(s.d||'')).join(),x.inst.slice(0,20)])).join('\n'));
