const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const runtime=path.join(process.env.USERPROFILE||'', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(require.resolve('playwright',{paths:[runtime,__dirname]}));
const out=process.env.DIFFICULTY_QA_DIR||'tmp/difficulty_qa';fs.mkdirSync(out,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  const errors=[],results=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route(/\/js\/game\.js(?:\?|$)/,async route=>{
    const response=await route.fetch();const body=(await response.text()).replace('    init, newGame, loadGame,',
      '    __difficultyQA:{freeze:()=>{running=false;},resume:()=>{running=true;},render},\n    init, newGame, loadGame,');
    await route.fulfill({response,body});
  });
  try {
    await page.goto(process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741/',{waitUntil:'load',timeout:90000});
    await page.waitForSelector('#titleMenu button',{timeout:90000});
    await page.evaluate(async()=>{
      Sfx.setVol('master',0);await Game.newGame('Difficulty Browser QA','vanguard',false);await Game.skipOpening();
      const s=Game.state;s.seed=123;s.unlockedDiff=2;s.quests.q7={state:'done'};s.flags.fn_temple_open=true;
      Game.debugFlags.god=true;await Game.enterMap('north_wild','default');
      window.normalMonsters=s.monsters;Game.__difficultyQA.freeze();UI.closeAll();
    });
    // Use the same Escape button a player uses to change difficulty.
    for(const tier of [1,2,0]) {
      await page.evaluate(()=>Game.__difficultyQA.resume());
      await page.keyboard.press('Escape');
      const current=['Normal','Nightmare','Torment'][(tier+2)%3];
      await page.getByRole('button',{name:`Difficulty: ${current}`,exact:false}).click();
      await page.waitForFunction(tier=>Game.state.difficulty===tier&&!Game.state.difficultyTransition,tier,{timeout:90000});
      const campaign=await page.evaluate(()=>({tier:Game.state.difficulty,zone:Game.state.map.id,quest:Game.state.quests.q7,
        shrines:Game.state.shrines,temple:!!Game.state.flags.fn_temple_open,opening:!!Game.state.flags.opening}));
      assert.equal(campaign.zone,'frosthaven');
      assert.equal(campaign.quest.state,tier?'active':'done');assert.equal(campaign.temple,!tier);
      if(tier){assert.equal(campaign.opening,false);assert.deepEqual(campaign.shrines,['frosthaven','town']);}
      await page.keyboard.press('q');
      await page.getByText('Quest journal',{exact:true}).waitFor();
      await page.locator('#centerMsg').waitFor({state:'hidden'});
      await page.screenshot({path:path.join(out,`tier-${tier}-quests.png`)});
      await page.evaluate(()=>UI.closeAll());
      await page.evaluate(()=>UI.openShrine());
      assert((await page.locator('.wp-facts').innerText()).includes(`Recommended level ${1+tier*30}`));
      await page.evaluate(()=>UI.closeAll());
      const monsters=await page.evaluate(async()=>{
        await Game.enterMap('north_wild','default');Game.__difficultyQA.freeze();
        const s=Game.state;s.map.explored.fill(1);UI.refreshHUD();Game.__difficultyQA.render();
        return {levels:s.monsters.map(mon=>mon.lvl),reused:s.monsters.some(mon=>window.normalMonsters.includes(mon))};
      });
      assert(!monsters.reused,'previous difficulty monster instances reused');
      assert(monsters.levels.length>0&&monsters.levels.every(level=>level>=1+tier*30&&level<=3+tier*30));
      results.push({campaign,...monsters});
    }
    await page.evaluate(()=>Game.saveAndQuit());
    await page.evaluate(async()=>{const slot=Game.listSaves().find(row=>row.name==='Difficulty Browser QA').slot;await Game.loadGame(slot);Game.__difficultyQA.freeze();});
    assert.equal(await page.evaluate(()=>Game.state.quests.q7.state),'done');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({status:'PASS',results,errors},null,2));
    console.log('PASS browser difficulty menu, fresh/resumed quest logs, monster levels, reload and zero page errors.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
