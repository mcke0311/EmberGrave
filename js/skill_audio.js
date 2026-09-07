/* Recorded combat presentation. No gameplay timers, save data, or Math.random.
   Sfx owns the AudioContext and supplies the existing SFX bus on init. */
'use strict';
const SkillAudio = (() => {
  const {recipes, families} = SkillAudioCatalog;
  const LIMITS = Object.freeze({voices:24, sameCue:4, sustains:6});
  const phases = {activate:0, release:1, impact:2, end:3, sustain:4};
  const legacyNames = new Set('swing bow hit crit block arrowHit fireHit slam roar firebolt frost zap blast curse portal potion shrine click vox_bone vox_beast die_bone die_flesh'.split(' '));
  const impactNames = new Set(['hit','crit','block','arrowHit','fireHit']);
  const textures = [...new Set([...Object.values(families).flat(), ...Object.values(recipes).map(r=>r.accent), 'thunder','growl','breath'].filter(Boolean))];
  let ac=null, bus=null, volume=null, ready=null, current=null, transaction=null, serial=0, seed=0x683dab;
  let world=null, ownerIds=new WeakMap(), nextOwner=0, enabled=true, paused=false;
  const buffers=new Map(), voices=new Set(), retiring=new Set(), sustained=new Map(), recent=new Map(), previousTakes=new Map();
  const stats={played:0,dropped:0,coalesced:0,peak:0,failed:[],legacy:0};
  const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function identity(owner){
    if(!owner||typeof owner!=='object')return 0;
    if(!ownerIds.has(owner))ownerIds.set(owner,++nextOwner);
    return ownerIds.get(owner);
  }
  function scope(id, context, callback){
    const previous=current;
    current=id&&recipes[id]?{...context,id}:null;
    try{return callback();}finally{current=previous;}
  }
  function init(context, destination, volumes){
    if(ready)return ready;
    ac=context;volume=volumes;
    // A separate compressor protects overlapping skill tails without changing
    // the user's recordings, music, or UI-click level.
    bus=ac.createDynamicsCompressor();
    bus.threshold.value=-15;bus.knee.value=12;bus.ratio.value=5;
    bus.attack.value=.004;bus.release.value=.12;
    const headroom=ac.createGain();headroom.gain.value=.7;bus.connect(headroom);headroom.connect(destination);
    ready=Promise.all(textures.flatMap(texture=>[1,2,3].map(async take=>{
      const key=texture+'_'+take;
      try{
        const response=await fetch(new URL('assets/sound-effects/skills/'+key+'.wav',document.baseURI));
        if(!response.ok)throw Error('HTTP '+response.status);
        const buffer=await ac.decodeAudioData(await response.arrayBuffer());
        buffers.set(key,buffer);
      }catch(error){stats.failed.push(key);console.warn('Could not load skill sound '+key+':',error);}
    })));
    return ready;
  }
  function stopVoice(voice, fade=.045){
    if(!voices.has(voice)&&!retiring.has(voice))return;
    voices.delete(voice);retiring.delete(voice);if(fade)retiring.add(voice);
    if(voice.emitter&&sustained.get(voice.emitter)===voice)sustained.delete(voice.emitter);
    const t=ac.currentTime;
    for(const {source,gain} of voice.nodes){
      if(fade){gain.gain.cancelAndHoldAtTime(t);gain.gain.linearRampToValueAtTime(0,t+fade);source.stop(t+fade+.005);}
      else {source.stop();source.disconnect();gain.disconnect();}
    }
  }
  function stopAll(owner){
    for(const v of [...voices])if(!owner||v.owner===owner)stopVoice(v);
    if(!owner){recent.clear();previousTakes.clear();}
  }
  function selectRecipe(id,context){
    const base=recipes[id];if(!base)return null;
    let family=base.family;
    if(id==='basic')family=context.owner?.stats?.ranged?'bow':context.owner?.form?'nature':'steel';
    // Damage conversion is audible at contact, while identity remains intact.
    if(context.phase==='impact')family=({fire:'fire',cold:'frost',light:'storm',poison:'poison',shadow:'hex',earth:'earth'})[context.elem]||family;
    return {...base,family};
  }
  function play(id, phase, context={}){
    context={...context,phase};
    const recipe=selectRecipe(id,context), index=phases[phase];
    if(!recipe||index===undefined||!enabled||paused||!ac||ac.state!=='running'||!volume.master||!volume.sfx||context.owner?.dead)return null;
    if(recipe.passive&&(!context.trigger||!recipe.trigger))return null;
    const emitter=context.emitter||context.owner;
    if(phase==='sustain'&&(!emitter||typeof emitter!=='object'))return null;
    if(phase==='sustain'&&sustained.has(emitter))return sustained.get(emitter).handle;
    const cue=id+':'+phase, key=identity(emitter)+':'+cue, t=ac.currentTime;
    // Simultaneous area contacts form one impact instead of one voice per foe.
    const last=recent.get(key);
    if(phase!=='sustain'&&last!==undefined&&t-last<(phase==='impact'?.07:.025)){stats.coalesced++;return null;}
    const texture=families[recipe.family][index];if(!texture)return null;
    const lastTake=previousTakes.get(texture)||0;
    let take=1+Math.floor(random()*3);if(take===lastTake)take=take%3+1;
    const buffer=buffers.get(texture+'_'+take);
    if(!buffer){stats.dropped++;return null;}
    previousTakes.set(texture,take);recent.set(key,t);
    if(recent.size>512)for(const [k,at] of recent)if(t-at>2)recent.delete(k);
    let siblings=[...voices].filter(v=>v.cue===cue);
    while(siblings.length>=LIMITS.sameCue)stopVoice(siblings.shift(),0);
    if(phase==='sustain'&&sustained.size>=LIMITS.sustains){stats.dropped++;return null;}
    while(voices.size+retiring.size>=LIMITS.voices){
      const oldest=retiring.values().next().value||[...voices].find(v=>v.phase==='sustain')||voices.values().next().value;
      stopVoice(oldest,0);
    }
    const level=({activate:.13,release:.55,impact:.56,end:.14,sustain:.085})[phase]
      *recipe.weight*(context.crit?1.15:1)*(context.trigger?.35:1)*(context.level??1)
      *(Number.isFinite(context.charge)?.65+.35*clamp(context.charge,0,1):1);
    const voice={id:++serial,skill:id,cue,phase,owner:context.owner,emitter:phase==='sustain'?emitter:null,nodes:[],at:t};
    const pan=ac.createStereoPanner();
    const point=context.target||emitter, listener=context.owner;
    const offset=point&&listener?((point.x-listener.x)-(point.y-listener.y))*.07:0;
    pan.pan.value=Number.isFinite(offset)?clamp(offset,-.65,.65):0;
    pan.connect(bus);voice.pan=pan;
    let remaining=0;
    const add=(buf,gainLevel,rate,delay=0)=>{
      const source=ac.createBufferSource(), gain=ac.createGain();
      source.buffer=buf;source.playbackRate.value=rate;
      source.loop=phase==='sustain';
      source.connect(gain);gain.connect(pan);
      const start=t+delay, duration=buf.duration/rate;
      gain.gain.setValueAtTime(0,start);
      gain.gain.linearRampToValueAtTime(gainLevel,start+(phase==='sustain'?.16:.006));
      if(phase!=='sustain'){
        const end=start+Math.max(.04,duration);
        gain.gain.setValueAtTime(gainLevel,Math.max(start+.008,end-.065));
        gain.gain.linearRampToValueAtTime(0,end);
      }
      remaining++;voice.nodes.push({source,gain});
      source.onended=()=>{
        source.disconnect();gain.disconnect();remaining--;
        if(!remaining){voices.delete(voice);retiring.delete(voice);pan.disconnect();if(voice.emitter&&sustained.get(voice.emitter)===voice)sustained.delete(voice.emitter);}
      };
      source.start(start);if(phase!=='sustain')source.stop(start+duration+.01);
    };
    const rate=recipe.rate*(.985+random()*.03);
    add(buffer,level,rate);
    if(recipe.accent&&(phase==='release'||phase==='impact')){
      const accent=buffers.get(recipe.accent+'_'+take);
      if(accent&&recipe.accent!==texture)add(accent,level*.28,rate*.97,.014);
    }
    if(recipe.family==='storm'&&phase==='impact'&&recipe.weight>1){
      const thunder=buffers.get('thunder_'+take);if(thunder&&recipe.accent!=='thunder')add(thunder,level*.24,.93,.025);
    }
    voice.handle=Object.freeze({stop:()=>stopVoice(voice),get active(){return voices.has(voice);}});
    voices.add(voice);if(voice.emitter)sustained.set(voice.emitter,voice);
    stats.played++;stats.peak=Math.max(stats.peak,voices.size+retiring.size);
    events.push({id,phase,texture,t,emitter:identity(emitter)});if(events.length>128)events.shift();
    return voice.handle;
  }
  function legacy(name){
    if(!current||!legacyNames.has(name))return false;
    stats.legacy++;
    if(transaction&&transaction.owner===current.owner){transaction.cues.push(name);return true;}
    // Dedicated hit hooks carry the effective element and actual contact point.
    const phase=impactNames.has(name)?'impact':name.startsWith('die_')?'end':'release';
    play(current.id,phase,{...current,crit:name==='crit'});return true;
  }
  function markRelease(owner){if(transaction?.owner===owner)transaction.delayed=true;}
  function cast(owner,id,callback){
    const previous=transaction;
    const oldForm=owner.form,oldStance=owner.stance;
    const tx={owner,id,cues:[],delayed:false};transaction=tx;
    let result;
    try{result=scope(id,{owner,emitter:owner},callback);}finally{transaction=previous;}
    if(!result)return result;
    if((oldForm&&!owner.form)||(oldStance&&!owner.stance)){
      play(id,'end',{owner});forms.set(owner,owner.form||null);return result;
    }
    // Source ownership must also work when the visual effects module is absent.
    for(const key of ['siphon','drawing','charging','leaping','spinning','dashing'])if(owner[key])owner[key].sourceSkill=id;
    play(id,'activate',{owner});
    if(!tx.delayed&&!owner.drawing)play(id,'release',{owner});
    return result;
  }
  function release(owner,id){if(!owner.dead)play(id,'release',{owner});}
  function passive(owner,trigger,context={}){
    if(!owner?.skills)return;
    const key='passive:'+identity(owner)+':'+trigger,t=ac?.currentTime||0;
    if(recent.has(key)&&t-recent.get(key)<.3)return;recent.set(key,t);
    const rows=Object.entries(recipes).filter(([id,r])=>r.passive&&r.trigger===trigger&&owner.skills[id]>0);
    for(const [id] of rows.slice(0,1))play(id,'impact',{owner,...context,trigger});
  }
  function update(state){
    if(!state?.player||state.player.dead){stopAll();world=state?.map||null;return;}
    if(world&&world!==state.map)stopAll();world=state.map;
    const p=state.player, live=new Map();
    for(const key of ['siphon','drawing','spinning'])if(p[key]?.sourceSkill)live.set(p[key],{id:p[key].sourceSkill,owner:p});
    for(const f of state.fx||[])if(f.sourceSkill&&f.ttl>0&&['firewall','groundfield','cyclone'].includes(f.type))live.set(f,{id:f.sourceSkill,owner:f.owner||p});
    for(const [emitter,voice] of [...sustained])if(!live.has(emitter)||voice.owner?.dead){stopVoice(voice);if(!voice.owner?.dead)play(voice.skill,'end',{owner:voice.owner,emitter});}
    for(const [emitter,ctx] of live)if(!sustained.has(emitter))play(ctx.id,'sustain',{...ctx,emitter});
    const lastForm=forms.get(p);
    if(lastForm!==undefined&&lastForm!==p.form){
      const id=Object.keys(recipes).find(id=>typeof DATA!=='undefined'&&DATA.SKILLS[id]?.form===lastForm);
      if(id)play(id,'end',{owner:p});
    }
    forms.set(p,p.form||null);
  }
  let forms=new WeakMap();
  const events=[];
  function reset(){stopAll();forms=new WeakMap();ownerIds=new WeakMap();nextOwner=0;world=null;events.length=0;}
  function setPaused(value){if(paused===value)return;paused=value;if(value)stopAll();}
  function snapshot(){return {...stats,failed:[...stats.failed],voices:voices.size,totalVoices:voices.size+retiring.size,sustains:sustained.size,decoded:buffers.size,expected:textures.length*3,events:[...events]};}
  return {init,play,scope,cast,legacy,markRelease,release,passive,update,reset,stopAll,setPaused,recipes,LIMITS,
    get current(){return current;},get ready(){return ready;},get enabled(){return enabled;},
    setEnabled(value){enabled=!!value;if(!enabled)stopAll();},snapshot};
})();
