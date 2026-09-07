// Class-authored body poses. The authored contact pose is mapped to the game's
// common melee, ranged and casting delays without changing gameplay duration.
export const CLASS_ANIMATIONS={
  vanguard:{name:'Iron discipline',description:'Planted guard, marching steps, forceful cuts and a shield-braced recoil.',stride:.43,knee:.65,crouch:.10,sway:.015,breath:.007,cloth:.06,
    stance:{Spine:[.025,0,0],Chest:[0,-.035,0],UpperArmL:[-.18,0,.18],UpperArmR:[-.18,.05,-.14],ForearmL:[-.34,0,0],ForearmR:[-.42,0,0]},
    attack:[
      [.22,-.018,{Chest:[-.035,-.25,0],UpperArmR:[-1.02,-.35,-.08],ForearmR:[-.72,0,0],UpperArmL:[-.18,0,.12]}],
      [.4,-.045,{Spine:[.10,0,0],Chest:[.035,.26,-.025],UpperArmR:[-.73,.48,-.42],ForearmR:[.20,0,0],UpperArmL:[-.28,0,.12]}],
      [.64,-.027,{Chest:[.04,.15,-.025],UpperArmR:[-.32,.30,-.35],ForearmR:[.12,0,0]}]],
    cast:[
      [.22,-.035,{Spine:[.10,0,0],UpperArmL:[-.48,0,.18],ForearmL:[-.64,0,0],UpperArmR:[-.25,0,-.15]}],
      [.4,.015,{Spine:[-.08,0,0],Chest:[-.06,0,0],UpperArmL:[-1.17,0,.32],ForearmL:[.08,0,0],UpperArmR:[-.60,0,-.22],Head:[-.08,0,0]}],
      [.64,0,{UpperArmL:[-.70,0,.22],UpperArmR:[-.25,0,-.12]}]],
    hit:[ [.14,-.06,{Spine:[-.17,0,0],Chest:[0,-.10,0],Head:[-.12,0,0],UpperArmL:[-.28,0,.14],ForearmL:[-.25,0,0]}], [.48,-.025,{Spine:[.09,0,0],UpperArmL:[-.18,0,.08]}] ],
    death:[ [.24,-.12,{Spine:[.22,0,0],Head:[.16,0,0],ThighL:[-.28,0,0],ShinL:[.52,0,0],ThighR:[-.22,0,0],ShinR:[.44,0,0]}], [.52,-.40,{Hips:[-.55,.05,.05],Spine:[.18,0,0],ThighL:[-.38,0,0],ShinL:[.85,0,0],ShinR:[.44,0,0],UpperArmL:[-.13,0,.16]}], [1,-.76,{Hips:[-1.53,0,.08],Spine:[.10,0,0],Head:[.19,.08,0],UpperArmL:[.12,0,.55],UpperArmR:[.20,0,-.55],ForearmL:[.20,0,0],ForearmR:[.18,0,0],ThighL:[.04,0,.10],ThighR:[-.16,0,-.08],ShinR:[.32,0,0]}] ]},
  emberwitch:{name:'Cinder dance',description:'Poised steps, flowing wrists, gathering flame and a sweeping release.',stride:.34,knee:.73,crouch:.035,sway:.025,breath:.014,cloth:.16,
    stance:{Spine:[-.015,.025,.025],Chest:[0,-.07,-.025],Head:[.02,.04,0],UpperArmL:[-.22,-.10,.26],UpperArmR:[-.28,.06,-.18],ForearmL:[-.55,0,-.08],ForearmR:[-.58,0,.06],HandL:[0,0,.18]},
    attack:[ [.22,.01,{Chest:[-.06,-.22,.07],UpperArmR:[-.40,-.32,-.16],ForearmR:[-.66,0,0],HandR:[0,.25,.12],UpperArmL:[-.18,0,.15]}], [.4,.015,{Spine:[.08,0,0],Chest:[0,.20,-.07],UpperArmR:[-1.12,.16,-.13],ForearmR:[.40,0,0],HandR:[-.16,0,-.12],UpperArmL:[-.38,0,.36]}], [.64,0,{Chest:[.03,.17,-.03],UpperArmR:[-.73,.28,-.22],ForearmR:[.18,0,0],UpperArmL:[-.27,0,.26]}] ],
    cast:[ [.22,-.025,{Chest:[-.06,-.18,.06],UpperArmL:[-.45,-.18,.26],ForearmL:[-.72,0,-.25],UpperArmR:[-.49,.22,-.26],ForearmR:[-.57,0,.20],Head:[.13,-.12,0]}], [.4,.045,{Spine:[-.08,0,-.02],Chest:[-.04,.19,-.05],UpperArmL:[-1.17,-.14,.52],ForearmL:[.20,0,-.15],HandL:[-.20,-.15,.23],UpperArmR:[-.90,.25,-.37],ForearmR:[.23,0,.10],Head:[-.09,.12,0]}], [.64,.02,{Chest:[-.03,.12,-.04],UpperArmL:[-.78,-.1,.60],UpperArmR:[-.52,.12,-.38],ForearmL:[-.1,0,-.2]}] ],
    hit:[ [.16,-.065,{Spine:[-.16,0,.16],Chest:[-.10,.17,0],Head:[-.11,-.16,-.12],UpperArmL:[-.46,0,.30],UpperArmR:[-.25,0,-.28]}], [.53,-.028,{Spine:[.05,0,-.04],UpperArmL:[-.18,0,.12]}] ],
    death:[ [.26,-.11,{Spine:[.10,0,.18],Chest:[-.10,.24,0],Head:[.16,-.2,.08],UpperArmL:[-.65,0,.30]}], [.57,-.44,{Hips:[-.24,.1,.75],Spine:[.13,.15,.14],UpperArmL:[-.38,0,.42],UpperArmR:[.22,0,-.15],ThighL:[-.42,0,.12],ShinL:[.9,0,0],ShinR:[.38,0,0]}], [1,-.76,{Hips:[-.32,.16,1.48],Spine:[.12,.12,.03],Head:[.24,-.14,.08],UpperArmL:[-.28,0,.26],UpperArmR:[.25,0,-.22],ForearmL:[-.28,0,0],ForearmR:[.30,0,0],ThighL:[-.52,0,.05],ShinL:[.95,0,0],ThighR:[-.2,0,-.04],ShinR:[.5,0,0]}] ]},
  gravebinder:{name:'Ossuary rites',description:'Stooped shuffling, crooked beckoning and deliberate soul-raising gestures.',stride:.25,knee:.42,crouch:.17,sway:.02,breath:.01,cloth:.12,
    stance:{Spine:[.13,0,0],Chest:[.07,-.03,0],Head:[-.12,0,-.02],UpperArmL:[-.30,-.15,.28],UpperArmR:[-.20,.10,-.23],ForearmL:[-.72,0,-.18],ForearmR:[-.53,0,.08],HandL:[.16,-.12,.12]},
    attack:[ [.22,-.025,{Spine:[.09,0,0],Chest:[.04,-.16,0],UpperArmR:[-.30,-.28,-.15],ForearmR:[-.65,0,0],Head:[.11,0,0]}], [.4,-.035,{Spine:[.13,0,0],Chest:[.03,.25,0],UpperArmR:[-.92,.25,-.27],ForearmR:[.25,0,0],UpperArmL:[-.52,0,.18],HandL:[.22,0,.12]}], [.64,-.03,{Chest:[.07,.18,0],UpperArmR:[-.61,.12,-.15],UpperArmL:[-.30,0,.21]}] ],
    cast:[ [.22,-.07,{Spine:[.16,0,0],Head:[.12,0,0],UpperArmL:[-.34,-.20,.22],UpperArmR:[-.36,.15,-.18],ForearmL:[.14,0,-.18],HandL:[.25,0,.24]}], [.4,.02,{Spine:[-.12,0,0],Chest:[-.09,0,0],Head:[-.12,0,0],UpperArmL:[-1.04,-.22,.34],UpperArmR:[-.86,.15,-.28],ForearmL:[-.18,0,-.3],ForearmR:[-.14,0,.20],HandL:[.36,0,.2]}], [.64,0,{UpperArmL:[-.92,-.2,.33],UpperArmR:[-.72,.12,-.26],HandL:[-.18,0,.26],Head:[.03,.08,0]}] ],
    hit:[ [.18,-.09,{Spine:[.24,0,-.08],Chest:[.12,-.12,0],Head:[.17,.08,0],UpperArmL:[.15,0,.3],UpperArmR:[.10,0,-.24]}], [.62,-.04,{Spine:[.10,0,.03],Head:[.05,0,0]}] ],
    death:[ [.24,-.17,{Spine:[.28,0,0],Head:[.25,0,0],UpperArmL:[.08,0,.18],UpperArmR:[.12,0,-.14],ThighL:[-.35,0,0],ShinL:[.7,0,0],ShinR:[.55,0,0]}], [.57,-.53,{Hips:[.65,-.1,-.08],Spine:[.28,0,0],Head:[.24,0,0],ThighL:[-.4,0,0],ShinL:[.85,0,0],ThighR:[-.2,0,0],ShinR:[.65,0,0],UpperArmL:[-.32,0,.30]}], [1,-.73,{Hips:[1.42,-.07,-.1],Spine:[.06,0,0],Chest:[-.06,0,0],Head:[.2,.18,0],UpperArmL:[-.4,0,.3],UpperArmR:[-.4,0,-.3],ForearmL:[.25,0,0],ForearmR:[.15,0,0],ThighL:[-.30,0,.06],ShinL:[.6,0,0],ThighR:[-.45,0,-.08],ShinR:[.85,0,0]}] ]},
  wildkeeper:{name:'Primal weight',description:'Broad grounded strides, brutal sweeps and an earth-calling rise.',stride:.49,knee:.84,crouch:.24,sway:.035,breath:.019,cloth:.09,
    stance:{Spine:[.095,0,0],Chest:[.035,-.05,0],Head:[-.07,0,0],UpperArmL:[-.19,-.08,.34],UpperArmR:[-.24,.06,-.33],ForearmL:[-.38,0,0],ForearmR:[-.45,0,0]},
    attack:[ [.22,-.075,{Spine:[-.08,0,0],Chest:[-.04,-.40,.04],UpperArmR:[-1.02,-.42,-.30],ForearmR:[-.40,0,0],UpperArmL:[-.40,0,.20]}], [.4,-.10,{Spine:[.18,0,0],Chest:[.08,.39,-.06],UpperArmR:[-.64,.58,-.61],ForearmR:[.20,0,0],UpperArmL:[-.36,0,.42],Head:[.10,.10,0]}], [.64,-.065,{Spine:[.12,0,0],Chest:[.04,.26,-.04],UpperArmR:[-.30,.38,-.45],UpperArmL:[-.24,0,.22]}] ],
    cast:[ [.22,-.15,{Spine:[.20,0,0],Chest:[.08,0,0],UpperArmL:[-.57,-.16,.40],UpperArmR:[-.52,.17,-.4],ForearmL:[.18,0,0],ForearmR:[.12,0,0],Head:[.16,0,0]}], [.4,.015,{Spine:[-.11,0,0],Chest:[-.12,0,0],Head:[-.13,0,0],UpperArmL:[-.98,-.1,.77],UpperArmR:[-.99,.1,-.68],ForearmL:[-.28,0,0],ForearmR:[-.2,0,0]}], [.64,-.02,{Spine:[-.04,0,0],UpperArmL:[-.60,0,.59],UpperArmR:[-.65,0,-.52]}] ],
    hit:[ [.16,-.105,{Spine:[.18,0,-.10],Chest:[0,.16,0],Head:[.12,-.12,0],UpperArmL:[-.22,0,.21],UpperArmR:[-.08,0,-.25]}], [.46,-.035,{Spine:[-.045,0,.04],Chest:[-.03,-.08,0]}] ],
    death:[ [.23,-.2,{Spine:[.20,0,0],Head:[.13,0,0],ThighL:[-.4,0,.1],ShinL:[.85,0,0],ThighR:[-.3,0,-.1],ShinR:[.65,0,0]}], [.55,-.48,{Hips:[.40,.10,-.60],Spine:[.16,0,0],UpperArmR:[-.48,0,-.4],ThighL:[-.42,0,.1],ShinL:[1.05,0,0],ShinR:[.55,0,0]}], [1,-.72,{Hips:[.35,.15,-1.48],Spine:[.10,0,0],Head:[.18,.16,0],UpperArmL:[.18,0,.44],UpperArmR:[-.55,0,-.20],ForearmL:[-.12,0,0],ForearmR:[.24,0,0],ThighL:[-.48,0,.09],ShinL:[.95,0,0],ThighR:[-.15,0,-.06],ShinR:[.4,0,0]}] ]},
  veilranger:{name:'Veil footwork',description:'Low quiet steps, quick precise releases and an evasive recoil.',stride:.44,knee:.86,crouch:.30,sway:.012,breath:.008,cloth:.13,
    stance:{Spine:[.08,0,-.035],Chest:[.025,-.12,.025],Head:[-.06,.1,0],UpperArmL:[-.24,-.08,.2],UpperArmR:[-.26,.13,-.20],ForearmL:[-.50,0,0],ForearmR:[-.68,0,0]},
    attack:[ [.22,-.055,{Spine:[.045,0,0],Chest:[-.02,-.28,.04],UpperArmR:[-.62,-.18,-.08],ForearmR:[-.30,0,0],UpperArmL:[-.35,0,.15]}], [.4,-.085,{Spine:[.13,0,0],Chest:[.02,.29,-.07],UpperArmR:[-.91,.45,-.24],ForearmR:[.43,0,0],UpperArmL:[-.26,0,.25]}], [.64,-.025,{Chest:[0,.10,0],UpperArmR:[-.18,.14,-.12],ForearmR:[.12,0,0]}] ],
    cast:[ [.22,-.12,{Spine:[.14,0,.13],Chest:[.07,-.20,0],UpperArmL:[-.43,-.12,.12],ForearmL:[-.33,0,-.12],UpperArmR:[-.20,.08,-.10]}], [.4,-.035,{Spine:[.03,0,-.07],Chest:[0,.20,-.04],UpperArmL:[-1.04,-.18,.25],ForearmL:[.35,0,-.10],HandL:[-.25,0,.10],UpperArmR:[-.45,.12,-.15]}], [.64,-.05,{Chest:[.02,.08,0],UpperArmL:[-.37,0,.24],ForearmL:[-.13,0,0]}] ],
    hit:[ [.13,-.13,{Spine:[.16,0,-.20],Chest:[.04,.19,0],Head:[.02,-.14,.13],UpperArmL:[-.40,0,.24],UpperArmR:[-.32,0,-.16]}], [.43,-.045,{Spine:[.06,0,.06],Chest:[0,-.09,0],UpperArmL:[-.15,0,.08]}] ],
    death:[ [.2,-.15,{Spine:[.20,0,-.15],Chest:[0,.16,0],ThighL:[-.30,0,.05],ShinL:[.65,0,0],ThighR:[-.4,0,-.08],ShinR:[.7,0,0]}], [.5,-.5,{Hips:[.18,-.2,-.82],Spine:[.19,0,-.1],UpperArmR:[-.45,0,-.12],ThighL:[-.58,0,.1],ShinL:[1.1,0,0],ThighR:[-.38,0,0],ShinR:[.85,0,0]}], [1,-.76,{Hips:[-.15,-.18,-1.52],Spine:[.22,0,-.03],Head:[.12,-.22,0],UpperArmL:[-.18,0,.25],UpperArmR:[-.30,0,-.12],ForearmL:[-.3,0,0],ForearmR:[-.18,0,0],ThighL:[-.68,0,.08],ShinL:[1.20,0,0],ThighR:[-.43,0,-.06],ShinR:[.8,0,0]}] ]}
};
const TAU=Math.PI*2,clamp=v=>Math.max(0,Math.min(1,v));
export const smooth=v=>{const x=clamp(v);return x*x*(3-2*x);};
const lerp=(a,b,t)=>a+(b-a)*t;
// Chamber the right knee, drive the sole forward at 50%, then plant it again.
// Deltas layer over each class's guard; the left foot remains the support foot.
const KICK_KEYS=[
  [.24,-.025,{Spine:[-.07,0,-.035],Chest:[0,-.08,0],ThighR:[-1.05,0,-.06],ShinR:[1.65,0,0],FootR:[-.35,0,0],UpperArmR:[.12,0,-.12]}],
  [.5,.012,{Spine:[-.16,0,-.045],Chest:[-.04,.12,0],ThighR:[-1.42,0,-.04],ShinR:[.15,0,0],FootR:[.18,0,0],UpperArmR:[.20,0,-.16],UpperArmL:[.08,0,.10]}],
  [.7,-.012,{Spine:[-.06,0,-.025],ThighR:[-.85,0,-.04],ShinR:[1.25,0,0],FootR:[-.22,0,0],UpperArmR:[.08,0,-.08]}]
];
export function animationPhase(state,t,family){
  if(state!=='attack'&&state!=='cast')return t;
  const ranged=family==='bow_2h'||family==='crossbow_2h',impact=state==='cast'?.55:ranged?.45:.5;
  const actual=[0,impact*.55,impact,impact+(1-impact)*.45,1],authored=[0,.22,.4,.64,1];
  for(let i=1;i<actual.length;i++)if(t<=actual[i])return lerp(authored[i-1],authored[i],(t-actual[i-1])/(actual[i]-actual[i-1]));return 1;
}
export function actionWeight(t){return smooth(t/.22)*(1-smooth((t-.64)/.36));}
function sampleKeys(keys,u,terminal=false){
  const frames=[[0,0,{}],...keys,...(terminal?[]:[[1,0,{}]])];
  let a=frames[0],b=frames.at(-1);for(let i=1;i<frames.length;i++)if(u<=frames[i][0]){a=frames[i-1];b=frames[i];break;}
  const t=smooth((u-a[0])/(b[0]-a[0])),r={};
  for(const name of new Set([...Object.keys(a[2]),...Object.keys(b[2])]))r[name]=[0,1,2].map(i=>lerp(a[2][name]?.[i]||0,b[2][name]?.[i]||0,t));
  return {rotations:r,height:lerp(a[1],b[1],t)};
}
export function classPoseAt(id,state,u){
  const style=CLASS_ANIMATIONS[id];if(!style)throw new Error('Unknown animation class: '+id);
  u=clamp(u);const rotations=Object.fromEntries(Object.entries(style.stance).map(([k,v])=>[k,[...v]]));
  const add=(name,x=0,y=0,z=0)=>{const r=rotations[name]||(rotations[name]=[0,0,0]);r[0]+=x;r[1]+=y;r[2]+=z;};
  const breath=Math.sin(u*TAU);let height=.94;
  for(const side of ['L','R']){rotations['Thigh'+side]=[-style.crouch*.5,0,side==='L'?.035:-.035];rotations['Shin'+side]=[style.crouch,0,0];rotations['Foot'+side]=[-style.crouch*.5,0,0];}
  height-=.81*(1-Math.cos(style.crouch*.5));
  if(state==='idle'){
    add('Spine',breath*style.breath);add('Chest',0,Math.sin(u*TAU)*style.sway*.4);add('Head',-breath*style.breath*.5,0,breath*style.sway*.3);
    add('ForearmL',breath*style.breath*2);add('HandL',0,breath*style.sway,0);
  }else if(state==='walk'){
    for(const [side,offset] of [['L',0],['R',.5]]){
      const phase=(u+offset)%1,stance=phase<.5,swing=stance?0:Math.sin((phase-.5)*TAU),stride=style.stride;
      const thigh=stance?lerp(-stride,stride,phase*2):lerp(stride,-stride,smooth((phase-.5)*2));
      const knee=style.crouch+swing*style.knee;
      rotations['Thigh'+side]=[thigh-knee*.5,0,side==='L'?.035:-.035];rotations['Shin'+side]=[knee,0,0];rotations['Foot'+side]=[-thigh-knee*.5,0,0];
      add('UpperArm'+side,-thigh*(id==='gravebinder'?.25:.6));add('Forearm'+side,-swing*.1);
    }
    add('Spine',.025,Math.sin(u*TAU)*style.sway,Math.sin(u*TAU)*style.sway*.7);add('Chest',0,-Math.sin(u*TAU)*style.sway*1.7);
    add('Head',-.015,Math.sin(u*TAU)*style.sway*.4);height-=Math.abs(Math.cos(u*TAU))*.026;
  }else{
    const keys=state==='kick'?KICK_KEYS:style[state==='dead'?'death':state];
    if(keys){
      const p=sampleKeys(keys,state==='dead'?1:u,state==='death'||state==='dead');height+=p.height;for(const [name,r] of Object.entries(p.rotations))add(name,...r);
      if(state!=='death'&&state!=='dead'&&state!=='kick'){const bend=Math.sqrt(Math.max(0,-p.height)*7);for(const side of ['L','R']){add('Thigh'+side,-bend*.5);add('Shin'+side,bend);add('Foot'+side,-bend*.5);}}
    }
  }
  // Let the lower arm fold onto the body during side falls, rather than acting
  // as a rigid prop. The forward Gravebinder collapse leaves both arms trailing.
  if(state==='death'||state==='dead'){
    const settle=smooth(((state==='dead'?1:u)-.48)/.52);
    if(id==='wildkeeper')add('UpperArmL',0,0,-1.54*settle);
    if(id==='emberwitch')add('UpperArmR',0,0,.95*settle);
    if(id==='veilranger')add('UpperArmL',0,0,-.85*settle);
    if(id==='gravebinder'){add('UpperArmL',.7*settle);add('UpperArmR',.6*settle);add('ForearmL',.47*settle);add('ForearmR',.38*settle);}
  }
  return {rotations,height};
}

