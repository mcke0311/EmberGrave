/* Individually authored shot lists; no track changes campaign state. */
'use strict';
const CinematicScenes=(()=>{
 const all=[];
 const s=(at,id,target,zoom,lift=0,extra={})=>({at,id,target,zoom,lift,...extra});
 const a=(target,from,to,clip,extra={})=>({target,from,to,clip,state:clip==='walk'?'walk':'idle',...extra});
 const l=(at,to,speaker,text)=>({at,to,speaker,text}),c=(at,id)=>({at,id});
 // Named effect intervals are sampled directly, including when scrubbing backward.
 // An interval's final state remains available to props after its animation ends.
 const effectTracks={
  oathsworn:[['beaconCollapse',0,1.8],['awakening',1.2,2.6]],
  korvath:[['oathfire',4,6]],
  ledger:[['ledgerTransfer',1,3],['southernRoute',6,11],['waystone',14,16]],
  quieting:[['quietWalk',3,12]],
  mire_mother:[['souls',2,4],['chestPulse',5.7,8]],
  mire_shard:[['extraction',4,6.2],['plansReveal',7,8],['plansUnfold',7,9]],
  dig:[['dust',4,9],['mechanism',9,11],['gateway',13,16]],
  ilyan:[['bindingBreak',1.8,2.3]],
  azram:[['souls',2,4],['chains',2.2,5]],
  fortress_map:[['mapReveal',1,2],['mapUnfold',2,5],['projection',8,10],['projectionFade',14,16]],
  cathedral:[['islands',3,6],['bridges',4,8],['dust',3,18]],
  empty_archangel:[['armorRise',0,3]],
  malthoron:[['souls',2,4]],
  hell_portal:[['convergence',6,10],['gateway',8,11]],
  breach:[['dust',4,14],['distantConflict',4,14]],
  vethriss:[['unevenShadow',10,14]],
  core:[['coreAssembly',0,6]],
  ending_destroy:[['firstFracture',10.38,10.65],['secondFracture',12.92,13.2],['coreRelease',14,19],['coreIllumination',14,18],['fissures',14,17],['dust',14,22],['cooling',19,26],['skyScar',27,35]],
  ending_seal:[['wardTrace',5,13],['enclosure',13,16],['concealCore',13,18],['encroachingShadow',27,33]],
  ending_give:[['transfer',9,11.5],['unevenShadow',16,20],['portalCollapse',23,28]]
 };
 function add(id,title,act,zone,duration,visual,shots,actors,captions,sounds,extra={}){
  all.push(Object.freeze({id,title,act,zone,duration,visual,revision:2,shots,camera:shots,actors,captions,sounds,
   contacts:[],stages:[{id:'main',at:0,zone}],effects:[{kind:visual,from:0,to:duration},...effectTracks[id].map(([kind,from,to])=>({kind,from,to}))],bundles:[],
   color:['#a5dcff','#bed7ac','#f0ca7e','#cfb9ec','#f3aa76'][act-1],...extra}));
 }
 add('ending_destroy','Destroy the Core',5,'arena_vethriss',35,'destroy',[
  s(0,'The strained stone','core',6.2,0,{endZoom:6.4}),s(4,'The last shard','hero',3.1,40),
  s(9,'First fracture','contact',4.2),s(14,'The release','pair',1.75,35,{endZoom:1.45}),
  s(19,'A boundary left open','core',2.5,0,{endZoom:2.1}),
  s(27,'The road home','homeVista',1.3,0,{stage:'home',endZoom:1.55})
 ],[a('hero',4,7,'walk',{path:['heroStart','heroMark']}),a('hero',7,9,'grasp'),
  a('hero',9,11.3,'strike'),a('hero',11.3,14,'strike'),a('hero',14,19,'recoil'),
  a('hero',19,22,'recover'),a('hero',27,35,'walk',{stage:'home',path:['heroStart','heroMark']})],[
  l(15,22,'','The wound between worlds will never fully close.'),l(22,27,'','The core can never be used again.'),
  l(28,34.8,'','A world always a little too thin. But free.')
 ],[c(.3,'coreHum'),c(7.4,'crystal'),c(10.38,'fracture'),c(12.92,'fracture'),c(14,'coreBreak'),c(19,'settle'),c(27,'wind')],
 {ending:'destroy',contacts:[{at:10.38,id:'strike1'},{at:12.92,id:'strike2'},{at:14,id:'shatter'}],
 stages:[{id:'main',at:0,zone:'arena_vethriss'},{id:'home',at:27,zone:'frosthaven_approach'}]});
 add('ending_seal','Seal It Away',5,'arena_vethriss',35,'seal',[
  s(0,'The burden','core',3.8),s(5,'The old wards','pair',2.65,35),s(13,'The enclosure','core',3.45),
  s(19,'Where no map remembers','vault',2.4,20,{stage:'vault',endZoom:2.1}),
  s(27,'Those who keep watch','guardian',2.7,0,{stage:'vault',endZoom:2.45})
 ],[a('hero',5,13,'ward'),a('hero',13,19,'offer')],[
  l(6,12.8,'','Wards older than the Render.'),l(19.8,26,'','Hidden where no map remembers.'),
  l(27.5,34.7,'','It sleeps. Its guardians will not. In time, even they may fall.')
 ],[c(.3,'coreHum'),c(5,'ward'),c(13,'ward'),c(18,'stone'),c(19,'hush'),c(29,'whisper')],
 {ending:'seal',contacts:[{at:13,id:'enclose'},{at:18,id:'sealed'}],
 stages:[{id:'main',at:0,zone:'arena_vethriss'},{id:'vault',at:19,zone:'sand_tombs'}]});
 add('ending_give','Give It to Seraneth',5,'arena_vethriss',35,'give',[
  s(0,'The true Warden','warden',2.7,55),s(5,'An offered burden','pair',3.2,40),
  s(11,'The transfer','contact',4),s(16,'Changed','wardenEyes',4.3),
  s(22,'The closing sky','warden',2.25,55,{endZoom:1.8}),s(29,'The lingering shadow','shadow',3.4)
 ],[a('hero',5,11,'offer'),a('hero',11,16,'withdraw'),a('hero',16,22,'watch')],[
  l(1,5.8,'','The true Seraneth returns from outside the world.'),l(16.3,21.8,'','For a moment, her eyes are not entirely her own.'),
  l(29,34.8,'','She will guard it. You almost believe it.')
 ],[c(0,'portalOpen'),c(11.5,'crystal'),c(16,'whisper'),c(23,'portalClose'),c(30,'hush')],
 {ending:'give',bundles:['frosthaven'],legacyFlag:'scene_warden',contacts:[{at:11.5,id:'transfer'},{at:26,id:'departure'}]});
 add('oathsworn','The Oathsworn Rise',1,'north_wild',10,'rise',[
  s(0,'The extinguished beacon','focus',2.8,20),s(2,'The first oath','warrior0',3,42),
  s(4.4,'The guard answers','warrior1',2.7,42),s(7,'An unremembered oath','pair',1.65,40)
 ],[a('hero',0,2,'recoil'),a('hero',7,10,'watch')],[l(5,9.8,'','Korvath’s honor-guard defend an oath they can no longer remember.')],
 [c(.3,'stone'),c(2,'armor'),c(4,'armor'),c(6,'armor')],
 {legacyQuest:'q8b',contacts:[{at:2,id:'rise0'},{at:4,id:'rise1'},{at:6,id:'rise2'}]});
 add('korvath','The Oathbreaker',1,'arena_korvath',10,'boss',[
  s(0,'Broken defenses','defenses',1.5,0,{pan:{x:1,y:-1}}),s(2,'A watch without end','bossWeapon',2.5),
  s(4,'Oathfire','bossChest',2.75),s(7,'The commander','pair',1.6,35)
 ],[a('focus',2,4.8,'brace'),a('focus',4.8,7,'awaken'),a('hero',7,10,'watch')],[
  l(2.5,7.5,'Korvath','Another demon wearing a living face. I will not abandon my watch.'),l(7.6,9.9,'','Oathfire answers him.')
 ],[c(2,'armor'),c(4.5,'fire'),c(7,'bossBreath')],{boss:'korvath',music:'boss'});
 add('ledger','Follow the Quiet',1,'frosthaven',18,'ledger',[
  s(0,'The ledger changes hands','pair',2.8,42),s(5,'The transport ledger','document',4.5),
  s(10,'South into the marsh','document',4.7,0,{endZoom:4.25}),s(14,'The ferryman’s waystone','waystone',2.5,28)
 ],[a('hero',0,4,'offer'),a('hero',4,7,'withdraw'),a('hero',7,18,'watch')],[
  l(1,6,'Seraneth','Someone is harvesting Embershards.'),l(6.2,12.8,'Seraneth','The shipments went south into the Weeping Marsh. The folk there are falling silent.'),
  l(14,17.9,'Seraneth','The ferryman’s waystone has woken. Follow the quiet.')
 ],[c(2,'paper'),c(7,'paper'),c(14,'ward')],{quest:'q9',bundles:['frosthaven'],contacts:[{at:3,id:'ledgerTransfer'}]});
 add('quieting','The Quieting',2,'weeping_marsh',20,'quieting',[
  s(0,'The watcher on the bank','pair',1.9,38),s(4,'No hesitation','walker0',3.1,48),
  s(9,'The black water','water',2.4,12),s(15,'No cry','water',2.8,5,{endZoom:2.4})
 ],[a('hero',0,15,'watch'),a('hero',15,17,'hesitate')],[
  l(1,5.5,'','The fragments woke something beneath the marsh.'),l(6,12,'','First their voices. Then their dreams. Then their fear.'),l(15,19.8,'','They went without a cry.')
 ],[c(0,'water'),c(10,'water'),c(15,'hush')],{bundles:['marshcamp'],legacyFlag:'scene_quieting'});
 add('mire_mother','The Marsh’s Embrace',2,'arena_mire_mother',10,'boss',[
  s(0,'The consumed','focus',1.65,70),s(2.8,'Many bodies','bossChest',2.8),
  s(5.7,'The guarded fragment','bossChest',3.4),s(8,'The Mother','pair',1.65,40)
 ],[a('focus',1,8,'awaken'),a('hero',8,10,'watch')],[
  l(1,4.7,'','The marsh has given its dead a single body.'),l(5,9.9,'','An Embershard beats inside her chest. She will not let them go.')
 ],[c(0,'water'),c(3,'whisper'),c(6,'coreHum')],{boss:'mire_mother',music:'boss'});
 add('mire_shard','A Gateway Beneath the Sand',2,'arena_mire_mother',18,'shard',[
  s(0,'What remains','remains',2,25),s(4,'The extraction','contact',3.9),s(8,'The bound plans','document',4.5),s(13,'Beneath Khal-Zahir','pair',2.6,40)
 ],[a('hero',1,4,'kneel'),a('hero',4,8,'extract'),a('hero',8,13,'examine'),a('hero',13,16,'recover')],[
  l(8.5,14,'','The Choir’s plans: a gateway beneath the buried city of Khal-Zahir.'),l(14.2,17.8,'','The marsh was only the first gathering point.')
 ],[c(4,'water'),c(6.2,'crystal'),c(9,'paper')],{object:'mire_shard',contacts:[{at:6.2,id:'extract'}]});
 add('dig','What the Quakes Uncovered',3,'khalcamp',18,'excavation',[
  s(0,'The excavation','vista',1.25,20,{pan:{x:1.5,y:-1}}),s(4,'Uncovered masonry','focus',2.5,30),
  s(9,'The awakened mechanism','mechanism',3.05,10),s(14,'An impossible passage','gateway',2.15,40)
 ],[a('hero',0,18,'watch')],[
  l(1,7.8,'Edran Vael','The quakes uncovered a city erased after its rulers contacted Hell.'),
  l(9,14,'Edran Vael','The shards have restarted their machines.'),l(14.2,17.8,'','Passages open where none should exist.')
 ],[c(1,'stone'),c(5,'settle'),c(9,'mechanism'),c(14,'portalOpen')],{arrival:'khalcamp'});
 add('ilyan','The Imprisoned Archivist',3,'sand_tombs',12,'rescue',[
  s(0,'The binding','contact',3.4),s(3,'Released','pair',2.75,35),s(6.5,'The palace symbols','inscription',3.6,25),s(9,'The archivist','pair',2.65,42)
 ],[a('hero',0,3,'unbind'),a('hero',3,6,'withdraw'),a('hero',6,12,'watch')],[
  l(4,8,'Ilyan','These symbols are the Render’s forgotten experiments.'),
  l(8.2,11.9,'Ilyan','Azram fused himself to a fragment. The passages lead to his throne.')
 ],[c(1.8,'chainBreak'),c(4,'armor'),c(7,'stone')],{object:'imprisoned_scholar',bundles:['khalcamp'],contacts:[{at:1.8,id:'unbind'}]});
 add('azram','The Gilded King',3,'arena_azram',10,'boss',[
  s(0,'The throne','focus',1.5,60),s(2.2,'The chained souls','bossChest',2.8),s(5,'The gilded plates','bossChest',2.6),s(7.2,'All roads','pair',1.7,40)
 ],[a('focus',2,5,'brace'),a('focus',5,7.2,'awaken'),a('hero',7.2,10,'watch')],[
  l(1,4.5,'','Gold plates. Chained souls.'),l(5,9.9,'Azram','Every road returns to my throne. Even the roads you thought you left behind.')
 ],[c(2,'chains'),c(5,'armor'),c(7,'bossBreath')],{boss:'azram',music:'boss'});
 add('fortress_map','The Suspended Fortress',3,'arena_azram',18,'map',[
  s(0,'A recovered route','hero',2.8,42),s(4,'The impossible map','document',4.4),
  s(9,'The suspended fortress','projection',3.25,15,{endZoom:2.8}),s(14,'The road to the Hollow King','pair',2.2,40)
 ],[a('hero',0,4,'grasp'),a('hero',4,14,'examine'),a('hero',14,18,'withdraw')],[
  l(4.3,9,'','A cathedral suspended between the Waking World and Hell.'),l(9.2,13.8,'','Its halls are built from memories stolen by the shards.'),
  l(14,17.9,'','The fragment and the route to Malthoron are yours.')
 ],[c(3,'paper'),c(9,'ward'),c(14,'crystal')],{object:'fortress_map',contacts:[{at:3,id:'mapRecovery'}]});
 add('cathedral','A Cathedral of Memories',4,'cathedral1',20,'assembly',[
  s(0,'The arrival bridge','hero',2,40),s(4,'Stone remembers','island0',1.55,25),
  s(9,'The stolen places','island1',1.65,35),s(14,'A road through memory','vista',1.15,30,{endZoom:1.4})
 ],[a('hero',0,20,'watch')],[
  l(4,8.7,'','Stone remembers what the world has lost.'),l(9,14,'','Cinderwatch. The Last Bastion. Mount Karrhal.'),
  l(15,19.8,'','The cathedral rebuilds itself around the souls it has taken.')
 ],[c(4,'stone'),c(9,'stone'),c(12,'chains'),c(15,'ward')],{arrival:'cathedral1',music:'cathedral'});
 add('empty_archangel','The Borrowed Voice',4,'arena_empty_archangel',10,'boss',[
  s(0,'Discarded armor','focus',2,35),s(2,'The empty visor','bossFace',3.15),
  s(5,'A borrowed voice','bossFace',2.9),s(8,'The hero recognizes it','hero',3,42)
 ],[a('focus',0,5,'rise'),a('hero',7.5,10,'hesitate')],[
  l(2.2,5.3,'The Empty Archangel','The light spared you. Come closer.'),l(5.5,9.9,'','Seraneth’s voice. Her armor. Nothing living inside.')
 ],[c(0,'armor'),c(3,'whisper'),c(8,'hush')],{boss:'empty_archangel',music:'boss'});
 add('malthoron','The Hollow King',4,'arena_malthoron',10,'boss',[
  s(0,'The armored king','focus',1.85,60),s(3,'The leaking light','bossChest',2.85),
  s(6,'What waits beneath','bossFace',2.6),s(8,'The confrontation','pair',1.6,40)
 ],[a('focus',3,7.5,'brace'),a('hero',8,10,'watch')],[
  l(1,6.5,'Malthoron','You have broken my seals. You have not broken what waits beneath them.'),l(6.7,9.9,'','The armor holds something together.')
 ],[c(0,'bossBreath'),c(3,'whisper'),c(6,'armor')],{boss:'malthoron',music:'boss'});
 add('hell_portal','Someone Else Guided Him',4,'arena_malthoron',22,'portal',[
  s(0,'The hoarded fragments','core',2.5),s(5,'The convergence','core',3.2),
  s(10,'A road into Hell','gateway',2.1,50),s(16,'Beyond the opening','gateway',2.55,45),s(19,'Someone else','hero',2.7,40)
 ],[a('hero',0,16,'watch'),a('hero',16,19,'walk',{path:['heroStart','heroMark']}),a('hero',19,22,'watch')],[
  l(5.5,10,'','The Hollow King’s shards converge.'),l(11,16.5,'','A road directly into the Burning Hells.'),l(17,21.8,'','Malthoron gathered them for someone else.')
 ],[c(0,'crystal'),c(5,'coreHum'),c(10,'portalOpen'),c(17,'wind')],{object:'hell_portal',contacts:[{at:10,id:'portal'}]});
 add('breach','The Breach',5,'hellgate',18,'breach',[
  s(0,'The defenses','hero',2.2,42),s(4,'Ruined kingdoms','vista',1.15,40,{stage:'outlook',pan:{x:2,y:-1}}),
  s(9,'Rival broods','battle',1.9,35,{stage:'outlook'}),s(14,'The onward road','gateway',1.65,40)
 ],[a('hero',0,14,'watch'),a('hero',14,18,'walk',{path:['heroStart','heroMark']})],[
  l(4,8.8,'','Hell is built from kingdoms that lost their wars.'),l(9.2,13.5,'','Rival broods fight beneath the Breach.'),
  l(14,17.9,'','Beyond them, the shards could bridge the worlds forever.')
 ],[c(0,'wind'),c(5,'fire'),c(9,'distantBattle'),c(12,'distantBattle')],{arrival:'hellgate',music:'breach',stages:[{id:'main',at:0,zone:'hellgate'},{id:'outlook',at:4,zone:'ash_wastes'}]});
 add('vethriss','The Wounded Warden',5,'arena_vethriss',20,'boss',[
  s(0,'A familiar face','woundedFace',4.4),s(5,'The plea','woundedHands',3.6),
  s(10,'The hero hesitates','hero',3.2,42),s(14,'The wrong shadow','shadow',2.85,10),s(18,'The distance between them','pair',1.7,35)
 ],[a('focus',0,10,'plead'),a('hero',10,14,'hesitate'),a('hero',14,18,'withdraw')],[
  l(3,9.8,'Seraneth, Wounded','Please. Bring the shards to me. Let me carry this burden.'),l(14.5,19.8,'','The shadow does not follow the light.')
 ],[c(0,'hush'),c(6,'whisper'),c(14,'whisper')],{boss:'vethriss',music:'boss'});
 add('core','The Last Core',5,'arena_vethriss',10,'core',[
  s(0,'The deceiver’s aftermath','pair',1.7,32),s(3,'The gathering','core',3),
  s(6,'The last whole piece','core',4),s(8,'Its fate','pair',2.5,38)
 ],[a('hero',0,6,'watch'),a('hero',6,10,'kneel')],[
  l(4,7.8,'','The last whole piece of the Sunderstone.'),l(8,9.9,'','Its fate is yours to choose.')
 ],[c(0,'settle'),c(3,'coreHum'),c(6,'crystal')],{bossDead:'vethriss',contacts:[{at:6,id:'assembled'}]});
 const order=['oathsworn','korvath','ledger','quieting','mire_mother','mire_shard','dig','ilyan','azram','fortress_map','cathedral','empty_archangel','malthoron','hell_portal','breach','vethriss','core','ending_destroy','ending_seal','ending_give'];
 all.sort((x,y)=>order.indexOf(x.id)-order.indexOf(y.id));
 return {all:Object.freeze(all),get:id=>all.find(d=>d.id===id),boss:id=>all.find(d=>d.boss===id),object:id=>all.find(d=>d.object===id)};
})();
