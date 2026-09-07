await import('./skill_vfx_review.mjs');
const $=id=>document.getElementById(id), review=window.skillReview;
if(!review)throw Error('Combat review did not initialize');
const {win,data,game}=review, sfx=win.eval('Sfx'), audio=win.eval('SkillAudio');
const out=$('audioStatus'), report=$('results');
let unlocked=false,baseline=null,checking=false;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const selected=()=>data.SKILLS[$('skill').value];
const owner=()=>review.player;
const legacyNames={steel:'swing',fire:'firebolt',frost:'frost',storm:'zap',bone:'vox_bone',hex:'curse',poison:'firebolt',shadow:'portal',earth:'slam',blood:'swing',nature:'vox_beast',bow:'bow',trap:'click',warcry:'roar',banner:'roar',shield:'roar',chain:'swing'};
function silence(){review.pause();sfx.stopSkills();sfx.stopMusic();baseline?.stopMusic();}
function setMix(){sfx.setVol('master',+$('listenLevel').value);sfx.setVol('sfx',.8);sfx.setVol('music',.32);}
async function loadBaseline(){
  if(baseline)return baseline;
  const f=document.createElement('iframe');f.hidden=true;f.title='Previous audio reference';
  f.srcdoc=`<base href="${new URL('../index.html',location.href)}"><script src="tests/fixtures/skill_audio_before/audio.js"><\/script>`;
  document.body.append(f);await new Promise(r=>f.onload=r);
  baseline=f.contentWindow.eval('Sfx');await baseline.init();baseline.setVol('music',0);baseline.setVol('sfx',.6);return baseline;
}
$('enableAudio').disabled=false;
$('enableAudio').onclick=async()=>{
  try{
    out.textContent='Decoding the local sound bank…';
    await sfx.init();await audio.ready;
    if(audio.snapshot().failed.length)throw Error('Missing audio: '+audio.snapshot().failed.join(', '));
    await loadBaseline();unlocked=true;setMix();
    for(const id of ['soloRelease','soloImpact','oldSound','stopAudio','audioChecks','audioCoverage'])$(id).disabled=false;
    $('enableAudio').textContent='Sound enabled';$('enableAudio').disabled=true;
    out.textContent=`Ready — ${audio.snapshot().decoded} local recordings, 107 skills and basic attacks.`;
    await review.replay();
  }catch(e){out.textContent='FAIL — '+e.message;}
};
$('listenLevel').oninput=()=>{if(unlocked)setMix();};
$('musicMix').onchange=()=>{if(!unlocked)return;sfx.stopMusic();if($('musicMix').value!=='off')sfx.music($('musicMix').value);};
$('stopAudio').onclick=()=>{silence();$('musicMix').value='off';out.textContent='Stopped.';};
for(const [id,phase] of [['soloRelease','release'],['soloImpact','impact']])$(id).onclick=()=>{
  review.pause();audio.setPaused(false);const sk=selected(),r=audio.recipes[sk.id];
  const played=sfx.playSkill(sk.id,phase,{owner:owner(),trigger:r.trigger});
  out.textContent=played?sk.name+' · '+phase+' · '+r.family:sk.name+' · silent stat passive';
};
$('oldSound').onclick=async()=>{
  review.pause();const old=await loadBaseline(),r=audio.recipes[selected().id];
  old.setVol('master',+$('listenLevel').value);old.play(legacyNames[r.family]);
  out.textContent=selected().name+' · previous representative '+legacyNames[r.family]+' sound';
};
const oldPause=$('pause').onclick;
$('pause').onclick=()=>{oldPause();if(!review.playing)sfx.stopSkills();};
const oldReplay=$('replay').onclick;
$('replay').onclick=()=>{audio.setPaused(false);oldReplay();};

