// Close lens on the armory rig. Use production bones to keep the camera on the
// same fitting while changing classes, helmets, and independently equipped limbs.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
async function run(){
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto((process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741')+'/tests/body_armor3d_review.html');
    await page.waitForFunction(()=>document.body.dataset.testStatus==='ready',null,{timeout:120000});
    const {images,checks}=await page.evaluate(async()=>{
      const {Vector3}=await import('../js/vendor/three/three.module.min.js');
      const {createCharacterRenderer}=await import('../js/character3d.mjs');
      const {CLASS_STYLES,resolveCharacterVisual}=await import('../js/character_catalog3d.mjs');
      const view=createCharacterRenderer({size:420,presentation:true}),data=window.BodyArmorData;
      const images={},checks={};
      try{
        for(const id of Object.keys(CLASS_STYLES)){
          const loadout=Object.fromEntries(Object.entries(data.PLAYER_STARTER_LOADOUTS[id]).map(([s,baseId])=>[s,{baseId}]));
          const equip=(more={})=>resolveCharacterVisual(data,id,{...loadout,...more}).equipment;
          const starter=equip(),mixed=equip({head:{baseId:'helm_t4'},gloves:{baseId:'gloves_t7'},boots:{baseId:'boots_t4'},belt:{baseId:'belt_t7'}});
          const mythic=equip({head:{baseId:'helm_t13'},chest:{baseId:'chest_t13'}});
          const w=204,canvas=document.createElement('canvas');canvas.width=4*w;canvas.height=2*w;
          const ctx=canvas.getContext('2d');ctx.fillStyle='#28292c';ctx.fillRect(0,0,canvas.width,canvas.height);
          function close(n,kit,bone,offset,ang,span){
            const pose={state:'idle',ang,t:.2,ex:{}};
            view.render(pose,kit,id);
            const target=view.model.joints[bone].localToWorld(new Vector3(...offset));
            view.camera.position.copy(target).add(new Vector3(0,1,6));view.camera.lookAt(target);
            Object.assign(view.camera,{left:-span/2,right:span/2,top:span/2,bottom:-span/2});view.camera.updateProjectionMatrix();
            ctx.drawImage(view.render(pose,kit,id),n%4*w,Math.floor(n/4)*w,w,w);
          }
          close(0,starter,'Head',[0,.047,0],1.18,.46);
          close(1,starter,'Head',[0,.047,0],.09,.46);
          close(2,mixed,'Head',[0,.063,0],1.20,.56);
          close(3,mythic,'Head',[0,.10,0],-1.17,.72);
          close(4,starter,'HandR',[0,-.034,0],1.46,.32);
          close(5,mixed,'HandL',[0,.025,0],1.64,.36);
          close(6,mixed,'FootL',[0,.071,.008],1.36,.49);
          close(7,mixed,'Hips',[0,.064,.012],1.22,.68);
          images[id]=canvas.toDataURL('image/webp',.97).split(',')[1];
          // Sample the same secondary-motion driver used for live locomotion.
          const garment=view.model.root.getObjectByName('CoatPanel0');
          const gait=t=>view.render({state:'walk',ang:1.23,t,ex:{walkPh:t*2*Math.PI,animation:{secondary:.08}}},starter,id);
          gait(.18);const q=garment.quaternion.clone();gait(.66);
          const clothTravel=q.angleTo(garment.quaternion);
          if(clothTravel<.001)throw Error(id+' cloth did not move');
          const hair=()=>['Hair','HairAtNape'].filter(name=>view.model.root.getObjectByName(name).visible);
          const baseHair=hair();
          view.render({state:'idle',t:0,ang:1},mixed,id);const mailHair=hair();
          view.render({state:'idle',t:0,ang:1},mythic,id);const mythicHair=hair();
          if(id==='emberwitch'&&mailHair[0]!=='Hair'||id==='vanguard'&&(mailHair[0]!=='HairAtNape'||mythicHair.length))
            throw Error(id+' helmet coverage');
          checks[id]={baseHair,mailHair,mythicHair,clothTravelRadians:clothTravel};
        }
        for(const form of ['form_fang','form_brute','form_stone','form_apex']){
          const tile=232,canvas=document.createElement('canvas');canvas.width=tile*4;canvas.height=tile;
          const ctx=canvas.getContext('2d');ctx.fillStyle='#28292c';ctx.fillRect(0,0,canvas.width,canvas.height);
          [['Head',1.54,.76,'idle'],['Head',.3,.84,'attack'],['Paw1:0',1.02,.57,'walk'],['Torso',-1.42,1.58,'idle']].forEach(([bone,ang,span,state],n)=>{
            const pose={state,ang,t:state==='attack'?.42:.18,ex:{}};
            view.render(pose,{},'wildkeeper',form);
            const target=view.model.joints[bone].localToWorld(new Vector3(0,0,bone==='Head'?.10:0));
            view.camera.position.copy(target).add(new Vector3(0,1.35,6));view.camera.lookAt(target);
            Object.assign(view.camera,{left:-span/2,right:span/2,top:span/2,bottom:-span/2});view.camera.updateProjectionMatrix();
            ctx.drawImage(view.render(pose,{},'wildkeeper',form),n*tile,0,tile,tile);
          });
          images[form]=canvas.toDataURL('image/webp',.97).split(',')[1];
        }
      }finally{view.dispose();}
      return {images,checks};
    });
    assert.deepEqual(errors,[]);
    const out=path.join(__dirname,'qa','finished_heroes','details');fs.mkdirSync(out,{recursive:true});
    for(const [id,bytes] of Object.entries(images))fs.writeFileSync(path.join(out,id+'.webp'),Buffer.from(bytes,'base64'));
    fs.writeFileSync(path.join(out,'fittings.json'),JSON.stringify(checks,null,2)+'\n');
    console.log('PASS 56 close views, five cloth and helmet fittings.');
  }finally{await browser.close();}
}
run().catch(e=>{console.error(e);process.exitCode=1;});
