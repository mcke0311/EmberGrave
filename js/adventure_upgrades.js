/* Durable optional encounters. All mutation runs in the solo simulation or host. */
'use strict';
const CursedEvents=(()=>{
  const eligible=p=>p?.ev&&['curse','ambush'].includes(p.ev.kind);
  const key=(s,p)=>s.map.id+':'+(p.propId||MapGen.propIdentity(s.map,p));
  const records=s=>s.flags.cursedEvents||(s.flags.cursedEvents={});
  function syncProp(p,r){
    p.event=false;p.spent=true;p.lootable=false;p.breakable=false;
    p.interact=r.status==='claimed'?null:'sealed_cache';p.cursedKey=r.key;
    p.label=r.status==='active'?'Sealed cache · defeat its defenders':r.status==='ready'?'Unsealed cache · claim rewards':'Empty cache';
    p.type='chest';p.propFamily='chest';delete p.visual;p.spent=p.opened=r.status==='claimed';
  }
  function start(s,p,actor){
    if(!eligible(p)||!s.map.props.includes(p)||records(s)[key(s,p)])return false;
    if(!TerrainLayers.same(actor,p)||U.dist(actor.x,actor.y,p.x,p.y)>2.5)return false;
    const ev=p.ev,ids=(s.map.zone.spawns||[]).filter(id=>DATA.ENEMIES[id]&&!DATA.ENEMIES[id].boss);
    if(!ids.length)return false;
    const r={v:1,key:key(s,p),zone:s.map.id,status:'active',prop:{...p},guards:[],reward:null};
    for(let i=0;i<(ev.count||4);i++){
      const mon=Game.spawnPropMonster(p,ids[i%ids.length]);if(!mon)continue;
      mon.cursedKey=r.key;mon.cursedIndex=r.guards.length;mon._coopId='curse_'+U.hash(r.key)+'_'+mon.cursedIndex;
      if(ev.kind==='curse'&&r.guards.length===0){mon.maxHp*=2;mon.hp=mon.maxHp;mon.def.dmgMult=(mon.def.dmgMult||1)*1.25;mon.name='Accursed '+mon.name;}
      r.guards.push({id:mon.defId,x:mon.x,y:mon.y,surfaceId:mon.surfaceId,hp:mon.hp,maxHp:mon.maxHp,def:JSON.parse(JSON.stringify(mon.def)),name:mon.name,dead:false});
    }
    if(!r.guards.length){Game.msg('There is no room for the defenders. Try from another side.','#d8b880');return false;}
    records(s)[r.key]=r;syncProp(p,r);Sfx.play('vox_boss');Game.saveGame();return true;
  }
  function capture(s){
    for(const m of s.monsters||[]){const r=s.flags.cursedEvents?.[m.cursedKey],g=r?.guards[m.cursedIndex];if(g){g.hp=m.hp;g.x=m.x;g.y=m.y;g.dead=!!m.dead;}}
  }
  function killed(s,m,actor){
    const r=s.flags.cursedEvents?.[m.cursedKey];if(!r||r.status!=='active')return;
    r.guards[m.cursedIndex].dead=true;
    if(r.guards.every(g=>g.dead)){
      const lvl=DATA.effectiveLevel(s.map.zone.lvl,s.difficulty),drops=Items.rollDrops(lvl+3,'boss',actor.stats.mf+30,actor.stats.goldFind);
      if(!drops.some(d=>d.item?.rarity==='rare'||d.item?.rarity==='unique'))drops.push({item:Items.rollGear(lvl+2,'rare')});
      r.reward={gold:drops.reduce((n,d)=>n+(d.gold||0),0),items:drops.filter(d=>d.item).map(d=>Game.serializeItem(d.item))};r.status='ready';
      const prop=s.map.props.find(p=>p.cursedKey===r.key);if(prop)syncProp(prop,r);
      Game.centerMsg('THE CACHE IS UNSEALED','Return to claim your offering');
    }
    Game.saveGame();
  }
  function claim(s,prop,p){
    const r=s.flags.cursedEvents?.[prop.cursedKey];if(!r||r.status!=='ready')return false;
    if(!TerrainLayers.same(p,prop)||U.dist(p.x,p.y,prop.x,prop.y)>2.5)return false;
    const items=r.reward.items.map(Game.reviveItem),grid={...p.inv,items:p.inv.items.map(i=>({...i}))};
    for(const it of items)if(!Items.autoPlace(grid,it)){Game.msg('Make room in your pack; the cache will keep your rewards.','#d8b880');return false;}
    p.inv.items=grid.items;p.gold+=r.reward.gold;r.status='claimed';r.reward=null;syncProp(prop,r);
    Sfx.play('chest');Game.msg('Cache rewards placed in your pack.','#d8b880');Game.saveGame();UI.refreshGrids();return true;
  }
  function restore(s){
    for(const r of Object.values(s.flags.cursedEvents||{})){
      if(r.zone!==s.map.id)continue;
      let p=s.map.props.find(p=>p.cursedKey===r.key||key(s,p)===r.key);
      if(!p){p={...r.prop};s.map.props.push(p);}syncProp(p,r);
      if(r.status!=='active')continue;
      r.guards.forEach((g,i)=>{
        if(g.dead||s.monsters.some(m=>m.cursedKey===r.key&&m.cursedIndex===i))return;
        const mon=new Monster(g.id,g.x,g.y,{surfaceId:g.surfaceId,packId:r.key});
        mon.def=JSON.parse(JSON.stringify(g.def));mon.hp=g.hp;mon.maxHp=g.maxHp;mon.name=g.name;mon.aggro=true;
        mon.cursedKey=r.key;mon.cursedIndex=i;mon.sourcePropId=p.propId;mon._coopId='curse_'+U.hash(r.key)+'_'+i;s.monsters.push(mon);
      });
    }
  }
  return {eligible,key,start,capture,killed,claim,restore};
})();

