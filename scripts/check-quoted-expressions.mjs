#!/usr/bin/env node
// Detects a JSX expression container that was accidentally wrapped in quotes,
// i.e. text a learner would literally see as "{c('some.key')}".
import fs from 'fs'; import path from 'path';
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);
  if(e.isDirectory()){if(['node_modules','dist','.git'].includes(e.name))continue;walk(p,o);}
  else if(/\.(jsx?|tsx?)$/.test(e.name))o.push(p);}return o;}
const roots=process.argv.slice(2); const files=roots.flatMap(r=>fs.statSync(r).isDirectory()?walk(r):[r]);
let issues=0;
for(const f of files){
  const src=fs.readFileSync(f,'utf8');
  src.split('\n').forEach((line,i)=>{
    // Walk the line, tracking quote state. On entering a quote, scan to its
    // match; if a {c( or {t( container appears inside, it is a bug.
    let q=null; let start=0;
    for(let k=0;k<line.length;k++){
      const ch=line[k];
      if(q){
        if(ch==='\\'){k++;continue;}
        if(ch===q){
          const inner=line.slice(start,k);
          if(/\{\s*(c|t)\s*\(/.test(inner)){
            console.log(`${f}:${i+1}  ${line.trim().slice(0,120)}`); issues++;
          }
          q=null;
        }
        continue;
      }
      if(ch==="'"||ch==='"'||ch==='`'){q=ch;start=k+1;}
    }
  });
}
console.log(issues?`\n${issues} unevaluated expression(s) inside string literals.`:'clean: no unevaluated expressions inside string literals');
process.exit(issues?1:0);
