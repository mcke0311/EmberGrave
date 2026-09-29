// Run alone against python serve.py; alternating samples avoid a warm-cache bias.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const {ensureSnapshot}=require('./boss_arenas_baseline.cjs');
const arg=(name,fallback)=>process.argv.find(v=>v.startsWith('--'+name+'='))?.split('=').slice(1).join('=')||fallback;
const before=ensureSnapshot(),out=arg('output-dir','tests/qa/boss_arenas/performance'),pairs=+arg('pairs','3');
const bosses=arg('boss','korvath,mire_mother,azram,empty_archangel,malthoron,vethriss').split(','),widths=arg('width','1920,3840').split(',').map(Number);
const seconds=+arg('seconds','6'),warmup=+arg('warmup','2000'),resume=process.argv.includes('--resume');
fs.mkdirSync(out,{recursive:true});
const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)],cases=[];
for(const boss of bosses)for(const width of widths){
 const samples={before:[],after:[]};
 for(let pair=0;pair<pairs;pair++)for(const version of pair%2?['after','before']:['before','after']){
  const file=path.join(out,`${boss}_${width}_${pair}_${version}.json`);
  if(!resume||!fs.existsSync(file))execFileSync(process.execPath,['--preserve-symlinks','--preserve-symlinks-main','tests/input_latency.cjs',`--boss=${boss}`,`--width=${width}`,'--modes=normal',`--seconds=${seconds}`,`--warmup=${warmup}`,`--output=${file}`,...(version==='before'?[`--source-directory=${before}`]:[])],{stdio:'pipe',timeout:180000});
  const r=JSON.parse(fs.readFileSync(file)),sample=r.results[0];
  assert.ok(sample?.frames>=100&&!r.failed,'Insufficient performance sample: '+file);
  samples[version].push(sample.cpuMs.p95);
  console.log(`${boss} ${width} pair ${pair+1} ${version}: p95 ${sample.cpuMs.p95} ms`);
 }
 const baseline=median([...samples.before]),current=median([...samples.after]);
 const result={boss,width,samples,beforeP95:baseline,afterP95:current,changePercent:+((current/baseline-1)*100).toFixed(2),withinBudget:current<=baseline*1.1};cases.push(result);
 console.log(JSON.stringify(result));
 fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify({method:'Median of alternating production-loop samples; same class, ordinary gear, capped adds, final phase, seed and canvas size. Before is the initial working tree; after includes dedicated arena art and devices. Run without concurrent tests.',seconds,warmupMs:warmup,pairs,cases},null,2)+'\n');
}
if(cases.some(c=>!c.withinBudget))process.exitCode=1;
