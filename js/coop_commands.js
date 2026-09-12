/* All decisions use host-owned objects. Commands contain IDs, never item data. */
const CoopCommands=(()=>{
  const economic=new Set(['quaff','pickup','equip','unequip','moveItem','drop','belt','unbelt','use','identify','socket','buy','sell','craft','attribute','learn','perk','bind','acceptQuest','completeQuest','interact','portal','carry','place','offer','tidy','identifyAll','returnManagement','cancelCarry']);
  const fail=message=>{throw Error(message);};
  function nearby(p,o,range=2.5){return o&&TerrainLayers.same(p,o)&&U.dist(p.x,p.y,o.x,o.y)<=range;}
  function management(p){return p.management||(p.management={carried:null,origin:null,offer:[null,null,null,null],origins:[null,null,null,null]});}
  function item(p,id){
    if(!id)return null;
    for(const name of ['inv','stash']){const it=p[name].items.find(x=>x._coopId===id);if(it)return {it,grid:p[name],name};}
    for(const [slot,it] of Object.entries(p.equip))if(it?._coopId===id)return {it,name:'equip',slot};
    const m=management(p);if(m.carried?._coopId===id)return {it:m.carried,name:'carried'};
    const slot=m.offer.findIndex(it=>it?._coopId===id);return slot<0?null:{it:m.offer[slot],name:'offer',slot};
  }
  function remove(p,e){
    if(e.grid)Items.remove(e.grid,e.it);
    else if(e.name==='equip')delete p.equip[e.slot];
    else if(e.name==='carried'){management(p).carried=null;management(p).origin=null;}
    else{management(p).offer[e.slot]=null;management(p).origins[e.slot]=null;}
  }
  function consume(p,e,n=1){e.it.count=(e.it.count||1)-n;if(e.it.count<=0)remove(p,e);}
  function access(p,e){if(e.name==='stash')facility(p,'storage');if(e.name==='offer')facility(p,'forge');}
  function origin(e){return {name:e.name,slot:e.slot,x:e.it.gx,y:e.it.gy};}
  function returnItem(p,it,from){
    if(!it)return;
    if(from?.name==='equip'&&!p.equip[from.slot]&&Items.canEquip(p,it)&&!(it.twoHand&&p.equip.off)&&!(from.slot==='off'&&p.equip.main?.twoHand)){p.equip[from.slot]=it;return;}
    const grid=from&&['inv','stash'].includes(from.name)?p[from.name]:null;
    if(grid&&Number.isInteger(from.x)&&Number.isInteger(from.y)&&Items.fits(grid,it,from.x,from.y)){Items.place(grid,it,from.x,from.y);return;}
    if(!Items.autoPlace(p.inv,it)){Game.coop.drop(it,p);Coop.event('message',{message:'Your pack was full — returned item placed at your feet.'},p._coopId);}
  }
  async function settle(p,carryOnly=false){
    const m=management(p);returnItem(p,m.carried,m.origin);m.carried=null;m.origin=null;
    if(!carryOnly)for(let i=0;i<4;i++){returnItem(p,m.offer[i],m.origins[i]);m.offer[i]=null;m.origins[i]=null;}
    await Game.coop.prepareHero(p);p.computeStats();
  }
  function facility(p,type,npcId){
    const s=Game.state,o=npcId?s.npcs.find(n=>n.id===npcId):s.map.props.find(o=>o.interact===type&&nearby(p,o));
    if(!nearby(p,o)||(npcId&&!Game.canTradeWith(o)))fail('Move closer to '+(npcId?'the vendor':type)+'.');return o;
  }
  function checkSkill(p,id){if(id!=='basic'&&(!DATA.SKILLS[id]||!p.skills[id]||DATA.SKILLS[id].type==='passive'))fail('Skill is not learned');}
  async function execute(p,c){
    const s=Game.state;
    if(!c||typeof c.type!=='string'||JSON.stringify(c).length>4096)fail('Invalid gameplay command');
    if(!p||!s.players.includes(p))fail('Hero is not in this session');
    if(p.dead&&!['ready','bind','stop','returnManagement','cancelCarry'].includes(c.type))fail('Wait for a teammate to revive you.');
    const pt=c.point;
    if(pt&&(!Number.isFinite(pt.x)||!Number.isFinite(pt.y)||pt.x<0||pt.y<0||pt.x>s.map.w||pt.y>s.map.h||![0,1].includes(pt.surfaceId??0)))fail('Invalid destination');
    if(['move','steer','attack','cast','stop','jump','interact','pickup'].includes(c.type))p.reviveTarget=null;
    switch(c.type){
      case 'move':case 'steer':
        if(!pt)fail('Missing destination');p.command={type:c.type,point:pt};
        if(c.type==='move')Game.repath(p,pt.x,pt.y,pt.surfaceId);
        else{p.path=null;p._navGoal=null;p._navCache=null;}return;
      case 'stop':p.command=null;p.path=null;p._navGoal=null;p._navCache=null;p.drawing=null;p.moving=false;return;
      case 'release':p.releaseDraw();p.command=null;return;
      case 'attack':{
        checkSkill(p,c.skill);const t=s.monsters.find(m=>m._coopId===c.targetId&&!m.dead);
        if(!t)fail('Target is gone');p.command={type:'attack',target:t,skill:c.skill,hold:!!c.hold&&Game.coop.repeatSkill(c.skill)};p.path=null;return;
      }
      case 'cast':checkSkill(p,c.skill);if(p.resolveSkill(c.skill).type==='melee')return Game.coop.airAttack(p,c.skill,pt);p.command={type:'skillPoint',skill:c.skill,point:pt||{x:p.x,y:p.y,surfaceId:p.surfaceId}};p.path=null;return;
      case 'jump':return Game.coop.jump(p,pt);
      case 'quaff':if(!Number.isInteger(c.slot)||c.slot<0||c.slot>3)fail('Invalid belt slot');return p.quaff(c.slot);
      case 'revive':{
        const target=s.players.find(t=>t._coopId===c.targetId&&t.dead);if(!nearby(p,target,2))fail('Move within two tiles of your teammate.');
        p.command=null;p.path=null;p.reviveTarget={id:target._coopId,t:0,x:p.x,y:p.y,hurt:p._coopHurt||0};return;
      }
      case 'pickup':{
        const g=s.ground.find(g=>g._coopId===c.targetId);if(!g)return;
        if(!nearby(p,g,1.5)){p.command={type:'pickup',gi:g};Game.repath(p,g.x,g.y);return;}
        return Game.coop.pickup(g,p);
      }
      case 'interact':{
        const o=[...s.npcs,...s.map.props].find(o=>o._coopId===c.targetId);if(!o)fail('Object is no longer available');
        if(!nearby(p,o,o.interactionRange||1.8)){p.command={type:'interact',obj:o};Game.repath(p,o.x,o.y);return;}
        return c.committed?Game.coop.interactCommitted(o,p):Game.coop.interact(o,p);
      }
      case 'acceptQuest':case 'completeQuest':{
        if(p!==s.player)fail('The host manages the party campaign.');
        const q=DATA.QUESTS.find(q=>q.id===c.questId);if(!q||Coop.active&&!CoopProtocol.ZONES.includes(q.zone))fail('Quest is outside the co-op beta');
        if(!s.npcs.some(n=>n.id===q.giver&&nearby(p,n))&&!s.map.props.some(o=>o.interact==='board'&&q.giver==='board'&&nearby(p,o)))fail('Speak to the quest giver first.');
        if(c.type==='completeQuest'){
          if(s.quests[c.questId]?.state!=='reward')fail('Quest is not ready');
          Game.coop.completeQuest(c.questId);
          if(Coop.active)s.shrines=s.shrines.filter(z=>CoopProtocol.ZONES.includes(z));
          if(Coop.active&&q.target==='korvath'){s.flags.coopComplete=true;Coop.event('complete',{message:'Act I complete — thank you for playing the co-op beta!'});}
        }else Game.coop.acceptQuest(c.questId);
        return;
      }
      case 'attribute':
        if(!Object.hasOwn(p.attr,c.attribute)||!['str','dex','vit','wil'].includes(c.attribute)||p.attrPts<1)fail('No attribute point available');p.attr[c.attribute]++;p.attrPts--;p.computeStats();return;
      case 'learn':{
        const sk=DATA.SKILLS[c.skill];
        if(!sk||sk.cls!==p.classId)fail('Skill is not available to this class');
        if(p.skillPts<1||p.lvl<sk.reqLvl||(p.skills[c.skill]||0)>=sk.maxRank||(sk.prereq&&!p.skills[sk.prereq]))fail('Skill requirements are not met');
        p.skills[c.skill]=(p.skills[c.skill]||0)+1;p.skillPts--;p.computeStats();
        if(sk.type!=='passive'&&!p.quickSlots.includes(c.skill)){const i=p.quickSlots.indexOf(null);if(i>=0)p.quickSlots[i]=c.skill;}return;
      }
      case 'perk':{
        const result=SkillPerks.choose(p,c.skill,c.tier,c.perk);if(result===false)fail('Perk is not available');p.computeStats();return;
      }
      case 'bind':
        if(!(c.skill===null&&Number.isInteger(c.slot)))checkSkill(p,c.skill);if(c.slot==='L'||c.slot==='R')p['skill'+c.slot]=c.skill;else if(Number.isInteger(c.slot)&&c.slot>=0&&c.slot<4)p.quickSlots[c.slot]=c.skill;else fail('Invalid skill binding');return;
      case 'returnManagement':return settle(p);
      case 'cancelCarry':return settle(p,true);
      case 'tidy':if(management(p).carried)fail('Place the carried item first');if(!Items.tidy(p.inv))fail('This arrangement cannot be tidied');return;
      case 'identifyAll':{
        facility(p,'vendor',c.npcId);if(c.npcId!=='maesa')fail('This vendor cannot identify items');
        const items=p.inv.items.filter(it=>!it.identified);if(!items.length)fail('No unidentified items');if(p.gold<60)fail('Not enough gold');
        p.gold-=60;for(const it of items)it.identified=true;return;
      }
      case 'offer':{
        facility(p,'forge');if(!Number.isInteger(c.slot)||c.slot<0||c.slot>3)fail('Invalid offering slot');
        const m=management(p),old=m.offer[c.slot],from=m.origins[c.slot];
        if(c.itemId!==(m.carried?._coopId||null)||c.expectedId!==(old?._coopId||null))fail('Offering changed; try again');
        m.offer[c.slot]=m.carried;m.origins[c.slot]=m.origin;m.carried=old;m.origin=from;p.computeStats();return;
      }
      case 'place':{
        const m=management(p),it=m.carried;if(!it||it._coopId!==c.itemId)fail('Carried item changed');
        if(!['inv','stash'].includes(c.to)||!Number.isInteger(c.x)||!Number.isInteger(c.y))fail('Invalid item destination');
        if(c.to==='stash')facility(p,'storage');const grid=p[c.to];
        if(c.x<0||c.y<0||c.x+it.w>grid.w||c.y+it.h>grid.h)fail('Item does not fit');
        const overlap=grid.items.filter(o=>c.x<o.gx+o.w&&o.gx<c.x+it.w&&c.y<o.gy+o.h&&o.gy<c.y+it.h);
        if(overlap.length>1)fail('Item does not fit');const old=overlap[0];
        if((old?._coopId||null)!==(c.targetId||null))fail('Destination changed; try again');
        if(old&&it.kind==='consumable'&&old.kind==='consumable'&&it.baseId===old.baseId&&old.count<old.maxStack){
          const n=Math.min(old.maxStack-old.count,it.count);old.count+=n;it.count-=n;if(!it.count){m.carried=null;m.origin=null;}p.computeStats();return;
        }
        const from=old?origin({it:old,name:c.to}):null;
        if(old)Items.remove(grid,old);
        if(!Items.fits(grid,it,c.x,c.y)){if(old)Items.place(grid,old,from.x,from.y);fail('Item does not fit');}
        Items.place(grid,it,c.x,c.y);m.carried=old||null;m.origin=from;p.computeStats();return;
      }
      case 'unbelt':{
        const slot=p.belt[c.slot];if(!slot)fail('Empty belt slot');const it=Items.makeConsumable(slot.id,slot.count);
        if(!Items.canAutoPlace(p.inv,it))fail('Pack is full');Items.autoPlace(p.inv,it);p.belt[c.slot]=null;return;
      }
      case 'unequip':{
        if(!Items.EQUIP_SLOTS.includes(c.slot))fail('Invalid equipment slot');
        const it=p.equip[c.slot];if(!it)fail('Empty equipment slot');if(c.itemId&&it._coopId!==c.itemId)fail('Equipment changed');if(!Items.canAutoPlace(p.inv,it))fail('Pack is full');
        Items.autoPlace(p.inv,it);delete p.equip[c.slot];await Game.coop.prepareHero(p);p.computeStats();return;
      }
      case 'buy':{
        facility(p,'vendor',c.npcId);const stock=s.vendorStock[c.npcId],it=stock?.find(i=>i._coopId===c.itemId);if(!it)fail('Item is no longer for sale');
        const price=Items.value(it);if(p.gold<price)fail('Not enough gold');
        const incoming=it.kind==='consumable'?Items.makeConsumable(it.baseId,it.count):it;
        if(!Items.canAutoPlace(p.inv,incoming))fail('Pack is full');Items.autoPlace(p.inv,incoming);p.gold-=price;
        if(it.kind!=='consumable')stock.splice(stock.indexOf(it),1);return;
      }
      case 'craft':{
        facility(p,'forge');if(!Array.isArray(c.items)||c.items.length>4||new Set(c.items).size!==c.items.length)fail('Invalid offering');
        const entries=c.items.map(id=>item(p,id));if(entries.some(v=>!v||!['inv','offer'].includes(v.name)))fail('Offering item is missing');
        const check=ForgeRecipes.evaluate(entries.map(v=>v.it),c.recipe);if(!check.valid)fail('Offering does not match this recipe');
        const {glyphs,gear,pots,total,upgrade}=check;let result,left=[];
        for(const v of entries)remove(p,v);
        if(c.recipe==='glyph')result=Items.reforgeGlyph(glyphs[0]);
        else if(c.recipe==='temper'||c.recipe==='reweave'){result=gear[0];Items.rollAffixesOnto(result,c.recipe==='temper'?'enhanced':'rare');result.identified=true;}
        else{result=Items.makeConsumable(upgrade,1);let n=total-3;while(n>0){const take=Math.min(10,n);left.push(Items.makeConsumable(pots[0].baseId,take));n-=take;}}
        for(const it of [result,...left])if(!Items.autoPlace(p.inv,it))Game.coop.drop(it,p);p.computeStats();return;
      }
      case 'portal':if(p!==s.player)fail('Only the host can open a party portal');return Game.coop.castPortal();
      case 'travel':if(p!==s.player)fail('Only the host can request party travel');return Coop.requestTravel(c.zone,c.spawn||'default');
    }
    const entry=item(p,c.itemId);if(!entry)fail('Item is no longer in your inventory');
    const {it,grid,name}=entry;
    access(p,entry);
    switch(c.type){
      case 'carry':{
        const m=management(p);if(m.carried)fail('Place the carried item first');
        const from=entry.name==='offer'?m.origins[entry.slot]:origin(entry);
        remove(p,entry);m.carried=it;m.origin=from;await Game.coop.prepareHero(p);p.computeStats();return;
      }
      case 'moveItem':{
        if(!['inv','stash'].includes(c.to)||!entry.grid)fail('Invalid item destination');
        const dest=p[c.to];if(dest===p.stash||name==='stash')facility(p,'storage');
        const x=it.gx,y=it.gy;Items.remove(grid,it);
        if(Number.isInteger(c.x)&&Number.isInteger(c.y)){if(!Items.fits(dest,it,c.x,c.y)){Items.place(grid,it,x,y);fail('Item does not fit');}Items.place(dest,it,c.x,c.y);}
        else {if(!Items.canAutoPlace(dest,it)){Items.place(grid,it,x,y);fail('No room');}Items.autoPlace(dest,it);}p.computeStats();return;
      }
      case 'drop':remove(p,entry);Game.coop.drop(it,p);await Game.coop.prepareHero(p);p.computeStats();return;
      case 'sell':if(name!=='inv')fail('Only pack items can be sold');facility(p,'vendor',c.npcId);p.gold+=Items.sellValue(it);remove(p,entry);p.computeStats();return;
      case 'identify':{
        const scroll=p.inv.items.find(i=>i.baseId==='idscroll');if(!scroll||it.identified||it.kind!=='gear')fail('A Scroll of Insight is required');consume(p,item(p,scroll._coopId));it.identified=true;return;
      }
      case 'socket':{
        const socketable=item(p,c.socketId);if(!socketable||!['glyph','jewel'].includes(socketable.it.kind)||!it.identified)fail('Select a glyph or jewel and identified gear');
        access(p,socketable);
        if(it.kind!=='gear'||!Items.socketGlyph(it,socketable.it))fail('No compatible empty socket');remove(p,socketable);await Game.coop.prepareHero(p);p.computeStats();return;
      }
      case 'belt':{
        if(!it.belt)fail('This item cannot be put in the belt');
        for(let i=0;i<4&&it.count>0;i++){const slot=p.belt[i];if(slot&&slot.id===it.baseId){const n=Math.min(it.count,5-slot.count);slot.count+=n;it.count-=n;}}
        for(let i=0;i<4&&it.count>0;i++)if(!p.belt[i]){const n=Math.min(5,it.count);p.belt[i]={id:it.baseId,count:n};it.count-=n;}
        if(it.count<=0)remove(p,entry);return;
      }
      case 'use':{
        if(DATA.CONSUMABLES[it.baseId]?.respec){Game.coop.respec(p);consume(p,entry);return;}
        if(it.baseId==='tp'){if(p!==s.player)fail('Only the host opens party portals');if(Game.coop.castPortal())consume(p,entry);return;}
        fail('Put draughts in your belt to drink them.');break;
      }
      case 'equip':{
        if(name==='equip'||!it.identified||!Items.canEquip(p,it))fail('You cannot equip that item');
        const allowed=Items.slotFor(it),slot=c.slot||allowed.find(k=>!p.equip[k])||allowed[0];if(!allowed.includes(slot))fail('Invalid equipment slot');
        const displaced=[p.equip[slot]];
        if(it.twoHand&&p.equip.off){displaced.push(p.equip.off);delete p.equip.off;}
        if(slot==='off'&&p.equip.main?.twoHand){displaced.push(p.equip.main);delete p.equip.main;}
        remove(p,entry);p.equip[slot]=it;
        for(let i=0;i<displaced.length;i++){const old=displaced[i];if(!old)continue;
          if(name==='carried'&&i===0){management(p).carried=old;management(p).origin={name:'equip',slot};}
          else if(!Items.autoPlace(p.inv,old)){if(i===0)fail('Make room in your pack before swapping equipment');Game.coop.drop(old,p);}
        }
        await Game.coop.prepareHero(p);p.computeStats();return;
      }
      default:fail('Unknown gameplay command');
    }
  }
  return {execute,economic,nearby,management,settle};
})();
