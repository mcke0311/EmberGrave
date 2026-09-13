const {chromium}=require(process.env.SNARE_NODE_MODULES?process.env.SNARE_NODE_MODULES+'/playwright':'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const dest='tests/qa/snare_tree';fs.mkdirSync(dest,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:960}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')console.error('BROWSER:',m.text());});
 await page.route(/\/js\/game\.js(?:\?|$)/,async route=>{const response=await route.fetch();let body=await response.text();body=body.replace('    init, newGame, loadGame,','    __snareQA:{freeze:()=>{running=false;},advance:dt=>{update(dt);render();},render},\n    init, newGame, loadGame,');await route.fulfill({response,body});});
 try {
  await page.goto(process.env.GAME_REVIEW_URL||'http://127.0.0.1:8758/',{waitUntil:'load',timeout:90000});await page.waitForSelector('#titleMenu button',{timeout:90000});
  await page.evaluate(async()=>{Sfx.setVol('master',0);await Game.newGame('Snare Review','veilranger',false);await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);await Game.enterMap('north_wild','default');Game.__snareQA.freeze();});
  const setup=await page.evaluate(()=>{
   const s=Game.state,p=s.player,m=s.map;Game.debugFlags.god=true;UI.closeAll();UI.hideTitle();
   s.monsters=[];s.minions=[];s.fx=[];s.traps=[];s.projectiles=[];s.npcs=[];p.command=null;p.path=null;
   let center=null;for(let y=8;y<m.h-8&&!center;y++)for(let x=8;x<m.w-8&&!center;x++){
    let clear=true;for(let dy=-4;dy<=4&&clear;dy+=.5)for(let dx=-5;dx<=5&&clear;dx+=.5)if(!MapGen.walkable(m,x+dx,y+dy)||Math.abs(TerrainSurface.heightAt(m,x+dx,y+dy)-TerrainSurface.heightAt(m,x,y))>.1)clear=false;
    if(clear)center={x,y};
   }
   if(!center)throw Error('No open review area');window.snareCenter=center;p.x=center.x-4;p.y=center.y;p.surfaceId=0;p.lvl=30;
   for(const id of ['veilranger_0_5','veilranger_1_0','veilranger_1_1','veilranger_1_2','veilranger_1_3','veilranger_1_4','veilranger_1_5','veilranger_1_6'])p.skills[id]=5;
   p.skillL='veilranger_1_3';p.skillR='veilranger_1_5';p.quickSlots=['veilranger_1_4','veilranger_1_2',null,null];p.computeStats();p.mana=p.stats.maxMana=10000;p.hp=p.stats.maxHp;
   for(const [dx,dy] of [[2.3,0],[1.8,1.6],[-.2,2.4]]){const mon=new Monster('risen',center.x+dx,center.y+dy);mon.hp=mon.maxHp=10000;mon.def.speed=0;mon.def.sight=0;mon.aggro=false;s.monsters.push(mon);}
   m.explored.fill(1);m.visible?.fill(1);UI.refreshHUD();Game.__snareQA.render();return center;
  });
  await page.evaluate(()=>{const p=Game.state.player,c=window.snareCenter;p.performSkill('veilranger_1_2',null,c);p.performSkill('veilranger_1_4',null,c);for(let i=0;i<50;i++)Game.__snareQA.advance(1/60);for(const tr of Game.state.traps)tr.armT=0;p.performSkill('veilranger_1_3',null,c);for(let i=0;i<14;i++)Game.__snareQA.advance(1/60);});
  await page.screenshot({path:dest+'/dragnet_release.png'});
  await page.evaluate(()=>{for(let i=0;i<30;i++)Game.__snareQA.advance(1/60);});
  await page.screenshot({path:dest+'/gathered_rooted.png'});
  const combo=await page.evaluate(()=>Game.state.monsters.map(m=>({x:m.x,y:m.y,rooted:m.snareRootUntil>Game.state.time,slowed:m.slowT>0,bleeding:m.bleedDot?.t>0,mult:Game.state.player.snareDamageMult(m)})));
  assert(combo.some(m=>m.rooted&&m.slowed&&m.bleeding),'visible combo has all three conditions');
  await page.evaluate(()=>UI.togglePanel('skills'));await page.locator('#discipline-1').click();await page.screenshot({path:dest+'/skill_tree.png'});
  const text=await page.locator('body').innerText();assert(text.includes('Dragnet')&&text.includes('Exploit Weakness'),'new skills appear in tree');
  assert(!errors.length,errors.join('\n'));fs.writeFileSync(dest+'/report.json',JSON.stringify({setup,combo,errors},null,2));
  console.log('PASS browser review: net release, gathering, roots, layered bonus and replacement tree.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
