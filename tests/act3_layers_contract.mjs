import assert from 'node:assert/strict';
import {fixture} from './boss_fixture.mjs';

// The withdrawn bridge must not leave invisible surfaces or inaccessible loot.
// Generic surface combat is covered by skill_vfx_contract --layered.
const {MapGen:M}=fixture();
const areas=['khalcamp','desert_wastes','underground_market','sand_tombs','khal_palace','shard_flats','tomb_sanctum'];
const seedCount=process.argv.includes('--all-seeds')?30:1;
let checks=0;
const ok=(value,label)=>{assert.ok(value,label);checks++;};
for(const zone of areas)for(let sample=0;sample<seedCount;sample++){
 const seed=sample===0?12345:Math.imul(sample+37,2654435761)>>>0;
 const m=M.generate(zone,seed),label=zone+'/'+seed;
 ok(m.act3.environment?.outdoor?m.act3.architecture.walls.length===0:m.act3.architecture.walls.length>0,label+' appropriate natural or masonry boundaries');
 ok(m.act3.architecture.bridges.length===0,label+' no bridge assembly');
 ok(!Object.keys(m.layers||{}).length,label+' no invisible upper floor');
 ok(!(m.surfaceLinks||[]).length,label+' no orphan stairs');
 for(const point of [...m.props,...m.npcs,...m.monsterSpawns,...Object.values(m.spawns),...(m.act3.layerLandmarks||[])]){
  ok((point.surfaceId??0)===0,label+' object remains on the base surface');
 }
 ok(!(m.act3.layerLandmarks||[]).some(p=>['upper_crossing','underpass'].includes(p.id)),label+' no retired review destination');
 if(zone==='khalcamp')ok(m.act3.architecture.terraces?.length===1,label+' departure terrace retained');
 if(sample===seedCount-1)console.log(zone,seedCount,'seeds PASS');
}
console.log(JSON.stringify({status:'PASS',checks,seedCount}));
