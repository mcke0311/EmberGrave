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
 if(id){const spawn=a.monsterSpawns.find(m=>m.id===id);assert.ok(spawn&&b.arenaEntrance.x===spawn.x&&b.arenaEntrance.y===spawn.y);}
 else assert.equal(JSON.stringify(a.monsterSpawns),JSON.stringify(b.monsterSpawns),zone+' non-story population changed');
 assert.ok(JSON.stringify(a.campaignVisual)===JSON.stringify(b.campaignVisual),zone+' changed campaign art refresh');
 checks.push(zone);
}
for(const [key,entry]of Object.entries(before.DATA.SPRITE_MANIFEST.entries))assert.equal(JSON.stringify(after.DATA.SPRITE_MANIFEST.entries[key]),JSON.stringify(entry),'existing art changed: '+key);
fs.writeFileSync('tests/qa/boss_arenas/preservation.json',JSON.stringify({passed:true,zones:checks,existingSpriteEntries:Object.keys(before.DATA.SPRITE_MANIFEST.entries).length,baseline:'tmp/boss_arenas/before/js'},null,2)+'\n');
console.log('PASS '+checks.length+' existing maps and all existing sprite registrations preserved');
