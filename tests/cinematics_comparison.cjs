/* Capture the same story beat in both builds using the isolated review player. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');

const version = process.argv[2];
if (!['before', 'after'].includes(version)) throw Error('Choose before or after for this capture.');
const base = process.env.GAME_REVIEW_URL || 'http://127.0.0.1:8741';
const output = path.resolve(__dirname, '../tmp/cinematics-overhaul');
const seeds = [7136411, 1992887243];
const layouts = [[1280, 720], [844, 390], [568, 320]];
const beats = {
  oathsworn: 8.2, korvath: 5.6, ledger: 10.8, quieting: 11.5, mire_mother: 6.9,
  mire_shard: 10, dig: 15.6, ilyan: 8.8, azram: 5.8, fortress_map: 12, cathedral: 9.8,
  empty_archangel: 6.2, malthoron: 5.5, hell_portal: 14, breach: 10.5, vethriss: 16.2,
  core: 6.8, ending_destroy: 30, ending_seal: 30.5, ending_give: 30.8
};
const details = {
  oathsworn:[[2.5,'First rise']], ledger:[[3,'Handoff'],[16,'Awakened waystone']],
  quieting:[[6,'Leaving the bank'],[17.2,'Last ripple']], mire_shard:[[6.2,'Extraction']],
  dig:[[9,'Turning mechanism']], ilyan:[[2.3,'Broken binding']], cathedral:[[5.7,'Crossing the gap']],
  hell_portal:[[3.2,'Loose shards'],[7.6,'Inward travel']], breach:[[6.4,'Opposing broods']],
  core:[[9.2,'Choice framing']], ending_destroy:[[10.38,'First strike'],[12.92,'Second strike']],
  ending_seal:[[18.7,'Closed ward'],[19.3,'Vault match']],
  ending_give:[[11.5,'Transfer'],[18.5,'Changed eyes']]
};

function gallery(scenes) {
  const options = values => values.map(v => '<option>'+v+'</option>').join('');
  const cards = scenes.map(({id,title}) =>
    '<section data-id="'+id+'"><h2>'+title+'</h2><label>Moment <select class="moment"><option value="">'+beats[id]+' s</option>'+
    (details[id]||[]).map(([t,label])=>'<option value="-t'+t+'">'+t+' s · '+label+'</option>').join('')+'</select></label><div>'+
    ['before','after'].map(v=>'<figure><figcaption>'+v+'</figcaption><img loading="lazy" data-version="'+v+'" alt="'+v+' — '+title+'"></figure>').join('')+
    '</div></section>').join('');
  return '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<title>Embergrave cinematic comparison</title><style>html{color-scheme:dark}body{max-width:1500px;margin:auto;padding:20px;background:#101317;color:#eee4d1;font:16px/1.5 system-ui}header{background:#101317;position:sticky;top:0;padding:8px 0;z-index:1}h1,h2{font-family:Georgia,serif;font-weight:normal}label{margin-right:20px}select{padding:6px}section>div{display:grid;grid-template-columns:1fr 1fr;gap:12px}figure{margin:0}figcaption{text-transform:capitalize}img{width:100%;display:block}small{font:14px system-ui;color:#afa797}@media(max-width:750px){section>div{grid-template-columns:1fr}header{position:static}}</style>'+
    '<h1>Embergrave cinematic comparison</h1><header><label>Viewport <select id="layout">'+options(layouts.map(v=>v.join('x')))+'</select></label>'+
    '<label>World seed <select id="seed">'+options(seeds)+'</select></label><label><input type="checkbox" id="captions" checked> Captions</label></header>'+cards+
    '<script>function show(){for(const img of document.images){const scene=img.closest("section");img.src=[img.dataset.version,document.querySelector("#layout").value,document.querySelector("#seed").value,scene.dataset.id+scene.querySelector(".moment").value+(document.querySelector("#captions").checked?"-caption":"")+".jpg"].join("/")}}document.addEventListener("change",show);show()</script>';
}

(async () => {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  let scenes;
  try {
    for (const [width,height] of layouts) {
      const phone = width < 900;
      const page = await browser.newPage({viewport:{width,height},screen:{width,height},isMobile:phone,hasTouch:phone,deviceScaleFactor:1});
      const errors = [];
      page.on('pageerror',e => errors.push(e.message));
      await page.goto(base+'/tests/cinematics_review.html');
      await page.waitForFunction(()=>window.cinematicReview, null, {timeout:120000});
      await page.addStyleTag({content:'#host{position:fixed;inset:0;z-index:10}#host section{height:100%}#host h2{display:none}#host iframe{border:0;width:100vw;height:100vh}'});
      scenes = await page.evaluate(()=>cinematicReview.catalog.all.map(({id,title})=>({id,title})));
      assert.deepEqual(scenes.map(s=>s.id).sort(), Object.keys(beats).sort());
      const frame = page.frames().find(f=>f.parentFrame());
      await frame.evaluate(()=>document.fonts.ready);
      for (const seed of seeds) {
        const folder = path.join(output,version,width+'x'+height,String(seed));
        fs.mkdirSync(folder,{recursive:true});
        await page.evaluate(seed=>{const picker=document.querySelector('#seed');if(picker)picker.value=String(seed);cinematicReview.game.state.seed=seed;},seed);
        for (const {id} of scenes) {
          await page.evaluate(async id=>{
            const review=cinematicReview;
            document.querySelector('#scene').value=id;
            await review.play();
            await review.seek(0);
            if(review.cine.state.fallback)throw Error(id+' entered transcript fallback');
          },id);
          for(const [time,suffix] of [[beats[id],''],...(details[id]||[]).map(([t])=>[t,'-t'+t])]){
            await page.evaluate(time=>cinematicReview.seek(time),time);
            for(const visible of [false,true]){
              await frame.evaluate(async visible=>{
                document.body.classList.toggle('review-no-captions',!visible);
                await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
              },visible);
              await page.screenshot({path:path.join(folder,id+suffix+(visible?'-caption':'')+'.jpg'),type:'jpeg',quality:83});
            }
          }
          const fit=await page.evaluate(id=>{
            const r=cinematicReview,el=r.win.document.querySelector('.cine-caption');
            return r.catalog.get(id).captions.every(c=>{
              r.cine.seek((c.at+c.to)/2);
              const box=el.getBoundingClientRect(),skip=r.win.document.querySelector('.cine-skip').getBoundingClientRect();
              return !el.hidden&&el.textContent.includes(c.text)&&box.left>=0&&box.top>=skip.bottom&&box.right<=r.win.innerWidth+1&&box.bottom<=r.win.innerHeight+1;
            });
          },id);
          assert.ok(fit,id+' caption layout '+seed+' '+width);
        }
        console.log(version,width+'x'+height,seed,'20 scene pairs');
      }
      assert.deepEqual(errors,[]);
      await page.close();
    }
    if(version==='after')fs.writeFileSync(path.join(output,'index.html'),gallery(scenes));
  } finally {
    await browser.close();
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
