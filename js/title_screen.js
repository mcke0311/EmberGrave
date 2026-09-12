/* Cinematic front end. Characters remain live 3D; this module never writes saves. */
'use strict';
window.TitleScreen=(()=>{
  const ORDER=['vanguard','emberwitch','gravebinder','wildkeeper','veilranger'];
  const THEMES={
    vanguard:{color:'#d9b571',rgb:'217,181,113',title:'The last line of steel',role:'Melee · Defense · Warcries',quote:'Let the darkness break against you.',trees:['Master the blade','Rally and overwhelm','Break the enemy line'],crest:'M18 9 32 4 46 9v19c0 12-14 23-14 23S18 40 18 28Z M32 13v29 M25 23h14 M29 16l3-4 3 4'},
    emberwitch:{color:'#f2a578',rgb:'242,165,120',title:'Mistress of the elements',role:'Spells · Area damage · Control',quote:'Even a dying world can burn.',trees:['Wield living fire','Command killing frost','Unleash the storm'],crest:'M33 5c8 14-7 17 3 25 4-3 6-7 5-12 18 19 11 35-9 37C9 51 10 35 23 21c-2 12 4 14 6 12-8-12 2-19 4-28Z M32 38c-12 11-4 17 1 17 8-4 8-10-1-17Z'},
    gravebinder:{color:'#a5d8b6',rgb:'165,216,182',title:'Shepherd of the unquiet',role:'Summons · Curses · Decay',quote:'Death is only the beginning of service.',trees:['Raise an undead host','Bind the living in curses','Turn decay into power'],crest:'M17 29C8 7 53 0 49 28l-6 9v11H21V37Z M21 24l8 3-6 5Z M43 24l-8 3 6 5Z M32 31l-3 7h6Z M27 42v10 M37 42v10 M13 53l8-5 M43 48l8 5'},
    wildkeeper:{color:'#c0ce8b',rgb:'192,206,139',title:'Wrath of the ancient wild',role:'Beasts · Storms · Shapeshifting',quote:'The old forest remembers its teeth.',trees:['Call the wild to your side','Channel primal storms','Become the predator'],crest:'M28 29 17 20 10 9 M17 20 7 19 5 14 M17 20 20 9 M36 29 47 20 54 9 M47 20 57 19 59 14 M47 20 44 9 M22 30l10-5 10 5-3 15-7 10-7-10Z M25 35l4 3 M39 35l-4 3 M29 46h6'},
    veilranger:{color:'#b6b4ee',rgb:'182,180,238',title:'The arrow in the dark',role:'Ranged · Traps · Evasion',quote:'They will never hear the final arrow.',trees:['Make every arrow count','Turn the field into a trap','Vanish beyond their reach'],crest:'M17 7c30 6 30 44 0 50l8-25Z M25 32h31 M49 26l7 6-7 6 M8 26l6 6-6 6 M14 32h11'}
  };
  let cleanup=()=>{},background=null;
  const obscured=new Map();
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const root=()=>document.getElementById('title');
  function animateBackground(){
    const host=root().querySelector('.title-backdrop'),canvas=el('canvas','title-atmosphere'),ctx=canvas.getContext('2d');
    // The original painting remains visible even if Canvas2D is unavailable.
    if(!ctx)return {refresh(){},dispose(){}};
    canvas.setAttribute('aria-hidden','true');host.append(canvas);
    const artWidth=1672,artHeight=941,motion=matchMedia('(prefers-reduced-motion: reduce)');
    let raf=0,disposed=false,dirty=true,last=0,time=0,width=0,height=0,scale=1,offsetX=0,offsetY=0;
    const textures=[];
    function texture(w,h,paint){
      const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);textures.push(c);return c;
    }
    const fract=n=>n-Math.floor(n),smooth=n=>n*n*(3-2*n);
    const hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7+43.3)*43758.5453);
    function noise(x,y,period){
      const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(fract(x)),fy=smooth(fract(y));
      const a=hash(ix%period,iy),b=hash((ix+1)%period,iy),c=hash(ix%period,iy+1),d=hash((ix+1)%period,iy+1);
      return (a+(b-a)*fx)*(1-fy)+(c+(d-c)*fx)*fy;
    }
    function vapor(seed){
      return texture(512,192,(g,w,h)=>{
        const pixels=g.createImageData(w,h);
        for(let y=0;y<h;y++)for(let x=0;x<w;x++){
          let n=0,weight=.55;
          for(let octave=0;octave<4;octave++){
            const frequency=4*2**octave;
            n+=noise(x/w*frequency,y/h*frequency+seed,frequency)*weight;weight*=.5;
          }
          const i=(y*w+x)*4,envelope=Math.sin(Math.PI*y/(h-1))**2;
          pixels.data[i]=160;pixels.data[i+1]=184;pixels.data[i+2]=204;
          pixels.data[i+3]=Math.max(0,n-.3)*255*envelope;
        }
        g.putImageData(pixels,0,0);
      });
    }
    // Periodic noise tiles and soft lighting are painted once, never generated per frame.
    const cloud=vapor(3),mist=vapor(19);
    const glow=texture(128,128,(g,w)=>{
      const gradient=g.createRadialGradient(w/2,w/2,0,w/2,w/2,w/2);
      gradient.addColorStop(0,'rgba(255,181,94,.8)');gradient.addColorStop(.12,'rgba(255,133,52,.5)');
      gradient.addColorStop(.4,'rgba(230,92,28,.15)');gradient.addColorStop(1,'rgba(230,92,28,0)');
      g.fillStyle=gradient;g.fillRect(0,0,w,w);
    });
    const spark=texture(24,24,(g,w)=>{
      const gradient=g.createRadialGradient(12,12,0,12,12,12);
      gradient.addColorStop(0,'#fff3cb');gradient.addColorStop(.13,'#ffc27c');
      gradient.addColorStop(.3,'rgba(255,139,57,.4)');gradient.addColorStop(1,'rgba(255,110,30,0)');
      g.fillStyle=gradient;g.fillRect(0,0,w,w);
    });
    const fracture=texture(192,440,g=>{
      g.translate(-970,-10);g.lineJoin='round';g.lineCap='round';
      // Source-pixel coordinates follow the painted fracture; only its soft bloom is added.
      const path=new Path2D('M1054 99L1048 114L1036 127L1038 145L1034 162L1042 182L1046 204L1045 249L1044 291L1048 325L1045 357L1050 391');
      g.filter='blur(12px)';g.strokeStyle='rgba(255,116,35,.65)';g.lineWidth=12;g.stroke(path);
      g.filter='blur(4px)';g.strokeStyle='rgba(255,185,97,.3)';g.lineWidth=4;g.stroke(path);
    });
    const fires=[
      {x:636,y:721,w:88,h:62},{x:843,y:731,w:30,h:24},{x:1004,y:724,w:65,h:80},
      {x:1162,y:729,w:32,h:24},{x:1325,y:731,w:50,h:34},{x:1433,y:706,w:94,h:70},
      {x:315,y:851,w:380,h:165},{x:179,y:897,w:245,h:130}
    ];
    const particles=Array.from({length:48},(_,i)=>{
      const source=fires[i%fires.length],lava=i%fires.length>5;
      return {x:source.x+(hash(i,1)-.5)*(lava?230:12),y:source.y,life:8+hash(i,2)*13,
        phase:hash(i,3),rise:lava?170+hash(i,4)*280:60+hash(i,4)*140,
        drift:18+hash(i,5)*65,size:3+hash(i,6)*5};
    });
    function drift(sprite,y,w,h,speed,opacity,phase){
      ctx.globalAlpha=opacity;
      const x=-((time*speed+phase)%w);
      // Both horizontal edges use the same noise period; copies meet without a crossfade seam.
      for(let left=x;left<artWidth;left+=w)ctx.drawImage(sprite,left,y,w,h);
    }
    function light(x,y,w,h,opacity){ctx.globalAlpha=opacity;ctx.drawImage(glow,x-w/2,y-h/2,w,h);}
    function paint(){
      if(!width||!height)return;
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
      const rx=canvas.width/width,ry=canvas.height/height;
      ctx.setTransform(scale*rx,0,0,scale*ry,offsetX*rx,offsetY*ry);
      ctx.globalCompositeOperation='source-over';
      drift(cloud,-80,1450,470,7,.6,130);
      drift(cloud,140,1150,330,11,.35,690);
      drift(mist,475+Math.sin(time*.11)*12,1240,220,12,.55,310);
      drift(mist,660+Math.sin(time*.09)*10,1550,175,19,.72,820);
      ctx.globalCompositeOperation='screen';
      const pulse=.55+.2*Math.sin(time*.65)+.08*Math.sin(time*1.07);
      ctx.globalAlpha=pulse;ctx.drawImage(fracture,970,10);
      light(1047,398,106,85,pulse*.45);
      fires.forEach((fire,i)=>{
        const flicker=.62+.17*Math.sin(time*3.1+i*2.3)+.1*Math.sin(time*7.7+i*1.9);
        light(fire.x,fire.y,fire.w,fire.h,flicker);
        if(i<6)light(fire.x+Math.sin(time*3+i)*1.2,fire.y-3,9,15+flicker*8,flicker*.75);
      });
      for(const p of particles){
        const age=fract(time/p.life+p.phase),fade=Math.sin(Math.PI*age)**2;
        const x=p.x+age*p.drift+Math.sin(age*7+p.phase*20)*7,y=p.y-age*p.rise;
        ctx.globalAlpha=fade*.8;ctx.drawImage(spark,x-p.size/2,y-p.size/2,p.size,p.size);
      }
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    }
    function active(){return !disposed&&!document.hidden&&!root().classList.contains('hidden')&&canvas.isConnected;}
    function draw(now){
      raf=0;if(!active()){last=0;return;}
      if(dirty||!last||now-last>=1000/30){
        if(last&&!motion.matches)time+=Math.min((now-last)/1000,.1);
        last=now;dirty=false;paint();
      }
      if(!motion.matches)raf=requestAnimationFrame(draw);
    }
    function wake(){if(active()&&!raf)raf=requestAnimationFrame(draw);}
    function size(){
      const bounds=host.getBoundingClientRect();width=bounds.width;height=bounds.height;
      if(width&&height){
        const ratio=Math.min(devicePixelRatio||1,1920/width,1080/height);
        const w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        scale=Math.max(width/artWidth,height/artHeight);
        // Read the CSS position so desktop and mobile crops have one source of truth.
        const position=getComputedStyle(host);
        offsetX=(width-artWidth*scale)*parseFloat(position.backgroundPositionX)/100;
        offsetY=(height-artHeight*scale)*parseFloat(position.backgroundPositionY)/100;
      }
      dirty=true;wake();
    }
    function visibility(){
      cancelAnimationFrame(raf);raf=0;last=0;
      if(active()){dirty=true;wake();}
    }
    const observer=new ResizeObserver(size);observer.observe(host);
    document.addEventListener('visibilitychange',visibility);motion.addEventListener('change',visibility);
    window.addEventListener('resize',size);size();
    return {refresh(){dirty=true;wake();},dispose(){
      disposed=true;cancelAnimationFrame(raf);observer.disconnect();
      document.removeEventListener('visibilitychange',visibility);motion.removeEventListener('change',visibility);
      window.removeEventListener('resize',size);canvas.remove();
      for(const c of textures){c.width=1;c.height=1;}
      canvas.width=1;canvas.height=1;
    }};
  }
  function crest(id){const wrap=el('span','class-crest');wrap.setAttribute('aria-hidden','true');wrap.innerHTML=`<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round" stroke-linecap="round"><path d="${(THEMES[id]||THEMES.vanguard).crest}"/></svg>`;return wrap;}
  function button(text,cls,fn){const b=el('button',cls,text);b.type='button';if(text)b.setAttribute('aria-label',text);b.addEventListener('click',()=>{Sfx.init();fn();});return b;}
  function theme(id){const t=THEMES[id]||THEMES.vanguard;root().style.setProperty('--class-color',t.color);root().style.setProperty('--class-rgb',t.rgb);root().dataset.class=id;}
  function reset(screen){
    cleanup();cleanup=()=>{};
    if(typeof MobilePages!=='undefined')MobilePages.release(document.getElementById('titleMenu'));
    delete root().dataset.heroStep;
    const r=root(),m=document.getElementById('titleMenu');r._back=null;r.dataset.screen=screen;r.scrollTop=0;
    for(const sibling of r.parentElement.children)if(sibling!==r&&!obscured.has(sibling)){obscured.set(sibling,sibling.inert);sibling.inert=true;}
    r.onkeydown=e=>{if(e.key==='Escape'&&r.dataset.screen!=='main'&&m.getAttribute('aria-busy')!=='true'){e.preventDefault();e.stopPropagation();(r._back||(()=>main({focus:true})))();}};
    r.setAttribute('aria-label',screen==='main'?'Embergrave main menu':screen==='new'?'Create a hero':'Choose a saved hero');
    document.getElementById('titleInner').classList.remove('wide');m.replaceChildren();theme('vanguard');
    if(!background)background=animateBackground();else background.refresh();
    return m;
  }
  function focusHeading(node){node.tabIndex=-1;node.focus({preventScroll:true});}
  async function enter(m,fn){
    if(m.getAttribute('aria-busy')==='true')return;
    m.setAttribute('aria-busy','true');const buttons=[...m.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
    const status=el('p','title-status','Opening the Marches…');status.setAttribute('role','status');m.append(status);
    try{await fn();}catch(error){status.textContent=error.message||'The hero could not be loaded. Please try again.';status.setAttribute('role','alert');}
    finally{m.removeAttribute('aria-busy');buttons.filter(b=>b.isConnected).forEach(b=>b.disabled=false);if(status.textContent==='Opening the Marches…')status.remove();}
  }
  function main({focus=false}={}){
    const m=reset('main'),saves=Game.listSaves();
    const intro=el('div','splash-intro');intro.append(el('span','title-kicker','THE FALLEN NORTH AWAITS'),el('p','','The Sunderstone lies shattered.\nSomething beneath the mountain has awakened.'));m.append(intro);
    const actions=el('nav','splash-actions');actions.setAttribute('aria-label','Start your journey');
    if(saves.length){
      const latest=saves[0],b=button('CONTINUE','title-action primary',()=>enter(m,()=>Game.loadGame(latest.slot)));
      const details=el('span','continue-detail',`${latest.name} · Level ${latest.lvl} ${DATA.CLASSES[latest.classId]?.name||latest.classId}`);details.id='continueDetails';b.setAttribute('aria-describedby',details.id);b.append(details);actions.append(b);
    }
    if(typeof CoopUI!=='undefined')actions.append(button('MULTIPLAYER','title-action secondary',()=>CoopUI.open().catch(e=>CoopUI.status(e.message))));
    actions.append(button('NEW HERO','title-action '+(!saves.length?'primary':'secondary'),newHero));
    if(saves.length)actions.append(button('CHOOSE HERO','title-action quiet',savedHeroes));
    actions.append(button('SETTINGS & CONTROLS','title-action quiet',()=>UI.openSettings({origin:'title'})));
    actions.append(button('ITEMS & AFFIXES','title-action quiet',()=>window.open('loot.html','_blank','noopener')));
    const support=el('a','title-action quiet','SUPPORT THE GAME');
    support.href='support.html';support.target='_blank';support.rel='noopener noreferrer';
    support.setAttribute('aria-label','Support the game (opens in a new tab)');
    actions.append(support);
    if(typeof MobileShell!=='undefined'&&MobileShell.enabled){
      const secondary=[...actions.children].filter(n=>!['CONTINUE','NEW HERO','MULTIPLAYER'].some(label=>n.getAttribute('aria-label')===label));
      let morePage=0;
      function showMore(){
        for(const node of [...actions.children])node.hidden=true;
        const available=secondary.filter(n=>!(n.hasAttribute('data-phone-fullscreen')&&!document.fullscreenEnabled)&&!(n.hasAttribute('data-phone-install')&&MobileShell.standalone()));
        available.slice(morePage*4,morePage*4+4).forEach(node=>node.hidden=false);back.hidden=false;
        moreNext.hidden=available.length<=4;moreNext.textContent=morePage?'Previous options':'Next options';moreNext.setAttribute('aria-label',moreNext.textContent);
      }
      const more=button('MORE','title-action quiet',()=>{morePage=0;showMore();});
      const moreNext=button('Next options','title-action quiet',()=>{morePage=morePage?0:1;showMore();});
      const back=button('BACK','title-action quiet',()=>{for(const node of [...actions.children])node.hidden=false;secondary.forEach(node=>node.hidden=true);back.hidden=true;moreNext.hidden=true;});
      MobileShell.controls(actions);
      for(const node of [...actions.children])if(node.hasAttribute('data-phone-fullscreen')||node.hasAttribute('data-phone-install')){node.classList.add('title-action','quiet');secondary.push(node);}
      secondary.forEach(node=>node.hidden=true);back.hidden=true;moreNext.hidden=true;actions.append(more,back,moreNext);
    }
    m.append(actions);
    const chapter=el('aside','splash-chapter');chapter.append(el('span','title-kicker','ACT I'),el('strong','','The Fallen North'),el('span','chapter-line','Beyond the last warm wall.'));m.append(chapter);
    if(focus)actions.querySelector('button').focus({preventScroll:true});
  }
  function stage(container,getSelected,savedEquipment=null){
    const area=el('div','hero-viewport'),halo=el('div','hero-halo');halo.setAttribute('aria-hidden','true');
    const cv=el('canvas');cv.id='campCanvas';cv.setAttribute('role','img');
    const controls=el('div','hero-controls'),gear=el('div','gear-switch');gear.setAttribute('role','group');gear.setAttribute('aria-label','Preview equipment');
    let angle=1.05,regalia=!savedEquipment,dirty=true;
    const regaliaBtn=button('Class regalia','',()=>setGear(true)),starterBtn=button(savedEquipment?'Equipped gear':'Starting gear','',()=>setGear(false));
    gear.append(regaliaBtn,starterBtn);
    const rotations=el('div','hero-rotation');rotations.setAttribute('role','group');rotations.setAttribute('aria-label','Rotate hero');
    for(const [label,symbol,delta] of [['Rotate hero left','↶',-.45],['Rotate hero right','↷',.45]]){const b=button(symbol,'',()=>{angle+=delta;wake();});b.setAttribute('aria-label',label);rotations.append(b);}
    const caption=el('span','hero-preview-note','A vision of your class in full armor');
    controls.append(gear,rotations);area.append(halo,cv,controls,caption);container.append(area);
    function setGear(value){regalia=value;regaliaBtn.setAttribute('aria-pressed',String(value));starterBtn.setAttribute('aria-pressed',String(!value));caption.textContent=value?'A vision of your class in full armor':savedEquipment?'Your hero’s last saved equipment':'The equipment your new hero starts with';dirty=true;if(cv.dataset.renderedClass)wake();}
    setGear(regalia);
    const showcase=Player3D.createShowcase(),ctx=cv.getContext('2d'),motion=matchMedia('(prefers-reduced-motion: reduce)');
    let raf=0,last=0,start=performance.now(),width=0,height=0,disposed=false,failed=false;
    function size(){
      const r=cv.getBoundingClientRect();width=r.width;height=r.height;const ratio=Math.min(devicePixelRatio||1,2);
      const w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
      // ResizeObserver also delivers an initial notification; avoid erasing a finished frame at the same size.
      if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;delete cv.dataset.renderedClass;}
      ctx.setTransform(ratio,0,0,ratio,0,0);wake();
    }
    const observer=new ResizeObserver(size);observer.observe(cv);
    function draw(now){
      raf=0;if(disposed||failed||root().classList.contains('hidden')||!cv.isConnected)return;
      if(document.hidden)return;
      if((dirty||!motion.matches)&&now-last>=32&&width&&height){
        last=now;const id=getSelected();cv.setAttribute('aria-label',DATA.CLASSES[id].name+' live 3D model, '+(regalia?'class regalia':savedEquipment?'equipped gear':'starting gear'));
        ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(width*.5,Math.min(height*.86,height-70));
        const scale=Math.min(width/132,height/114);
        ctx.save();ctx.scale(1,.18);const shadow=ctx.createRadialGradient(0,0,0,0,0,33*scale);shadow.addColorStop(0,'rgba(0,0,0,.48)');shadow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=shadow;ctx.fillRect(-33*scale,-33*scale,66*scale,66*scale);ctx.restore();
        try{showcase.draw(ctx,id,{t:motion.matches?0:(now-start)/1000,ang:angle,scale,regalia,equipment:!regalia&&savedEquipment?savedEquipment():null});cv.dataset.renderedClass=id;}
        catch(error){failed=true;const msg=el('p','preview-error',error.message);msg.setAttribute('role','alert');area.append(msg);}
        ctx.restore();dirty=false;
      }
      if(!failed&&(!motion.matches||dirty))raf=requestAnimationFrame(draw);
    }
    function wake(){dirty=true;if(!raf&&!disposed)raf=requestAnimationFrame(draw);}
    document.addEventListener('visibilitychange',wake);motion.addEventListener('change',wake);size();wake();
    return {refresh(){angle=1.05;start=performance.now();wake();},dispose(){disposed=true;cancelAnimationFrame(raf);observer.disconnect();document.removeEventListener('visibilitychange',wake);motion.removeEventListener('change',wake);showcase.dispose();}};
  }
  function backButton(back=()=>main({focus:true})){return button('← BACK','title-back',back);}
  function newHero(options={}){
    const m=reset('new'),preferred=new URLSearchParams(location.search).get('class');let selected=ORDER.includes(preferred)?preferred:'vanguard',phoneHeroActions=null;
    root()._back=options.back||null;
    const top=el('div','selection-top');top.append(backButton(options.back),el('span','title-kicker',options.coop?'CHOOSE YOUR CO-OP HERO':'CHOOSE WHO ANSWERS THE CALL'),el('span','selection-count','FIVE CALLINGS. ONE FATE.'));m.append(top);
    const scene=el('section','selection-scene'),info=el('div','class-story');info.id='campInfo';info.setAttribute('role','tabpanel');info.tabIndex=0;
    scene.append(info);m.append(scene);
    const preview=stage(scene,()=>selected);
    const roster=el('div','class-roster');roster.setAttribute('role','tablist');roster.setAttribute('aria-label','Hero class');
    const tabs=new Map();
    ORDER.forEach((id,index)=>{
      const b=button('','class-choice',()=>select(id));b.id='choose-'+id;b.dataset.class=id;b.setAttribute('role','tab');b.setAttribute('aria-label',DATA.CLASSES[id].name);b.setAttribute('aria-controls','campInfo');b.style.setProperty('--choice-color',THEMES[id].color);
      b.append(el('span','class-number',['I','II','III','IV','V'][index]),crest(id));
      const text=el('span','class-choice-text');text.append(el('strong','',DATA.CLASSES[id].name),el('small','',THEMES[id].role.split(' · ')[0]));b.append(text);tabs.set(id,b);roster.append(b);
      b.addEventListener('keydown',e=>{let next=index;if(['ArrowRight','ArrowDown'].includes(e.key))next=(index+1)%ORDER.length;else if(['ArrowLeft','ArrowUp'].includes(e.key))next=(index+ORDER.length-1)%ORDER.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=ORDER.length-1;else return;e.preventDefault();select(ORDER[next]);tabs.get(ORDER[next]).focus({preventScroll:true});});
    });
    m.append(roster);
    function select(id){
      selected=id;theme(id);const t=THEMES[id],cls=DATA.CLASSES[id];
      tabs.forEach((b,key)=>{b.setAttribute('aria-selected',String(key===id));b.tabIndex=key===id?0:-1;});info.setAttribute('aria-labelledby','choose-'+id);info.replaceChildren();
      info.append(el('span','title-kicker',t.title),el('h3','class-name',cls.name),el('p','class-quote',t.quote),el('p','class-description',cls.desc));
      const disciplines=el('div','class-disciplines');disciplines.setAttribute('aria-label','Skill disciplines');
      cls.trees.forEach((name,i)=>{const d=el('div','discipline');d.append(el('span','discipline-index',['I','II','III'][i]),el('strong','',name),el('span','',t.trees[i]));disciplines.append(d);});info.append(disciplines);
      preview.refresh();
      if(phoneHeroActions)info.append(phoneHeroActions);
    }
    const form=el('form','hero-form');form.id='campRow';
    const nameLabel=el('label','hero-name','NAME YOUR LEGEND'),input=el('input');input.id='nameInput';input.name='heroName';input.maxLength=options.coop?24:14;input.placeholder='Wanderer';input.autocomplete='off';input.spellcheck=false;nameLabel.append(input);
    const hardcore=el('label','hardcore-option'),check=el('input');check.type='checkbox';check.id='hcBox';check.name='hardcore';check.setAttribute('aria-describedby','hardcoreHelp');
    const hcText=el('span');hcText.append(el('strong','','Hardcore'),el('small','','One life. No second chances.'));hcText.lastChild.id='hardcoreHelp';hardcore.append(check,hcText);
    const go=el('button','title-action primary',options.coop?'CREATE CO-OP HERO':'ENTER THE MARCHES');go.type='submit';go.setAttribute('aria-label',go.textContent);
    form.append(nameLabel);if(!options.coop)form.append(hardcore);form.append(go);form.addEventListener('submit',e=>{e.preventDefault();Sfx.init();enter(m,()=>options.create?options.create(input.value.trim()||'Wanderer',selected):Game.newGame(input.value.trim()||'Wanderer',selected,check.checked));});m.append(form);
    select(selected);cleanup=()=>preview.dispose();focusHeading(tabs.get(selected));
    if(typeof MobileShell!=='undefined'&&MobileShell.enabled){
      root().dataset.heroStep='class';
      const actions=el('div','phone-hero-next');
      phoneHeroActions=actions;
      const next=button('Next', '',()=>{root().dataset.heroStep='identity';input.focus({preventScroll:true});});
      const details=button('Details','',()=>MobileShell.showHelp(`${DATA.CLASSES[selected].desc} Disciplines: ${DATA.CLASSES[selected].trees.join(', ')}.`,DATA.CLASSES[selected].name));
      actions.append(details,next);info.append(actions);
      for(const tab of tabs.values())tab.addEventListener('click',()=>info.append(actions));
      root()._back=()=>{if(root().dataset.heroStep==='identity'){root().dataset.heroStep='class';tabs.get(selected).focus({preventScroll:true});}else (options.back||(()=>main({focus:true})))();};
      top.firstChild.addEventListener('click',e=>{if(root().dataset.heroStep==='identity'){e.preventDefault();e.stopImmediatePropagation();root().dataset.heroStep='class';tabs.get(selected).focus({preventScroll:true});}},true);
    }
    // Keep the selected tab in the keyboard sequence after focusHeading.
    tabs.get(selected).tabIndex=0;
  }
  function savedHeroes(options={}){
    const m=reset('saves'),saves=options.saves||Game.listSaves();if(!saves.length){main({focus:true});return;}
    root()._back=options.back||null;
    let selected=saves.find(s=>s.slot===options.selectedId)||saves[0];
    const top=el('div','selection-top');top.append(backButton(options.back),el('span','title-kicker',options.coop?'YOUR CO-OP HEROES':'THE UNFINISHED CHRONICLES'),button('NEW HERO','title-back',options.newHero||newHero));m.append(top);
    const scene=el('section','selection-scene saved-scene'),story=el('div','saved-story');story.append(el('span','title-kicker','YOUR LEGENDS'),el('h3','saved-heading','Answer the call again.'));
    const list=el('div','saved-roster');list.setAttribute('role','group');list.setAttribute('aria-label','Saved heroes');story.append(list);scene.append(story);m.append(scene);
    const preview=stage(scene,()=>DATA.CLASSES[selected.classId]?selected.classId:'vanguard',()=>selected.equipment);
    const footer=el('div','saved-footer'),details=el('div','saved-details'),resume=button(options.coop?'HOST OR JOIN':'CONTINUE','title-action primary',()=>enter(m,()=>options.onSelect?options.onSelect(selected):Game.loadGame(selected.slot)));footer.append(details,resume);m.append(footer);
    const rows=new Map();
    for(const s of saves){
      const row=el('div','saved-row'),pick=button('','saved-hero',()=>select(s));pick.append(crest(s.classId));
      const text=el('span');text.append(el('strong','',s.name),el('small','',`Level ${s.lvl} · ${DATA.CLASSES[s.classId]?.name||s.classId}${s.hardcore?' · Hardcore':''}`));pick.append(text);pick.setAttribute('aria-label',`Select ${s.name}, level ${s.lvl} ${DATA.CLASSES[s.classId]?.name||s.classId}`);
      const del=button('×','delete-hero',()=>{if(confirm(options.deleteMessage?options.deleteMessage(s):`Bury ${s.name} forever?`))enter(m,async()=>{if(options.remove){await options.remove(s);await options.refresh();}else{Game.deleteSave(s.slot);savedHeroes();}});});del.setAttribute('aria-label','Delete '+s.name);del.title='Delete '+s.name;
      row.append(pick,del);rows.set(s.slot,pick);list.append(row);
    }
    function select(s){selected=s;options.onChange?.(s);theme(s.classId);rows.forEach((b,slot)=>b.setAttribute('aria-pressed',String(slot===s.slot)));details.replaceChildren(el('span','title-kicker','RESUME YOUR JOURNEY'),el('strong','',s.name),el('span','',`Level ${s.lvl} ${DATA.CLASSES[s.classId]?.name||s.classId}${s.hardcore?' · Hardcore':''}`));preview.refresh();}
    select(selected);cleanup=()=>preview.dispose();rows.get(selected.slot).focus({preventScroll:true});
  }
  function hide(){cleanup();cleanup=()=>{};background?.dispose();background=null;for(const [sibling,inert] of obscured)sibling.inert=inert;obscured.clear();}
  return Object.freeze({main,newHero,savedHeroes,hide});
})();
