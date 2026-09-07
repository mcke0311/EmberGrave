// Compare the refined controller/HUD with the actual previous authored build.
// Runs sequentially so browsers never contend with another benchmark browser.
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const ref=process.argv.find(a=>a.startsWith('--baseline='))?.slice(11)||'4258cf2';
const selected=process.argv.find(a=>a.startsWith('--boss='))?.slice(7);
const widths=process.argv.find(a=>a.startsWith('--width='))?.slice(8);
const seconds=process.argv.find(a=>a.startsWith('--seconds='))?.slice(10)||'6';
const warmup=process.argv.find(a=>a.startsWith('--warmup='))?.slice(9)||'2000';
const resume=process.argv.includes('--resume');
const dir=process.argv.find(a=>a.startsWith('--output-dir='))?.slice(13)||'tests/qa/bosses/refinement_performance';fs.mkdirSync(dir,{recursive:true});
const mean=a=>a.reduce((s,n)=>s+n,0)/a.length;
if(process.argv.includes('--summarize')){
 const initial=JSON.parse(fs.readFileSync(`${dir}/summary.json`));
 const results=initial.results.map(row=>{
  let followup=null;
  if(!row.passed){
   const file=`tests/qa/bosses/refinement_performance_followup/summary_${row.boss}_${row.width}.json`;
   if(fs.existsSync(file)){
    const report=JSON.parse(fs.readFileSync(file));
    if(report.baseline!==initial.baseline||report.seconds!==12||report.warmupMs!==5000)throw Error('Incompatible follow-up: '+file);
    followup=report.results.find(r=>r.boss===row.boss&&r.width===row.width)||null;
   }
  }
  return {...(followup||row),seconds:followup?12:6,warmupMs:followup?5000:2000,initial:row};
 });
 const passed=results.length===12&&results.every(r=>r.passed);
 fs.writeFileSync('tests/qa/bosses/refinement_performance_validation.json',JSON.stringify({baseline:initial.baseline,passed,method:'Initial three-pair comparisons retained. Above-budget cases reassessed with three 12-second pairs and 5-second warmup; no disabled visual modes count toward acceptance.',results},null,2)+'\n');
 console.table(results.map(({initial,...row})=>row));process.exit(passed?0:1);
}
const results=[];
for(const boss of selected?[selected]:['korvath','mire_mother','azram','empty_archangel','malthoron','vethriss'])for(const width of widths?[+widths]:[1920,3840]){
 const runs={before:[],after:[]};
 for(let pair=0;pair<3;pair++)for(const version of pair%2?['after','before']:['before','after']){
  const output=`${dir}/${boss}_${width}_${pair}_${version}.json`;
  const args=['--preserve-symlinks','--preserve-symlinks-main','tests/input_latency.cjs',`--boss=${boss}`,`--width=${width}`,'--modes=normal',`--seconds=${seconds}`,`--warmup=${warmup}`,`--output=${output}`];
  if(version==='before')args.push(`--source-ref=${ref}`);
  const cached=resume&&fs.existsSync(output)?JSON.parse(fs.readFileSync(output)):null;
  if(!cached||cached.failed||cached.seconds!==+seconds||cached.warmupMs!==+warmup||cached.width!==width||cached.sourceRef!==(version==='before'?ref:null)||!cached.results[0]?.frames)
    execFileSync(process.execPath,args,{stdio:['ignore','pipe','inherit'],env:process.env});
  runs[version].push(JSON.parse(fs.readFileSync(output)).results[0]);
 }
 const baseline=mean(runs.before.map(r=>r.cpuMs.p95)),current=mean(runs.after.map(r=>r.cpuMs.p95));
 const result={boss,width,baselineP95:+baseline.toFixed(2),currentP95:+current.toFixed(2),changePercent:+((current/baseline-1)*100).toFixed(2),passed:current<=baseline*1.1};
 results.push(result);console.log(JSON.stringify(result));
 fs.writeFileSync(`${dir}/summary${selected?'_'+selected:''}${widths?'_'+widths:''}.json`,JSON.stringify({baseline:ref,seconds:+seconds,warmupMs:+warmup,method:'Three alternating pairs of production-loop samples, identical ordinary Gravebinder gear and capped adds; actual previous authored controller and HUD.',results},null,2)+'\n');
}
if(results.some(r=>!r.passed))process.exitCode=1;
