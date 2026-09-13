// Isolated browser coverage for scrollable phone screens. Never reads user saves.
const { chromium }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {reveal}=require('./phone_page_helpers.cjs');
const base=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741';
const output='tmp/phone-screens';fs.mkdirSync(output,{recursive:true});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:568,height:320},screen:{width:568,height:320},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.stack));
 await page.addInitScript(()=>{
   const store=new Map([['embergrave_options',JSON.stringify({vol:{master:0,sfx:0,music:0}})]]);
  Object.defineProperty(window,'localStorage',{value:{get length(){return store.size},key:i=>[...store.keys()][i]??null,getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()}});
 });
 async function checkMainMenu(saved){
  const labels=[...(saved?['CONTINUE']:[]),'SINGLE PLAYER','MULTIPLAYER','MORE'];
  const visibleLabels=()=>page.locator('.splash-actions > :visible').allTextContents();
  for(const size of [{width:568,height:240},{width:568,height:320},{width:844,height:390}]){
   await page.setViewportSize(size);await pause(100);
   assert.deepEqual(await visibleLabels(),labels,'phone main menu order');
   assert.equal((await page.locator('#titleInner').innerText()).replace(/\s+/g,' ').trim(),['EMBERGRAVE',...labels].join(' '),'phone title has extra or missing text');
   assert.ok(await page.evaluate(()=>{
    const nodes=[document.querySelector('#title h1'),...document.querySelector('.splash-actions').children].filter(n=>n.getClientRects().length);
    const single=nodes.find(n=>n.textContent==='SINGLE PLAYER').getBoundingClientRect(),multi=nodes.find(n=>n.textContent==='MULTIPLAYER').getBoundingClientRect();
    return single.bottom<=multi.top&&nodes.every(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&(n.tagName==='H1'||r.height>=44);});
   }),'phone title and vertically ordered actions must fit '+size.width+'x'+size.height);
   if(size.height===240)await page.screenshot({path:output+'/title-240'+(saved?'-saved':'')+'.png'});
  }
  await page.setViewportSize({width:568,height:320});await pause(100);
  await page.getByRole('button',{name:'MORE',exact:true}).click();
  const secondary=[...(saved?['CHOOSE HERO']:[]),'SETTINGS & CONTROLS','ITEMS & AFFIXES','SUPPORT THE GAME'];
  for(const label of secondary)assert.ok((await visibleLabels()).includes(label),'More is missing '+label);
  const support=page.getByRole('link',{name:'Support the game (opens in a new tab)',exact:true});
  assert.equal(await support.getAttribute('href'),'https://ko-fi.com/embergrave');
  assert.equal(await support.getAttribute('target'),'_blank');
  const next=page.getByRole('button',{name:'Next options',exact:true});
  if(await next.isVisible()){
   await next.click();assert.ok((await visibleLabels()).some(x=>['Full screen','Add to Home Screen'].includes(x)),'More next page lost phone controls');
   await page.getByRole('button',{name:'Previous options',exact:true}).click();
   for(const label of secondary)assert.ok((await visibleLabels()).includes(label),'previous options did not restore '+label);
  }
  await page.getByRole('button',{name:'BACK',exact:true}).click();assert.deepEqual(await visibleLabels(),labels,'Back did not restore the main menu');
 }
 try{
  await page.goto(base+'/index.html?touch=1',{waitUntil:'load',timeout:120000});
  await page.waitForFunction(()=>typeof Game!=='undefined'&&document.querySelector('#titleMenu button'),null,{timeout:120000});
  await pause(300);
  console.log('title',await page.evaluate(()=>({phone:MobileShell.enabled,blocked:MobileShell.blocked,errors:document.querySelector('#appFatal')?.textContent,orientation:screen.orientation.type})));
  await checkMainMenu(false);
  await page.screenshot({path:output+'/title.png'});
  await page.getByRole('button',{name:'SINGLE PLAYER',exact:true}).click();await pause(300);
  await page.screenshot({path:output+'/hero.png'});
  await page.getByRole('button',{name:'Next',exact:true}).click();await pause(100);
  assert.equal(await page.locator('#title').getAttribute('data-hero-step'),'identity');
  const savesBefore=await page.evaluate(()=>localStorage.length);
  for(const name of ['', '   ']){
   await page.locator('#nameInput').fill(name);await page.getByRole('button',{name:'ENTER THE MARCHES',exact:true}).click();
   assert.ok(await page.locator('#heroNameError').isVisible(),'phone name error is hidden');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'nameInput');
   assert.equal(await page.evaluate(()=>localStorage.length),savesBefore,'blank name wrote a save');
   assert.ok(await page.evaluate(()=>!Game.state?.player),'blank name started gameplay');
  }
  await page.locator('#nameInput').fill('Phone QA');
  assert.ok(await page.locator('#heroNameError').isHidden(),'correcting phone name keeps an error');
  await page.locator('#hcBox').check();
  await page.locator('#nameInput').focus();
  await page.evaluate(()=>{Object.defineProperty(visualViewport,'height',{value:120,configurable:true});MobileShell.refresh();});
  assert.equal(await page.evaluate(()=>MobileShell.blocked),false,'keyboard must not trigger portrait gate');
  assert.ok(await page.locator('#nameInput').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=120;}),'keyboard hides name input');
  await page.locator('#phoneKeyboardDone').click();
  await page.evaluate(()=>{delete visualViewport.height;MobileShell.refresh();});
  await page.setViewportSize({width:320,height:568});await page.waitForFunction(()=>MobileShell.blocked);
  assert.equal(await page.locator('#nameInput').inputValue(),'Phone QA');
  await page.setViewportSize({width:568,height:320});await page.waitForFunction(()=>!MobileShell.blocked);
  assert.equal(await page.locator('#title').getAttribute('data-hero-step'),'identity');
  await page.getByRole('button',{name:'← BACK',exact:true}).click();
  await page.locator('#choose-emberwitch').click();await page.getByRole('button',{name:'Next',exact:true}).click();
  assert.equal(await page.locator('#nameInput').inputValue(),'Phone QA','hero step lost the name');
  assert.ok(await page.locator('#hcBox').isChecked(),'hero steps lost Hardcore');
  await page.screenshot({path:output+'/identity.png'});
  await page.getByRole('button',{name:'← BACK',exact:true}).click();await page.locator('#choose-vanguard').click();await page.getByRole('button',{name:'Next',exact:true}).click();
  await page.locator('#nameInput').fill('  Phone QA  ');await page.locator('#nameInput').press('Enter');
  await page.waitForFunction(()=>Game.state?.player&&document.getElementById('title').classList.contains('hidden'),null,{timeout:120000});
  assert.deepEqual(await page.evaluate(()=>({name:Game.state.player.name,classId:Game.state.player.classId,hardcore:Game.state.player.hardcore})),{name:'Phone QA',classId:'vanguard',hardcore:true},'Enter did not create the selected hero with a trimmed name');
  await page.evaluate(async()=>{await (await import('/tests/completed_hero_fixture.mjs')).loadCompletedHero(Game);Game.debugFlags.god=true;UI.hideTitle();UI.closeAll();});
  await page.waitForFunction(()=>Game.touchReady(),null,{timeout:120000});
  await page.screenshot({path:output+'/game.png'});
  async function audit(label){
    await pause(120);
    const result=await page.evaluate(()=>{
      const visible=n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden'&&!n.closest('[inert]');
      const roots=[...document.querySelectorAll('dialog[open],#cinematic:not(.hidden),#escmenu:not(.hidden) > .box,#touchItemMenu,#skillPick:not(.hidden),#panelWorkspace > .panel:not(.hidden):not(.workspace-inactive),#title:not(.hidden) #titleMenu')].filter(visible);
      const root=roots[0],bad=[];if(!root)return {bad:['No active screen']};
      const r=root.getBoundingClientRect();
      if(r.left<-.5||r.top<-.5||r.right>innerWidth+1||r.bottom>innerHeight+1)bad.push('screen outside viewport '+JSON.stringify(r));
      if(root.scrollWidth>root.clientWidth+1)bad.push('horizontal root overflow '+root.scrollWidth+'/'+root.clientWidth);
      for(const el of root.querySelectorAll('*'))if(visible(el)&&el.getBoundingClientRect().right>r.right+1)bad.push('wide '+el.tagName+'.'+el.className);
      const controls=[...root.querySelectorAll('button,input:not([type=checkbox]),select,textarea,summary,[role=button]')].filter(visible);
      for(const el of controls){const b=el.getBoundingClientRect();if(b.width<43||b.height<43)bad.push('small '+(el.getAttribute('aria-label')||el.textContent).slice(0,70)+' '+Math.round(b.width)+'x'+Math.round(b.height));}
      const head=document.getElementById('workspaceHeader');
      if(visible(head))for(const el of head.querySelectorAll('button'))if(visible(el)){
        const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);
        if(b.width<43||b.height<43||!el.contains(hit))bad.push('unreachable navigation '+el.textContent);
      }
      return {bad:[...new Set(bad)],controls:controls.length,scrollable:root.scrollHeight>root.clientHeight};
    });
    console.log('AUDIT',label,JSON.stringify(result));
    if(result.bad.length)await page.screenshot({path:output+'/'+label.replace(/[^a-z0-9]/gi,'_')+'-failure.png'});
    return result.bad.map(e=>label+': '+e);
  }
  const failures=[];
  for(const panel of ['inv','char','skills','quest']){
   await page.evaluate(p=>{UI.closeAll();UI.togglePanel(p);},panel);await pause(300);
   await page.screenshot({path:output+'/'+panel+'.png'});
   failures.push(...await audit(panel));
  }
  await page.evaluate(()=>{UI.closeAll();UI.openSettings({origin:'pause'});});await pause(300);await page.screenshot({path:output+'/settings.png'});
  for(const size of [{width:568,height:240},{width:667,height:375},{width:844,height:390}]){
   await page.setViewportSize(size);await pause(100);
   for(const panel of ['inv','char','skills','quest','storage','forge']){
    await page.evaluate(p=>{UI.closeEsc();UI.closeAll();if(p==='storage')UI.openStorage();else if(p==='forge')UI.openForge();else UI.togglePanel(p);},panel);
    failures.push(...await audit(size.width+'x'+size.height+'-'+panel));
   }
   for(const tab of ['audio','gameplay','display','controls']){
    await page.evaluate(tab=>{UI.closeAll();UI.openSettings({origin:'pause',tab});},tab);failures.push(...await audit(size.width+'x'+size.height+'-'+tab));
   }
  }
  await page.setViewportSize({width:568,height:240});
  await page.evaluate(()=>{
    UI.closeEsc();UI.closeAll();const p=Game.state.player;p.inv.items=[];p.stash.items=[];
    for(let i=0;i<40;i++)Items.place(p.inv,Items.makeConsumable('idscroll',1),i%10,Math.floor(i/10));
    for(let i=0;i<60;i++)Items.place(p.stash,Items.makeConsumable('idscroll',1),i%10,Math.floor(i/10));
    p.attrPts=5;UI.togglePanel('inv');
  });failures.push(...await audit('full-pack'));
  await page.evaluate(()=>{UI.closeAll();UI.openStorage();});failures.push(...await audit('full-storage'));
  for(const cls of ['vanguard','emberwitch','gravebinder','wildkeeper','veilranger']){
    await page.evaluate(cls=>{UI.closeAll();const p=Game.state.player;p.classId=cls;p.cls=DATA.CLASSES[cls];p.lvl=50;p.skillPts=100;p.computeStats();UI.togglePanel('skills');},cls);
    for(let tree=0;tree<3;tree++){
      const tab=page.locator('#discipline-'+tree);await reveal(tab);await tab.click();failures.push(...await audit(cls+'-tree-'+tree));
    }
  }
  await page.evaluate(()=>{UI.closeAll();UI.openShrine();});failures.push(...await audit('travel'));
  await page.evaluate(()=>{UI.closeAll();UI.openDialog(Game.state.npcs[0]);});failures.push(...await audit('dialogue'));
  await page.evaluate(()=>{UI.closeAll();UI.openVendor(Object.keys(Game.state.vendorStock)[0]);});failures.push(...await audit('vendor'));
  await page.evaluate(()=>{UI.closeAll();UI.openEsc();});
  const filter=page.locator('#escmenu').getByRole('button',{name:'Loot Filter',exact:true,includeHidden:true});await reveal(filter);await filter.click();failures.push(...await audit('loot-filter'));
  await page.evaluate(()=>{UI.closeEsc();UI.showDeath(0,'Frosthaven');});failures.push(...await audit('death'));await page.evaluate(()=>UI.hideDeath());
  await page.evaluate(()=>UI.openFinalChoice());failures.push(...await audit('final-choice'));
  await page.evaluate(()=>{document.querySelector('#cinematic').classList.add('hidden');MobileShell.showHelp('A long description. '.repeat(150),'Long item detail');});failures.push(...await audit('long-text'));
  await page.locator('#phoneInstallHelp > button').click();
  assert.ok(await page.locator('#phoneInstallHelp').isHidden(),'closed help still covers the game');
  // Fullscreen promises and browser exit events must not leave the interface blocked.
  await page.evaluate(async()=>{
    window.__fullCalls=0;window.__requestFull=document.documentElement.requestFullscreen;
    document.documentElement.requestFullscreen=()=>{window.__fullCalls++;return Promise.reject(new Error('denied'));};
    await MobileShell.fullscreen();
  });assert.equal(await page.evaluate(()=>window.__fullCalls),1);assert.ok(await page.locator('#phoneInstallHelp').isVisible());
  await page.evaluate(()=>{document.documentElement.requestFullscreen=window.__requestFull;document.querySelector('#phoneInstallHelp').close();});
  await page.evaluate(async()=>{
    const request=document.documentElement.requestFullscreen,exit=document.exitFullscreen,lock=screen.orientation.lock;
    let entered=false,locked=false;
    Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>entered?document.documentElement:null});
    document.documentElement.requestFullscreen=async()=>{entered=true;document.dispatchEvent(new Event('fullscreenchange'));};
    document.exitFullscreen=async()=>{entered=false;document.dispatchEvent(new Event('fullscreenchange'));};
    screen.orientation.lock=async direction=>{locked=direction==='landscape';};
    try{await MobileShell.fullscreen();if(!entered||!locked)throw Error('fullscreen did not request landscape');await MobileShell.fullscreen();if(entered)throw Error('fullscreen exit failed');}
    finally{document.documentElement.requestFullscreen=request;document.exitFullscreen=exit;screen.orientation.lock=lock;delete document.fullscreenElement;MobileShell.refresh();}
    const install=new Event('beforeinstallprompt');window.__installCalls=0;install.prompt=async()=>{window.__installCalls++;};install.userChoice=Promise.resolve({outcome:'accepted'});dispatchEvent(install);MobileShell.showHelp();
  });
  const install=page.locator('#phoneInstallHelp').getByRole('button',{name:'Install app',exact:true,includeHidden:true});await reveal(install);await install.click();
  assert.equal(await page.evaluate(()=>window.__installCalls),1);
  await page.evaluate(()=>{
    const native=window.matchMedia;window.matchMedia=q=>q==='(display-mode: standalone)'?{matches:true}:native.call(window,q);
    try{if(!MobileShell.standalone())throw Error('standalone not detected');const host=document.createElement('div');MobileShell.controls(host);if(!host.querySelector('[data-phone-install]').hidden)throw Error('installed launch offers installation');}finally{window.matchMedia=native;}
  });
  await page.evaluate(()=>{UI.closeAll();UI.showTitle();});
  await checkMainMenu(true);
  await page.setViewportSize({width:568,height:240});
  await page.evaluate(()=>{const hero=Game.listSaves()[0];TitleScreen.savedHeroes({saves:Array.from({length:24},(_,i)=>({...hero,slot:'phone-fixture-'+i,name:'Saved hero '+i}))});});
  failures.push(...await audit('many-saved-heroes'));
  const manifest=await page.evaluate(async()=>await fetch('manifest.webmanifest').then(r=>r.json()));
  assert.equal(manifest.display,'standalone');assert.equal(manifest.orientation,'landscape');
  for(const icon of manifest.icons)assert.ok((await context.request.get(base+'/'+icon.src)).ok());
  console.log('FAILURES',JSON.stringify(failures));
  fs.writeFileSync(output+'/geometry.json',JSON.stringify({failures,errors},null,2));
  assert.deepEqual(failures,[]);
  console.log('errors',errors);assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
