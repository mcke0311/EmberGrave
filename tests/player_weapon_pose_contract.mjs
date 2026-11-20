import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {Matrix4,Quaternion,Vector3} from '../js/vendor/three/three.module.min.js';
import {createAnimationController,createCharacter,STATES} from '../js/character3d.mjs';
import {CLASS_STYLES,catalogEntries,resolveCharacterVisual} from '../js/character_catalog3d.mjs';
const scope={console};vm.createContext(scope);vm.runInContext(fs.readFileSync('js/utils.js','utf8')+'\n'+fs.readFileSync('js/data.js','utf8')+'\nthis.data=DATA;',scope);const data=scope.data;
let checks=0,maxGripError=0,minShaftClearance=Infinity,minBowSpan=Infinity;
const ok=(condition,label)=>{assert.ok(condition,label);checks++;};
const point=new Vector3(),families=['bow_2h','crossbow_2h','staff_2h','spear_2h'];
const pose=(m,state,t,animation)=>m.animate({state,t,ex:{walkPh:t*Math.PI*2,animation}});
function clearShaft(m,label){
  for(const [bone,low,high,rx,rz] of [['Hips',-.04,.16,.205,.17],['Spine',-.06,.16,.215,.18],['Chest',-.13,.10,.265,.21]]){
    for(let i=0;i<=64;i++){
      point.set(0,-.55+i/64*1.8,0);m.joints[bone].worldToLocal(m.weapon.localToWorld(point));
      if(point.y<low||point.y>high)continue;
      const clearance=Math.hypot(point.x/rx,point.z/rz);minShaftClearance=Math.min(minShaftClearance,clearance);
      ok(clearance>1.02,label+': shaft enters '+bone+' armor envelope ('+clearance+')');
    }
  }
}
function checkBowTaps(model,classId,equipment){
  const dt=1/120;
  for(const frames of [1,5,11,18]){
    const controller=createAnimationController();
    const player={classId,x:0,y:0,visAng:Math.PI/2,buffs:[],animT:0,_playerVisual:{equipment}};
    const tick=()=>{player.animT+=dt;model.animate(controller.update(player,dt));};
    for(let i=0;i<24;i++)tick();
    player.drawing={t:0,maxDraw:1.25};
    for(let i=0;i<frames;i++){player.drawing.t+=dt;tick();}
    const held=model.rightPalm.getWorldPosition(new Vector3()),drawCharge=player.drawing.t/player.drawing.maxDraw;
    player.drawing=null;
    player.action={state:'attack',t:0,dur:.8,visual:{id:1,releases:[0],drawCharge}};
    tick();
    const step=model.rightPalm.getWorldPosition(new Vector3()).distanceTo(held);
    ok(step<.04,`${classId}: ${frames}-frame bow tap moves the drawing hand ${step} on release`);
    const forward=model.root.worldToLocal(model.weapon.localToWorld(new Vector3(0,0,1))).sub(model.root.worldToLocal(model.weapon.getWorldPosition(new Vector3()))).normalize();
    ok(forward.z>.99,`${classId}: ${frames}-frame bow tap fires off-axis`);
  }
}
function checkBowShots(model,classId){
  const bows=catalogEntries(data,'main').filter(entry=>data.BASES[entry.item.baseId].playerVisualFamily==='bow_2h');
  const {Head,UpperArmR,ForearmR,HandR}=model.joints;
  const atHead=node=>Head.worldToLocal(node.getWorldPosition(new Vector3()));
  for(const [index,entry] of bows.entries()){
    const gear={main:entry.item,chest:{baseId:'chest_t13'},head:{baseId:'helm_t13'},gloves:{baseId:'gloves_t13'}};
    const equipment=resolveCharacterVisual(data,classId,gear).equipment;
    model.equip(equipment);
    model.root.rotation.y=index*Math.PI/4;
    if(entry.id==='huntbow')checkBowTaps(model,classId,equipment);
    const label=classId+'/'+entry.id,weapon=model.weapon,release=.45;
    const nock=()=>weapon.userData.string.geometry.attributes.position.getZ(1);
    const checkArm=()=>{
      const chain=[UpperArmR,ForearmR,HandR,model.rightPalm].map(atHead);
      let clearance=Infinity;
      // A padded head volume includes the hood and the thickness of the arm.
      for(let j=1;j<chain.length;j++)for(let k=0;k<=6;k++){
        point.lerpVectors(chain[j-1],chain[j],k/6);
        clearance=Math.min(clearance,Math.hypot(point.x/.163,(point.y-.04)/.19,(point.z-.008)/.165));
      }
      ok(clearance>1.02,label+': drawing arm crosses the head');
      const palm=chain[3];
      if(palm.y>-.16)ok(palm.x<-.11&&palm.z>.05,label+': drawing hand passes behind the face');
      return palm;
    };
    for(let i=0;i<=48;i++){pose(model,'attack',i/48,{releases:[release]});checkArm();}
    pose(model,'attack',release,{releases:[release]});
    const contact=checkArm(),elbow=atHead(ForearmR);
    ok(contact.y>-.13&&contact.y<-.03&&elbow.x<contact.x-.07&&elbow.y<contact.y-.06,label+': elbow rises across the cheek at release');
    for(const side of ['R','L']){
      const hand=model.joints['Hand'+side],wrist=hand.getWorldPosition(new Vector3());
      const forearm=model.joints['Forearm'+side].getWorldPosition(new Vector3()).sub(wrist);
      ok(forearm.angleTo(hand.localToWorld(new Vector3(0,1,0)).sub(wrist))<Math.PI/4,label+': wrist folds back at release');
    }
    pose(model,'attack',release+.11,{releases:[release]});
    const follow=checkArm();
    ok(follow.y<contact.y-.055&&follow.z>contact.z-.015,label+': follow-through pulls the hand toward the back of the head');
    for(const charge of [0,.25,.65,1]){
      pose(model,'draw',charge);
      const held=checkArm(),string=nock();
      ok(weapon.userData.arrow.visible&&Math.abs(string-weapon.userData.primary[2])<1e-6,label+': fingers lose the nocked arrow');
      pose(model,'attack',0,{releases:[0],drawCharge:charge});
      ok(!weapon.userData.arrow.visible&&Math.abs(nock()-string)<1e-6&&checkArm().distanceTo(held)<1e-5,label+': quick release jumps to a different draw length');
    }
    for(const state of ['release','reload']){pose(model,state,.5);checkArm();}
    for(let i=0;i<=10;i++){
      pose(model,'walk',.18,{turn:2,blend:{from:{state:'draw',t:1},weight:i/10}});checkArm();
    }
  }
  model.root.rotation.y=0;
}
function checkHeavyAttacks(model,classId){
  const inActor=(object,x=0,y=0,z=0)=>model.root.worldToLocal(object.localToWorld(new Vector3(x,y,z)));
  const armor={head:{baseId:'helm_t13'},chest:{baseId:'chest_t13'},gloves:{baseId:'gloves_t13'},boots:{baseId:'boots_t13'}};
  const uniqueBoot=data.UNIQUES.find(item=>data.BASES[item.base]?.slot==='boots');
  const envelopes=[['Head',-.08,.16,.125,.116],['Chest',-.15,.075,.233,.148],['Spine',-.07,.13,.19,.142],['Hips',-.07,.14,.175,.129]];
  for(const id of ['sword2h_t13','axe2h_t13','u_gen_0_6','u_gen_1_9']){
    const unique=data.UNIQUES.find(u=>u.id===id),main=unique?{baseId:unique.base,uniqueId:id,rarity:'unique'}:{baseId:id};
    const boots=unique?{baseId:uniqueBoot.base,uniqueId:uniqueBoot.id,rarity:'unique'}:armor.boots;
    const gear=resolveCharacterVisual(data,classId,{...armor,boots,main}).equipment;
    model.equip(gear);
    const weapon=model.weapon,label=classId+'/'+id,axe=gear.main.family==='axe_2h';
    const hands=[['R',model.rightPalm,weapon.userData.primary],['L',model.supportSocket,weapon.userData.support]];
    const bootMarks=[];
    for(const boot of model.attachments.get('boots').objects){
      let cuff,sole;
      boot.traverse(mesh=>{
        if(!mesh.isMesh)return;
        const g=mesh.geometry,w=g.attributes.skinWeight,p=g.attributes.position;
        for(let i=0;i<p.count;i++){
          const y=p.getY(i);
          if(w?.getY(i)===1&&(!cuff||y>cuff.y))cuff={mesh,i,y,joint:boot.parent.parent};
          if((!w||w.getX(i)===1)&&(!sole||y<sole.y))sole={mesh,i,y,joint:boot.parent};
        }
      });
      ok(cuff&&sole,label+': missing cuff or sole');
      bootMarks.push(cuff,sole);
    }
    const checkGrips=()=>{
      for(const [side,palm,grip] of hands){
        const error=inActor(weapon,...grip).distanceTo(inActor(palm));maxGripError=Math.max(maxGripError,error);
        ok(error<1e-6,label+': '+side+' palm left the handle');
      }
    };
    const tips=[],previous={};
    let frontAnkle,backToe;
    for(let i=0;i<=160;i++){
      pose(model,'attack',i/160,{releases:[.5]});
      tips.push(inActor(weapon,0,1.07));
      checkGrips();
      for(const [side] of hands){
        const bone=model.joints['Hand'+side],wrist=inActor(bone),forearm=inActor(model.joints['Forearm'+side]).sub(wrist);
        ok(forearm.angleTo(inActor(bone,0,1).sub(wrist))<Math.PI/3,label+': gauntlet folds back on the forearm');
        const q=new Quaternion().setFromRotationMatrix(new Matrix4().copy(model.root.matrixWorld).invert().multiply(bone.matrixWorld));
        if(previous[side])ok(q.angleTo(previous[side])<.53,label+': hand flips around the handle');
        previous[side]=q;
      }
      const lead=inActor(model.joints.FootL),toe=inActor(model.joints.FootR,0,0,.14);
      if(i===0){frontAnkle=lead;backToe=toe;}
      ok(Math.hypot(lead.x-frontAnkle.x,lead.z-frontAnkle.z,toe.x-backToe.x,toe.z-backToe.z)<1e-5,label+': boot slides during weight transfer');
      if(i%8===0)for(const mark of bootMarks){
        const local=mark.joint.worldToLocal(mark.mesh.localToWorld(mark.mesh.getVertexPosition(mark.i,new Vector3())));
        if(i===0)mark.start=local;
        else ok(local.distanceTo(mark.start)<1e-6,label+': boot separates from its joint');
      }
      // Cover the pommel, both grips and the shaft at the extreme points of the arc.
      if(i%4===0)for(const [bone,bottom,top,width,depth] of envelopes)for(let j=0;j<=30;j++){
        point.set(0,-.39+j*.05,0);model.joints[bone].worldToLocal(weapon.localToWorld(point));
        if(point.y>=bottom&&point.y<=top)ok(Math.hypot(point.x/width,point.z/depth)>1,label+': shaft enters '+bone);
      }
    }
    const wind=tips.slice(28,66),follow=tips[110];
    if(axe){
      ok(Math.max(...wind.map(v=>v.y))-tips[80].y>1.1,label+': axe misses the high anticipation');
      ok(follow.y<.40&&follow.z>.75,label+': axe misses its low finish');
    }else{
      ok(Math.min(...wind.map(v=>v.x))<-.9&&follow.x>.95,label+': blade misses the cross-body sweep');
    }
    for(const release of [.22,.50,.73]){
      pose(model,'attack',release,{releases:[release]});
      const contact=inActor(weapon,0,1.07),direction=contact.clone().sub(inActor(weapon)).normalize();
      ok(direction.z>.90&&contact.z>1.45,label+': swing misses the gameplay contact');
      pose(model,'attack',release+(1-release)*.10,{releases:[release]});
      ok(inActor(weapon,0,1.07).distanceTo(contact)>.30,label+': weapon freezes at contact');
    }
    for(const state of ['idle','walk','death'])for(let i=0;i<=12;i++){
      pose(model,state,i/50,{blend:{from:{state:'attack',t:.57},weight:i/12}});checkGrips();
    }
    pose(model,'attack',.50,{releases:[.5]});
    ok(inActor(weapon,0,1.07).distanceTo(tips[80])<1e-8,label+': interrupted swing depends on playback history');
  }
}
for(const id of Object.keys(CLASS_STYLES)){
  const m=createCharacter(id);
  for(const family of families)for(const tier of [0,13]){
    const base=Object.values(data.BASES).find(b=>b.playerVisualFamily===family&&b.id.endsWith('_t'+tier)),raw=Object.fromEntries(['head','chest','gloves','boots','belt'].map(s=>[s,{baseId:(s==='head'?'helm':s)+'_t'+tier}]));raw.main={baseId:base.id};
    m.equip(resolveCharacterVisual(data,id,raw).equipment);
    for(const state of [...STATES,'draw','channel','charge','spin','airborne'])for(let i=0;i<=40;i++){
      const t=i/40,label=[id,family,tier,state,t].join('/');
      m.root.rotation.y=Math.floor(i/6)*Math.PI/4;pose(m,state,t);
      for(const [anchor,palm] of [[m.weapon.userData.primary,m.rightPalm],[m.weapon.userData.support,m.supportSocket]]){
        const error=m.weapon.localToWorld(point.set(...anchor)).distanceTo(palm.getWorldPosition(new Vector3()));maxGripError=Math.max(maxGripError,error);ok(error<.000001,label+': wrist detaches');
      }
      if((family==='staff_2h'||family==='spear_2h')&&!['death','dead'].includes(state))clearShaft(m,label);
    }
    m.root.rotation.y=0;
    const snapshot=()=>JSON.stringify({weapon:m.weapon.matrixWorld.toArray(),primary:m.weapon.userData.primary,string:m.weapon.userData.string?Array.from(m.weapon.userData.string.geometry.attributes.position.array):null,arrow:m.weapon.userData.arrow?.visible,arrowPosition:m.weapon.userData.arrow?.position.toArray(),limbs:m.weapon.userData.bowLimbs.map(l=>l.rotation.toArray())});
    pose(m,'idle',.37);const clean=snapshot();pose(m,'draw',1);pose(m,'attack',.70);pose(m,'dead',1);pose(m,'idle',.37);ok(snapshot()===clean,id+'/'+family+': weapon retains another render pose');
    if(family==='bow_2h'){
      pose(m,'draw',1);const span=m.root.worldToLocal(m.rightPalm.getWorldPosition(new Vector3())).distanceTo(m.root.worldToLocal(m.supportSocket.getWorldPosition(new Vector3())));minBowSpan=Math.min(minBowSpan,span);ok(span>.55,id+': bow draw is cramped');
      const string=m.weapon.userData.string.geometry.attributes.position;
      ok(Math.abs(string.getZ(1)-m.weapon.userData.primary[2])<1e-6,id+': drawing fingers miss string');
      ok(Math.abs(m.weapon.userData.arrow.position.z-.08-string.getZ(1))<1e-6,id+': arrow nock misses string');
      for(const limb of m.weapon.userData.bowLimbs){const sign=limb.userData.side,tip=new Vector3(0,sign*.53,-.27).applyEuler(limb.rotation).add(limb.position);ok(tip.distanceTo(new Vector3().fromBufferAttribute(string,sign<0?0:2))<1e-6,id+': string leaves bent bow tip');ok(Math.abs(limb.rotation.x)>.1,id+': bow limbs do not take tension');}
      const hand=m.root.worldToLocal(m.rightPalm.getWorldPosition(new Vector3())),head=m.root.worldToLocal(m.joints.Head.getWorldPosition(new Vector3()));
      ok(head.y-hand.y<.30&&head.y-hand.y>0,id+': draw anchor below the face');
      pose(m,'attack',.54);ok(m.weapon.userData.primary[2]<string.getZ(1)-.12,id+': release drags drawing hand forward with string');
    }
    if(family==='crossbow_2h'){
      pose(m,'attack',.4);const forward=m.weapon.localToWorld(new Vector3(0,0,1)).sub(m.weapon.getWorldPosition(new Vector3())).normalize();ok(forward.z>.995,id+': crossbow does not aim along facing');
      ok(m.weapon.userData.support[2]-m.weapon.userData.primary[2]>.20,id+': crossbow support is not ahead of trigger');
      pose(m,'attack',.70);ok(m.weapon.userData.primary[1]>.025,id+': recovery does not recock the string');
    }
    if(family==='bow_2h'||family==='crossbow_2h')for(const release of [0,.17,.45,.73]){
      if(release>0){pose(m,'attack',release-.00001,{releases:[release]});ok(m.weapon.userData.arrow.visible,id+'/'+family+': projectile disappears early');}
      pose(m,'attack',release,{releases:[release]});ok(!m.weapon.userData.arrow.visible,id+'/'+family+': projectile remains at release');
    }
    // Interrupt an aimed/held pose into locomotion, a cast, and death.
    for(const state of ['walk','cast','death'])for(let i=0;i<=20;i++){
      const t=i/20;pose(m,state,t*.24,{blend:{from:{state:'draw',t:1},weight:t}});
      for(const [anchor,palm] of [[m.weapon.userData.primary,m.rightPalm],[m.weapon.userData.support,m.supportSocket]])ok(m.weapon.localToWorld(point.set(...anchor)).distanceTo(palm.getWorldPosition(new Vector3()))<.000001,id+'/'+family+'/'+state+': interrupted grip detaches');
      if((family==='staff_2h'||family==='spear_2h')&&state!=='death')clearShaft(m,id+'/'+family+'/'+state+' transition');
    }
  }
  checkBowShots(m,id);checkHeavyAttacks(m,id);m.dispose();
}
console.log(JSON.stringify({status:'PASS',checks,maxGripError,minShaftClearance,minBowSpan},null,2));
