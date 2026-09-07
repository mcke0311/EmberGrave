const fs=require('node:fs');
const dir='tests/qa/bosses/performance';
const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
const round=n=>+n.toFixed(2);
const results=[];
for(const name of fs.readdirSync(dir).filter(n=>/_(1920|3840)\.json$/.test(n))){
 const report=JSON.parse(fs.readFileSync(dir+'/'+name)),normal=report.results.filter(r=>r.mode==='normal'),legacy=report.results.filter(r=>r.mode==='legacy');
 if(normal.length!==3||legacy.length!==3)throw Error('Incomplete three-run comparison: '+name);
 const before=mean(legacy.map(r=>r.cpuMs.p95)),after=mean(normal.map(r=>r.cpuMs.p95));
 const events=normal.flatMap(r=>r.inputEvents).filter(e=>e.name.startsWith('key'));
 const result={boss:normal[0].scene.boss,width:report.width,runs:3,baselineP95:round(before),currentP95:round(after),changePercent:round((after/before-1)*100),currentMedian:round(mean(normal.map(r=>r.cpuMs.median))),maxKeyboardPresentation:round(Math.max(0,...events.map(e=>e.presentation))),keyboardEvents:events.length,keyboardOver100:events.filter(e=>e.presentation>100).length,maxFrameCPU:Math.max(...normal.map(r=>r.cpuMs.max)),maxFrameInterval:Math.max(...normal.map(r=>r.frameIntervals.max))};
 results.push(result);
}
const report={method:'Mean of three warm-run p95 CPU values per mode. Generic AI baseline shares the new arena, art, seed, ordinary gear and initial capped enemies/player army. Six seconds per run; trusted Shift keys.',results};
fs.writeFileSync('tests/qa/bosses/performance_summary.json',JSON.stringify(report,null,2)+'\n');
console.table(results);
if(results.some(r=>r.changePercent>10||r.keyboardOver100))process.exitCode=1;
