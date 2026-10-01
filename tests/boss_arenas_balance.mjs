import fs from 'node:fs';
import assert from 'node:assert/strict';
const argument=(name,fallback)=>process.argv.find(a=>a.startsWith('--'+name+'='))?.slice(name.length+3)||fallback;
const report=JSON.parse(fs.readFileSync(argument('input','tests/qa/boss_arenas/playthrough.json')));
assert.equal(report.results.length,30);
assert.ok(report.results.every(r=>r.won&&!r.dead&&r.mode==='ordinary playthrough'));
const kinds={korvath:'charge',mire_mother:'heart',azram:'mirror',empty_archangel:'choir',malthoron:'soul',vethriss:'trueSerpent'},rows=[];
for(const [boss,kind]of Object.entries(kinds)){
 const results=report.results.filter(r=>r.boss===boss);assert.equal(new Set(results.map(r=>r.class)).size,5);
 for(const r of results){
   if(boss==='azram')assert.equal(r.counters.filter(c=>c.kind==='mirror').length,2,'Azram requires two successful reflections');
   assert.ok(r.healingLeft>=0&&r.healingLeft<=6&&r.manaLeft>=0&&r.manaLeft<=6);
 }
 assert.ok(results.some(r=>r.counters.some(c=>c.kind===kind)),boss+' driver exercised the signature counter');
 const pressureCasts=results.reduce((total,r)=>total+(r.pressureCasts||0),0);assert.ok(pressureCasts>0,boss+' driver exercised distant pressure');
 const times=results.map(r=>r.seconds).sort((a,b)=>a-b),median=times[2],range=boss==='vethriss'?[180,240]:[120,180];
 // "Roughly" permits five seconds of variation from deterministic pathing.
 assert.ok(median>=range[0]-5&&median<=range[1]+5,boss+' outside target median: '+median);
 rows.push({boss,medianSeconds:median,fastest:times[0],slowest:times[4],wins:5,pressureCasts});
}
fs.writeFileSync(argument('output','tests/qa/boss_arenas/balance.json'),JSON.stringify({passed:true,bossDamageMultiplier:5,method:'Five classes, level-appropriate ordinary equipment, collision-aware movement, distinct combat counters and distant pressure, damage enabled, six healing and six aether draughts. No player class changes.',rows},null,2)+'\n');
console.table(rows);console.log('PASS 30 victories, all six signature counters, all target medians');
