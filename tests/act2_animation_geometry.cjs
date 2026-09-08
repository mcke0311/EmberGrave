const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage();await page.goto('http://127.0.0.1:8749/tests/act2_review.html?enemyReview&animationReview');
  await page.waitForFunction(()=>window.act2ReviewDone,null,{timeout:120000});
  await page.evaluate(async()=>{await window.act2AnimationReview.win.eval('SpriteAssets').loadBundle('boss:mire_mother');});
  const result=await page.evaluate(()=>{
   const r=window.act2AnimationReview,{SpriteAssets:S,DATA}=r.win.eval('({SpriteAssets,DATA})'),c=r.win.document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d',{willReadFrequently:true});let checks=0;
   const entries=Object.entries(DATA.SPRITE_MANIFEST.entries).filter(([id,d])=>d.act2Art);
   for(const [asset,d] of entries)for(let index=0;index<d.cols*d.rows;index++)for(const flip of [false,true]){
    const opts={scale:1,...(asset.includes('mire_mother')?{bossArt:'mire_mother'}:{})},pose={ang:flip?Math.PI:0,ex:{act2Animation:{asset,index,alpha:1}}};
    const geometry=S.actorGeometry(opts,pose,256,256,1);
    for(const mode of ['normal','flash','elite']){
     ctx.clearRect(0,0,512,512);ctx.save();ctx.translate(256,256);S.drawActor(ctx,{...opts,bossFlash:mode==='flash',act2Tint:mode==='elite'?'#b595dc':undefined},pose);ctx.restore();
     const data=ctx.getImageData(0,0,512,512).data;let count=0,hit=false;
     for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(data[(x+y*512)*4+3]>96){count++;
      if(x<geometry.left-2||x>geometry.right+2||y<geometry.top-2||y>geometry.bottom+2)throw Error(asset+' clipped geometry '+index);
      if(S.hitTestGeometry(geometry,x,y))hit=true;
     }
     if(!count||!hit)throw Error(asset+' missing visible/targetable pose '+index);checks++;
    }
   }
   return {status:'PASS',atlases:entries.length,checks,method:'Every registered frame in both facings, normal, elite tint and hit-flash raster bounds against shared geometry and picking mask.'};
  });fs.writeFileSync('tests/qa/act2_animation/geometry.json',JSON.stringify(result,null,2));console.log(result);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
