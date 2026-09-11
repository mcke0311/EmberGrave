const {chromium}=require(process.env.SNARE_NODE_MODULES?process.env.SNARE_NODE_MODULES+'/playwright':'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const dest='tests/qa/veil_tree';fs.mkdirSync(dest,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')console.error('BROWSER:',m.text());});
 await page.route(/\/js\/game\.js(?:\?|$)/,async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('    init, newGame, loadGame,','    __veilQA:{freeze:()=>{running=false;},advance:dt=>{update(dt);render();},render},\n    init, newGame, loadGame,');await route.fulfill({response,body});});
 try {
  await page.goto(process.env.GAME_REVIEW_URL||'http://127.0.0.1:8758/',{waitUntil:'load',timeout:90000});await page.waitForSelector('#titleMenu button',{timeout:90000});
  await page.evaluate(async()=>{Sfx.setVol('master',0);await Game.newGame('Veil Review','veilranger',false);await Game.skipOpening();Game.state.seed=123;await Game.enterMap('north_wild','default');Game.__veilQA.freeze();});
  await page.evaluate(()=>{window.prepareVeilReview=async weapon=>{
   const s=Game.state,p=s.player,m=s.map;Game.debugFlags.god=true;UI.closeAll();UI.hideTitle();
   s.monsters=[];s.minions=[];s.fx=[];s.traps=[];s.projectiles=[];s.npcs=[];p.command=null;p.path=null;p.action=null;p.buffs=[];p.skillCd={};p.clearVeilState();
   let center=window.veilCenter;for(let y=8;y<m.h-8&&!center;y++)for(let x=8;x<m.w-8&&!center;x++){
    let clear=true;for(let dy=-4;dy<=4&&clear;dy+=.5)for(let dx=-5;dx<=5&&clear;dx+=.5)if(!MapGen.walkable(m,x+dx,y+dy)||Math.abs(TerrainSurface.heightAt(m,x+dx,y+dy)-TerrainSurface.heightAt(m,x,y))>.1)clear=false;
    if(clear)center={x,y};
   }
   if(!center)throw Error('No open review area');window.veilCenter=center;p.x=center.x-3;p.y=center.y;p.surfaceId=0;p.lvl=30;p.skills={};
   for(const id of ['veilranger_0_5','veilranger_2_0','veilranger_2_1','veilranger_2_2','veilranger_2_3','veilranger_2_4','veilranger_2_5','veilranger_2_6'])p.skills[id]=5;
   p.skillL='veilranger_2_1';p.skillR='veilranger_2_6';p.quickSlots=['veilranger_2_0','veilranger_2_4','veilranger_2_3','veilranger_2_5'];
   const base=weapon==='sword'?'shortsword':'huntbow',next={...p.equip,main:Items.fromBase(base)};const prepared=await Game.preparePlayerEquipment(next);p.equip=next;Game.commitPlayerEquipment(prepared);
   p.computeStats();p.mana=p.stats.maxMana=10000;p.hp=p.stats.maxHp;
   for(const [dx,dy] of [[.2,0],[.4,1.4],[1.6,-.6]]){const mon=new Monster('risen',center.x+dx,center.y+dy);mon.hp=mon.maxHp=10000;mon.def={...mon.def,speed:0,sight:0};mon.aggro=false;s.monsters.push(mon);}
   m.explored.fill(1);m.visible?.fill(1);UI.refreshHUD();Game.__veilQA.render();
  };window.veilAdvance=t=>{for(let i=0;i<Math.ceil(t*120);i++)Game.__veilQA.advance(1/120);};});
  const reports=[];
  for(const weapon of ['bow','sword']){
   await page.evaluate(weapon=>window.prepareVeilReview(weapon),weapon);
   await page.evaluate(()=>{const s=Game.state,p=s.player;p.performSkill('veilranger_2_1',s.monsters[0]);window.veilAdvance(.45/p.stats.attackRate+.06);});
   await page.screenshot({path:dest+'/'+weapon+'_knife.png'});
   await page.evaluate(()=>{
    window.veilAdvance(1);const s=Game.state,p=s.player,t=s.monsters[0];if(!(t.veilExposedUntil>s.time))throw Error('Knife did not expose');
    p.performSkill('veilranger_2_4',t);p.performSkill('veilranger_2_0',null,{x:p.x+1.2,y:p.y});window.veilAdvance(.03);
   });
   await page.screenshot({path:dest+'/'+weapon+'_ambush.png'});
   await page.evaluate(()=>{const s=Game.state,p=s.player;p.performSkill('veilranger_2_5',s.monsters[0],window.veilCenter);window.veilAdvance(.35/p.stats.attackRate+.03);});
   await page.screenshot({path:dest+'/'+weapon+'_flurry.png'});
   await page.evaluate(()=>{window.veilAdvance(1.3);const s=Game.state,p=s.player;p.performSkill('veilranger_2_3',s.monsters[0]);window.veilAdvance(.45/p.stats.attackRate+.06);});
   await page.screenshot({path:dest+'/'+weapon+'_cleave.png'});
   await page.evaluate(()=>{window.veilAdvance(1);const s=Game.state,p=s.player;p.performSkill('veilranger_2_4',s.monsters[0]);p.performSkill('veilranger_2_6',s.monsters[0]);window.veilAdvance(.45/p.stats.attackRate+.015);});
   await page.screenshot({path:dest+'/'+weapon+'_deathblow.png'});
   const report=await page.evaluate(()=>{window.veilAdvance(1);const s=Game.state;return {weapon:s.player.equip.main.cat,monsters:s.monsters.map(m=>({damage:10000-m.hp,bleeding:!!m.bleedDot,marked:!!m.killMark})),ambushConsumed:!s.player.shadowAmbushUntil,preview:CharacterSheet.preview(s.player,'veilranger_2_6',s).veilConditional};});
   assert(report.monsters.every(m=>m.damage>0),'Flurry damages the entire pack');assert(!report.monsters[0].marked,'Deathblow consumes primary mark');assert(report.ambushConsumed,'Ambush consumed');reports.push(report);
  }
  await page.evaluate(()=>UI.togglePanel('skills'));await page.locator('#discipline-2').click();await page.screenshot({path:dest+'/skill_tree.png'});
  const text=await page.locator('body').innerText();for(const name of ['Umbral Knife','Dusk Cleave','Shadow Flurry','Deathblow'])assert(text.includes(name),'tree contains '+name);
  assert(!errors.length,errors.join('\n'));fs.writeFileSync(dest+'/report.json',JSON.stringify({reports,errors},null,2));
  console.log('PASS browser review: full Veil combo, attack visuals, Exposed, Ambush, mark detonation, bow and sword.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
