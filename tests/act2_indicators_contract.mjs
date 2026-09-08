import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {enemyFixture} from './act2_enemy_fixture.mjs';

execFileSync('python',['-c',`import zipfile,json,hashlib,pathlib
with zipfile.ZipFile('tests/fixtures/act2_indicators_before.zip') as z:
 for name,digest in json.loads(z.read('hashes.json')).items():
  data=z.read(name);assert hashlib.sha256(data).hexdigest()==digest
  p=pathlib.Path('tmp/act2_indicators/before')/name
  if p.exists(): assert p.read_bytes()==data
  else: p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
`]);
const exports=['drawFx','setContext:c=>{ctx=c;}','getNovas:()=>novas','clearNovas:()=>{novas=[];}','clearPresentation:()=>{particles=[];novas=[];}'];
const f=enemyFixture({gameExports:exports}),before=enemyFixture({sourceDirectory:'tmp/act2_indicators/before/js',gameExports:exports});
const A=vm.runInContext('Act2EnemyAnimation',f.ctx);
let checks=0,samples=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const snapshot=s=>JSON.stringify({time:s.time,player:[s.player.x,s.player.y,s.player.hp,s.player.xp,s.player.gold,s.player.slowT,s.player.slowPct],
 monsters:s.monsters.map(m=>[m.defId,m.x,m.y,m.hp,m.dead,m.corpseT,m.jumpZ,m.act2Combat?.history,m.act2Combat?.cooldowns,m.act2Combat?.pending?.age,m.act2Combat?.burst?.age]),
 projectiles:s.projectiles.map(p=>[p.x,p.y,p.dead,p.ttl]),ground:s.ground.map(g=>[g.x,g.y,g.gold,g.item]),quests:s.quests,
 props:s.map.props,blocked:[...s.map.blocked]});
const ids=Object.keys(A.sequences).filter(id=>id!=='mire_mother');
for(const id of ids)for(const opts of [{},{elite:true},{minion:true},{act2Profile:false}]){
 const x=f.scene(id,'weeping_marsh',opts),y=before.scene(id,'weeping_marsh',opts);
 // Include a breakable at the release point so nova side effects affect RNG,
 // terrain occupancy and drops, all compared against the working-tree baseline.
 for(const z of [x,y])z.s.map.props=[{x:z.m.x,y:z.m.y,type:'barrel',breakable:true}];
 for(let i=0;i<150;i++){
  if(i===60){x.m.die(x.p);y.m.die(y.p);}
  f.tick(x.s,1/30,1/30);before.tick(y.s,1/30,1/30);
  assert.equal(snapshot(x.s),snapshot(y.s),`${id}/${JSON.stringify(opts)} frame ${i}`);samples++;
 }
}
for(const [id,skill] of [['choirmaster','requiem'],['choirmaster','sacrifice'],['choir_herald','cleanup'],['brood_mother','summon'],['bog_bloat','death'],['sludge_horror','death']]){
 const x=f.scene(id),y=before.scene(id);
 for(const z of [x,y]){
  for(const k in z.c.cooldowns)z.c.cooldowns[k]=999;
  z.s.map.props=[{x:z.m.x,y:z.m.y,type:'barrel',breakable:true}];
  if(skill==='cleanup'||skill==='sacrifice')for(let i=0;i<3;i++)z.c.spawn('drowned_dead',z.m.x+i*.8,z.m.y+2);
  if(skill==='death'||skill==='cleanup')z.m.die(z.p);else z.c[skill](z.p);
 }
 for(let i=0;i<120;i++){f.tick(x.s,1/30,1/30);before.tick(y.s,1/30,1/30);assert.equal(snapshot(x.s),snapshot(y.s),`${id}/${skill} ${i}`);samples++;}
}
const x=f.fresh('mire_mother'),y=before.fresh('mire_mother');
for(let i=0;i<900;i++){f.tick(x.s,1/30,1/30);before.tick(y.s,1/30,1/30);assert.equal(snapshot(x.s),snapshot(y.s),'Mire Mother '+i);samples++;}
x.m.die(x.p);y.m.die(y.p);assert.equal(snapshot(x.s),snapshot(y.s),'Mire death and quest rewards');checks++;

