/* Character-sheet read models. No rolls, casts, resource spending or save state.
   Damage adapters follow Player.performSkillAction, spellHit, Monster.update,
   Minion.dmgRoll and Game's field/trap handlers; these paths deliberately have
   different scaling. Keep their behavior covered by character_sheet_contract. */
"use strict";
const CharacterSheet = (() => {
  const elements = Object.freeze({phys:"Physical",fire:"Fire",cold:"Cold",light:"Lightning",poison:"Poison",shadow:"Shadow",earth:"Earth"});
  const coreElements = ["phys","fire","cold","light","poison"];
  const formatter = new Intl.NumberFormat("en-US", {maximumFractionDigits:2});
  const number = v => formatter.format(Math.abs(v) < .000001 ? 0 : v);
  const percent = v => number(v) + "%";
  const bonus = v => (v < 0 ? "" : "+") + percent(v);
  const range = v => Array.isArray(v) ? [...v] : [v,v];
  const scale = (v,m) => range(v).map(n=>n*m);
  const sum = values => values.reduce((a,v)=>[a[0]+v[0],a[1]+v[1]],[0,0]);
  const formatRange = v => v == null ? "Conditional" : v[0] === v[1] ? number(v[0]) : number(v[0])+" – "+number(v[1]);
  const value = (s,k,r,def=0) => typeof s[k] === "function" ? s[k](r) : s[k] ?? def;
  // Resolving perks normally fills a player cache. Use a private cache for reads.
  function resolve(p,id) {
    const reader = Object.create(p);
    reader._perkCache = new Map(p._perkCache || []);
    return reader.resolveSkill(id);
  }
  const weaponTypes = new Set(["umbral_knife","dusk_cleave","shadow_flurry","deathblow","melee","sweep","spin","leap","wfan","wpierce","combo","combo_finish","execute","charge","grapple","thrown","bash","ricochet","rain","parry_stance"]);
  const spellTypes = new Set(["projectile","pierce","chain","fan","lightning","meteor","pyreblast","freezenova","arcblink","overloadnuke","corpse","reap"]);
  const supportTypes = new Set(["passive","combat_stance","shout","fear","banner","banner_ultimate","warshout_debuff","minionbuff","curse","taunt_curse","devour","blink","form","decoy","afterimage"]);
  const specialTypes = new Set(["shockwave","charge_shot","fireclaw","rabies","trap","firewall","groundfield","balllightning","roamaoe","totem","summon","summon_golem","ward","buff","sacrifice","siphon_beam","doom","plague_seed","corpse_launch","outbreak","dragnet","tripwire","weapon_coat","deathmark","detonate_dots"]);
  function classification(sk) {
    return weaponTypes.has(sk.type) ? "weapon" : spellTypes.has(sk.type) ? "spell" : supportTypes.has(sk.type) ? "support" : specialTypes.has(sk.type) ? "special" : null;
  }
  function preview(p,id="basic",state=Game.state) {
    const sk=resolve(p,id), st=p.stats, now=state?.time || 0;
    if (!sk) return {id,name:"Unassigned",parts:[],notes:["Assign a learned skill using the skill bar."],status:"unassigned"};
    const rk=id==="basic"?1:p.effRank(id), syn=id==="basic"?1:p.synergyMult(sk);
    const result={id,name:sk.name,rank:rk,kind:classification(sk),parts:[],notes:[],status:"damage"};
    const v=(key,def=0)=>value(sk,key,rk,def), note=t=>result.notes.push(t);
    const dotBonus=1+(st.poisonDotPct||0)/100;
    const empower=kind=>1+(p.buffs||[]).reduce((n,b)=>n+(b.until>now&&b.uniqueEmpower?.attack===kind?b.uniqueEmpower.pct:0),0)/100;
    const part=(label,basis="per hit")=>{const a={label,basis,hit:Object.fromEntries(coreElements.map(e=>[e,[0,0]])),dots:[],notes:[]};result.parts.push(a);return a;};
    const dot=(a,element,total,duration,label,help="A fresh application lasting its full duration. Reapplication refreshes or replaces this effect; it is not added as another stack.",playerOwned=true)=>{
      const amount=scale(total,playerOwned?DATA.elementMultiplier(p,element):1);
      if (amount.some(n=>n!==0)) a.dots.push({element,range:amount,duration,label:label||elements[element]+" over time",help});
    };
    // spellHit converts direct damage and adds a two-second burn to converted
    // spells. Weapon strike's conversion suppresses its ordinary poison.
    function spell(label,amount,elem,basis="per hit",opts={}) {
      const a=part(label,basis), converted=st.dmgToFire>0&&elem!=="fire", e=converted?"fire":elem;
      a.hit[e]=scale(amount,empower("spell")*DATA.elementMultiplier(p,e));
      // Explicit zero/undefined options suppress the runtime's default burn.
      const burn=Object.hasOwn(opts,"burn")?opts.burn:(converted?1:0);
      if(e==="fire"&&burn)dot(a,"fire",burn*2*dotBonus,2,"Burn");
      if(e==="fire"&&opts.scorch)dot(a,"fire",opts.scorch*3*(1+(st.scorchPct||0)/100),3,"Scorch · one stack","One new stack on an unscorched enemy. Up to five stacks can build on repeated hits; existing stacks are excluded from this baseline.");
      if(e==="poison"&&opts.pdot)dot(a,"poison",opts.pdot*dotBonus,3,"Poison");
      return a;
    }
    function weapon(label,mult,basis="per hit",opts={}) {
      const a=part(label,basis), e=st.elem, fire=opts.fire??st.dmgToFire>0;
      a.hit.phys=scale(p.weaponDamage(),(1+(st.dmgPct+(opts.damageBonus||0))/100)*mult);
      const tempo=(opts.tempo??p.tempo??0)*(st.dmgPerTempo||0);
      a.hit.phys=a.hit.phys.map(n=>n+tempo);
      a.hit.fire=e.fire?[e.fire*.6,e.fire]:[0,0];a.hit.cold=e.cold?[e.cold*.6,e.cold]:[0,0];a.hit.light=e.light?[1,Math.max(1,e.light)]:[0,0];
      if(fire){a.hit.fire=sum(Object.values(a.hit));for(const key of ["phys","cold","light"])a.hit[key]=[0,0];}
      for(const key in a.hit)a.hit[key]=scale(a.hit[key],empower("strike")*DATA.elementMultiplier(p,key));
      let poison=fire?0:(e.poison||0), seconds=3;
      const arrow=opts.arrow&&["bow","crossbow"].includes(p.equip.main?.cat);
      if(arrow&&p.coat&&p.buffs.some(b=>b.id==="serrated")){poison=Math.max(poison,p.coat.pdot);seconds=p.coat.woundDuration??4;poison=poison/3*seconds;}
      dot(a,"poison",poison*dotBonus,seconds,arrow&&p.coat?"Poison / arrow coating":"Weapon poison");
      a.notes.push("Physical and added elemental rolls make up the weapon hit. The current combat system mitigates their combined hit with armor; Fire conversion instead uses Fire Resistance. Poison is applied separately.");
      return a;
    }
    const spellRange=()=>scale(v("dmg"),(1+st.attr.wil/110)*(1+st.spellPct/100)*syn);
    const fieldRange=()=>scale(v("dmg"),1+st.spellPct/100);
    if(!result.kind){result.status="unsupported";note("Damage preview is unavailable for this skill type.");return result;}
    if(id!=="basic"&&rk<=0){result.status="unlearned";note("Learn this talent to preview its damage.");return result;}
    if(sk.requiredWeapons&&!p.canUseSkillWeapon(id))note("Requires a bow or crossbow. These values preview the assignment, which cannot currently be used.");
    if(sk.mana&&id!=="basic")note("Aether cost: "+number(v("mana"))+". Effective rank: "+rk+".");
    if(supportTypes.has(sk.type)) {result.status="support";note("No direct damage. "+sk.desc(rk));}
    else if(weaponTypes.has(sk.type)) {
      let mult=v("dmgMult",v("mult",1))*syn, tempo=p.tempo||0;
      if(sk.type==="combo"){tempo=Math.min(3+(st.tempoCapBonus||0),tempo+v("tempoGain",1)+(p.stance==="berserk"?1:0));note("Includes the Tempo generated by this strike.");}
      if(sk.type==="combo_finish"){if(!tempo){result.status="conditional";note("Requires at least one Tempo. Build Tempo to see the finisher's damage.");return result;}mult*=.6+.35*tempo;tempo=Math.min(tempo,v("tempoRetain"));}
      if(sk.type==="execute"){mult=v("base")*syn;tempo=0;note("Baseline against a full-life enemy. Missing life increases damage; execution requires a wounded non-boss. Both bonuses are target-dependent.");}
      if(sk.type==="parry_stance")mult=v("riposteMult")*syn;
      const arrow=["wfan","wpierce","ricochet"].includes(sk.type)||(sk.type==="melee"&&st.ranged);
      const a=weapon(sk.type==="parry_stance"?"Counterattack":"Weapon hit",mult,sk.type==="rain"?"per pulse":sk.type==="parry_stance"?"per successful parry":arrow||sk.type==="thrown"?"per projectile hit":"per enemy hit",{tempo,arrow});
      if(sk.count)note(number(v("count"))+" projectiles; damage is per projectile hitting one enemy.");
      if(["umbral_knife","dusk_cleave","shadow_flurry","deathblow"].includes(sk.type)){
        result.veilConditional={exposed:v("exposedBonus"),shadowAmbush:25,missingHealthMax:v("missingHpBonus")*100};
        note("Conditional bonuses (excluded above): Shadow Ambush +25% for the entire cast"+(sk.exposedBonus?"; Exposed +"+number(v("exposedBonus"))+"%":"")+(sk.missingHpBonus?"; missing health up to +"+number(v("missingHpBonus")*100)+"%":"")+". These multiply with weapon damage; bleed ticks and mark explosions are separate.");
        if(sk.exposeDuration)note("A damaging hit applies Exposed for "+number(v("exposeDuration"))+"s; reapplication refreshes it.");
        if(sk.type==="shadow_flurry")note("A lone enemy receives all "+number(v("count"))+" blades; a pack shares them before repeats.");
        if(sk.type==="deathblow")note("A damaging hit detonates an active Killing Mark; explosion damage is excluded.");
        if(sk.cd)note("Cooldown: "+number(v("cd"))+"s.");
      }
      if(sk.type==="rain")note("Pulses every 0.25s for "+number(v("dur"))+"s. Recasting replaces the previous zone. The 25% bonus against Quarry is excluded.");
      if(sk.type==="ricochet")note("First impact shown. Each subsequent enemy bounce reduces the weapon multiplier by 12%.");
      if(sk.type==="thrown")note("Axes can hit on both outward and returning paths; each hit is shown separately.");
      if(sk.type==="grapple")a.notes.push("Pulling a non-boss triggers the strike on arrival. Against a boss you move to it; that boss is excluded from the charge hit.");
    } else if(spellTypes.has(sk.type)) {
      const elem={pyreblast:"fire",freezenova:"cold",arcblink:"light",overloadnuke:"light",reap:"shadow"}[sk.type]||sk.elem;
      let dm=spellRange();if(sk.type==="overloadnuke"){dm=dm.map(n=>n+v("perStatic")*(p.staticChg||0));note("Includes "+number(p.staticChg||0)+" current Static charges.");}
      const opts=["projectile","pierce","chain","fan"].includes(sk.type)?{burn:v("burn"),pdot:v("pdot"),scorch:v("scorch")}
        :sk.type==="meteor"?{burn:v("burn")}:sk.type==="pyreblast"?{burn:2}:{};
      spell("Spell impact",dm,elem,"per enemy hit",opts);
      if(sk.count)note(number(v("count"))+" projectiles; damage is per projectile.");
      if(sk.type==="chain")note("First impact shown. Subsequent jumps lose 15% damage each.");
      if(sk.type==="lightning")note("Each fork rolls its own damage; totals are per enemy.");
      if(sk.type==="pyreblast")note("Damage from consuming existing Scorch stacks and chance-based repeat blasts is excluded.");
      if(sk.type==="reap")note("The bonus against cursed enemies and any existing Doom detonation are excluded.");
      if(sk.type==="corpse")note("Requires a corpse or grave; damage is per enemy caught in the explosion.");
      if(sk.delay)note("Impact delay: "+number(v("delay"))+"s after the cast release.");
    } else switch(sk.type) {
      case "shockwave":
        if(sk.mult)weapon("Fissure strike",v("mult")*syn,"per enemy hit");else spell("Fissure impact",spellRange(),sk.elem||"earth","per enemy hit");break;
      case "charge_shot":
        weapon("Minimum draw",v("dmgMin")+(v("dmgMax")-v("dmgMin"))*.15,"per arrow hit",{arrow:true});
        weapon("Full draw",v("dmgMax"),"per arrow hit",{arrow:true});
        note("Full draw takes "+number(v("maxDraw"))+"s. An immediate release still uses 15% draw. Consumed Quarry bonuses are excluded.");break;
      case "fireclaw": {
        const old=p.buffs.find(b=>b.id==="fireclaw")?.stats?.dmgPct||0;
        weapon("Claw strike",v("meleeMult")*syn,"per enemy hit",{fire:true,damageBonus:v("dmgBoost")-old});
        spell("Fire explosion",spellRange(),"fire","per explosion hit",{burn:2});
        note("Requires a beast shape. Includes the damage buff applied by this cast. "+number(v("explosions"))+" explosions, 0.3s apart; overlapping explosions can hit the same foe.");break;
      }
      case "rabies": {
        const a=weapon("Bite",v("dmgMult")*syn);
        a.dots=[];a.conditionalEffect="Rabies poison deals 50% of the bite damage per second, multiplied by your "+bonus(st.elementPct?.poison||0)+" Poison Damage, for "+number(v("dur"))+"s, replacing weaker poison. The elemental bonus is captured on application and inherited by contagious clouds.";
        note("The bite is a baseline; its full poison total requires the damage actually dealt to a target.");break;
      }
      case "dragnet": {
        const a=part("Net impact","per enemy caught");a.hit.phys=scale(v("dmg"),syn*(1+(st.trapPct||0)/100)*(1+st.attr.dex/140));
        note("Releases after 0.4s; pulls enemies together over 0.3s, then roots for "+number(Math.min(3,v("root")))+"s. Bosses receive a 40% slow instead. Cooldown: "+number(v("cd"))+"s.");break;
      }
      case "trap": {
        const a=part("Trap impact","per enemy hit");a.hit.phys=scale(v("dmg"),syn*(1+(st.trapPct||0)/100)*(1+st.attr.dex/140));
        dot(a,"fire",v("burn")*2*dotBonus,2,"Burn");
        note("Trap impact currently deals physical damage, including frost and powder traps. Any burn is separate. Arms in "+number(v("trapArm",.7)/(1+(st.armSpeed||0)/100))+"s.");break;
      }
      case "firewall":spell("Wall pulse",fieldRange(),"fire","per 0.4s pulse");note("Lasts "+number(v("dur"))+"s. Targets must stay in the wall; pulses do not add a lingering burn.");break;
      case "groundfield": {
        const kind=sk.fieldKind, tick=v("tickEvery",.5);
        if(["smoke","regrowth"].includes(kind)){result.status="support";note("No direct damage. "+sk.desc(rk));break;}
        if(kind==="spore"){const a=part("Spore infection","per fresh application");dot(a,"poison",(v("dmg")[0]||3)*3*dotBonus,3,"Spore poison");}
        else if(kind==="caltrop"){const a=part("Caltrop pulse","per "+number(tick)+"s pulse");a.hit.phys=scale(v("dmg"),syn*(1+(st.trapPct||0)/100)*(1+st.attr.dex/140));note("Scales with Dexterity and Trap Damage, including Tinker's Eye.");}
        else {const elem={inferno:"fire",glacier:"cold",static:"light",caltrop:"phys",miasma:"poison",snare:"poison",quake:"earth"}[kind];
          spell("Field pulse",scale(fieldRange(),kind==="static"?1+(p.staticChg||0)/40:1),elem,"per "+number(tick)+"s pulse",kind==="inferno"?{burn:2}:{});}
        note("Field lasts "+number(v("dur"))+"s. Only enemies inside are affected.");
        if(kind==="quake")note("Damage per fissure hit. Each pulse has a 70% chance to create a fissure at a random point.");break;
      }
      case "balllightning":case "roamaoe":
        spell(sk.type==="balllightning"?"Orb arc":"Cyclone pulse",v("dmg"),"light","per "+number(sk.type==="balllightning"?v("orbTick",.35):v("tickCd",.4))+"s pulse");
        note("Lasts "+number(sk.type==="balllightning"?v("dur"):v("ttl"))+"s. Damage is per enemy in range, using this effect's own damage range.");break;
      case "totem": {
        const dm=scale(v("dmg"),1+(st.totemPower||0)/100);
        if(sk.totemKind==="tempest"){
          spell("Storm ring",dm,"light","per "+number(v("pulseCd",1.4))+"s ring hit");
          spell("Wisp",dm,"light","per wisp impact");note("One wisp every "+number(v("wispCd",3))+"s when a target is available.");
        }else spell("Totem bolt",dm,"light","per "+number(v("zapCd",1.1)*Math.max(.1,1-(st.totemRate||0)/100))+"s bolt");
        note("Per totem. Lasts "+number(v("ttl")*(1+(st.totemTtl||0)))+"s; includes Totem Damage. Tempest ring and wisp intervals are independent of Totem Attack Speed.");break;
      }
      case "summon":case "summon_golem": {
        const golem=sk.type==="summon_golem", ms=golem?null:v("minionStats");
        if(ms?.noAttack){result.status="support";note("No direct damage. This companion supports you with its aura. "+sk.desc(rk));break;}
        const existing=(state?.minions||[]).filter(m=>!m.dead&&m.owner===p&&m.sourceSkill===id);
        const samples=existing.length?existing:[null];
        // Identical companions share a readout; different stitches/buffs retain
        // their own damage. Never construct a Minion just to inspect a summon.
        const seen=new Set();
        for(const m of samples){
          const base=m?.dmg||(golem?v("slamDmg").map(Math.round):ms.dmg);
          const aura=p.summonAuraStatsFor(m||p), buff=m&&now<m.buffUntil?m.buffDmg:0;
          const dm=scale(base,(1+(st.minionDmgPct||0)/100)*(1+(aura.dmgPct||0)/100)*(1+(buff||0)/100));
          const beast=m?m.beast:["wolf","boar","hawk","bear","ent"].includes(ms?.sprite);
          const poison=beast?0:(m?.pdot||ms?.pdot||0)+(st.minionPoison||0);
          const slamBase=m?.slamDmg||(golem?base:null);
          const slam=(m?m.slamRadius:golem||["bear","ent"].includes(ms?.sprite))?
            (slamBase?scale(slamBase,(1+(st.minionDmgPct||0)/100)*(1+(aura.dmgPct||0)/100)):scale(dm,1.5)):null;
          const key=JSON.stringify([dm,poison,slam]);if(seen.has(key))continue;seen.add(key);
          const a=part((m?"Living companion":"New companion")+(golem?" · "+(m?.stitches||1)+" stitches":""),"per companion attack");a.hit.phys=dm;dot(a,"poison",poison*dotBonus,3,"Companion poison",undefined,false);
          if(slam){const b=part("Companion slam","per enemy hit · 4.5s cooldown");b.hit.phys=slam;}
        }
        note(existing.length?"Includes the living companions' current damage, auras and rally bonuses.":"Preview at your position, including nearby auras. Grave-empowered summons double base damage; golem preview uses one corpse.");
        if(golem)note("Stitches increase base damage. Slams use the same base range and aura bonus, but do not receive temporary rally damage.");
        note("Upkeep: "+number(v("upkeep"))+" aether/s per companion. Companions die when aether reaches zero.");break;
      }
      case "ward": {const a=part("Bone shield retaliation","per nearby melee hit absorbed");a.hit.phys=range(v("retal"));note("Shield absorbs "+number(v("shield"))+" damage for up to "+number(v("dur"))+"s.");break;}
      case "buff":
        if(sk.retal){const a=part("Frost retaliation","per nearby melee hit");a.hit.phys=range(v("retal"));note("This retaliation currently uses armor mitigation and chills its attacker. "+sk.desc(rk));}
        else {result.status="support";note("No direct damage. "+sk.desc(rk));}break;
      case "sacrifice":
        if(sk.mode==="one"){result.status="support";note("No direct damage. "+sk.desc(rk));}
        else {spell("Sacrifice explosion",v("dmg"),"poison","per full-life standard companion");note("Actual damage scales with the sacrificed companion's remaining life fraction: golems ×2, ranged companions ×0.7. Each explosion is separate.");}break;
      case "siphon_beam": {
        const tick=v("tickRate",.25), ramp=Math.min(.6,(p.siphon?.ramp||0)+.08*tick);
        spell("Channel tick",v("tickDmg")*(1+ramp),"shadow","per "+number(tick)+"s tick");
        note("Includes the next tick's ramp ("+percent(ramp*100)+"). Ramps by 8% per second, capped at 60%; channel lasts up to "+number(v("maxChannel"))+"s and drains "+number(v("manaPerSec",2))+" aether/s.");break;
      }
      case "doom":
        spell("Early detonation",scale([v("dmgLo"),v("dmgHi")],.5),"shadow","per enemy hit");
        spell("Fully charged detonation",[v("dmgLo"),v("dmgHi")],"shadow","per enemy hit");
        note("Charges over "+number(v("timer")*(1+(st.curseDurPct||0)/100))+"s. Early death detonates at 50–100% of full damage, depending on accumulated charge.");break;
      case "plague_seed": {
        const a=part("Plague infection","per application"), duration=v("dur")+1/st.castRate;
        // Plague ticks immediately, then each second, and checks expiry after
        // ticking. The cast wind-up is included in its recorded duration.
        dot(a,"poison",v("tick")*(Math.floor(duration)+1),duration,"Plague",number(v("tick"))+" damage immediately and every second; total assumes uninterrupted infection. Expiry is checked after the last due tick. Plague uses its own fixed damage and ignores resistance.");
        note("Plague duration includes the cast wind-up. Existing infection and spreads are excluded.");break;
      }
      case "corpse_launch":
        spell("Corpse impact",fieldRange(),"poison");spell("Nearby spray",scale(fieldRange(),.6),"poison","per other enemy hit");note("Requires a corpse. Spray excludes the enemy struck directly.");break;
      case "outbreak": {
        const a=spell("Wave infection",v("tick"),"poison","per newly infected enemy");dot(a,"poison",v("tick")*6,5,"Plague","Fixed plague damage immediately and every second through its five-second expiry. Existing infections and spreads are excluded.");
        spell("Corpse rupture",v("corpseDmg"),"poison","per corpse explosion hit");break;
      }
      case "tripwire": {const a=spell("Wire trigger",v("dmg"),"phys","per enemy caught");a.dots=[];dot(a,"poison",v("bleed")*3*dotBonus,3,"Bleeding (Poison)","The wire's bleeding is processed as poison damage over three seconds. It replaces existing weapon poison or burn.");break;}
      case "weapon_coat": {const a=part("Arrow coating","per fresh arrow wound"), duration=v("coatDuration",4);dot(a,"poison",v("pdot")/3*duration*dotBonus,duration,"Poison wound");note("No immediate damage from applying the coating. Bow and crossbow projectiles apply the wound; stronger existing poison is retained. Coating lasts "+number(v("dur"))+"s.");break;}
      case "deathmark":spell("Mark detonation",v("detDmg"),"shadow","per enemy hit");note("Detonates on death or expiry after "+number(v("dur"))+"s. The marked target's amplification and spread to other targets are excluded.");break;
      case "detonate_dots":result.status="conditional";note("Requires existing bleed, poison wounds, Quarry or a Killing Mark. Damage depends on the target's remaining wound damage and stacks; there is no target-independent hit total.");break;
    }
    if(sk.type==="dragnet"||sk.type==="trap"||sk.fieldKind==="caltrop"){
      const bonus=st.snareConditionPct||0;result.snareConditionBonus={perCondition:bonus,max:bonus*3};
      note("Exploit Weakness: +"+number(bonus)+"% damage for each active slow, root, and physical bleed (up to +"+number(bonus*3)+"%). Conditions are checked before the hit. This conditional bonus is excluded from baseline damage and damage-over-time totals.");
    }
    for(const a of result.parts){
      a.totalHit=sum(Object.values(a.hit));
      if(a.totalHit.some(n=>n>0)&&!["summon","summon_golem","ward","buff"].includes(sk.type))dot(a,"phys",(st.bleedDps||0)*3,3,"Master of the Hunt bleed","Successful damaging attacks apply physical bleed for three seconds, reduced by armor. Repeated hits refresh the strongest bleed without stacking; poison remains separate.");
      a.totalEffect=a.conditionalEffect?null:sum([a.totalHit,...a.dots.map(d=>d.range)]);
    }
    return result;
  }

  const statDefs = [];
  function define(group,id,label,help,format=number,read=p=>p.stats[id]||0){statDefs.push({group,id,label,help,format,read});}
  define("Attributes","str","Strength","Each point adds 1 percentage point to the physical weapon damage bonus. Strength also helps meet equipment requirements.",number,p=>p.stats.attr.str);
  define("Attributes","dex","Dexterity","Each point adds 15 base Attack Rating, 0.25 base Armor and 0.08 percentage points of critical chance. With a shield, each 10 points adds 1% block. Dexterity also scales trap damage and equipment eligibility.",number,p=>p.stats.attr.dex);
  define("Attributes","vit","Vitality","Each point adds 4 base maximum Life, before maximum-life percentage bonuses. More Life lets you survive larger hits.",number,p=>p.stats.attr.vit);
  define("Attributes","wil","Willpower","Each point adds 3 maximum Aether. Standard spell damage is multiplied by 1 + Willpower / 110. A larger aether pool also increases regeneration; fields, totems and other special effects use their own scaling.",number,p=>p.stats.attr.wil);
  define("Offense","dmgPct","Physical Damage Bonus","Strength and global damage bonuses increase the physical portion of weapon strikes. Local weapon affixes are already included in the weapon's base range.",bonus);
  define("Offense","ar","Attack Rating","Improves the chance of landing weapon attacks, relative to enemy defense and both combatants' levels. Standard spells do not roll Attack Rating.");
  define("Offense","hitChance","Chance to Hit · Recent Target","Weapon hit chance against the last enemy attacked. It depends on Attack Rating, enemy defense and levels, and is limited to 20–95%. This target-specific readout does not change the damage baselines.",v=>v,p=>{const m=p.lastTarget;return !m?.def||m.dead?"— (no recent target)":Math.round(p.hitChanceVs(m)*100)+"% vs "+(m.name||m.def.name||"target");});
  define("Offense","critChance","Critical Chance","Chance for a critical weapon strike, standard spell or trap hit. Critical Chance is capped at 75%; effects with their own fixed damage do not automatically roll critical hits.",percent);
  define("Offense","critDmg","Critical Damage","Total critical multiplier: 150% means a critical hit deals 1.5 times normal damage. Weapon criticals multiply the physical roll; added weapon elements and poison are not multiplied.",percent);
  define("Offense","ias","Attack Speed Bonus","Increases attack rate by this percentage of the weapon's base rate. Faster attacks reduce weapon attack wind-up and recovery.",bonus);
  define("Offense","attackRate","Attacks / sec","Weapon action rate: 1.35 × weapon speed × (1 + Attack Speed Bonus / 100). Actual hits also depend on reach, movement and the skill used.",v=>number(v)+" /s");
  define("Offense","range","Melee Weapon Reach","Normal melee reach from your equipped weapon. Skills may add their own reach and enemy size affects contact distance. Ranged projectiles use their own speed and lifetime instead of this value.",v=>number(v)+" yards");
  define("Offense","spellPct","Spell Power","Increases damage in spell paths that apply Spell Power, including standard spells and several persistent fields. Totems, companions and certain fixed-damage skills have separate scaling; their damage previews follow those rules.",bonus);
  for (const [elem, label] of Object.entries(DATA.DAMAGE_ELEMENTS)) define("Offense", elem + "DmgPct", label + " Damage Bonus",
    "Increases your matching damage after conversion, including spells, added weapon damage, item effects and damage over time. Bonuses add together. Damage over time captures the bonus when applied. Summon damage uses its own bonuses.",
    bonus, p => p.stats.elementPct?.[elem] || 0);
  define("Offense","fcr","Cast Speed Bonus","Increases the rate of standard cast animations. It shortens cast wind-up; it does not shorten skill cooldowns or automatically speed up a field's pulses.",bonus);
  define("Offense","castRate","Casts / sec","Standard cast animation rate: 1.5 × (1 + Cast Speed Bonus / 100). Cooldowns, aether costs and skill-specific timing can limit sustained casting.",v=>number(v)+" /s");
  for(const [id,label,help] of [["dmgUndead","Damage to Undead","Increases the physical weapon roll against undead enemies."],["dmgDemon","Damage to Demons","Increases the physical weapon roll against demon enemies."]])define("Offense",id,label,help+" Excluded from baseline damage because it depends on the target.",bonus);
  for(const [id,label] of [["arUndead","Attack Rating vs. Undead"],["arDemon","Attack Rating vs. Demons"]])define("Offense",id,label,"Adds this Attack Rating only when checking a weapon hit against this enemy family. It does not increase damage on a successful hit.");
  define("Offense","knockback","Knockback","Successful weapon strikes push surviving non-boss enemies away, creating space to move or attack again.",v=>v?"Yes":"No");
  define("Offense","monsterFlee","Cause Flee","Chance for a weapon hit to make a surviving non-boss enemy flee for two seconds.",percent);
  define("Offense","preventHeal","Prevent Monster Healing","Weapon hits prevent the surviving target's natural regeneration. This does not remove its existing Life.",v=>v?"Yes":"No");
  define("Defense","armor","Armor","Reduces physical damage. Reduction is Armor / (Armor + 45 + 9 × attacker level), capped at 75%. Stronger enemies reduce armor's effectiveness. Elemental hits use their resistance instead.");
  define("Defense","armorReduction","Physical Mitigation · Same Level","Estimated armor reduction against an attacker of your level, before other damage modifiers. Actual reduction varies with attacker level. This is separate from elemental resistance.",percent,p=>Math.min(75,100*p.stats.armor/(p.stats.armor+45+9*p.lvl)));
  define("Defense","block","Block Chance","Chance to negate attacks that allow blocking. Requires an equipped off-hand item with base block; otherwise the chance is zero. Capped at 60%. Ground effects and damage over time are not generally blockable.",percent);
  define("Defense","dodge","Evasion","Chance to avoid attacks that perform an evasion check, including ordinary melee hits and projectiles. Capped at 60%; it is not a blanket chance to avoid ground effects or damage over time.",percent);
  define("Defense","dmgReduceFlat","Physical Damage Reduction","Subtracts this amount from each physical hit after armor and percentage modifiers. Particularly effective against frequent small hits; damage cannot fall below zero.");
  define("Defense","magicReduceFlat","Elemental Damage Reduction","Subtracts this amount from each non-physical hit after resistance and percentage modifiers. Does not raise your resistance percentage.");
  define("Defense","dmgReducePct","Damage Reduction","Reduces incoming hit damage after armor or resistance. The applied reduction caps at 80%; damage-taken modifiers are multiplied separately.",percent,p=>Math.min(80,p.stats.dmgReducePct||0));
  define("Defense","dmgTakenPct","Damage Taken Modifier","Multiplies incoming hit damage after armor, resistance and percentage reduction. A positive value makes you take more damage; a negative value reduces it.",bonus);
  define("Defense","thorns","Thorns","Deals physical retaliation damage to attackers on supported melee-hit paths. Attacker armor can reduce that damage; it is not added to your normal attacks.");
  define("Defense","ccReduce","Slow / Stun Duration Reduction","Shortens enemy slow and stun effects that use duration resistance. Capped at 80%. It does not reduce the damage of the triggering attack.",percent);
  define("Defense","dmgToMana","Damage Redirected to Aether","After mitigation, this share of incoming hit damage drains Aether instead of Life. Capped at 100% and limited by available Aether. This spends aether; it does not restore it.",percent);
  define("Defense","immovable","Knockback Immunity Bonus","Some forms and stances grant this bonus, but the current displacement handlers do not check it. It currently provides no protection against forced movement.",v=>v?"Granted":"None");
  for(const [id,element] of [["resFire","Fire"],["resCold","Cold"],["resLight","Lightning"],["resPoison","Poison"]])define("Resistances",id,element+" Resistance","Reduces incoming "+element.toLowerCase()+" hit damage by this percentage. Includes All Resistances bonuses and caps at 75%. Negative resistance increases damage: −20% means taking 20% more damage before other defenses.",percent);
  define("Recovery","life","Life","Current and maximum Life. Reaching zero kills your hero. Maximum Life includes Vitality, levels, equipment, passives and active buffs.",v=>v,p=>number(Math.ceil(p.hp))+" / "+number(p.stats.maxHp));
  define("Recovery","aether","Aether","Current and maximum Aether, spent on skills and companion upkeep. Maintained companions die when it reaches zero.",v=>v,p=>number(Math.ceil(p.mana))+" / "+number(p.stats.maxMana));
  define("Recovery","lifeRegen","Life Regeneration","Life recovered each second, including the innate 0.25 Life/s. Stops at maximum Life and excludes potions and temporary healing fields.",v=>number(v)+" /s",p=>.25+(p.stats.lifeRegen||0));
  define("Recovery","manaRegen","Aether Regeneration","Innate and stat-based aether recovered per second, before companion bonuses and upkeep: 1 + 1% of maximum Aether × (1 + regeneration bonus / 100). Potions are separate.",v=>number(v)+" /s");
  define("Recovery","lifeSteal","Life Stolen per Hit","Restores this percentage of the actual damage dealt by a successful weapon strike. Does not apply to standard spells or damage over time; restoration stops at maximum Life.",percent);
  define("Recovery","manaSteal","Aether Stolen per Hit","Restores this percentage of actual weapon-strike damage as Aether, up to maximum. Does not apply to standard spells or damage over time.",percent);
  define("Recovery","lifeOnDeath","Life after Nearby Kill","Restores this much Life when an enemy dies within nine yards of you. Distant kills do not provide this nearby recovery.");
  define("Recovery","manaAfterKill","Aether after Kill","Restores this much Aether when the game credits an enemy kill. Restoration cannot exceed maximum Aether.");
  define("Exploration","frw","Movement Speed Bonus","Increases normal movement speed. More speed helps you reposition and escape attacks; slows, terrain and movement skills can change your actual travel speed.",bonus);
  define("Exploration","moveSpeed","Movement Speed","Base movement in world yards per second, including movement bonuses: 4.6 × (1 + Movement Speed Bonus / 100). Temporary slow strength is not included.",v=>number(v)+" yards/s");
  define("Exploration","mf","Rare Loot Chance","Improves loot-quality roll weights; this is not an absolute drop probability. Rare loot weight gains the full bonus, enhanced loot gains less, and unique loot uses diminishing returns.",bonus);
  define("Exploration","goldFind","Gold Find","Increases the amount of gold generated by supported loot and reward rolls. It does not increase the sale price of items.",bonus);
  define("Exploration","lightRadius","Light Radius Bonus","Adds world yards to your normal 7.5-yard light radius, making nearby terrain easier to see. Also extends Stormshell's target-search radius.",v=>number(v)+" yards");

  const classDefs={
    skillAll:["All Talent Ranks","Adds effective ranks to learned talents. It does not learn new talents or unlock invested-rank perk choices."],
    minionDmgPct:["Companion Damage","Increases companion attack damage. Living companions use this current bonus.",bonus],
    minionHpPct:["Companion Life","Increases maximum Life when a companion is summoned or a golem is rebuilt; existing companions are not automatically healed.",bonus],
    minionPoison:["Undead Companion Poison","Adds poison over three seconds to non-beast companion attacks. Reapplication replaces the existing poison."],
    minionThorns:["Undead Companion Thorns","Non-beast companions retaliate against nearby attackers for this much physical damage."],
    trapPct:["Trap Damage","Multiplies trap impact damage alongside Dexterity and synergies.",bonus],
    trapCap:["Additional Trap Capacity","Adds to the normal limit of four placed traps."],
    armSpeed:["Trap Arming Speed","Reduces trap arming time by dividing it by 1 + this bonus / 100.",bonus],
    projRange:["Projectile Range Bonus","A projectile-range bonus. The current projectile paths do not consume this stat, so this bonus alone does not extend their lifetime.",v=>number(v)+" yards"],
    tempoCapBonus:["Additional Tempo Capacity","Adds to the normal three-Tempo limit."],
    tempoWindowBonus:["Tempo Window Bonus","Adds seconds to the window during which generated Tempo is retained.",v=>number(v)+"s"],
    dmgPerTempo:["Damage per Tempo","Adds this much immediate damage per current Tempo to weapon strikes, after the physical roll."],
    scorchPct:["Scorch Damage","Increases the damage per second assigned to new Scorch stacks.",bonus],
    scorchSpread:["Scorch Spreading","Scorched enemies spread part of their Scorch stacks to nearby enemies when they die.",v=>v?"Enabled":"No"],
    shatterRank:["Frozen Shatter Damage","Frozen enemies explode for this much cold damage on death; nearby enemies are affected.",number,p=>6+3*p.stats.shatterRank],
    coldVsFrozenPct:["Cold Damage vs. Frozen","Increases cold spell-hit damage against frozen foes. Excluded from baseline because it requires a frozen target.",bonus],
    curseDurPct:["Curse Duration","Extends supported curses and Doom's charging time.",bonus],
    curseRadiusPct:["Curse Radius","Expands the radius of supported curses and Doom explosions.",bonus],
    curseSpread:["Curse Spreading","A cursed enemy's death can transfer its curse to a nearby uncursed enemy.",v=>v?"Enabled":"No"],
    soulCharge:["Spell Power per Soul Charge","Cursed or marked deaths grant stacking Spell Power for five seconds, up to five stacks. Active charges are already included in Spell Power.",bonus],
    poisonDotPct:["Poison / Burn Damage over Time","Increases damage using the poison-over-time handler, including weapon poison, arrow wounds and ordinary burns. Scorch and Plague use separate damage paths.",bonus],
    snareConditionPct:["Exploit Weakness","Each distinct active slow, root, and physical bleed multiplies snare hit damage by an additional bonus. Three conditions add together. Does not affect damage-over-time ticks.",bonus],
    bleedDps:["Master of the Hunt Bleed","All damaging attacks apply this much physical damage per second for three seconds. Armor reduces it. Repeated hits refresh the strongest bleed without stacking; poison remains separate.",v=>number(v)+" /s"],
    plagueSpreadPct:["Plague Spreading","Expands plague spread range and shortens the time between spread attempts.",bonus],
    pShare:["Damage Shared with Pack","Living companions absorb this share of your remaining incoming hit damage, up to 50%, divided between them.",percent,p=>Math.min(50,p.stats.pShare||0)],
    pManaPerBeast:["Aether per Living Beast","Adds aether regenerated per second for each living owned beast on the active terrain surface.",v=>number(v)+" /s"],
    totemRate:["Totem Attack Speed","Shortens Storm Totem's bolt interval, down to 10% of normal. Does not speed up Tempest rings or wisps.",bonus],
    totemTtl:["Totem Duration","Extends newly placed totems' lifetime.",percent,p=>(p.stats.totemTtl||0)*100],
    totemPower:["Totem Damage","Increases the base damage stored when a totem is placed.",bonus],
    totemCapacity:["Additional Totem Capacity","Adds to the number of totems of each kind you can keep active."],
    shiftRadius:["Transformation Shock Radius","On transformation, nearby enemies within this radius are stunned.",v=>number(v)+" yards"],
    shiftStun:["Transformation Stun","Stun duration for enemies caught in the transformation shock radius.",v=>number(v)+"s"],
    primalProc:["Primal Surge Chance","Chance for a weapon strike to double its immediate damage and erupt for half that blow against nearby enemies as Fire. Excluded from baseline totals.",percent],
    dmgToFire:["Fire Conversion","Converts weapon hit damage and spell-hit damage to Fire. Ordinary weapon poison is suppressed; converted spells gain a burn. Effects that bypass these paths keep their existing type.",v=>v?"Active":"No"],
  };
  function sections(p,state=Game.state) {
    const groups=new Map();
    const add=(group,row)=>{if(!groups.has(group))groups.set(group,[]);groups.get(group).push(row);};
    for(const d of statDefs)add(d.group,{id:d.id,label:d.label,value:d.format(d.read(p)),help:d.help,attribute:d.group==="Attributes"?d.id:null});
    const minions=(state?.minions||[]).filter(m=>!m.dead&&m.owner===p);
    const maintained=minions.filter(m=>["summon","summon_golem"].includes(DATA.SKILLS[m.sourceSkill]?.type));
    const upkeep=maintained.reduce((n,m)=>n+value(resolve(p,m.sourceSkill),"upkeep",p.effRank(m.sourceSkill)),0);
    const beasts=minions.filter(m=>m.beast&&(m.surfaceId??0)===(state?.map?.activeSurfaceId??state?.map?.activeLayer??p.surfaceId??0)).length;
    // TerrainLayers is the authoritative surface filter used by Player.update.
    const activeBeasts=typeof TerrainLayers!=="undefined"?TerrainLayers.targets(state?.minions||[]).filter(m=>!m.dead&&m.owner===p&&m.beast).length:beasts;
    const pack=activeBeasts*(p.stats.pManaPerBeast||0), stance=p.stance==="riposte"?(p.riposteData?.drain??3):0, channel=p.siphon?.manaPerSec||0;
    for(const [id,label,n,help] of [
      ["companionUpkeep","Companion Upkeep",upkeep,"Aether spent each second on all living maintained companions, including companions on other terrain surfaces. All maintained companions die at zero Aether."],
      ["beastMana","Aether from Beasts",pack,"Additional regeneration from living owned beasts on the active terrain surface."],
      ["skillDrain","Active Skill Drain",stance+channel,"Ongoing aether cost of your active parry stance and channel, excluding each skill's initial cast cost."],
      ["netMana","Net Aether Regeneration",p.stats.manaRegen+pack-upkeep-stance-channel,"Regeneration plus beast recovery, minus companion upkeep and ongoing stance/channel drain. Negative means your aether is draining. Excludes potions and individual cast costs."]
    ])add("Recovery",{id,label,value:number(n)+" /s",help});
    const types=new Set(Object.values(DATA.SKILLS).filter(s=>s.cls===p.classId).map(s=>s.type));
    const always=new Set(["skillAll"]);
    if(types.has("summon"))for(const k of ["minionDmgPct","minionHpPct"])always.add(k);
    if(types.has("trap"))for(const k of ["trapPct","trapCap","armSpeed"])always.add(k);
    if(types.has("totem"))for(const k of ["totemRate","totemPower","totemTtl","totemCapacity"])always.add(k);
    for(const [id,[label,help,fmt=number,read=x=>x.stats[id]||0]] of Object.entries(classDefs))if(always.has(id)||p.stats[id])add("Class Bonuses",{id,label,value:fmt(read(p)),help});
    for(const [key,label] of [["skillClass_"+p.classId,p.cls.name+" Talent Ranks"],...p.cls.trees.map((t,i)=>["skillTree_"+p.classId+"_"+i,t+" Talent Ranks"])])add("Class Bonuses",{id:key,label,value:"+"+number(p.stats[key]||0),help:"Adds effective ranks to already learned talents in this class or discipline, on top of All Talent Ranks. Does not count as invested points for prerequisites or perks."});
    for(const [i,proc] of (p.stats.procs||[]).entries())add("Class Bonuses",{id:"proc-"+i,label:"Chance to Cast · "+(proc.trigger==="struck"?"When Struck":"On Strike"),value:percent(proc.chance),help:"Chance to release "+(proc.label||"an elemental burst")+" for "+formatRange([proc.lo,proc.hi])+" "+(elements[proc.elem]||"elemental")+" damage within "+number(proc.radius)+" yards. Chance-based effects are excluded from baseline damage."});
    if(typeof UniquePowers!=="undefined")for(const {key,entry,power} of UniquePowers.collect(p))add("Class Bonuses",{id:"unique-"+key,label:power.title,value:"Equipped",help:UniquePowers.describe(entry,power)+" Conditional triggers and random procs are excluded from the baseline; already active buffs are included."});
    return [...groups].map(([title,rows])=>({title,rows}));
  }
  const liveDefs=statDefs.filter(d=>["life","aether","hitChance"].includes(d.id));
  const liveValues=p=>Object.fromEntries(liveDefs.map(d=>[d.id,d.format(d.read(p))]));
  return Object.freeze({elements,coreElements,number,formatRange,preview,sections,classification,statDefs,classDefs,liveValues});
})();
