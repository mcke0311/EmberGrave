const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),before=process.argv.includes('--before'),contractsOnly=process.argv.includes('--contracts-only'),reviewOnly=process.argv.includes('--review-only'),out=path.join(root,'tests/qa/body_armor3d',before?'before':'after');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.ogg':'audio/ogg','.otf':'font/otf'};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,bytes)=>{if(error){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(bytes);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port,report={errors:[],missing:[],gallery:[]};let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror',error=>report.errors.push(error.message));page.on('response',r=>{if(r.status()===404&&!r.url().endsWith('favicon.ico'))report.missing.push(r.url());});
    await page.goto(base+'/tests/body_armor3d_review.html');await page.waitForFunction(()=>['ready','failed'].includes(document.body.dataset.testStatus),null,{timeout:120000});assert.equal(await page.locator('body').getAttribute('data-test-status'),'ready',await page.locator('#result').innerText());
    if(!contractsOnly){
      const {classes,pages}=await page.evaluate(()=>({classes:bodyArmorQA.classes,pages:bodyArmorQA.pages}));
      for(const id of classes){let count=0;for(let i=0;i<pages;i++){
        await page.evaluate(({i,id})=>bodyArmorQA.showPage(i,id),{i,id});const ids=await page.locator('.item').evaluateAll(rows=>rows.map(r=>r.dataset.armorId));count+=ids.length;
        await page.screenshot({path:path.join(out,id+'-'+String(i+1).padStart(2,'0')+'.png'),fullPage:true});report.gallery.push({classId:id,page:i+1,ids});
      }assert.equal(count,27);console.log('PASS: '+id+' — all 27 body armors, front/side/back and gameplay scale.');}
      for(const [name,viewport] of [['desktop',{width:1440,height:1000}],['mobile',{width:844,height:390}]]){
        const p=await browser.newPage({viewport,isMobile:name==='mobile',hasTouch:name==='mobile'});await p.goto(base+'/tests/three_character.html?unique=u_gen_6_2');await p.waitForFunction(()=>document.body.dataset.testStatus==='ready',null,{timeout:120000});
        for(const id of classes){await p.evaluate(id=>{armoryQA.setClass(id);for(const key of ['u_gen_12_12','u_gen_17_7','u_gen_7_9','u_gen_6_2','u_gen_18_12','u_gen_8_12'])armoryQA.selectModel(key);armoryQA.pose('walk',.35,90);},id);await p.screenshot({path:path.join(out,name+'-outfit-'+id+'.png'),fullPage:true});}
        assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await p.close();
      }
    }
    if(!before&&!reviewOnly){report.render=await page.evaluate(()=>bodyArmorQA.runContract());console.log('PASS: '+report.render.frames+' body armor WebGL frames, cuffs and GPU cleanup.');}
    assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);
  }finally{fs.writeFileSync(path.join(out,contractsOnly?'contracts.json':reviewOnly?'review.json':'browser.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
