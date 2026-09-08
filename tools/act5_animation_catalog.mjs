// Record the effective catalog, including recursively summoned creatures.
import fs from 'node:fs';
import {fixture} from '../tests/boss_fixture.mjs';
const f=fixture({dataSeed:518}), ids=new Set(Object.keys(f.DATA.ACT5_COMBAT_PROFILES));
for(const id of ids){const d=f.DATA.ENEMIES[id];for(const pool of [d.summons?.id,d.throwUndead?.pool])for(const child of (Array.isArray(pool)?pool:pool?[pool]:[]))ids.add(child);}
const skills={slam:'slam',charge:'charge',leap:'leap',whirl:'whirl',volley:'volley',summons:'summon',heals:'heal',teleports:'blink',throwUndead:'throw'};
const groups={},roster={};
for(const id of ids){
  const d=f.DATA.ENEMIES[id],art=d.artId||d.sprite;
  const seq=[d.projectile?'bolt':'melee',...Object.entries(skills).filter(([k])=>d[k]).map(([,v])=>v),'death'];
  const entry=f.DATA.SPRITE_MANIFEST.entries[f.DATA.SPRITE_MANIFEST.maps.monsters[art]];
  const g=groups[art]||(groups[art]={id:art,reference:entry.src,sequences:[],enemies:[],weapon:d.artReview?.weapon||'as shown in reference',sprite:d.sprite});
  g.enemies.push(id);g.sequences=[...new Set([...g.sequences,...seq])];roster[id]={art,sequences:seq,deathBurst:!!d.deathBurst,split:!!d.splitOnDeath};
}
for(const g of Object.values(groups))g.sequences=[...g.sequences.filter(s=>s!=='death'),'death'];
const dest='assets/act5_animations';fs.mkdirSync(dest,{recursive:true});
fs.writeFileSync(dest+'/catalog.json',JSON.stringify({version:1,roster,enemies:Object.values(groups)},null,2)+'\n');
console.log(JSON.stringify(Object.values(groups).map(g=>({id:g.id,sequences:g.sequences})),null,1));
