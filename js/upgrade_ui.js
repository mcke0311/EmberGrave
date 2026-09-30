'use strict';
const UpgradeUI=(()=>{
  let dialog=null,scene=null,notice='',pending=false,refreshEcho=false;
  const coop=()=>typeof Coop!=='undefined'&&Coop.active;
  const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
  function close(){dialog?.close();dialog?.remove();dialog=null;}
  function panel(title,text){
    close();UI.closeAll();UI.closeEsc();Game.cancelMenuInput();
    dialog=node('dialog',null,'upgrade-dialog');dialog.setAttribute('aria-labelledby','upgradeHeading');
    const h=node('h2',title);h.id='upgradeHeading';dialog.append(h,node('p',text));
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);dialog.showModal();return dialog;
  }
  function button(root,label,action,secondary=false){
    const b=node('button',label,secondary?'upgrade-secondary':'upgrade-action');b.type='button';
    b.onclick=async()=>{if(pending)return;pending=true;b.disabled=true;try{await action();}catch(e){Game.msg(e.message,'#e2a08c');const p=node('p',e.message,'upgrade-error');p.setAttribute('role','alert');root.append(p);}finally{pending=false;b.disabled=false;}};root.append(b);return b;
  }
  function event(prop){
    const d=panel(prop.ev.name,`${prop.ev.count||4} defenders will emerge${prop.ev.kind==='curse'?', led by an accursed champion':''}. Defeat them all to unseal a cache containing at least one rare item. Rewards wait safely in the cache until you have pack space.`);
    button(d,'Awaken the defenders',async()=>{if(coop()){if(!await Coop.submit({type:'startEvent',targetId:prop._coopId}))throw Error('The encounter could not begin. Move closer and try again.');}else if(!CursedEvents.start(Game.state,prop,Game.state.player))throw Error('Move closer to the altar and try again.');close();});
    button(d,'Leave the seal intact',close,true);
  }
  async function echoAction(action,extra={}){
    if(coop()){
      const previous=Echoes.run(Game.state)?.id;
      if(!await Coop.submit({type:'echoAction',action,...extra}))throw Error('The expedition could not be updated. Try again after the party is ready.');
      close();if(['start','collect'].includes(action))refreshEcho={action,previous};return;
    }
    const s=Game.state,p=s.player;
    if(action==='collect'){if(!Echoes.collect(s,p))throw Error('Make room in your pack to collect your reward.');return echoes();}
    if(action==='start'){if(!Echoes.start(s,p,extra.slot))throw Error('Complete the saga and return to Frosthaven to begin.');for(const [id]of Echoes.stages){delete s.mapsCache[id];delete s.monstersByMap[id];delete s.groundByMap[id];}return echoes();}
    if(action==='choose'||action==='resume'){
      const previous=JSON.stringify(Echoes.run(s));
      if(action==='choose'&&!Echoes.choose(s,extra.curse))throw Error('That curse is no longer available.');
      const r=Echoes.run(s);if(!r||r.phase!=='combat')throw Error('No encounter is waiting.');
      close();
      if(!await Game.enterMap(r.zone,'default',{recoverable:true})){s.flags.echoRun=JSON.parse(previous);Game.saveGame();echoes();throw Error('The Echo could not load. Your progress is safe.');}
      Game.saveGame();return;
    }
    if(action==='claim'){if(!Echoes.claim(s,p))throw Error('Make room in your pack before claiming the expedition reward.');}
    else if(action==='abandon')Echoes.fail(s);
    if(action==='claim'||action==='abandon'||action==='return'){close();if(s.map.id!=='frosthaven'&&!await Game.enterMap('frosthaven','default',{recoverable:true,revive:p.dead}))throw Error('Frosthaven could not load. Use Echoes to retry returning.');}
  }
  function echoes(){
    const s=Game.state,r=Echoes.run(s),owner=!r||r.owner===(s.player.heroId||s.player.name);
    const d=panel('Sunderstone Echoes',!Echoes.unlocked(s)?'Complete the saga to unlock the memories within Frosthaven’s waystone.':r&&!['claimed','failed'].includes(r.phase)?`${r.cleared}/3 memories restored · ${Echoes.slots[r.slot]} · ${250*r.cleared*r.cleared} bonus gold. Unclaimed expedition treasure is lost on defeat.`:'Three remembered battles. Choose a curse before each, then claim your treasure or press deeper. Ordinary drops are yours to keep.');
    if(!Echoes.unlocked(s)){button(d,'Close',close,true);return;}
    if(s.flags.echoAwards?.[s.player.heroId||s.player.name])button(d,'Collect your stored Echo reward',()=>echoAction('collect'));
    if(!r||['claimed','failed'].includes(r.phase)){
      if(r?.phase==='failed')d.append(node('p','The expedition ended. Its unclaimed bonus was lost.'));
      if(s.map.id==='frosthaven'){
        const label=node('label','Seek equipment: '),select=node('select');select.setAttribute('aria-label','Desired equipment category');
        for(const [id,name]of Object.entries(Echoes.slots)){const o=node('option',name);o.value=id;select.append(o);}label.append(select);d.append(label);
        const b=button(d,'Begin an expedition',()=>echoAction('start',{slot:select.value}));if(coop()&&s.player._coopId!==Coop.hostId)b.disabled=true;
      }else button(d,'Return to Frosthaven',()=>echoAction('return'));
    }else{
      if(r.curses.length)d.append(node('p','Curses: '+r.curses.map(id=>Echoes.curses.find(c=>c.id===id).name).join(' · ')));
      if(r.phase==='combat'){
        if(s.map.id!==r.zone)button(d,'Resume the encounter',()=>echoAction('resume'));
        d.append(node('p','After leaving the game, an unfinished battle resumes from its entrance. Completed memories and your pending reward are preserved.'));
      }
      if(owner&&['choice','reward'].includes(r.phase)){
        if(r.phase==='reward')button(d,`Claim ${r.rewards.length} item${r.rewards.length===1?'':'s'} and return`,()=>echoAction('claim'));
        if(r.cleared<3){d.append(node('h3','Choose the next curse'));for(const c of Echoes.choices(r))button(d,c.name+' — '+c.text,()=>echoAction('choose',{curse:c.id}));}
      }else if(!owner)d.append(node('p','The expedition leader chooses curses and when the party claims its reward.'));
      if(owner)button(d,'Forfeit the expedition bonus and return',()=>echoAction('abandon'),true);
    }
    button(d,'Close',close,true);
  }
  async function story(kind,done=()=>{}){
    if(scene)return;const s=Game.state;Game.cancelMenuInput();UI.closeAll();
    const overlay=node('section',null,'upgrade-story');overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label',kind==='quieting'?'The Quieting':'The Warden returns');overlay.setAttribute('aria-modal','true');
    const canvas=node('canvas');canvas.width=1080;canvas.height=540;overlay.append(canvas);
    const caption=node('p',kind==='quieting'?'They walked into the water without a cry.':'She returned with the light. Something else returned with her.','upgrade-caption');overlay.append(caption);
    const skip=node('button','Skip scene','upgrade-skip');skip.type='button';overlay.append(skip);document.body.append(overlay);
    const c=canvas.getContext('2d'),back=document.createElement('canvas');back.width=1080;back.height=540;back.getContext('2d').drawImage(document.getElementById('view'),0,0,1080,540);
    let raf=0,finished=false;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish=()=>{if(finished)return;finished=true;cancelAnimationFrame(raf);document.removeEventListener('keydown',key,true);overlay.remove();scene=null;s.characterFlags['scene_'+kind]=true;Game.saveGame();done();};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();finish();}else if(e.key==='Tab'){e.preventDefault();skip.focus();}};document.addEventListener('keydown',key,true);
    skip.onclick=finish;skip.focus();scene={finish};
    try{
      await SpriteAssets.loadBundle('zone:'+(kind==='quieting'?'marshcamp':'frosthaven'));if(finished)return;
      const start=performance.now(),draw=now=>{
        if(finished)return;const t=Math.min(1,(now-start)/8500);c.clearRect(0,0,1080,540);c.drawImage(back,0,0);c.fillStyle=kind==='quieting'?'rgba(7,25,25,.73)':'rgba(10,12,26,.8)';c.fillRect(0,0,1080,540);
        if(kind==='quieting'){
          for(let i=0;i<3;i++){const a=Math.max(0,Math.min(1,(t-.12*i)*1.5)),x=350+i*135+(reduced?0:a*100),y=430-(reduced?0:a*130);c.save();c.globalAlpha=1-a*.96;
            const frame=SpriteAssets.getFrame('actor.npc.resident_marshcamp_'+i,0);SpriteAssets.drawFrame(c,frame,x,y,{scale:2});c.restore();}
          const mist=c.createLinearGradient(0,210,0,430);mist.addColorStop(0,'#29444300');mist.addColorStop(.6,'#294443aa');mist.addColorStop(1,'#152d2ce8');c.fillStyle=mist;c.fillRect(200,210,700,230);
        }else{
          const frame=SpriteAssets.getFrame('actor.npc.resident_frosthaven_0',0),change=Math.max(0,(t-.35)/.65),scale=Math.min(2.8,370/frame.sh);
          // The returned Warden stands still while her shadow twists away.
          const shadow=reduced?1:change;c.save();c.translate(540,450);c.transform(1,0,-.6-shadow,.3,0,0);c.globalAlpha=.35+change*.5;c.filter='brightness(0)';SpriteAssets.drawFrame(c,frame,shadow*70,0,{scale});c.restore();
          c.save();c.filter='saturate('+(1-change*.75)+') hue-rotate('+(change*65)+'deg)';SpriteAssets.drawFrame(c,frame,540,450,{scale});c.restore();
          c.strokeStyle='#baa6db';c.globalAlpha=change*.85;c.lineWidth=2;
          for(const side of [-1,1]){c.beginPath();c.moveTo(540+side*10,325);c.lineTo(540+side*22,345);c.lineTo(540+side*15,365);c.lineTo(540+side*30,390);c.stroke();}
          c.globalAlpha=1;caption.textContent=t<.45?'Seraneth took the core into her keeping.':'The light in her shadow no longer moved with her.';
        }
        if(t>=1)finish();else raf=requestAnimationFrame(draw);
      };raf=requestAnimationFrame(draw);
    }catch(e){Game.msg('The scene could not load: '+e.message,'#c8b699');finish();}
  }
  function tick(){
    const s=Game.state;if(!s||s.player.dead)return;
    let b=document.getElementById('echoOpen');if(s.map.zone.echo){if(!b){b=node('button','Echoes · reward & return','echo-open');b.id='echoOpen';b.onclick=echoes;document.getElementById('game').append(b);}}else b?.remove();
    if(dialog||scene||UI.cinematicActive()||UI.anyOpen()||UI.escOpen())return;
    const r=Echoes.run(s),sig=r?.id+':'+r?.cleared+':'+r?.phase;
    if(refreshEcho&&(refreshEcho.action==='start'?r&&r.id!==refreshEcho.previous:!s.flags.echoAwards?.[s.player.heroId||s.player.name])){refreshEcho=false;echoes();return;}
    if(s.map.zone.echo&&r?.phase==='reward'&&notice!==sig){notice=sig;echoes();return;}
    if(s.map.id==='weeping_marsh'&&!s.characterFlags.scene_quieting&&s.quests.q10)story('quieting');
  }
  return {event,echoes,echoAction,story,tick,close,get active(){return !!dialog||!!scene;}};
})();
