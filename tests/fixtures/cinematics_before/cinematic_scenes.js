/* EMBERGRAVE — solo campaign scenes. Tracks use seconds, stable story IDs,
   and the installed world art. No track awards loot or changes campaign state. */
"use strict";
const CinematicScenes = (() => {
  const scenes = [];
  function add(id, title, act, zone, duration, visual, lines, extra = {}) {
    const captions = lines.map(([speaker, text], i) => ({at:i * duration / lines.length, speaker, text}));
    const scene = {id,title,act,zone,duration,visual,captions,color:['#a5dcff','#bed7ac','#f0ca7e','#cfb9ec','#f3aa76'][Math.min(4,act-1)],
      camera:[{at:0,target:'hero',dx:-1,dy:1},{at:2,target:'focus'},{at:duration*.66,target:'vista'},{at:duration-2,target:'hero'}],
      actors:[{target:'hero',from:duration*.28,to:duration*.55,state:visual==='seal'?'cast':['shard','map','give','ledger'].includes(visual)?'reach':visual==='destroy'?'attack':'idle'}],
      effects:[{kind:visual,from:0,to:duration}],sounds:[{at:2,id:['boss','rise'].includes(visual)?'vox_boss':'shrine'}],bundles:[],...extra};
    scenes.push(Object.freeze(scene));
  }
  const boss = (id,title,act,enemy,lines,duration=10) => add(id,title,act,'arena_'+enemy,duration,'boss',lines,
    {boss:enemy,music:'boss',actors:[{target:'focus',from:2,to:6,state:'windup'},{target:'focus',from:6,to:8,state:'recovery'}]});
  add('oathsworn','The Oathsworn Rise',1,'north_wild',10,'rise',[
    ['','The last beacon shatters. The light over the temple falters.'],['','Korvath’s honor-guard rise to defend the oath they can no longer remember.']],{legacyQuest:'q8b'});
  boss('korvath','The Oathbreaker',1,'korvath',[
    ['Korvath','Another demon wearing a living face. I will not abandon my watch.'],['','Oathfire answers the commander who can no longer recognize his own people.']]);
  add('ledger','Follow the Quiet',1,'frosthaven',18,'ledger',[
    ['Seraneth','Korvath’s transport ledger confirms it. Someone is harvesting Embershards.'],['Seraneth','The shipments went south into the Weeping Marsh. The folk there have begun to fall silent.'],['Seraneth','A ferryman’s waystone has woken. Follow the quiet.']],{quest:'q9',bundles:['frosthaven']});
  add('quieting','The Quieting',2,'weeping_marsh',20,'quieting',[
    ['','The shining fragments woke something buried beneath the marsh.'],['','First their voices. Then their dreams. Then their fear.'],['','They walked into the water without a cry.']],{bundles:['marshcamp'],legacyFlag:'scene_quieting'});
  boss('mire_mother','The Marsh’s Embrace',2,'mire_mother',[
    ['','The marsh has given its dead a single body.'],['','An Embershard beats inside her chest. She will not let them go.']]);
  add('mire_shard','A Gateway Beneath the Sand',2,'arena_mire_mother',18,'shard',[
    ['','You pull the Embershard from the Mire Mother’s chest.'],['','The Choir’s plans are bound around its setting: a gateway beneath the buried city of Khal-Zahir.'],['','The marsh was only the first gathering point.']],{object:'mire_shard'});
  add('dig','What the Quakes Uncovered',3,'khalcamp',18,'excavation',[
    ['Edran Vael','The earthquakes uncovered a city erased from history. Its rulers tried to contact Hell.'],['Edran Vael','The shards have restarted their machines. Some passages now lead where no passage should.'],['','Below the excavation, Khal-Zahir wakes.']],{arrival:'khalcamp'});
  add('ilyan','The Imprisoned Archivist',3,'sand_tombs',12,'rescue',[
    ['Ilyan','Tell Edran: the palace symbols are the Render’s forgotten experiments.'],['Ilyan','Azram fused himself to a fragment. The impossible passages lead to his throne.']],{object:'imprisoned_scholar',bundles:['khalcamp']});
  boss('azram','The Gilded King',3,'azram',[
    ['','Gold plates bind chained souls to the king of Khal-Zahir.'],['Azram','Every road returns to my throne. Even the roads you thought you left behind.']]);
  add('fortress_map','The Suspended Fortress',3,'arena_azram',18,'map',[
    ['','Azram’s map marks a ruined cathedral suspended between the Waking World and Hell.'],['','Its halls are assembled from memories stolen by the shards.'],['','You take the fragment and the route to Malthoron, the Hollow King.']],{object:'fortress_map'});
  add('cathedral','A Cathedral of Memories',4,'cathedral1',20,'assembly',[
    ['','Stone remembers what the world has lost.'],['','Cinderwatch. The Last Bastion. The depths beneath Mount Karrhal.'],['','The cathedral rebuilds itself around the souls it has taken.']],{arrival:'cathedral1',music:'cathedral'});
  boss('empty_archangel','The Borrowed Voice',4,'empty_archangel',[
    ['The Empty Archangel','The light spared you. Come closer.'],['','Seraneth’s voice. Her discarded armor. Nothing living inside it.']]);
  boss('malthoron','The Hollow King',4,'malthoron',[
    ['Malthoron','You have broken my seals. You have not broken what waits beneath them.'],['','Soul-light escapes through the plate. The king’s armor is holding something together.']]);
  add('hell_portal','Someone Else Guided Him',4,'arena_malthoron',22,'portal',[
    ['','The Hollow King is unmade. His hoarded shards collapse toward one another.'],['','Their light opens a road directly into the Burning Hells.'],['','Malthoron gathered the fragments for someone else. The road leads to his master.']],{object:'hell_portal'});
  add('breach','The Breach',5,'hellgate',18,'breach',[
    ['','Hell is built from the ruins of kingdoms that lost their wars.'],['','Rival broods fight beneath the defenses of the Breach.'],['','Beyond them, the gathered shards could make a permanent bridge into the Waking World.']],{arrival:'hellgate',music:'breach'});
  boss('vethriss','The Wounded Warden',5,'vethriss',[
    ['Seraneth, Wounded','Please. Bring the shards to me. Let me carry this burden.'],['','The face is familiar. The shadow does not follow the light.'],['','Something has been guiding the fragments here all along.']],20);
  add('core','The Last Core',5,'arena_vethriss',10,'core',[
    ['','Vethriss is dead. The gathered shards collapse into a single, humming core.'],['','The last whole piece of the Sunderstone lies at your feet. Its fate is yours to choose.']],{bossDead:'vethriss'});
  add('ending_destroy','Destroy the Core',5,'arena_vethriss',35,'destroy',[
    ['','You drive the last shard against the others until the core cracks like river ice.'],['','Light floods out. The wound between the Waking World and Hell will never fully close.'],['','But the core cannot be gathered. It cannot be used. It cannot lie to anyone again.'],['','You walk home through a world that will always be a little too thin. It is free. That will have to be enough.']],{ending:'destroy'});
  add('ending_seal','Seal It Away',5,'arena_vethriss',35,'seal',[
    ['','You bind the core in wards older than the Render and hide it where no map remembers.'],['','It sleeps. Its guardians will not. In time, the core may corrupt those sworn to keep it.'],['','You have bought time. Someday another hero will hold the same terrible question.'],['','You hope they choose better. You hope there is a they.']],{ending:'seal'});
  add('ending_give','Give It to Seraneth',5,'arena_vethriss',35,'give',[
    ['','The true Seraneth steps from the broken light, frayed by the long road outside the world.'],['','She takes the core. For a moment her eyes are not entirely her own.'],['','She nods and is gone. The sky knits shut behind her. Her shadow no longer moves with her light.'],['','She will guard it. You tell yourself that. You almost believe it.']],{ending:'give',bundles:['frosthaven'],legacyFlag:'scene_warden'});
  return {all:Object.freeze(scenes),get:id=>scenes.find(s=>s.id===id),boss:id=>scenes.find(s=>s.boss===id),object:id=>scenes.find(s=>s.object===id)};
})();
