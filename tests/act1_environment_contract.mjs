import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context=vm.createContext({console,Math,performance,Uint8Array,Int32Array,Uint8ClampedArray,document:{createElement:()=>({getContext:()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){}})})}});
for(const n of ['utils','data','data_overrides','boss_encounters','sprite_manifest','mapgen','navigation'])vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),context);
const {MapGen:M,TerrainSurface:S,TerrainNavigation:N}=vm.runInContext('({MapGen,TerrainSurface,TerrainNavigation})',context);
const zones=['frosthaven_approach','frosthaven','north_wild','mines','shattered_temple','shardpeak_shrine','deepfreeze_cavern'];
const seeds=[0,1,123,12345,4294967295,320040388,...Array.from({length:25},(_,i)=>Math.imul(i+37,2654435761)>>>0)];
let checks=0;const ok=(v,msg)=>{checks++;assert.ok(v,msg);};
for(const zone of zones)for(const seed of seeds){
 const m=M.generate(zone,seed),tag=zone+'/'+seed,env=m.act1Environment;
 ok(env&&env.segments.length,tag+' missing assemblies');
 ok(m.thresholds.length===m.exits.length,tag+' missing passage');
 for(const e of m.exits){
  const t=m.thresholds.find(t=>t.id===e.thresholdId);ok(t&&t.act===1,tag+' missing threshold');
  const prop=m.props.find(p=>p.act1Threshold&&p.thresholdId===t.id);
  ok(prop&&prop.flipX===t.flipX&&(t.flipX?1-t.artAxis:t.artAxis)===t.axis,tag+' gate art faces across its wall');
  for(const p of [t.approach,t.arrival,{x:(e.x0+e.x1)/2,y:(e.y0+e.y1)/2}])ok(S.supported(m,p.x,p.y,.36),tag+' unsupported passage point '+JSON.stringify(p));
  ok(N.segment(m,t.arrival.x,t.arrival.y,t.approach.x,t.approach.y,.36),tag+' passage approach blocked');
  if(t.kit!=='town'){
   ok(t.backing,tag+' freestanding entrance');
   const rear={x:t.x-(t.axis?3:0),y:t.y-(t.axis?0:3)};
   ok(!S.supported(m,rear.x,rear.y,.36),tag+' open ground behind cave mouth');
   const seen=new Set(),queue=[(rear.x|0)+(rear.y|0)*m.w];let boundary=false;
   for(let q=0;q<queue.length&&!boundary&&seen.size<128;q++){
    const i=queue[q],x=i%m.w,y=Math.floor(i/m.w);if(seen.has(i)||!m.walls[i])continue;seen.add(i);
    if(x===0||y===0||x===m.w-1||y===m.h-1){boundary=true;break;}
    queue.push(i-1,i+1,i-m.w,i+m.w);
   }
   ok(boundary||seen.size>=128,tag+' doorway lacks a substantial connected rock mass');
   ok(env.facades.filter(f=>f.thresholdId===t.id).length===2,tag+' doorway missing wall joins');
   ok(N.segment(m,t.arrival.x,t.arrival.y,t.x,t.y,.36),tag+' doorway aperture obstructed');
   const node=m.frontier.landmarks.find(n=>n.exit?.target===e.target)||m.frontier.landmarks.find(n=>n.id==='entry');
   ok(N.findPath(m,t.arrival,node,{radius:.36,speed:4.5}),tag+' entrance cut off from its court');
  }
  for(const f of t.footprints)for(let y=f.y0;y<f.y1;y++)for(let x=f.x0;x<f.x1;x++)ok(m.blocked[x+y*m.w],tag+' jamb collision missing');
  if(zone!=='frosthaven_approach')ok(!(t.arrival.x>=e.x0&&t.arrival.x<=e.x1&&t.arrival.y>=e.y0&&t.arrival.y<=e.y1),tag+' arrival in trigger');
  const target=M.generate(e.target,seed);ok(target.spawns[e.spawnKey],tag+' missing destination key');
  if(!e.openingGate){const back=target.exits.find(b=>b.target===zone);ok(back&&m.spawns[back.spawnKey],tag+' missing return link');}
 }
 for(const s of env.segments){
  ok(s.length>0&&s.length<=(s.kit==='north'?4:6),tag+' invalid span');
  for(let t=0;t<s.length;t++){
   const x=s.x+(s.axis?0:t),y=s.y+(s.axis?t:0),i=x+y*m.w,j=s.axis?i-1:i-m.w;
   ok(!!m.blocked[i]!==!!m.blocked[j],tag+' wall does not follow collision');
  }
 }
 if(m.frontier){ok(!m.props.some(p=>['stairs','cryptdoor','monasterygate'].includes(p.type)),tag+' detached legacy entrance');}
 if(m.frontier&&!m.outdoor)ok(m.elev.every(h=>h===0),tag+' artificial indoor boundary elevation');
 if(m.outdoor)ok(env.natural.length>0,tag+' missing natural boundary');
}
for(const zone of ['fields','weeping_marsh','desert_wastes','cathedral','hell_wastes'])if(vm.runInContext('DATA.ZONES',context)[zone])ok(!M.generate(zone,12345).act1Environment,'Act I assembly leaked into '+zone);
const result={status:'PASS',checks,seeds:seeds.length,zones};fs.mkdirSync('tests/qa/act1_environment',{recursive:true});fs.writeFileSync('tests/qa/act1_environment/layout.json',JSON.stringify(result,null,2)+'\n');console.log(result);
