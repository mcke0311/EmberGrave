/* Fixed ordinary equipment and legal skill-point budgets for encounter QA. */
"use strict";
const BossLoadouts = {
  apply(p,level) {
    const primary={vanguard:'str',emberwitch:'wil',gravebinder:'wil',veilranger:'dex',wildkeeper:'wil'}[p.classId];
    p.lvl=level;p.attr={...DATA.CLASSES[p.classId].baseStats};
    p.attr[primary]+=3*(level-1);p.attr.vit+=2*(level-1);p.attrPts=0;
    const cat={vanguard:'sword',emberwitch:'wand',gravebinder:'wand',veilranger:'bow',wildkeeper:'staff'}[p.classId];
    p.equip={};
    for(const slot of ['main','chest','head','gloves','boots','belt']) {
      const candidates=Object.values(DATA.BASES).filter(b=>b.slot===slot&&b.ilvl<=level&&(slot!=='main'||b.cat===cat));
      candidates.sort((a,b)=>b.ilvl-a.ilvl||a.id.localeCompare(b.id));
      if(candidates[0])p.equip[slot]=Items.fromBase(candidates[0].id);
    }
    const main={vanguard:'vanguard_0_0',emberwitch:'emberwitch_0_0',gravebinder:'venom_spit',veilranger:'veilranger_0_0',wildkeeper:'wildkeeper_1_0'}[p.classId];
    const summon={gravebinder:'raise_dead',wildkeeper:'call_wolf'}[p.classId];
    p.skills={};let budget=level-1;
    const rank=Math.min(10,Math.max(1,Math.ceil(budget/(summon?2:1))));
    p.skills[main]=Math.min(rank,budget);budget-=p.skills[main];
    if(summon){p.skills[summon]=Math.min(10,budget);budget-=p.skills[summon];}
    let secondarySummon=null;
    if(p.classId==='gravebinder') {
      p.skills={venom_spit:1,mark_of_frailty:1,raise_dead:Math.min(10,level-3)};
      budget=level-1-Object.values(p.skills).reduce((a,b)=>a+b,0);
      if(budget>0){secondarySummon='raise_plaguemage';p.skills[secondarySummon]=Math.min(10,budget);budget-=p.skills[secondarySummon];}
    }
    p.skillPts=budget;p.skillPerks={};p.skillL=main;p.skillR='basic';
    const tier=level<5?1:2;
    p.belt=[{id:'hp'+tier,count:6},{id:'mp'+tier,count:6},null,null];
    p.computeStats();p.hp=p.stats.maxHp;p.mana=p.stats.maxMana;
    return {main,summon,secondarySummon,level,equipment:Object.fromEntries(Object.entries(p.equip).map(([k,v])=>[k,v.baseId])),skills:{...p.skills}};
  },
  prepareSummons(p,summon,settle) {
    if(!summon||!p.skills[summon])return;
    const sk=p.resolveSkill(summon),rank=p.effRank(summon),cap=sk.cap?sk.cap(rank):1;
    for(let i=0;i<cap;i++) {
      if(sk.needsCorpse)Game.spawnCorpse(p.x+1,p.y+.3*i,20);
      p.performSkill(summon,null,{x:p.x+1,y:p.y});settle(1);p.action=null;
    }
  },
};
