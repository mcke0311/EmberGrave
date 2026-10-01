import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './boss_fixture.mjs';
import {ensureSnapshot} from './boss_arenas_baseline.cjs';
const before=fixture({sourceDirectory:ensureSnapshot(),dataSeed:7331}),after=fixture({dataSeed:7331});
const checks=[];
for(const zone of Object.keys(before.DATA.ZONES)){
 const a=before.MapGen.generate(zone,12345),b=after.MapGen.generate(zone,12345);
 for(const key of ['w','h','blocked','walls','elev','floor','hazard','void','surfaceVersion'])assert.equal(JSON.stringify(a[key]),JSON.stringify(b[key]),zone+' changed '+key);
 for(const exit of a.exits)assert.ok(b.exits.some(e=>JSON.stringify(e)===JSON.stringify(exit)),zone+' lost exploration exit');
 const id=after.DATA.ZONES[zone].arenaEntrance;
 if(id){
  const spawn=a.monsterSpawns.find(m=>m.id===id),door=b.arenaEntrance;
  assert.ok(spawn&&door.room.x===spawn.x&&door.room.y===spawn.y,zone+' entrance belongs to original boss chamber');
  assert.ok(Math.hypot(door.x-spawn.x,door.y-spawn.y)>8,zone+' doorway moved out of room center');
  assert.ok(b.props.some(p=>p.doorId==='boss_entry_'+id&&p.visual===after.DATA.BOSS_ARENAS[id].entranceVisual),zone+' destination-specific entrance art');
  for(let dx=-2;dx<=2;dx++)assert.ok(b.blocked[Math.floor(door.wall.x+dx)+Math.floor(door.wall.y-.5)*b.w],zone+' solid wall behind arch');
 }
 else assert.equal(JSON.stringify(a.monsterSpawns),JSON.stringify(b.monsterSpawns),zone+' non-story population changed');
 assert.ok(JSON.stringify(a.campaignVisual)===JSON.stringify(b.campaignVisual),zone+' changed campaign art refresh');
 checks.push(zone);
}
for(const [key,entry]of Object.entries(before.DATA.SPRITE_MANIFEST.entries))assert.equal(JSON.stringify(after.DATA.SPRITE_MANIFEST.entries[key]),JSON.stringify(entry),'existing art changed: '+key);
const preDoor=fixture({sourceDirectory:ensureSnapshot('tmp/boss_entrances/replay','tests/fixtures/boss_entrances_before.json.gz'),dataSeed:7331});
let remainsMaps=0;
for(const c of Object.values(after.DATA.BOSS_ARENAS))for(const seed of [0,1,123,12345,4294967295]){
 const a=preDoor.MapGen.generate(c.zone,seed),b=after.MapGen.generate(c.zone,seed);
 for(const key of ['blocked','walls','elev','floor','hazard','void'])assert.equal(JSON.stringify(a[key]),JSON.stringify(b[key]),c.bossId+' arena terrain changed');
 const remains=m=>m.props.filter(p=>p.arenaRemains).map(p=>({propId:p.propId,seed:p.seed,searchable:p.searchable,interact:p.interact,label:p.label}));
 assert.equal(JSON.stringify(remains(a)),JSON.stringify(remains(b)),c.bossId+' moved remains lost saved identity or loot selection');
 remainsMaps++;
}
fs.writeFileSync('tests/qa/boss_arenas/preservation.json',JSON.stringify({passed:true,zones:checks,existingSpriteEntries:Object.keys(before.DATA.SPRITE_MANIFEST.entries).length,baseline:'tmp/boss_arenas/before/js',remainsLayouts:remainsMaps,entranceBaseline:'tests/fixtures/boss_entrances_before.json.gz'},null,2)+'\n');
console.log('PASS '+checks.length+' existing maps, all existing sprite registrations and '+remainsMaps+' saved remains layouts preserved');
