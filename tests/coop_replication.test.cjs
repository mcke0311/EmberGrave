const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({});vm.runInContext(fs.readFileSync('js/coop_replication.js','utf8'),context);const replication=vm.runInContext('CoopReplication',context);
const state=()=>({kind:'snapshot',seq:1,epoch:1,worldId:'north_wild',generation:1,time:1,partyTime:1,
  groups:Object.fromEntries(['players','monsters','minions','projectiles','ground','traps','fx','npcs'].map(k=>[k,[]]))});
test('nested combat patches keep warnings and unchanged inventories without cloning the baseline',()=>{
  const a=state();a.groups.players.push({_coopId:'player',inv:{items:[{id:'item'}]},x:1});
  a.groups.monsters.push({_coopId:'boss',action:{state:'attack',t:.1,dur:1},encounter:{active:true,timer:1,attack:{shapes:[{kind:'cone',radius:4}],age:.1}}});
  const before=JSON.stringify(a),b=structuredClone(a);b.seq=2;b.time=1.1;b.groups.players[0].x=2;
  b.groups.monsters[0].action.t=.2;b.groups.monsters[0].encounter.attack.age=.2;b.groups.monsters[0].encounter.timer=.9;
  const patch=replication.diff(a,b),merged=replication.merge(a,patch);
  assert.equal(patch.groups.players.rows[0].inv,undefined);assert.ok(patch.groups.monsters.rows[0].encounter.$patch);
  assert.equal(merged.groups.players[0].inv,a.groups.players[0].inv);
  assert.deepEqual(JSON.parse(JSON.stringify(merged.groups)),b.groups);assert.equal(JSON.stringify(a),before);
  assert.equal(replication.merge(a,{...patch,generation:2}),null);
  assert.equal(replication.merge(a,{...patch,worldId:'mines'}),null);
});
test('nested action cancellation and actor removal survive incremental application',()=>{
  const a=state();a.groups.monsters.push({_coopId:'enemy',action:{state:'attack',t:.3}});a.groups.projectiles.push({_coopId:'arrow'});
  const b=structuredClone(a);b.seq=2;b.groups.monsters[0].action=null;b.groups.projectiles=[];
  const merged=replication.merge(a,replication.diff(a,b));assert.equal(merged.groups.monsters[0].action,null);assert.equal(merged.groups.projectiles.length,0);
});
