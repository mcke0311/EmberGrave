import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=name=>JSON.parse(fs.readFileSync(`tests/qa/bosses/${name}.json`));
const before=read('playthrough_baseline_refinement'),after=read('playthrough'),historical=read('playthrough_before_refinement');
const median=a=>a.slice().sort((a,b)=>a-b)[Math.floor(a.length/2)];
assert.equal(after.results.length,30);assert.equal(before.results.length,30);
assert.ok(after.results.every(r=>r.won&&!r.dead));assert.ok(before.results.every(r=>r.won&&!r.dead));
const results=[];
for(const boss of new Set(after.results.map(r=>r.boss))){
 const previous=before.results.filter(r=>r.boss===boss),current=after.results.filter(r=>r.boss===boss);
 assert.equal(current.length,5);
 for(const run of current){
  const old=previous.find(r=>r.class===run.class);assert.deepEqual(run.loadout,old.loadout,'comparison equipment/skills changed');
  assert.ok(run.healingLeft>=0&&run.manaLeft>=0,'invalid consumable budget');
 }
 const baseline=median(previous.map(r=>r.seconds)),now=median(current.map(r=>r.seconds));
 const recorded=median(historical.results.filter(r=>r.boss===boss).map(r=>r.seconds));
 const row={boss,historicalMedian:recorded,matchedDriverBaseline:baseline,currentMedian:now,changePercent:+((now/baseline-1)*100).toFixed(2)};
 results.push(row);assert.ok(Math.abs(now/baseline-1)<=.2,`${boss} median changed more than 20% with matched driving`);
}
fs.writeFileSync('tests/qa/bosses/refinement_balance.json',JSON.stringify({baseline:before.baseline,method:'Identical improved movement driver, common equipment and six healing/six aether budget on both controllers. Historical medians retained to expose the driver change.',results},null,2)+'\n');
console.table(results);console.log('PASS 30/30 victories; all matched-driver boss medians within 20%.');
