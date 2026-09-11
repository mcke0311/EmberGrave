const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const math=Object.create(Math),ctx=vm.createContext({console,Math:math});
for(const f of ['utils','data','unique_powers','data_overrides','items','loot_data']){
  let code=fs.readFileSync('js/'+f+'.js','utf8');
  if(f==='items')code=code.replace('RARITY_COLOR, RARITY_ORDER, DROP_CONFIG,','RARITY_COLOR, RARITY_ORDER, DROP_CONFIG, __rollAffix:rollAffix,');
  vm.runInContext(code,ctx,{filename:f});
}
const {D,I,L,U}=vm.runInContext('({D:DATA,I:Items,L:LootData,U})',ctx);
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
ok(new Set(L.rows.map(r=>r.id)).size===L.rows.length,'unique catalogue IDs');
ok(L.rows.filter(r=>r.powers.length).length===Object.keys(vm.runInContext('UniquePowers.catalog',ctx)).length,'every authored brown power is visible');
for(const row of L.rows)for(const p of row.powers)ok(!p.includes('undefined')&&(row.kind==='unique'?p.includes('only.')&&p.includes('Duplicates do not stack.'):p.includes('cooldown')),'complete power descriptions');
const scenarios=[...Object.keys(I.DROP_CONFIG).map(s=>[20,s,0]),[1,'boss',0],[5,'boss',100],[60,'boss',300],[80,'chest',1000],[1,'normal',0]];
const report=[];
function identity(it){return it.uniqueId||it.setItemId||(it.kind==='jewel'?'jewel':it.baseId);}
for(const [level,source,mf] of scenarios){
  math.random=U.rng(8713+level);const N=10000,seen=new Map(),expected=L.distribution(level,source,mf);
  for(let n=0;n<N;n++){
    const ids=new Set(I.rollDrops(level,source,mf,0).filter(d=>d.item).map(d=>identity(d.item)));
    for(const id of ids)seen.set(id,(seen.get(id)||0)+1);
  }
  for(const id of seen.keys())ok(expected.has(id)&&expected.get(id)>0,`${id} was predicted eligible at ${level}/${source}`);
  for(const [id,p] of expected){
    ok(Number.isFinite(p)&&p>=0&&p<=1,`${id} valid probability`);
    const observed=(seen.get(id)||0)/N,tolerance=6*Math.sqrt(p*(1-p)/N)+.0006;
    ok(Math.abs(observed-p)<tolerance,`${level}/${source}/${mf} ${id}: observed ${observed}, expected ${p}`);
  }
  report.push({level,source,mf,events:N});
}
for(const base of ['shortsword','charm','jewel','cap'])for(const level of [1,20,60,100]){
  const tiers=L.affixes(level,base),sum=tiers.reduce((s,r)=>s+r.p,0);
  ok(Math.abs(sum-1)<1e-10,`${base}/${level}: first draw chances sum to 1`);
  ok(tiers.filter(r=>r.t.ilvl>level).every(r=>r.p===0),'locked tiers cannot roll');
}
math.random=U.rng(4821);
const counts=new Map(),N=30000,tiers=L.affixes(20,'shortsword');
for(let i=0;i<N;i++){const a=I.__rollAffix('main','sword',20,new Set());const key=a.group+'/'+a.tierName;counts.set(key,(counts.get(key)||0)+1);}
const expectedAffixes=new Map();
for(const r of tiers){const key=(r.a.group||r.a.stat)+'/'+r.t.name;expectedAffixes.set(key,(expectedAffixes.get(key)||0)+r.p);}
for(const [key,p] of expectedAffixes)ok(Math.abs((counts.get(key)||0)/N-p)<6*Math.sqrt(p*(1-p)/N)+.0006,key+' first roll distribution');
const grave=L.byId.get('u_gravebite');
for(const row of L.rows)for(const [i,c] of L.difficultyChances(row,5,'boss',100).entries()){
  ok(c.level===[5,12,18][i],'difficulty applies level increment once');
  ok(c.p===L.chance(row,c.level,'boss',100),'difficulty probability matches source level');
}
const comparison=L.compareLocations(grave,100);
ok(comparison.some(l=>l.chances.some(c=>c.p===0)&&l.chances.some(c=>c.p>0)),'comparison retains exclusions across difficulties');
for(const l of comparison){
  ok(l.chances.length===3,'all difficulties for same source');
  for(const [i,c] of l.chances.entries()){
    ok(c.level===l.chances[0].level+D.DIFFICULTIES[i].lvlAdd,'location level shifted once');
    ok(c.p===L.chance(grave,c.level,l.source,100),'location odds match live analytical distribution');
  }
}
ok(L.chance(grave,80,'boss',0)===0,'early unique leaves the high-level band');
ok(L.locations(grave,0,0).length>0,'early unique has real locations');
for(const row of L.rows.filter(r=>r.powers.length))for(const location of L.locations(row,2,100))ok(location.p>0&&Number.isFinite(location.level),'locations are eligible');
console.log(JSON.stringify({status:'PASS',checks,items:L.rows.length,affixFamilies:D.AFFIXES.length,tiers:tiers.length,scenarios}));