let calls=[];
const canvas=new Proxy({canvas:{width:3840,height:2160}},{get:(t,k)=>t[k]??((...args)=>calls.push([k,...args]))});
f.ctx.LevelTerrain={clipBehind(){}};f.Game.__bossTest.setContext(canvas);
const cam={x:0,y:0},paint=fn=>{calls=[];fn();return calls.filter(c=>['ellipse','stroke','fill'].includes(c[0])).length;};
for(const id of [...ids,'mire_mother','quieting_ritual','drowned_ritual'])for(const opts of [{},{elite:true},{minion:true},{act2Profile:false}]){
 const {m,s,c}=f.scene(id,'weeping_marsh',opts),show=!!m.isBoss||m.beacon;
 ok(A.showsAttackRadius(m)===show,`${id}: classification`);
 A.enabled=false;ok(A.showsAttackRadius(m)===show,'Policy must survive animation toggle');A.enabled=true;
 const at={x:m.x,y:m.y,radius:2},view={x:f.U.isoX(m.x,m.y)-200,y:f.U.isoY(m.x,m.y)-200};
 if(c)for(const shape of [{kind:'circle',...at},{kind:'line',...at,angle:0,width:1,length:3}]){
  c.start('slam',[shape],.6,.6,()=>{},'phys');
  ok((paint(()=>f.C.draw(canvas,view))>0)===show,`${id}: authored warning`);c.cancel();
 }
 for(const type of ['enemywarning','slamwarning','meteorfall']){
  const warning={type,owner:m,shape:{kind:'circle',...at},...at,ttl:.5,maxTtl:1,col:'#ff6a30'};m.slamWarning=warning;
  ok((paint(()=>f.Game.__bossTest.drawFx(warning,view))>0)===show,`${id}: ${type}`);
 }
 for(const kind of ['slam','dive','blink','summon','rupture','impact','sacrifice'])for(const reduced of [false,true]){
  f.motionMedia.matches=reduced;A.cancel(m);A.emit(m,kind,[at]);
  paint(()=>A.drawGround(canvas,s,view));
  ok(calls.some(c=>c[0]==='ellipse')===show,`${id}/${kind}: impact rings (reduced ${reduced})`);
  if(!reduced)ok(calls.some(c=>c[0]==='lineTo'),`${id}/${kind}: keep sparks`);
 }
 f.motionMedia.matches=false;
 for(const kind of ['melee','lunge','bolt','volley']){
  A.cancel(m);A.emit(m,kind,[at]);ok(paint(()=>A.drawGround(canvas,s,view))>0,`${id}/${kind}: retain strike VFX`);
 }
 f.Game.__bossTest.clearNovas();m.attackNova(m.x,m.y,2,'#abc');
 ok(f.Game.__bossTest.getNovas().at(-1).hideRadius===!show,`${id}: generic nova`);
 s.map.act2=false;ok(A.showsAttackRadius(m),'Other acts retain indicators');
}
// Exercise the real helper with and without styling, including its public
// four-argument default, prop destruction, particles and gameplay RNG stream.
for(const styled of [false,true])for(const hidden of [false,true]){
 // Fresh worlds avoid carrying terrain edits, item IDs or particle budgets
 // from the intentionally asymmetric drawing-only checks above.
 const current=enemyFixture({gameExports:exports}),old=enemyFixture({sourceDirectory:'tmp/act2_indicators/before/js',gameExports:exports});
 vm.runInContext(fs.readFileSync('js/skill_vfx.js','utf8'),current.ctx);
 const V=vm.runInContext('SkillVFX',current.ctx);
 const z=current.scene('gnarl_treant'),b=old.scene('gnarl_treant');
 for(const scene of [z,b])scene.s.map.props=[{x:scene.m.x,y:scene.m.y,type:'barrel',breakable:true}];
 V.setEnabled(styled);V.update(0,z.s);
 const invoke=()=>current.Game.addNova(z.m.x,z.m.y,2,'#abc',hidden?{hideRadius:true}:undefined);
 if(styled)V.scope(z.p,'vanguard_0_0',invoke);else invoke();
 old.Game.addNova(b.m.x,b.m.y,2,'#abc');
 assert.equal(snapshot(z.s),snapshot(b.s),'Nova prop destruction and rewards');checks++;
 ok(z.s.map.props.length===0,'Hidden nova still breaks props');
 ok(current.ctx.Math.random()===old.ctx.Math.random(),'No gameplay RNG change');
 const nv=current.Game.__bossTest.getNovas().at(-1);ok(nv.hideRadius===hidden,'Nova option default');
 if(styled){ok(V.diagnostics().particles>0,'Keep styled particles');ok(V.diagnostics().events===(hidden?0:1),'Only suppress styled area wave');}
}
const report={status:'PASS',checks,samples,baseline:'tests/fixtures/act2_indicators_before.zip',coverage:'Normal, elite, summoned and legacy-AI variants; all warning renderers; impact rings; reduced motion; other acts; boss/ritual indicators; seeded combat, cleanup, splitting, rewards, quest progression and prop destruction'};
fs.mkdirSync('tests/qa/act2_indicators',{recursive:true});fs.writeFileSync('tests/qa/act2_indicators/contract.json',JSON.stringify(report,null,2)+'\n');console.log(report);