const TacticalElites=(()=>{
  function setup(s){
    if(s.map.zone.opening||s.map.zone.arena)return;
    const packFor=m=>m.packId||m.defId+':'+Math.floor(m.x)+':'+Math.floor(m.y);
    const packs=new Set(s.monsters.filter(m=>m.tactical).map(packFor));
    for(const m of s.monsters){
      if(m.dead||!m.elite||m.isBoss||m.bossOwner||m.cursedKey)continue;
      const pack=packFor(m);
      if(packs.has(pack)||m.tactical||m.tacticalChecked)continue;packs.add(pack);m.tacticalChecked=true;
      const roll=U.hash(s.seed+':'+s.map.id+':'+pack)%4;if(roll>1)continue;
      if(!m.packId){m.packId=pack;for(const n of s.monsters)if(!n.packId&&!n.dead&&!n.isBoss&&n.monsterFamily===m.monsterFamily&&TerrainLayers.same(m,n)&&U.dist(m.x,m.y,n.x,n.y)<=6)n.packId=pack;}
      if(roll===0){
        const id='ward_'+U.hash(s.map.id+':'+pack),old=s.map.props.find(p=>p.propId===id);
        m.tactical='wardbearer';m.tacticalBanner=id;m.name='Wardbearer '+m.name;
        if(!old)s.map.props.push({type:'banner',visual:'banner',x:m.x,y:m.y,surfaceId:m.surfaceId||0,blocks:false,breakable:true,broken:!!s.flags.brokenWards?.[id],propId:id,tacticalBanner:true,label:'Ward banner · break to remove protection',scale:1,seed:U.hash(id)});
      }else{
        const mate=s.monsters.filter(n=>n!==m&&!n.dead&&!n.isBoss&&!n.tactical&&n.packId===m.packId&&n.monsterFamily===m.monsterFamily&&TerrainLayers.same(m,n)&&U.dist(m.x,m.y,n.x,n.y)<=6).sort((a,b)=>U.dist(m.x,m.y,a.x,a.y)-U.dist(m.x,m.y,b.x,b.y))[0];
        if(!mate)continue;
        const pair='soul_'+U.hash(s.map.id+':'+pack);m.tactical=mate.tactical='soulbound';mate.tacticalChecked=true;m.soulPair=mate.soulPair=pair;m.name='Soulbound '+m.name;mate.name='Soulbound '+mate.name;
      }
    }
  }
  function multiplier(s,m){
    if(m.isBoss)return 1;
    if(m.soulPair&&s.monsters.some(n=>n!==m&&!n.dead&&n.soulPair===m.soulPair&&TerrainLayers.same(n,m)&&U.dist(n.x,n.y,m.x,m.y)<=4))return .65;
    const owner=s.monsters.find(n=>!n.dead&&n.tacticalBanner&&n.packId===m.packId&&n.monsterFamily===m.monsterFamily);
    if(!owner)return 1;
    const banner=s.map.props.find(p=>p.propId===owner.tacticalBanner&&!p.broken&&TerrainLayers.same(p,m)&&U.dist(p.x,p.y,m.x,m.y)<=5);
    return banner ? .65 : 1;
  }
  function broken(s,p){if(!p.tacticalBanner)return false;(s.flags.brokenWards||={})[p.propId]=true;Game.msg('The ward breaks. Its allies are vulnerable.','#d8c99e');Game.saveGame();return true;}
  function draw(ctx,s,cam){
    const seen=new Set();ctx.save();ctx.lineWidth=2;
    const project=o=>[U.isoX(o.x,o.y)-cam.x,U.isoY(o.x,o.y)-cam.y-TerrainSurface.heightAt(s.map,o.x,o.y,o.surfaceId)*TerrainSurface.LIFT];
    const visible=o=>{const [x,y]=project(o);return x>-250&&y>-150&&x<ctx.canvas.width+250&&y<ctx.canvas.height+150;};
    for(const m of s.monsters){
      if(!m.soulPair||m.dead||seen.has(m.soulPair))continue;seen.add(m.soulPair);
      const n=s.monsters.find(n=>n!==m&&!n.dead&&n.soulPair===m.soulPair);if(!n||!TerrainLayers.same(m,n))continue;
      if(!visible(m)&&!visible(n))continue;
      const linked=U.dist(m.x,m.y,n.x,n.y)<=4;ctx.strokeStyle=linked?'#d9b8ed':'#6a536c';ctx.globalAlpha=linked?.85:.35;ctx.setLineDash(linked?[]:[3,6]);
      const [mx,my]=project(m),[nx,ny]=project(n);ctx.beginPath();ctx.moveTo(mx,my-22);ctx.lineTo(nx,ny-22);ctx.stroke();
    }
    ctx.setLineDash([]);
    for(const p of s.map.props)if(p.tacticalBanner&&!p.broken&&visible(p)&&s.monsters.some(m=>!m.dead&&m.tacticalBanner===p.propId)){ctx.globalAlpha=.5;ctx.strokeStyle='#d1b871';ctx.beginPath();ctx.ellipse(...project(p),5*32*Math.SQRT2,5*16*Math.SQRT2,0,0,Math.PI*2);ctx.stroke();}
    ctx.restore();
  }
  return {setup,multiplier,broken,draw};
})();