async function checks(){
  if(checking)return;checking=true;silence();audio.reset();audio.setPaused(false);
  let n=0;const records=[];const ok=(value,label)=>{n++;if(!value)throw Error(label);records.push('PASS '+label);};
  const p=owner(),oldMaster=sfx.vol.master,oldSfx=sfx.vol.sfx;
  try{
    out.textContent='Checking real decoding, playback, limits and cleanup…';
    const decoded=audio.snapshot().decoded;await sfx.init();await audio.ready;
    ok(decoded===78&&audio.snapshot().decoded===78,'78 textures decoded once');
    ok(audio.snapshot().failed.length===0,'no failed files');
    const start=audio.snapshot().played;
    sfx.setVol('master',0);sfx.playSkill('basic','release',{owner:p});
    sfx.setVol('master',oldMaster);sfx.setVol('sfx',0);sfx.playSkill('basic','release',{owner:p});sfx.setVol('sfx',oldSfx);
    ok(audio.snapshot().played===start,'master and SFX mute prevent playback');
    await sfx.ctx.suspend();sfx.playSkill('basic','release',{owner:p});await sfx.ctx.resume();
    ok(audio.snapshot().played===start,'suspension does not queue old effects');
    let h=sfx.playSkill('basic','release',{owner:p});ok(!!h,'real buffer source starts');
    h.stop();ok(!h.active,'stoppable handle fades out');
    audio.reset();
    for(let i=0;i<80;i++)sfx.playSkill('emberwitch_0_4','impact',{owner:p,target:{x:p.x+i,y:p.y}});
    ok(audio.snapshot().voices===1,'80 simultaneous contacts coalesce');
    audio.reset();
    for(const id of Object.keys(audio.recipes).filter(id=>!audio.recipes[id].passive))sfx.playSkill(id,'release',{owner:p});
    ok(audio.snapshot().voices<=24&&audio.snapshot().peak<=24,'24-voice bound under skill spam');
    audio.reset();const field={type:'firewall',sourceSkill:'emberwitch_0_3',ttl:4};
    const state={player:p,map:game.state.map,fx:[field]};audio.update(state);ok(audio.snapshot().sustains===1,'live field starts one sustain');
    field.ttl=0;audio.update(state);ok(audio.snapshot().sustains===0,'expired field stops');
    const before=audio.snapshot().played;audio.cast(p,'basic',()=>false);ok(audio.snapshot().played===before,'rejected activation stays silent');
    audio.setEnabled(false);sfx.playSkill('basic','release',{owner:p});ok(audio.snapshot().played===before,'audio disabled stays silent');audio.setEnabled(true);
    audio.reset();await wait(2100);ok(audio.snapshot().voices===0,'one-shots and tails fully cleaned up');
    const {renderSkillMix}=await import('./skill_audio_mix.mjs');
    const mix=await renderSkillMix(win.eval('SkillAudioCatalog'),win),peak=mix.peak;
    ok(mix.admitted===24,'production mixer admits 24 heavy critical impacts');
    ok(Number.isFinite(peak)&&peak<.8,'dense rendered mix retains headroom');ok(mix.energy>1,'rendered mix is audible');
    window.skillAudioResults={status:'PASS',checks:n,mixPeak:peak,stats:audio.snapshot()};
    out.textContent=`PASS — ${n} real-audio checks; dense mix peak ${(20*Math.log10(peak)).toFixed(1)} dBFS.`;
    report.textContent=records.join('\n');document.body.dataset.audioTestStatus='passed';
  }catch(e){out.textContent='FAIL — '+e.message;report.textContent=records.join('\n')+'\n'+e.stack;document.body.dataset.audioTestStatus='failed';}
  finally{audio.reset();audio.setEnabled(true);sfx.setVol('master',oldMaster);sfx.setVol('sfx',oldSfx);checking=false;}
}
$('audioChecks').onclick=checks;
$('audioCoverage').onclick=async()=>{
  if(checking)return;checking=true;silence();audio.setPaused(false);const records=[];const level=sfx.vol.master;sfx.setVol('master',.001);
  try{
    for(const sk of Object.values(data.SKILLS)){
      out.textContent=`Checking ${records.length+1}/107 · ${sk.name}`;
      audio.reset();const p=await review.setup(sk,10,-1);audio.setPaused(false);
      if(sk.type==='passive'){
        const r=audio.recipes[sk.id];sfx.playSkill(sk.id,'impact',{owner:p,trigger:r.trigger});
      }else review.cast(p,sk);
      for(let i=0;i<240;i++)review.tick(1/60);
      const events=audio.snapshot().events.filter(e=>e.id===sk.id);
      const expected=sk.type!=='passive'||!!audio.recipes[sk.id].trigger;
      if(expected&&!events.length)throw Error(sk.name+' produced no skill sound');
      if(!expected&&events.length)throw Error(sk.name+' is a stat passive and should be silent');
      records.push({id:sk.id,name:sk.name,events:events.map(e=>e.phase),silent:!expected});
      await wait(0);
    }
    window.skillAudioCoverage={status:'PASS',records};out.textContent='PASS — all 107 skills checked through the isolated arena.';
    report.textContent=JSON.stringify(records,null,2);document.body.dataset.audioCoverage='passed';
  }catch(e){out.textContent='FAIL — '+e.message;report.textContent=e.stack;document.body.dataset.audioCoverage='failed';}
  finally{audio.reset();sfx.setVol('master',level);await review.setup(selected());checking=false;}
};
window.addEventListener('pagehide',()=>silence());
out.textContent='Ready. Enable sound to audition all five classes.';
