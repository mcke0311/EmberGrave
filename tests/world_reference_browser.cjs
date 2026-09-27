const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const dest=process.env.WORLD_QA_DIR||'tmp/world-reference';fs.mkdirSync(dest,{recursive:true});
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1536,height:1050},permissions:['clipboard-read','clipboard-write']}),page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);};
  const ready=()=>page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Ready'),{},{timeout:30000});
  const zone=async id=>{await page.locator('[data-zone="'+id+'"]').click();await page.waitForFunction(id=>document.querySelector('#zoneId').textContent===id&&document.querySelector('#status').textContent.startsWith('Ready'),id);};
  try{
    await context.addInitScript(()=>localStorage.setItem('world_reference_save_sentinel','leave unchanged'));
    await page.goto((process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741')+'/world.html');await ready();
    ok(await page.locator('[data-zone]').count()===36,'36 levels');
    ok((await page.locator('#detail').innerText()).includes('Travel shrine'),'default travel shrine');
    ok(await page.locator('#detail canvas').getAttribute('data-asset')==='world.prop.frosthaven_shrine','authored town shrine');
    await page.locator('.copy').click();ok((await page.evaluate(()=>navigator.clipboard.readText())).includes('js/mapgen.js'),'copied editing references');
    await page.screenshot({path:dest+'/frosthaven.png'});
    await zone('north_wild');
    const initialFrame=await page.locator('#detail canvas').getAttribute('data-frame');await page.locator('.state-picker button').last().click();
    ok(await page.locator('#detail canvas').getAttribute('data-frame')!==initialFrame,'used-state art');
    await page.locator('.copy').click();ok((await page.evaluate(()=>navigator.clipboard.readText())).includes('Preview state: Attuned'),'copied preview state');
    await page.locator('[data-category="habitats"]').click();
    ok(await page.locator('#gallery .object-card').count()>0,'habitat filter');await page.locator('#gallery .object-card').first().click();
    ok((await page.locator('#detail').innerText()).includes('Decorative'),'habitats distinct from ambush sites');
    const count=await page.locator('#instance option').count();if(count>1){await page.locator('#instance').selectOption({index:1});ok(new URL(page.url()).searchParams.get('item')===await page.locator('#instance').inputValue(),'instance bookmark');}
    const before=await page.locator('#mapReadout').innerText();await page.locator('#zoomIn').click();ok(await page.locator('#mapReadout').innerText()!==before,'map zoom');await page.locator('#fit').click();
    await page.locator('[data-category="all"]').click();await page.locator('#objectSearch').fill('not-present-9981');ok((await page.locator('#gallery').innerText()).includes('No matching'),'empty search');
    await page.locator('#objectSearch').fill('');await page.locator('#eventSection summary').click();await page.locator('#events .object-card').filter({hasText:'Wolf Den'}).click();
    ok((await page.locator('#detail').innerText()).includes('Spawns an Icefang Wolf every 6 seconds'),'Act I den spawning description');ok(!(await page.locator('#detail').innerText()).includes('Position'),'eligible event has no fictitious coordinates');
    const bookmarked=page.url();await page.reload();await ready();ok(page.url()===bookmarked,'URL restored');ok((await page.locator('#detail').innerText()).includes('Wolf Den'),'selection restored');
    await page.locator('#seed').fill('42');await page.locator('#difficulty').selectOption('2');await page.locator('#scenario button').click();await ready();
    ok((await page.locator('#scenarioNote').innerText()).includes('Torment'),'difficulty applied');ok(new URL(page.url()).searchParams.get('seed')==='42','seed applied');
    for(const id of ['north_wild','weeping_marsh','desert_wastes','cathedral1','ash_wastes']){await zone(id);await page.locator('#gallery .object-card').first().click();await page.waitForFunction(()=>document.querySelector('#detail canvas').dataset.loaded==='true');await page.screenshot({path:dest+'/'+id+'.png'});}
    const ids=await page.locator('[data-zone]').evaluateAll(es=>es.map(e=>e.dataset.zone));for(const id of ids)await zone(id);
    ok(await page.locator('#diagnostics').isHidden(),'no missing references');
    await zone('frosthaven');
    // Actual marker picking in the fitted map, on a separated ordinary prop.
    const target=await page.evaluate(()=>{const s=WorldReference.inspect('frosthaven',{seed:42,difficulty:2}),p=s.instances.find(p=>p.collection==='props'&&!s.instances.some(q=>q.id!==p.id&&Math.hypot(p.x-q.x,p.y-q.y)<2));return {id:p.id,x:p.x,y:p.y,w:s.map.w,h:s.map.h};});
    const box=await page.locator('#map').boundingBox(),scale=Math.min((box.width-36)/target.w,(box.height-36)/target.h);
    await page.locator('#map').click({position:{x:(box.width-target.w*scale)/2+target.x*scale,y:(box.height-target.h*scale)/2+target.y*scale}});
    ok(await page.locator('#instance').inputValue()===target.id,'map marker selection');
    await page.setViewportSize({width:390,height:844});await page.locator('#map').scrollIntoViewIfNeeded();
    await page.screenshot({path:dest+'/mobile-map.png'});ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile fits');
    ok((await page.locator('#mapReadout').innerText()).includes('8.47 px/tile'),'map refits mobile width');
    await page.locator('#gallery .object-card').first().click();await page.locator('.mobile-return').waitFor({state:'visible'});await page.screenshot({path:dest+'/mobile-detail.png'});
    ok(await page.evaluate(()=>localStorage.length===1&&localStorage.getItem('world_reference_save_sentinel')==='leave unchanged'),'save storage untouched');
    // Broken art is explicit and does not break the rest of the dashboard.
    const artPath=await page.locator('#detail canvas').getAttribute('data-asset');const artSrc=await page.evaluate(id=>DATA.SPRITE_MANIFEST.entries[id].src,artPath);
    await page.route('**/'+artSrc+'*',r=>r.abort());await page.reload();await ready();await page.waitForFunction(()=>!!document.querySelector('#detail canvas').dataset.error);ok((await page.locator('#detail canvas').getAttribute('title')).includes('Cannot load'),'missing-art feedback');
    ok(errors.length===0,'browser exceptions: '+errors.join('\n'));
    console.log('PASS '+checks+' browser checks; 36 level switches; screenshots in '+dest);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
