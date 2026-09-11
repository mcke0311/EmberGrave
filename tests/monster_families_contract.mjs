import assert from 'node:assert/strict';
import vm from 'node:vm';
import {fixture} from './boss_fixture.mjs';

const f=fixture({dataSeed:7331,gameExports:['enemiesByFamily','typeInfoFor']});
const {DATA:D,MapGen:M,Game:G,Monster,Player,U,TerrainNavigation:N}=f;
const {TerrainSurface:S,PropInteractions:Props}=vm.runInContext('({TerrainSurface,PropInteractions})',f.ctx);
let checks=0;const ok=(value,label)=>{checks++;assert.ok(value,label);};
const zones=Object.values(D.ZONES).filter(z=>z.spawns?.length);
for(const zone of zones)for(const seed of [1,123,7331]){
  const m=M.generate(zone.id,seed),tag=zone.id+'/'+seed;
  ok(m.ecology?.packs.length,tag+' inhabited');
  ok(zone.spawns.every(id=>D.monsterFamily(id)||D.ENEMIES[id].boss),tag+' curated roster');
  const regular=m.monsterSpawns.filter(s=>!s.boss&&!D.ENEMIES[s.id].boss);
  ok(regular.every(s=>s.packId&&s.familyHome),tag+' pack homes');
  for(const pack of m.ecology.packs){
    ok(pack.spawns.every(s=>D.monsterFamily(s.id)===pack.family),tag+' coherent family');
    ok(pack.spawns.length<=6,tag+' bounded pack');
  }
  if(m.frontier||m.act2||m.composition)for(const sp of regular){
    const radius=.34*(D.ENEMIES[sp.id].big||1)*(sp.elite?1.18:1);
    ok(N.clear(m,sp.x,sp.y,radius)&&S.supported(m,sp.x,sp.y,radius),tag+' supported '+sp.id);
  }
  if(m.act2){
    for(const [id,count] of Object.entries(m.act2.quotas))ok(regular.filter(s=>s.id===id).length===count,tag+' quota '+id);
    for(const pack of m.ecology.packs){
      ok(pack.spawns.filter(s=>D.ACT2_COMBAT.role(s.id)==='ranged').length<=2,tag+' ranged cap');
      ok(pack.spawns.filter(s=>D.ACT2_COMBAT.role(s.id)==='specialist').length<=1,tag+' specialist cap');
    }
  }
  for(const site of m.props.filter(p=>p.familySite)){
    ok(!site.blocks&&!site.interact,tag+' decorative site');
    ok(Props.themed(site)&&Props.EXTRA[site.propFamily],tag+' authored habitat art');
    ok(!Props.nearRamp(m,site.x,site.y),tag+' clear ramps');
  }
  if(seed===123){
    const again=M.generate(zone.id,seed);
    assert.equal(JSON.stringify(m.monsterSpawns),JSON.stringify(again.monsterSpawns),tag+' deterministic population');checks++;
  }
}
for(const zone of ['frosthaven_approach','frosthaven','marshcamp','khalcamp','hellgate','town'])ok(!M.generate(zone,123).ecology,zone+' no ambient packs');

function scene(){
  const p=new Player('Family QA','vanguard'),s=G.__bossTest.freshState(p,123);
  s.map=M.generate('shattered_temple',123);G.__bossTest.setState(s);
  const a=s.map.bossArena;p.x=a.cx+30;p.y=a.cy;p.hp=p.stats.maxHp=1e6;
  return{s,p,a};
}
{
  const {s,p,a}=scene(),opts={packId:'watch',monsterFamily:'rimebound'};
  const first=new Monster('frost_risen',a.cx,a.cy,opts),kin=new Monster('frost_archer',a.cx+2,a.cy,opts);
  const neighbor=new Monster('ice_lurker',a.cx+1,a.cy+2,{packId:'den'}),secondPack=new Monster('frost_risen',a.cx+3,a.cy,{packId:'other'});
  const distant=new Monster('frost_archer',a.cx+10,a.cy,opts);
  s.monsters=[first,kin,neighbor,secondPack,distant];first.takeDamage(1,p);
  ok(first.aggro&&kin.aggro,'damage wakes own pack');ok(!neighbor.aggro&&!secondPack.aggro&&!distant.aggro,'no cross-pack or distant chain alert');
  kin.aggro=false;const los=first.combatLos;first.combatLos=()=>false;first.wakePack();ok(!kin.aggro,'walls block alert');first.combatLos=los;
  const child=first.ownSummon(new Monster('frost_risen',a.cx,a.cy));ok(first.allied(child)&&child.packId===first.packId,'summons remain allied');
  ok(G.__bossTest.typeInfoFor(first).label.includes('Rimebound Watch'),'visible family name');
}
{
  const {s,a}=scene();s.map.zone={...s.map.zone,infight:true};
  const legion=new Monster('ash_fiend',a.cx,a.cy),impaler=new Monster('impaler',a.cx+2,a.cy),brood=new Monster('cinder_hound',a.cx+1,a.cy);
  s.monsters=[legion,impaler,brood];ok(legion.allied(impaler)&&!legion.allied(brood),'rival infernal factions retained');
  ok(legion.pickTarget(s.player)===brood,'rival brood targeted');
}
for(const [family,id] of [['rimebound','frost_risen'],['shardbound','shard_thrall'],['icefang','ice_lurker'],['icebrood','shatter_wasp'],['white_reach','frost_wyrm']]){
  const {s,a}=scene(),m=new Monster(id,a.cx,a.cy,{packId:family,monsterFamily:family,familyHome:{x:a.cx,y:a.cy,anchorX:a.cx,anchorY:a.cy}});
  s.monsters=[m];let moved=false;
  for(let i=0;i<900;i++){s.time+=.1;m.familyIdle(.1,s.map);moved ||= U.dist(m.x,m.y,a.cx,a.cy)>.05;ok(U.dist(m.x,m.y,a.cx,a.cy)<4,family+' stays at home');ok(m.supportedPoint(m.x,m.y),family+' safe idle movement');}
  ok(moved,family+' living routine');
  m.x=a.cx+7;m.y=a.cy;m.wanderT=0;m.path=null;
  for(let i=0;i<400;i++){s.time+=.1;m.familyIdle(.1,s.map);}
  ok(U.dist(m.x,m.y,a.cx,a.cy)<4,family+' returns home after displacement');
}
{
  const {s,p}=scene();const map=M.generate('north_wild',123);s.map=map;
  const site=map.props.find(p=>p.familySite),territory=map.ecology.territories.find(t=>t.id===site.territoryId);
  s.monsters=map.monsterSpawns.filter(sp=>territory.packs.includes(sp.packId)).map(sp=>new Monster(sp.id,sp.x,sp.y,sp));
  s.monsters[0].die(p);ok(!site.spent,'occupied site stays inhabited');
  for(const m of s.monsters)m.die(p);ok(site.spent&&site.label.endsWith('deserted'),'cleared territory changes art state');
  const ids=G.__bossTest.enemiesByFamily('demon',25,territory);ok(ids.every(id=>D.monsterFamily(id)===territory.family&&map.zone.spawns.includes(id)),'events belong to local family');
}
console.log('PASS',checks,'monster family, habitat, pack alert, movement, and clearing checks');
