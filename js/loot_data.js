/* Read-only analytical catalogue. Load after the same data/power/override scripts as the game.
   Probabilities follow Items.rollDrops/rollGear; contract tests compare against actual rolls. */
'use strict';
const LootData = (() => {
  const rows = [], byId = new Map(), cache = new Map();
  const stat = (key, value) => DATA.STAT_TEXT[key]?.(value) || `${key}: ${value}`;
  function add(kind, id, def, base) {
    const entry = UniquePowers.catalog[id];
    const powers = entry ? entry.powers.map((p, i) => (entry.powers.length === 2 ? (i ? 'In armor: ' : 'In weapons: ') : '') + UniquePowers.describe(entry, p)) : [];
    const stats = Object.entries(def.stats || {}).map(([k, v]) => stat(k, v));
    if (def.affixes) stats.push(...def.affixes.map(a => stat(a.stat, a.val)));
    if (kind === 'glyph' || kind === 'uniqueGlyph') for (const side of ['wpn', 'arm']) {
      stats.push(...Object.entries(def[side] || {}).map(([k,v]) => `${side === 'wpn' ? 'Weapon' : 'Armor'}: ${stat(k,v)}`));
    }
    const row = { kind, id, name:def.name, level:def.ilvl || def.dropLevel || 1,
      slot:base?.slot || (kind.includes('Charm') || kind === 'charm' ? 'charm' : kind.includes('Jewel') || kind === 'jewel' ? 'jewel' : kind.includes('Glyph') || kind === 'glyph' ? 'glyph' : 'supply'),
      base:base?.name || '', def, stats, powers };
    rows.push(row); byId.set(id,row);
  }
  Object.entries(DATA.BASES).forEach(([id,d]) => add('base',id,d,d));
  DATA.UNIQUES.forEach(d => add('unique',d.id,d,DATA.BASES[d.base]));
  DATA.SET_ITEMS.forEach(d => add('set',d.id,d,DATA.BASES[d.base]));
  DATA.UNIQUE_CHARMS.forEach(d => add('uniqueCharm',d.id,d));
  DATA.UNIQUE_JEWELS.forEach(d => add('uniqueJewel',d.id,d));
  Object.values(DATA.GLYPHS).forEach(d => add(d.unique?'uniqueGlyph':'glyph',d.id,d));
  Object.values(DATA.CHARM_BASES).forEach(d => add('charm','charm_'+d.id,d));
  add('jewel','jewel',{name:'Rolled Jewel'});
  Object.values(DATA.CONSUMABLES).forEach(d => add('supply',d.id,d));
  const kinds = {unique:'Unique equipment',uniqueCharm:'Unique charms',uniqueJewel:'Unique jewels',uniqueGlyph:'Unique glyphs',base:'Base equipment',set:'Set equipment',glyph:'Glyphs',charm:'Charms',jewel:'Jewels',supply:'Supplies'};
  const sources = {normal:'Normal monster',elite:'Elite monster',boss:'Boss',chest:'Chest',barrel:'Breakable'};
  const clamp = p => Math.min(1,Math.max(0,p));
  function rarity(source,mf) {
    const weights = DATA.RARITY_WEIGHTS[source==='chest'?'elite':source==='barrel'?'normal':source];
    const unique = clamp((weights.find(x=>x[0]==='unique')?.[1]||0)/100*Items.uniqueMultiplier(mf));
    const rest = weights.filter(x=>x[0]!=='unique').map(([k,w])=>[k,w*(k==='rare'?1+mf/100:k==='enhanced'?1+mf/250:1)]);
    const total = rest.reduce((s,x)=>s+x[1],0);
    return {unique,...Object.fromEntries(rest.map(([k,w])=>[k,(1-unique)*w/total]))};
  }
  function gearPools(level) {
    const low = Math.max(0,level-Math.max(8,level*.45));
    const all = Object.values(DATA.BASES);
    let bases = all.filter(b=>b.ilvl<=level+1&&b.ilvl>=low);
    if(bases.length<3) bases=all.filter(b=>b.ilvl<=level+1);
    if(!bases.length) bases=all;
    const eligible = DATA.UNIQUES.filter(d=>d.ilvl<=level+2);
    let uniques = eligible.filter(d=>d.ilvl>=low);
    if(!uniques.length&&eligible.length) {const top=Math.max(...eligible.map(d=>d.ilvl));uniques=eligible.filter(d=>d.ilvl===top);}
    return {bases,uniques,sets:DATA.SET_ITEMS.filter(d=>d.ilvl<=level+2)};
  }
  function distribution(level,source,mf=0) {
    level=Math.max(1,Math.round(level)); mf=Math.max(0,Number(mf)||0);
    const key=[level,source,mf].join('/'); if(cache.has(key))return cache.get(key);
    const cfg=Items.DROP_CONFIG[source], r=rarity(source,mf), gear=new Map(), result=new Map();
    const put=(map,id,p)=>map.set(id,(map.get(id)||0)+p);
    for(const delta of [-1,0,1]) {
      const pools=gearPools(Math.max(1,level+delta));
      const pBase=1-(pools.uniques.length?r.unique:0)-(pools.sets.length?r.set:0);
      pools.bases.forEach(d=>put(gear,d.id,pBase/pools.bases.length/3));
      pools.uniques.forEach(d=>put(gear,d.id,r.unique/pools.uniques.length/3));
      pools.sets.forEach(d=>put(gear,d.id,r.set/pools.sets.length/3));
    }
    gear.forEach((p,id)=>result.set(id,1-(1-cfg.itemCh*p)**cfg.n));
    const pots=level>=5?['hp2','mp2','hp2','rejuv']:['hp1','mp1','hp1'];
    pots.forEach(id=>put(result,id,cfg.potCh/pots.length));
    result.set('tp',.03);result.set('idscroll',.03);
    const regular=Object.values(DATA.GLYPHS).filter(d=>!d.unique);
    regular.forEach(d=>result.set(d.id,({elite:.12,boss:.4,chest:.14}[source]||.015)/regular.length));
    for(const [id,w] of [['small',6],['large',3],['grand',1.4]])result.set('charm_'+id,({elite:.10,boss:.35,chest:.10}[source]||.012)*w/10.4);
    result.set('jewel',({elite:.05,boss:.22,chest:.06}[source]||.006));
    const groups=[DATA.UNIQUE_CHARMS.filter(d=>d.ilvl<=level+2),DATA.UNIQUE_JEWELS.filter(d=>d.ilvl<=level+2),Object.values(DATA.GLYPHS).filter(d=>d.unique&&d.dropLevel<=level+2)].filter(g=>g.length);
    groups.forEach(g=>g.forEach(d=>result.set(d.id,clamp(DATA.UNIQUE_SOCKET_CHANCE[source]*Items.uniqueMultiplier(mf))/groups.length/g.length)));
    if(cache.size>2000)cache.clear();cache.set(key,result);return result;
  }
  function chance(row,level,source,mf) {return distribution(level,source,mf).get(row.id)||0;}
  function difficultyChances(row,normalLevel,source,mf=0) {
    return DATA.DIFFICULTIES.map(d=>({difficulty:d.id,level:normalLevel+d.lvlAdd,p:chance(row,normalLevel+d.lvlAdd,source,mf)}));
  }
  function locations(row,difficulty=0,mf=0,includeZero=false) {
    const add=DATA.DIFFICULTIES[difficulty].lvlAdd, out=[];
    for(const z of Object.values(DATA.ZONES)) {
      if(['town','camp'].includes(z.kind)||z.opening)continue;
      const pool=[...new Set([...(z.spawns||[]),z.boss].filter(Boolean))];
      for(const id of pool) {
        const d=DATA.ENEMIES[id];if(!d)continue;
        const level=d.boss?d.lvl+add:Math.max(Math.max(1,z.lvl+add-2),Math.min(z.lvl+add+1,d.lvl+add));
        for(const source of d.boss?['boss']:['normal','elite']) {
          const p=chance(row,level,source,mf);if(p||includeZero)out.push({key:`${z.id}/${id}/${source}`,zone:z.name,name:d.name,source,level,p});
        }
      }
      for(const source of ['chest','barrel']) {
        const level=(z.lvl||1)+add+(source==='chest'?1:0),p=chance(row,level,source,mf);
        if(p||includeZero)out.push({key:`${z.id}/${source}`,zone:z.name,name:source==='chest'?'Chest (if present)':'Breakable (if present)',source,level,p});
      }
    }
    return out.sort((a,b)=>b.p-a.p||a.zone.localeCompare(b.zone));
  }
  function compareLocations(row,mf=0) {
    const merged=new Map();
    DATA.DIFFICULTIES.forEach((d,i)=>locations(row,i,mf,true).forEach(l=>{
      if(!merged.has(l.key))merged.set(l.key,{...l,chances:[]});
      merged.get(l.key).chances[i]={level:l.level,p:l.p};
    }));
    return [...merged.values()].filter(l=>l.chances.some(c=>c.p>0));
  }
  function affixes(level,baseId) {
    const base=DATA.BASES[baseId],special=['charm','jewel'].includes(baseId);
    const allowed=a=>special?!!a.stat&&DATA[baseId==='charm'?'CHARM_STATS':'JEWEL_STATS'].has(a.stat):
      (a.slots.includes('any')||a.slots.includes(base.slot))&&(!a.cats||a.cats.includes(base.cat));
    const pool=DATA.AFFIXES.filter(a=>allowed(a)&&a.tiers.some(t=>t.ilvl<=level));
    const total=pool.reduce((s,a)=>s+(a.weight||1),0);
    return DATA.AFFIXES.flatMap((a,index)=>{
      const eligible=a.tiers.filter(t=>t.ilvl<=level),family=pool.includes(a)?(a.weight||1)/total:0;
      return a.tiers.map((t,i)=>({id:`affix_${index}_${i}`,a,t,kind:a.kind==='p'?'Prefix':'Suffix',
        family, p:t.ilvl<=level?family*(.4/eligible.length+(t===eligible.at(-1) ? .6 : 0)):0,
        values:a.proc?`${t.chance}% on ${t.trigger}: ${t.lo}–${t.hi} ${t.elem} damage; radius ${t.radius}`:
          (t.mods||[{stat:a.stat,min:t.min,max:t.max}]).map(m=>`${stat(m.stat,m.min)} → ${stat(m.stat,m.max)}${a.perLevel?(special?' (flat; this item does not retain level scaling)':' per character level'):''}`).join('; ')}));
    });
  }
  return {rows,byId,kinds,sources,stat,rarity,gearPools,distribution,chance,difficultyChances,locations,compareLocations,affixes};
})();
