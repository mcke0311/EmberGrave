import {gaitProfile,footPath} from './character_motion3d.mjs';
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
export function animationPhase(state,t,family,releases=null){
  if(state!=='attack'&&state!=='cast')return t;
  if(releases?.length){
    const events=[...new Set(releases.filter(v=>v>=0&&v<=1))].sort((a,b)=>a-b);
    if(events.length){
      // A held shot already finished its anticipation before its immediate release.
      const first=events[0];
      if(t<=first&&first>0)return t<first*.62?lerp(0,.22,t/(first*.62)):lerp(.22,.4,(t-first*.62)/(first*.38));
      for(let i=0;i<events.length-1;i++)if(t<events[i+1]){
        const u=(t-events[i])/(events[i+1]-events[i]);
        return u<.55?lerp(.4,.22,smooth(u/.55)):lerp(.22,.4,smooth((u-.55)/.45));
      }
      const last=events.at(-1),u=(t-last)/Math.max(.00001,1-last);
      return u<.38?lerp(.4,.64,u/.38):lerp(.64,1,(u-.38)/.62);
    }
  }
  const ranged=family==='bow_2h'||family==='crossbow_2h',impact=state==='cast'?.55:ranged?.45:.5;
  const actual=[0,impact*.55,impact,impact+(1-impact)*.45,1],authored=[0,.22,.4,.64,1];
  for(let i=1;i<actual.length;i++)if(t<=actual[i])return lerp(authored[i-1],authored[i],(t-actual[i-1])/(actual[i]-actual[i-1]));return 1;
}
export function actionWeight(t){return smooth(t/.22)*(1-smooth((t-.64)/.36));}
function sampleKeys(keys,u,terminal=false){
  const frames=[[0,0,{}],...keys,...(terminal?[]:[[1,0,{}]])];
  let index=1;while(index<frames.length-1&&u>frames[index][0])index++;
  const a=frames[index-1],b=frames[index],r={},t=clamp((u-a[0])/(b[0]-a[0]));
  // Monotone Hermite tangents carry momentum through breakdowns, while exact
  // extrema and the start/end of an action have zero velocity and no overshoot.
  function curve(value){
    const va=value(a),vb=value(b),h=b[0]-a[0],s=(vb-va)/h;
    const tangent=(i)=>{
      if(i===0||i===frames.length-1)return 0;
      const p=frames[i-1],c=frames[i],n=frames[i+1],l=(value(c)-value(p))/(c[0]-p[0]),r=(value(n)-value(c))/(n[0]-c[0]);
      return l*r<=0?0:2*l*r/(l+r);
    };
    const m0=tangent(index-1),m1=tangent(index),t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*va+(t3-2*t2+t)*h*m0+(-2*t3+3*t2)*vb+(t3-t2)*h*m1;
  }
  for(const name of new Set([...Object.keys(a[2]),...Object.keys(b[2])]))r[name]=[0,1,2].map(i=>curve(f=>f[2][name]?.[i]||0));
  return {rotations:r,height:curve(f=>f[1])};
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
  if(state==='attack'){
    // Sequential weight transfer: hips wind first, chest follows, then the hand
    // cuts through the target. Recovery retains the cut's momentum.
    const wind=smooth(u/.22)*(1-smooth((u-.22)/.18)),drive=smooth((u-.22)/.18)*(1-smooth((u-.64)/.36));
    const force={vanguard:1,emberwitch:.58,gravebinder:.52,wildkeeper:1.16,veilranger:.76}[id];
    add('Hips',.025*drive,(-.13*wind+.15*drive)*force,-.025*drive);
    add('Chest',-.02*wind,(-.16*wind+.20*drive)*force,-.035*drive);
    add('Head',-.03*drive,(.09*wind-.11*drive)*force);
    add('UpperArmR',-.20*wind-.13*drive,-.10*wind+.16*drive,-.10*wind-.10*drive);
    add('ForearmR',-.12*wind+.10*drive);
    add('HandR',-.08*drive,0,-.12*drive);
  }
  if(state==='cast'){
    const gather=smooth(u/.22)*(1-smooth((u-.22)/.18)),release=smooth((u-.22)/.18)*(1-smooth((u-.64)/.36));
    add('Hips',.035*gather,(-.07*gather+.08*release)*(id==='gravebinder'?.4:1));
    add('Head',.035*gather-.045*release);add('HandL',-.12*release,.06*release,.09*gather);
  }
  if(state==='reach'||state==='search'){
    const w=smooth(u/.38)*(1-smooth((u-.60)/.40)),search=state==='search';
    // The unencumbered hand approaches the prop; the equipped hand stays guarded.
    height-=(search?.15:.035)*w;
    add('Spine',(search?.40:.13)*w);add('Chest',.05*w,-.07*w);add('Head',.22*w);
    add('UpperArmL',-(search?.80:1.02)*w,0,.14*w);add('ForearmL',.38*w);add('HandL',-.18*w);
    add('UpperArmR',.10*w);add('ForearmR',-.10*w);
  }
  // Let the lower arm fold onto the body during side falls, rather than acting
  // as a rigid prop. The forward Gravebinder collapse leaves both arms trailing.
  if(state==='death'||state==='dead'){
    const settle=smooth(((state==='dead'?1:u)-.48)/.52);
    if(id==='wildkeeper')add('UpperArmL',0,0,-1.54*settle);
    if(id==='emberwitch')add('UpperArmR',0,0,.95*settle);
    if(id==='veilranger')add('UpperArmL',0,0,-.85*settle);
    if(id==='gravebinder'){add('UpperArmL',.7*settle);add('UpperArmR',.6*settle);add('ForearmL',.47*settle);add('ForearmR',.38*settle);}
    const impact=Math.sin(Math.PI*clamp((u-.76)/.24));
    if(state==='death'){add('Chest',.035*impact);add('Head',.07*impact);add('Hips',id==='vanguard'?-.025*impact:0,0,(id==='wildkeeper'||id==='veilranger'?-.025:.025)*impact);}
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
      else {r[0]+=(-.85+release*1.95)*power*strength;r[1]+=(-.26+release*.52)*power;r[2]+=(.30-release*.83)*power*strength;p[1]+=(.045-release*.065)*power;}
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
  const bowGather=smooth((t-.16)/.16);
  let draw=category==='bow'?(attack?bowGather*(1-smooth((t-.4)/.045)):cast?bowGather*(1-smooth((t-.60)/.32)):0):0;
  const spell=(cast||attack&&['wand','staff'].includes(category))&&!fall?power:0;
  const motion={position:p,rotation:r,extra,shield,draw,handDraw:draw,reload:0,arrow:!attack||t<.4||t>.86,socket:melee?lerp(2.7,.65+release*1.45,power):category==='wand'?1.1+release*1.6*power:1.1,spell,cloth:style.cloth*(state==='walk'?1:power*.8),power};
  if(twoHand&&['bow','crossbow','staff','spear'].includes(category)){
    // Author these grips in the facing frame, not the rotating chest frame.
    // The support hand belongs ahead of the torso; the rear shaft stays outside it.
    motion.rootSpace=true;
    motion.rootWeight=fall?1-smooth((state==='dead'?1:t)/.28):1;
    const aim=attack||cast?(category==='bow'?smooth(t/.16)*(1-smooth((t-.88)/.12)):smooth(t/.22)*(1-smooth((t-.64)/.36))):0;
    const recoil=attack?smooth((t-.4)/.04)*(1-smooth((t-.44)/.20)):0;
    const advance=attack?smooth((t-.22)/.18)*(1-smooth((t-.46)/.38)):0;
    let hip,spine,chest;
    if(category==='bow'){
      p.splice(0,3,-.08+.16*aim,-.17+.41*aim,.33+.05*aim);r.splice(0,3,.08*(1-aim),.60*(1-aim),-.26+.20*aim);
      motion.handDraw=attack?bowGather*(1-smooth((t-.60)/.32))+.08*recoil:draw;
      motion.gripR=[-1.15,0,.12];motion.gripL=[0,0,-.12];
      // Lead with the elbow in front while the hand is low, then lift it into
      // the draw. A fixed rearward pole folds the forearm through the chest.
      motion.poleR=[-1,.10+.9*aim,.9-1.4*motion.handDraw];motion.poleL=[1,-.35,-.1];
      hip=-.12-.18*motion.handDraw;spine=-.10-.12*motion.handDraw;chest=-.16-.22*motion.handDraw;
    }else if(category==='crossbow'){
      p.splice(0,3,-.13,-.10+.145*aim,.285+.035*aim-.023*recoil);r.splice(0,3,.25*(1-aim)-.055*recoil,0,-.055);
      motion.gripR=[-.9,0,0];motion.gripL=[-1.1,0,.12];
      motion.poleR=[-1,-.55,-.25];motion.poleL=[.65,-1,.05];
      motion.draw=attack?1-smooth((t-.4)/.035)+smooth((t-.66)/.20):1;
      motion.reload=attack?smooth((t-.50)/.10)*(1-smooth((t-.84)/.14)):0;
      hip=-.16-.08*aim;spine=-.13-.05*aim;chest=-.23-.07*aim;
    }else if(category==='staff'){
      p.splice(0,3,-.20,-.16+.065*power,.34+.035*advance);r.splice(0,3,.18+.18*advance-.12*power,0,-.50-.06*power);
      hip=-.10;spine=-.08;chest=-.15;
    }else{
      p.splice(0,3,-.22,-.15-.025*power,.25-.08*power+.065*advance);r.splice(0,3,.82+.68*power,0,-.50+.25*power);
      hip=-.16-.08*power;spine=-.12-.04*power;chest=-.22-.08*power;
    }
    const guardWeight=fall?1-smooth((state==='dead'?1:t)/.52):1;
    motion.bodyWeight=guardWeight;
    motion.body={Hips:[0,hip,0],Spine:[style.stance.Spine[0]*.6,spine,0],Chest:[0,chest,0],Head:[-.035,-hip-spine-chest,0]};
  }
  return motion;
}

// One cheap pose evaluation, including transitions, before solving the skeleton.
// Snapshots carry their own source pose; no AnimationMixer or renderer history.
export function sampleHumanoid(id,pose,equipment={},depth=0){
  const context=pose.ex?.animation,requested=pose.state==='run'?'walk':pose.state||'idle';
  const name=pose.ex?.airborne&&!['death','dead'].includes(requested)?'airborne':requested;
  const cycle=context?.phase??pose.ex?.walkPh??(pose.t||0)*TAU;
  const time=name==='walk'||name==='charge'?((cycle/TAU)%1+1)%1:name==='idle'?((pose.t||0)/3%1+1)%1:clamp(pose.t||0);
  const family=equipment.main?.family,category=family?.split('_')[0],gait=gaitProfile(id,null,context?.speed??pose.ex?.speed??3);
  let source=name,phase=time;
  if(name==='draw'){source='attack';phase=.22+.16*smooth(time);}
  else if(name==='channel'){source='cast';phase=.42+Math.sin((pose.t||0)*2)*.018;}
  else if(name==='airborne'){source='idle';phase=0;}
  else if(name==='charge'){source='walk';}
  else if(name==='spin'){source='attack';phase=.49;}
  else phase=animationPhase(name,time,family,context?.releases);
  const body=classPoseAt(id,source,phase),motion=weaponMotionAt(id,source,phase,family,!!equipment.main?.twoHand,!!equipment.off);
  const add=(joint,x=0,y=0,z=0)=>{const r=body.rotations[joint]||(body.rotations[joint]=[0,0,0]);r[0]+=x;r[1]+=y;r[2]+=z;};
  for(const [joint,r] of Object.entries(motion.extra))add(joint,...r);
  if(motion.body)for(const [joint,r] of Object.entries(motion.body)){
    const original=body.rotations[joint]||[0,0,0];body.rotations[joint]=r.map((v,i)=>lerp(original[i],v,motion.bodyWeight));
  }
  if(category==='bow'||category==='crossbow'){
    if(source==='attack'||source==='cast')body.height=classPoseAt(id,'idle',0).height-.022*motion.power;
  }
  let feet=null;
  if(!['death','dead','airborne'].includes(name)){
    feet=context?.feet?.map(f=>({...f}))||gait.feet.map(f=>source==='walk'?footPath(time,gait,f):{...f,y:0,pitch:0,contact:true});
    if(source==='walk'){
      const wave=Math.sin(time*TAU),bounce=Math.cos(time*TAU*2);
      body.height=.845-CLASS_ANIMATIONS[id].crouch*.09+bounce*.013;
      add('Hips',.035,-wave*.045,wave*.035);add('Chest',-.015,wave*.07,-wave*.022);
      add('Head',-.02,-wave*.025,-wave*.014);
    }
  }
  if(name==='kick'){
    const wind=smooth(time/.24)*(1-smooth((time-.24)/.26));
    const drive=smooth((time-.24)/.26)*(1-smooth((time-.5)/.5));
    const foot=feet.find(f=>f.id==='R');foot.z=.025+.69*drive;foot.y=.55*drive+.24*wind;foot.pitch=-.2*wind+.12*drive;foot.contact=wind+drive<.001;
  }
  if(name==='reach'||name==='search'){
    // Keep two-handed grips solved and show searching through torso and head.
    const w=smooth(time/.38)*(1-smooth((time-.60)/.40));
    if(equipment.main?.twoHand){add('Spine',(name==='search'?.27:.12)*w);add('Head',.18*w);}
    motion.spell=0;
  }
  if(name==='draw'){if(category==='bow')motion.draw=motion.handDraw=.2+.8*smooth(time);motion.arrow=true;motion.power=1;motion.spell=0;}
  if(name==='channel'){motion.spell=.88+Math.sin((pose.t||0)*4)*.08;motion.power=1;add('HandL',Math.sin((pose.t||0)*3)*.045);}
  if(name==='charge'){add('Spine',.21);add('Head',-.13);add('UpperArmL',-.2);add('UpperArmR',-.18);}
  if(name==='spin'){add('UpperArmL',-.35,0,.35);add('UpperArmR',-.25,0,-.28);body.height-=.05;}
  if(name==='airborne'){
    const tuck=Math.sin(time*Math.PI),land=smooth((time-.7)/.3);
    body.height=.88-.07*tuck;
    add('Spine',.13*tuck-.08*land);add('Head',-.09*tuck);add('UpperArmL',-.3*tuck,0,.12*tuck);add('UpperArmR',-.25*tuck,0,-.12*tuck);
    for(const side of ['L','R']){body.rotations['Thigh'+side]=[-.4*tuck-.12*land,0,side==='L'?.08:-.08];body.rotations['Shin'+side]=[.9*tuck+.24*land,0,0];body.rotations['Foot'+side]=[-.24*tuck,0,0];}
  }
  const falling=name==='death'||name==='dead';
  if(context&&!falling){
    add('Spine',context.lean||0,0,-(context.turn||0)*.012);add('Chest',0,-(context.turn||0)*.018);
    add('Head',-(context.lean||0)*.6,(context.turn||0)*.013,(context.turn||0)*.008);
    body.height-=(context.landing||0)*.095;
    const reaction=context.reaction;
    if(reaction){const w=reaction.weight,dir=reaction.direction||0;add('Spine',-.12*Math.cos(dir)*w,0,.09*Math.sin(dir)*w);add('Head',-.06*w);if(reaction.kind==='block'){add('UpperArmL',-.25*w);motion.shield&&(motion.shield.fore-=.12*w);}}
  }
  const result={body,motion,feet,name,time,phase,gait};
  const blend=context?.blend;
  if(blend&&blend.weight<1&&depth<6){
    const old=sampleHumanoid(id,blend.from,equipment,depth+1),w=blend.weight;
    result.from=old;result.blendWeight=w;
    const bowLift=category==='bow'&&!falling?Math.min(1,Math.abs(old.motion.position[1]-motion.position[1])/.41)*.18*Math.sin(Math.PI*w):0;
    for(const key of ['position','rotation'])motion[key]=motion[key].map((v,i)=>lerp(old.motion[key][i],v,w));
    if(category==='bow'){
      motion.position[1]+=bowLift;
      for(const key of ['poleR','poleL'])motion[key]=motion[key].map((v,i)=>lerp(old.motion[key][i],v,w));
    }
    for(const key of ['socket','draw','handDraw','reload','power','spell','cloth'])motion[key]=lerp(old.motion[key],motion[key],w);
    if(motion.rootSpace)motion.rootWeight=lerp(old.motion.rootWeight,motion.rootWeight,w);
  }
  return result;
}
