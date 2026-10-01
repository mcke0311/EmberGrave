/* Pure cinematic poses: render snapshots never advance the gameplay controller. */
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
const pulse=(t,a,b,c)=>ease((t-a)/(b-a))*(1-ease((t-b)/(c-b)));
export const CINEMATIC_CLIPS=Object.freeze(['watch','walk','kneel','grasp','examine','extract','unbind','strike','recoil','recover','offer','withdraw','ward','hesitate']);
export function cinematicMotion(c){
  const t=clamp(c?.u||0),kind=c?.clip||'watch',r={},add=(j,x=0,y=0,z=0)=>r[j]=[x,y,z];
  let crouch=0,stow=false;
  const settle=ease(t/.25),out=ease((t-.74)/.26);
  if(kind==='watch'){add('Head',-.035,Math.sin((c.time||0)*.6)*.045);}
  if(kind==='kneel'||kind==='grasp'||kind==='extract'||kind==='unbind'){
    crouch=kind==='kneel'?.22*settle:.13;add('Spine',.16);add('Head',.19);stow=true;
  }
  if(kind==='examine'){crouch=.055;add('Spine',.07);add('Head',.22,Math.sin(t*6)*.045);stow=true;}
  if(kind==='offer'){add('Spine',.045);add('Head',.025);stow=true;}
  if(kind==='withdraw'){add('Spine',-.06*pulse(t,0,.35,1));add('Head',-.06);stow=true;}
  if(kind==='strike'){
    const gather=ease(t/.38)*(1-ease((t-.38)/.22)),drive=ease((t-.38)/.22),release=ease((t-.69)/.31);
    add('Spine',-.18*gather+.24*drive*(1-release));add('Chest',-.04,.18*gather-.14*drive*(1-release));
    add('Head',.10*drive*(1-release));crouch=.065+.055*drive*(1-release);stow=true;
  }
  if(kind==='recoil'){
    const hit=1-ease(t/.7);add('Spine',-.22*hit);add('Chest',-.06*hit);add('Head',-.14*hit);
    add('UpperArmL',-.8*hit,0,.28*hit);add('ForearmL',-.5*hit);crouch=.15*hit;stow=true;
  }
  if(kind==='recover'){crouch=.14*(1-ease(t));add('Head',.12*(1-ease(t)));stow=true;}
  if(kind==='ward'){
    add('Spine',.07);add('Head',.09);add('UpperArmL',-.7,0,.23);add('ForearmL',-.7);
    add('UpperArmR',-.7,0,-.23);add('ForearmR',-.7);crouch=.07;stow=true;
  }
  if(kind==='hesitate'){
    const w=pulse(t,0,.38,1);add('Spine',-.10*w);add('Head',-.06,.14*w);add('UpperArmL',-.25*w);crouch=.045*w;
  }
  return {rotations:r,crouch,stow,t,settle,out};
}
export function applyCinematicBody(sample,c){
  if(!c)return sample;
  const motion=cinematicMotion(c);
  for(const [joint,delta]of Object.entries(motion.rotations)){
    const r=sample.body.rotations[joint]||(sample.body.rotations[joint]=[0,0,0]);
    for(let i=0;i<3;i++)r[i]+=delta[i];
  }
  sample.body.height-=motion.crouch;sample.cinematic=motion;
  if(c.clip==='walk'&&sample.feet)cinematicFeet(sample.feet,c.travel||0,sample.gait?.feet,sample.gait?.width||1);
  return sample;
}
function cinematicFeet(feet,travel,bases,width=1){
  // Stance feet move opposite the root by precisely the distance it travels.
  // This absolute-distance solution has no hidden controller state when seeking.
  feet.forEach((f,i)=>{
    const base=bases?.find(b=>b.id===f.id),phase=((travel/(.68*width)+(base?.offset??(i%2)*.5))%1+1)%1;
    f.z=(base?.z||0)+(phase<.5?.17-phase*.68:-.17+.34*ease((phase-.5)*2));
    f.y=phase<.5?0:Math.sin((phase-.5)*Math.PI*2)*.12;f.pitch=0;f.contact=phase<.5;
  });
}
export function applyCinematicForm(sample,c,biped){
  if(!c)return sample;
  const t=clamp(c.u||0),kind=c.clip;
  const add=(j,x=0,y=0,z=0)=>{const r=sample.rot[j]||(sample.rot[j]=[0,0,0]);r[0]+=x;r[1]+=y;r[2]+=z;};
  if(['kneel','grasp','extract','unbind','examine'].includes(kind)){
    add('Torso',.10);add('Head',.22);sample.bodyPos[1]-=.08;
  }
  if(kind==='watch'||kind==='hesitate')add('Head',0,Math.sin((c.time||0)*.5)*.04);
  if(kind==='strike'){
    const gather=ease(t/.38)*(1-ease((t-.38)/.22)),drive=ease((t-.38)/.22)*(1-ease((t-.7)/.3));
    add('Torso',-.13*gather+.18*drive);add('Head',.12*drive);sample.bodyPos[1]-=.06*drive;
    if(biped){add('Arm1',-.9*gather+.6*drive);add('Forearm1',-.65*gather);}
    else if(sample.contacts){const f=sample.contacts.find(f=>f.id==='L0');if(f){f.y+=.17*gather+.13*drive;f.z+=.13*drive;f.contact=gather+drive<.01;}}
  }
  if(kind==='recoil'){const w=1-ease(t);add('Torso',-.2*w);add('Head',-.13*w);sample.bodyPos[1]-=.09*w;}
  if(kind==='ward'||kind==='offer'){add('Head',-.1);if(biped){add('Arm1',-.65);add('Forearm1',-.45);add('Arm-1',-.65);}else {add('Torso',.04);const paw=sample.contacts?.find(f=>f.id==='L0');if(paw){paw.y+=.16;paw.contact=false;}}}
  if(kind==='walk'&&sample.contacts)cinematicFeet(sample.contacts,c.travel||0,sample.gait?.feet);
  return sample;
}
