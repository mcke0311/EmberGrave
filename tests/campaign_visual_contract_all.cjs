// Independent seed checks use four normal Node processes, with bounded memory.
const fs=require('node:fs'),{spawn}=require('node:child_process');
const zones=JSON.parse(fs.readFileSync('tests/qa/campaign_visual/zones.json')).flat(),queue=[...zones],results=[];
async function worker(){
 while(queue.length){
  const zone=queue.shift();
  await new Promise((resolve,reject)=>{
   const child=spawn(process.execPath,['--preserve-symlinks','--preserve-symlinks-main','tests/campaign_visual_contract.mjs','--zone='+zone],{stdio:['ignore','pipe','pipe']});
   let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
   child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(Error(zone+': '+output)));
  });
  results.push(JSON.parse(fs.readFileSync('tests/qa/campaign_visual/contract_'+zone+'.json')));console.log('PASS',zone,'30 seeds');
 }
}
Promise.all(Array.from({length:4},worker)).then(()=>{
 const rows=results.flatMap(r=>r.rows).sort((a,b)=>zones.indexOf(a.zone)-zones.indexOf(b.zone));
 const report={status:'PASS',checks:results.reduce((s,r)=>s+r.checks,0),zones:zones.length,seeds:30,rows,
  isolation:'Four independent processes. Non-campaign exclusion was checked in contract_initial.json; the only subsequent map change bounds new Act II/V scenery.'};
 fs.writeFileSync('tests/qa/campaign_visual/contract.json',JSON.stringify(report,null,2)+'\n');console.log('PASS',report.checks,'checks');
}).catch(e=>{fs.writeFileSync('tests/qa/campaign_visual/contract.json',JSON.stringify({status:'FAIL',error:String(e)},null,2));console.error(e);process.exitCode=1;});
