const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=require(require.resolve('playwright',{paths:[runtime,__dirname]}));
const root=path.resolve(__dirname,'..'),out=path.join(root,'tests/qa/uniques');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav'};
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(bytes);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const report={errors:[],missing:[],items:0};
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1320,height:900},reducedMotion:'reduce'});
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()===404&&!r.url().endsWith('favicon.ico'))report.missing.push(r.url());});
  await page.goto(`http://127.0.0.1:${server.address().port}/tests/unique_review.html`);
  await page.waitForFunction(()=>window.uniqueQA||document.getElementById('status').textContent.startsWith('FAIL'),null,{timeout:120000});
  report.layouts=await page.evaluate(()=>{
   const q=window.uniqueQA;if(!q)throw Error(document.getElementById('status').textContent);
   const rows=Object.keys(q.api.UniquePowers.catalog).map(id=>{q.show(id);const tip=q.frame.contentDocument.getElementById('tooltip'),r=tip.getBoundingClientRect();return{id,top:r.top,bottom:r.bottom,frameHeight:q.frame.clientHeight,height:r.height,width:r.width,scrollWidth:tip.scrollWidth,clientWidth:tip.clientWidth,clipped:r.top<0||r.bottom>q.frame.clientHeight||tip.scrollWidth>tip.clientWidth+1,text:tip.textContent};});
   const host=q.api.Items.fromBase('sword2h_t12');host.sockets=[null,null,null,null];for(const id of ['g_doom','g_void','g_titan','g_aegis'])q.api.Items.socketGlyph(host,q.make(id));
   q.api.UI.showItemTooltip(host,500,710);const tip=q.frame.contentDocument.getElementById('tooltip'),r=tip.getBoundingClientRect();rows.push({id:'four_unique_sockets',height:r.height,width:r.width,scrollWidth:tip.scrollWidth,clientWidth:tip.clientWidth,clipped:r.top<0||r.bottom>q.frame.clientHeight||tip.scrollWidth>tip.clientWidth+1,text:tip.textContent});return rows;
  });report.items=report.layouts.length;
  for(const id of ['u_widow','u_cinder','g_doom','uc_mystic','u_gen_4_6']){
   await page.evaluate(async id=>{window.uniqueQA.show(id);await window.uniqueQA.effect();},id);await page.screenshot({path:path.join(out,id+'.png')});
  }
  if(report.layouts.some(x=>x.clipped))throw Error('Clipped power tooltips: '+report.layouts.filter(x=>x.clipped).map(x=>x.id).join(', '));
  if(report.errors.length||report.missing.length)throw Error(JSON.stringify({errors:report.errors,missing:report.missing}));
  console.log('PASS browser review: '+report.items+' production tooltips at 1280×720; five captures.');
 }finally{fs.writeFileSync(path.join(out,'browser_review.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