const Echoes=(()=>{
  const stages=[['echo_north','korvath','The Frozen Oath'],['echo_marsh','mire_mother','The Drowned Heart'],['echo_cathedral','malthoron','The Hollow Crown']];
  for(const [id,boss,name] of stages){const base=DATA.ZONES['arena_'+boss];DATA.ZONES[id]={...base,id,name:'Echo: '+name,echo:true,artZone:base.artZone||'arena_'+boss};}
  const curses=[
    {id:'iron',name:'Iron Memory',text:'Enemies gain 30% life.',hp:1.3},
    {id:'wrath',name:'Unquiet Wrath',text:'Enemies deal 20% more damage.',damage:1.2},
    {id:'haste',name:'Restless Steps',text:'Enemies move 25% faster. Attack warnings keep their normal timing.',speed:1.25},
    {id:'hunger',name:'Hollow Well',text:'Your passive life and aether regeneration are halved.',regen:.5}
  ];
  const slots={main:'Weapons',chest:'Body armor',head:'Helmets',off:'Off-hands',gloves:'Gloves',boots:'Boots',belt:'Belts',ring:'Rings',amulet:'Amulets'};
  const run=s=>s.flags.echoRun;
  const unlocked=s=>!!(s.unlockedDiff>0||s.flags.sagaComplete||s.flags.echoesUnlocked||s.characterFlags?.echoesUnlocked);
  function accountUnlocked(){
    try{return Game.listSaves().some(({slot})=>{const d=JSON.parse(localStorage.getItem(slot));return d?.unlockedDiff>0||d?.characterFlags?.echoesUnlocked||Object.values(d?.campaignsByDifficulty||{}).some(c=>c.flags?.sagaComplete);});}catch{return false;}
  }
  function choices(r){const n=r?.cleared||0;return [curses[n%4],curses[(n+1)%4]];}
  function start(s,p,slot){
    if(!unlocked(s)||!slots[slot]||s.map.id!=='frosthaven'||run(s)&&!['claimed','failed'].includes(run(s).phase))return false;
    s.flags.echoRun={v:1,id:(s.flags.echoSequence=(s.flags.echoSequence||0)+1),slot,level:p.lvl,cleared:0,phase:'choice',curses:[],rewards:[],owner:p.heroId||p.name,participants:[p.heroId||p.name]};Game.saveGame();return true;
  }
  function choose(s,id){
    const r=run(s);if(!r||!['choice','reward'].includes(r.phase)||r.cleared>=3||!choices(r).some(c=>c.id===id))return false;
    r.curses.push(id);r.phase='combat';r.zone=stages[r.cleared][0];Game.saveGame();return true;
  }
  function prepare(s){
    if(!s.map.zone.echo)return;
    const r=run(s);s.map.exits=[]; // Return is an explicit claim/forfeit action.
    if(!r||r.phase!=='combat'||r.zone!==s.map.id){s.monsters=[];return;}
    for(const m of s.monsters){
      if(m.echoApplied)continue;m.echoApplied=true;
      const level=Math.max(m.lvl,(r.level||s.player.lvl)+2*r.cleared),factor=Math.max(1,(level+8)/Math.max(1,m.lvl+8));
      m.maxHp=Math.round(m.maxHp*factor*factor);m.hp=m.maxHp;
      m.def.dmgMult=(m.def.dmgMult||1)*factor;m.def.xp=Math.round(m.def.xp*factor);m.lvl=m.def.lvl=level;
      for(const id of r.curses){const c=curses.find(c=>c.id===id);m.maxHp*=c.hp||1;m.hp=m.maxHp;m.def.dmgMult=(m.def.dmgMult||1)*(c.damage||1);m.def.speed*=c.speed||1;}
      if(m.encounter){m.encounter.base=JSON.parse(JSON.stringify(m.def));m.encounter.mon.maxHp=m.maxHp;}
    }
  }
  function killed(s,m){
    if(!s.map.zone.echo)return false;
    const r=run(s);if(m.bossOwner)return true;
    if(!r||r.phase!=='combat')return true;
    if(!m.isBoss)return false;
    r.cleared++;r.phase='reward';
    const level=Math.max(1,r.level||s.player.lvl),it=Items.rollGear(level+2*r.cleared,r.cleared===3?'unique':'rare',{slot:r.slot});it.identified=true;
    r.rewards.push(Game.serializeItem(it));s.map.bossArena.sealed=false;
    Game.centerMsg('ECHO '+r.cleared+' RESTORED',r.cleared===3?'Claim your treasure':'Claim your treasure, or accept another curse');Game.saveGame();return true;
  }
  function collect(s,p){
    const id=p.heroId||p.name,award=s.flags.echoAwards?.[id];if(!award)return false;
    const grid={...p.inv,items:p.inv.items.map(it=>({...it}))};
    for(const item of award.items)if(!Items.autoPlace(grid,Game.reviveItem(item)))return false;
    p.inv.items=grid.items;p.gold+=award.gold;delete s.flags.echoAwards[id];Game.saveGame();UI.refreshGrids();return true;
  }
  function claim(s,p){
    const r=run(s);if(!r||r.phase!=='reward'||r.owner!==(p.heroId||p.name))return false;
    const grid={...p.inv,items:p.inv.items.map(it=>({...it}))};
    for(const item of r.rewards)if(!Items.autoPlace(grid,Game.reviveItem(item))){Game.msg('Make room in your pack; your Echo rewards remain safe.','#d8b880');return false;}
    s.flags.echoAwards||={};
    for(const id of r.participants){const existing=s.flags.echoAwards[id]||{items:[],gold:0};existing.items.push(...r.rewards);existing.gold+=250*r.cleared*r.cleared;s.flags.echoAwards[id]=existing;}
    r.phase='claimed';r.rewards=[];collect(s,p);Game.saveGame();return true;
  }
  function fail(s){const r=run(s);if(r&&!['failed','claimed'].includes(r.phase)){r.phase='failed';r.rewards=[];if(s.map.zone.echo){for(const m of s.monsters){m.encounter?.finish();m.cancelAttacks?.();m.dead=true;m.hp=0;m.corpseT=0;}if(s.map.bossArena)s.map.bossArena.sealed=false;}Game.saveGame();}}
  function regen(s){return s.map?.zone.echo&&run(s)?.phase==='combat'?run(s).curses.reduce((n,id)=>n*(curses.find(c=>c.id===id)?.regen||1),1):1;}
  return {stages,curses,slots,run,unlocked,accountUnlocked,choices,start,choose,prepare,killed,claim,collect,fail,regen};
})();
