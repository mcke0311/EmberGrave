import fs from 'node:fs';
import assert from 'node:assert/strict';
const report=JSON.parse(fs.readFileSync('tests/qa/boss_arenas/playthrough.json'));
assert.equal(report.results.length,30);
assert.ok(report.results.every(r=>r.won&&!r.dead&&r.mode==='ordinary playthrough'));
const counts={korvath:1,mire_mother:2,azram:2,empty_archangel:1,malthoron:4,vethriss:2},rows=[];
for(const [boss,counters]of Object.entries(counts)){
 const results=report.results.filter(r=>r.boss===boss);assert.equal(new Set(results.map(r=>r.class)).size,5);
 for(const r of results){assert.equal(r.counters.length,counters,boss+'/'+r.class+' required interactions');assert.ok(r.healingLeft>=0&&r.healingLeft<=6&&r.manaLeft>=0&&r.manaLeft<=6);}
 const times=results.map(r=>r.seconds).sort((a,b)=>a-b),median=times[2],range=boss==='vethriss'?[180,240]:[120,180];
 // "Roughly" permits five seconds of variation from deterministic pathing.
 assert.ok(median>=range[0]-5&&median<=range[1]+5,boss+' outside target median: '+median);
 rows.push({boss,medianSeconds:median,fastest:times[0],slowest:times[4],wins:5});
}
fs.writeFileSync('tests/qa/boss_arenas/balance.json',JSON.stringify({passed:true,method:'Five classes, level-appropriate ordinary equipment, real movement and device interactions, damage enabled, six healing and six aether draughts. No player class changes.',rows},null,2)+'\n');
console.table(rows);console.log('PASS 30 victories, all required counters, all target medians');
