import assert from 'node:assert/strict';
import {ctx,D,Q,I,G,U,F,fresh,item,plain} from './unique_fixture.mjs';
import vm from 'node:vm';
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
const seed=n=>{ctx.seededRandom=U.rng(n);vm.runInContext('Math.random=seededRandom',ctx);};
const table={normal:[1,.22,.006,.0009],elite:[2,.9,.018,.009],boss:[4,1,.045,.04],chest:[2,.85,.018,.0105],barrel:[1,.07,.006,.0009]};
const report=[];
for(const [source,[n,ch,gear,socket]]of Object.entries(table)){
 const expected=1-(1-ch*gear)**n*(1-socket);let hits=0,total=0;const N=15000;seed(1741);
 for(let i=0;i<N;i++){const browns=I.rollDrops(80,source,0,0).filter(d=>d.item?.rarity==='unique');if(browns.length)hits++;total+=browns.length;}
 const observed=hits/N,tolerance=5*Math.sqrt(expected*(1-expected)/N)+.0003;
 ok(Math.abs(observed-expected)<tolerance,`${source}: ${observed} expected ${expected}`);report.push({source,expected,observed,events:N,items:total});
}
for(const source of ['normal','elite','boss']){
 let previous=0;
 for(const mf of [0,100,300,1000]){seed(4321);let count=0;const N=30000;for(let i=0;i<N;i++)if(I.rollRarity(source,mf)==='unique')count++;
  const probability=D.RARITY_WEIGHTS[source].find(([k])=>k==='unique')[1]/100*I.uniqueMultiplier(mf);
  ok(Math.abs(count/N-probability)<5*Math.sqrt(probability*(1-probability)/N)+.0003,`${source} MF ${mf}: expected distribution`);
  ok(count>=previous,`${source}: Magic Find monotonic at ${mf}`);previous=count;
 }
}
for(const mf of [-1,NaN,Infinity])ok(I.uniqueMultiplier(mf)===1,'invalid MF default');
ok(I.uniqueMultiplier(1e9)<2.5,'MF asymptote');
for(const level of [1,5,10,20,40,60,80,100])for(const slot of ['main','head','ring','boots'])for(let i=0;i<80;i++){
 const it=I.rollGear(level,'unique',{slot});ok(it.slot===slot,'requested unique slot');
 if(it.rarity==='unique'){
  const def=D.UNIQUES.find(d=>d.id===it.uniqueId),band=level-Math.max(8,level*.45),eligible=D.UNIQUES.filter(d=>D.BASES[d.base].slot===slot&&d.ilvl<=level+2);
  ok(def.ilvl<=level+2,'no overlevel unique equipment');ok(def.ilvl>=band||def.ilvl===Math.max(...eligible.map(d=>d.ilvl)),'level band or highest eligible fallback');
 }
}
for(const level of [1,5,10,20,40,60,80])for(const group of I.eligibleSocketables(level))for(const create of group){
 const it=create(),def=D.UNIQUE_CHARMS.find(d=>d.id===it.uniqueId)||D.UNIQUE_JEWELS.find(d=>d.id===it.uniqueId)||D.GLYPHS[it.glyph];
 ok((def.dropLevel||def.ilvl)<=level+2,`${it.name}: socketable eligibility`);
}
seed(187);let glyphCount=0;for(let i=0;i<20000;i++)if(I.rollGlyph(80,0).rarity==='unique')glyphCount++;
ok(Math.abs(glyphCount/20000-.05)<.009,'focused glyph rewards use five percent');
for(let i=0;i<500;i++)ok(I.rollGlyph(1,1000).rarity!=='unique','early glyphs eligible only');
for(const g of Object.values(D.GLYPHS))for(let i=0;i<40;i++){
 const result=I.reforgeGlyph(I.makeGlyph(g.id));ok(result.glyph!==g.id,'different reforged glyph');ok((result.rarity==='unique')===!!g.unique,'reforge preserves rarity');
}
// All explicit milestones survive, and completing a quest cannot grant twice.
const milestones=D.QUESTS.filter(q=>q.reward?.item?.rarity==='unique');ok(milestones.length===7,'seven quest guarantees preserved');
for(const q of milestones){const {p,state}=fresh();state.quests[q.id]={state:'reward'};G.completeQuest(q.id);ok(state.quests[q.id].state==='done','quest completed');
 const owned=()=>p.inv.items.filter(i=>i.rarity==='unique').length+state.ground.filter(g=>g.item?.rarity==='unique').length;
 ok(owned()===1,`${q.id}: guaranteed unique`);G.completeQuest(q.id);ok(owned()===1,`${q.id}: no repeated reward`);
}
const {state}=fresh();const ev=D.EVENTS.find(e=>e.id==='ev_glyph');
if(ev){const prop={x:12,y:12,type:'chest',interact:'event',ev};state.map.props.push(prop);G.__uniqueTest.triggerEvent(prop);ok(state.ground.length===2,'Runed Stone retains two rewards');}
ok(D.EVENTS.find(e=>e.id==='ev_curse2').rarity==='rare','repeatable Reliquary guarantee reduced');
ok(F.recipes.find(r=>r.id==='glyph').outcome.includes('same rarity'),'forge preview describes rule');
console.log(`PASS ${checks} drop checks. ${JSON.stringify(report)}`);