// Weapon-aware corrections complement the class poses. Two-hand transforms are
// targets for the existing arm IK, so neither grip is approximated by a clip.
export function weaponMotionAt(id,state,t,family,twoHand,hasShield){
  const style=CLASS_ANIMATIONS[id],category=family?.split('_')[0],attack=state==='attack',cast=state==='cast',fall=state==='death'||state==='dead';
  const power=attack||cast?actionWeight(t):0,release=smooth((t-.25)/.15),death=fall?smooth(state==='dead'?1:t):0;
  const melee=['sword','axe','mace','dagger'].includes(category),ranged=category==='bow'||category==='crossbow';
  const p=[0,-.16,.13],r=[0,0,0],extra={};
  const strength={vanguard:1,emberwitch:.74,gravebinder:.68,wildkeeper:1.17,veilranger:.84}[id];
  if(twoHand){
    if(ranged){p[1]=-.12;p[2]=.1;r[2]=id==='veilranger'?-.08:.035;}
    else if(category==='staff'||category==='spear')r[0]=.9;
    else r[2]=.65;
    if(attack){
      if(ranged){p[1]+=.042*power;p[2]+=.015*power-(category==='crossbow'?.028:0)*Math.sin(release*Math.PI)*power;r[1]+=(id==='veilranger'?-.10:.06)*power;r[2]+=(id==='veilranger'?-.10:.02)*power;}
      else if(category==='spear'){p[2]+=(release*.12-.035)*power;r[0]+=.5*power;r[1]+=(release-.5)*.12*power;}
      else if(category==='staff'){p[1]+=.015*power;r[0]-=.35*power;r[2]+=(id==='gravebinder'?-.18:.14)*power;}
      else {r[0]+=(-.65+release*1.55)*power*strength;r[2]+=(.20-release*.63)*power*strength;p[1]+=(.025-release*.04)*power;}
    }
    if(cast){p[1]+=.035*power;r[0]-=(id==='wildkeeper'?.32:.23)*power;r[2]+=(id==='gravebinder'?-.2:id==='emberwitch'?.14:0)*power;}
    // Weapons settle with the torso; do not hold an upright guard on the ground.
    p[1]-=.025*death;r[2]+=({vanguard:.12,emberwitch:.22,gravebinder:-.18,wildkeeper:-.16,veilranger:.16}[id])*death;
  }else if(attack&&melee){
    // Daggers thrust, long blades cut, axes and maces finish with a heavier drop.
    const heavy=category==='axe'||category==='mace';
    extra.UpperArmR=[(category==='dagger'?.24:heavy?-.16:0)*power,category==='dagger'?-.12*power:0,heavy?-.11*power:0];
    extra.ForearmR=[category==='dagger'?.18*power:heavy?-.12*(1-release)*power:0,0,0];
  }
  const shield=hasShield?{weight:1-death,upper:[-.32-(state==='hit'?.30*Math.sin(t*Math.PI):0)-power*.12,0,.20],fore:-.95-power*.08}:null;
  const draw=category==='bow'&&attack?smooth(t/.32)*(1-smooth((t-.4)/.09)):0;
  const spell=(cast||attack&&['wand','staff'].includes(category))&&!fall?power:0;
  return {position:p,rotation:r,extra,shield,draw,arrow:!attack||t<.4||t>.86,socket:melee?lerp(2.7,1.1+release*1.4,power):category==='wand'?1.1+release*1.6*power:1.1,spell,cloth:style.cloth*(state==='walk'?1:power*.8),power};
}
