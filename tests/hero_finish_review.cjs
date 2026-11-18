// The live armory supplies the same catalog, skeletons and WebGL renderer as the game.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const phase = process.argv[2];
assert.ok(['before', 'after'].includes(phase));
const out = path.join(__dirname, 'qa', 'finished_heroes', phase);
fs.mkdirSync(out, {recursive:true});

async function run() {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', e => {if (e.type()==='error' && /Shader Error/.test(e.text())) errors.push(e.text());});
    const base = process.env.GAME_REVIEW_URL || 'http://127.0.0.1:8741';
    await page.goto(base + '/tests/body_armor3d_review.html');
    await page.waitForFunction(() => document.body.dataset.testStatus==='ready', null, {timeout:120000});
    const result = await page.evaluate(async phase => {
      const {resolveCharacterVisual, CLASS_STYLES} = await import('../js/character_catalog3d.mjs');
      const {createCharacterRenderer} = await import('../js/character3d.mjs');
      const data=window.BodyArmorData, view=createCharacterRenderer({size:480});
      const forms=['form_fang','form_brute','form_stone','form_apex'], tiers=[0,4,7,13];
      const images={},stats={},peaks={gear:0,form:0,accessorized:0};
      const resources=()=>({...view.renderer.info.memory,programs:view.renderer.info.programs.length});
      const sample=document.createElement('canvas');sample.width=sample.height=480;
      const reader=sample.getContext('2d',{willReadFrequently:true});
      const pixels=canvas=>{
        reader.clearRect(0,0,sample.width,sample.height);reader.drawImage(canvas,0,0);
        return reader.getImageData(0,0,sample.width,sample.height).data;
      };
      const gear=(id,indices)=>resolveCharacterVisual(data,id,{
        main:{baseId:data.PLAYER_STARTER_LOADOUTS[id].main},...Object.fromEntries(
          ['head','chest','gloves','boots','belt'].map((slot,n)=>[slot,{baseId:(slot==='head'?'helm':slot)+'_t'+indices[n]}]))}).equipment;
      const pose=(ang,state='idle',t=.1)=>({state,t,ang,ex:{walkPh:t*2*Math.PI}});
      function render(id,equip,form,angle,state,t) {
        const canvas=view.render(pose(angle,state,t),equip,id,form);
        const group=form?'form':equip.ring2?'accessorized':'gear';
        peaks[group]=Math.max(peaks[group],view.renderer.info.render.calls);
        return canvas;
      }
      function strip(id,equipment,form,key) {
        const frames=[];
        let span=0,rise=0,drop=0;
        for(let dir=0;dir<8;dir++) {
          const source=render(id,equipment,form,dir*Math.PI/4);
          const copy=document.createElement('canvas');copy.width=source.width;copy.height=source.height;
          const c=copy.getContext('2d');c.drawImage(source,0,0);
          const pix=c.getImageData(0,0,copy.width,copy.height).data;
          for(let i=3;i<pix.length;i+=4)if(pix[i]>8){
            const x=((i-3)/4)%copy.width,y=Math.floor((i-3)/4/copy.width);
            span=Math.max(span,Math.abs(x-view.anchor.x));rise=Math.max(rise,view.anchor.y-y);drop=Math.max(drop,y-view.anchor.y);
          }
          frames.push(copy);
        }
        if(rise<40)throw Error(key+' invisible');
        const sheet=document.createElement('canvas'),w=178,h=220;sheet.width=w*8;sheet.height=h;
        const c=sheet.getContext('2d'),scale=Math.min((w/2-6)/span,(h-15)/(rise+drop));
        c.fillStyle='#24262a';c.fillRect(0,0,sheet.width,h);
        frames.forEach((f,i)=>c.drawImage(f,(i+.5)*w-view.anchor.x*scale,h-7-(drop+view.anchor.y)*scale,f.width*scale,f.height*scale));
        images[key]=sheet.toDataURL('image/webp',.96).split(',')[1];
      }
      function checkPanels(id,items){
        if(phase==='before')return;
        const col=Object.keys(CLASS_STYLES).indexOf(id),families=['light','mail','plate','mythic'];
        for(const slot of ['head','chest','gloves','boots','belt']){
          const rows=new Set(),part=view.model.attachments.get(slot);
          if(part?.key!==items[slot].key)throw Error(id+' incorrect '+slot);
          const roots=[...part.objects];
          if(slot==='chest')roots.push(view.model.armor[items.chest.family],view.model.armorLimbs);
          for(const root of roots)root.traverse(object=>{
            const uv=object.geometry?.attributes.garmentUv;
            if(!uv)return;
            for(let i=0;i<uv.count;i+=Math.max(1,Math.floor(uv.count/31))){
              if(Math.floor(uv.getX(i)*5)!==col)throw Error(id+' foreign class painting on '+slot);
              rows.add(9-Math.floor(uv.getY(i)*10));
            }
          });
          const rank=families.indexOf(items[slot].family);
          if(!rows.has(rank) || slot==='gloves'&&!rows.has(7) || slot==='boots'&&!rows.has(8))
            throw Error(id+'/'+slot+' fabric missing from rank '+rank+' in '+[...rows].join(','));
        }
      }
      try {
        view.setRegion({theme:'snowwild'});
        for(const id of Object.keys(CLASS_STYLES)){
          for(const tier of tiers){
            const outfit=gear(id,Array(5).fill(tier));
            strip(id,outfit,null,id+'-t'+tier);checkPanels(id,outfit);
          }
          const mixed=gear(id,[0,7,4,13,0]),other=gear(id,[13,4,13,0,7]);
          if(phase==='after'){
            const weapons=Object.values(data.BASES).filter(b=>b.slot==='main'&&b.id.endsWith('_t13'));
            for(const ranks of [...tiers.map(t=>Array(5).fill(t)),[0,7,4,13,0],[13,4,13,0,7]]){
              const armor=gear(id,ranks);
              for(const weapon of weapons){
                const raw=Object.fromEntries(Object.entries(armor).filter(([,item])=>item).map(([slot,item])=>[slot,{baseId:item.baseId}]));
                Object.assign(raw,{main:{baseId:weapon.id},ring1:{baseId:'ring_t13'},ring2:{baseId:'ring_t12'},amulet:{baseId:'amulet_t13'}});
                if(!weapon.twoHand)raw.off={baseId:'shield_t13'};
                const full=resolveCharacterVisual(data,id,raw).equipment;
                for(const state of ['idle','attack','cast'])render(id,full,null,1.25,state,.55);
              }
            }
          }
          const draw=(eq,form=null)=>render(id,eq,form,1.25,'attack',.46);
          if(id==='wildkeeper')for(const form of forms)strip(id,mixed,form,form);
          let checkedReturns=0;
          const cycle=()=>{
            draw(other);const equipped=draw(mixed);
            const look=phase==='after'&&id==='wildkeeper'?pixels(equipped):null;
            if(id==='wildkeeper')for(const form of forms){
              draw(mixed,form);const returned=draw(mixed);
              for(const [slot,item] of Object.entries(mixed))if(item && view.model.attachments.get(slot)?.key!==item.key)
                throw Error('Lost '+slot+' after '+form);
              if(look){
                if(!pixels(returned).every((byte,i)=>byte===look[i]))throw Error('Changed rendered outfit after '+form);
                checkedReturns++;
              }
            }
          };
          cycle();checkPanels(id,mixed);const warm=resources();
          checkedReturns=0;
          for(let i=0;i<20;i++)cycle();
          stats[id]={warm,settled:resources(),cycles:20,pixelMatchedReturns:checkedReturns};
        }
      } finally {view.dispose();}
      return {images,stats,peaks};
    },phase);
    for(const [id,bytes] of Object.entries(result.images))fs.writeFileSync(path.join(out,id+'.webp'),Buffer.from(bytes,'base64'));
    const {stats,peaks}=result;
    fs.writeFileSync(path.join(out,'outfits.json'),JSON.stringify({peaks,stats},null,2)+'\n');
    assert.deepEqual(errors,[]);
    if(phase==='after'){
      assert.ok(peaks.gear<=73,'Outfit exceeded draw budget: '+peaks.gear);
      assert.ok(peaks.form<=73,'Form exceeded draw budget: '+peaks.form);
      assert.ok(peaks.accessorized<=73,'Fully equipped hero exceeded draw budget: '+peaks.accessorized);
      for(const [id,{warm,settled}] of Object.entries(stats))assert.deepEqual(warm,settled,id+' GPU resource growth');
    }
    console.log(phase,24*8,'facings',peaks);
  } finally {await browser.close();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
