import * as THREE from './vendor/three/three.module.min.js';
import {UNIQUE_MODELS3D} from './character_unique_catalog3d.mjs?v=body-armor-1';
import {disposeMaterials} from './character_materials3d.mjs?v=2';
import {uniqueMaterials,uniqueSurface,shadeUnique,shadeUniqueGeometry,packUniqueSurfaces} from './character_unique_surfaces3d.mjs?v=body-armor-1';
import {box,wrap,shell,smoothOutline,domedPlate} from './character_unique_mesh3d.mjs?v=body-armor-1';
import {mesh,orb,rod,curved,plate,edge,rivet,band,combineStatic} from './character_mesh3d.mjs?v=body-armor-1';

const TAU=Math.PI*2;
const group=name=>{const g=new THREE.Group();g.name=name;return g;};
function recipe(item){const r=UNIQUE_MODELS3D[item.modelId];if(!r)throw Error('Missing unique 3D model: '+item.modelId);return r;}
function materials(item,r){
  const m=uniqueMaterials(item,r);m.profile=r.refinement;
  return m;
}
function finish(roots,m,skip=new Set()){
  for(const root of roots)shadeUnique(root,m.profile);packUniqueSurfaces(roots);
  const used=new Set();for(const root of roots){
    for(const part of skip)if(part?.isGroup)combineStatic(part);
    combineStatic(root,skip);root.traverse(o=>{for(const mat of [].concat(o.material||[]))used.add(mat);});
  }
  disposeMaterials(Object.values(m).filter(mat=>mat?.isMaterial&&!used.has(mat)));
  return roots[0];
}
function tip(parent,mat,a,b,r=.016){
  const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);
  const o=mesh(parent,new THREE.ConeGeometry(r,d.length(),6),mat,av.add(bv).multiplyScalar(.5).toArray());
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o;
}
function ring(parent,mat,pos,r=.045,thickness=.006,arc=TAU){return mesh(parent,new THREE.TorusGeometry(r,thickness,5,20,arc),mat,pos);}
function gem(parent,mat,pos,size=.025,scale=[.7,1.3,.65]){return mesh(parent,new THREE.DodecahedronGeometry(size),mat,pos,scale);}
function relief(parent,m,kind,pos=[0,0,0],scale=1){
  scale*=m.profile.relief;
  const g=group(kind);g.position.set(...pos);g.scale.setScalar(scale);parent.add(g);
  if(['sun','star','rays','snowflake'].includes(kind)){
    const n=kind==='snowflake'?6:kind==='star'?5:kind==='rays'?7:9;
    gem(g,m.glow,[0,0,.006],.026,[1,1,.6]);
    for(let i=0;i<n;i++){const a=i*TAU/n;tip(g,m.trim,[Math.sin(a)*.027,Math.cos(a)*.027,0],[Math.sin(a)*.087,Math.cos(a)*.087,0],.012);}
  }else if(kind==='ribs'){
    rod(g,m.bone,[0,-.059,.012],[0,.066,.007],.009);
    for(let i=0;i<4;i++)for(const s of [-1,1])curved(g,m.bone,[[s*.003,.050-i*.029,.009],[s*(.032+i*.003),.045-i*.027,.022],[s*.044,.017-i*.020,.014],[s*.021,.001-i*.014,.026]],.006);
  }else if(['jaw','teeth','grin'].includes(kind)){
    curved(g,m.bone,[[-.057,.023,-.007],[-.057,-.027,.016],[-.031,-.050,.027],[0,-.057,.030],[.031,-.050,.027],[.057,-.027,.016],[.057,.023,-.007]],.010);
    for(let i=-2;i<=2;i++)tip(g,m.bone,[i*.019,-.043,.033],[i*.019,-.011+Math.abs(i)*.003,.033],.008);
    if(kind==='jaw')for(const s of [-1,1])tip(g,m.bone,[s*.048,-.027,.019],[s*.039,.032,.024],.013);
  }else if(['skull','lion','wolf'].includes(kind)){
    orb(g,kind==='lion'?m.metal:m.bone,[0,.018,0],[.049,.047,.027]);
    for(const s of [-1,1]){orb(g,m.dark,[s*.018,.02,.025],[.015,.014,.009]);rod(g,m.bone,[s*.04,0,.012],[s*.035,-.043,.02],.009);}
    plate(g,m.bone,[[-.033,-.017],[-.033,-.04],[0,-.051],[.033,-.04],[.033,-.017]],.012,[0,0,.009],.002);
    tip(g,m.dark,[0,.010,.030],[0,-.008,.034],.009);
    for(let i=-2;i<=2;i++)box(g,m.bone,[i*.010,-.032,.024],[.006,.017,.011]);
    if(['wolf','lion'].includes(kind))for(const s of [-1,1])tip(g,m.metal,[s*.035,.046,0],[s*.058,.093,0],.022);
    if(kind==='wolf'){orb(g,m.metal,[0,-.008,.038],[.025,.019,.025]);orb(g,m.dark,[0,.001,.059],[.014,.009,.006]);}
    if(kind==='lion')for(const s of [-1,1])curved(g,m.trim,[[s*.02,.065,-.004],[s*.06,.029,.004],[s*.055,-.031,.009],[s*.027,-.050,.012]],.007);
  }else if(['wings','feathers','feather','fins','bird','leaves'].includes(kind)){
    for(const s of [-1,1])for(let i=0;i<3;i++){
      const p=plate(g,m.metal,[[0,0],[s*(.06+i*.025),.07-i*.019],[s*(.085+i*.022),.05-i*.019],[s*.02,-.023]],.008,[0,0,i*.006],.002);
      p.rotation.z=s*.08*i;
      rod(g,m.trim,[s*.013,0,i*.006+.010],[s*(.072+i*.021),.054-i*.019,i*.006+.010],.002);
    }
  }else if(kind==='flame'){
    plate(g,m.trim,[[-.048,-.025],[-.04,.038],[-.013,.019],[.002,.103],[.027,.053],[.019,.01],[.049,.029],[.039,-.035],[0,-.058]],.018,[0,0,-.009]);
    gem(g,m.glow,[0,-.015,.02],.023);
  }else if(kind==='globe'){
    orb(g,m.metal,[0,0,0],[.054,.054,.04]);ring(g,m.trim,[0,0,.034],.058,.005,Math.PI*1.5);
  }else if(kind==='lock'||kind==='wedge'){
    box(g,m.trim,[0,0,0],[.091,.055,.026]);
    if(kind==='lock'){ring(g,m.metal,[0,.041,0],.033,.008,Math.PI);box(g,m.dark,[0,-.005,.02],[.014,.027,.007]);}
    else for(const s of [-1,1])tip(g,m.metal,[s*.038,0,0],[s*.09,-.05,0],.02);
  }else if(kind==='chalice'){
    mesh(g,new THREE.CylinderGeometry(.041,.017,.067,12,1,true),m.trim,[0,.025,0]);
    rod(g,m.metal,[0,-.01,0],[0,-.043,0],.009);band(g,m.trim,-.047,.029,.009);
  }else if(kind==='serpent'){
    curved(g,m.trim,[[-.034,-.05,0],[.042,-.03,0],[.044,.035,0],[-.039,.05,0],[-.04,.01,.008],[.022,.0,.012]],.009);
    orb(g,m.metal,[.025,0,.014],[.017,.012,.015]);tip(g,m.bone,[.023,-.006,.018],[.03,-.027,.018],.005);
  }else if(['crown','throne','prongs','lightning','branches','antlers','thorns','horns','hook'].includes(kind)){
    for(const s of [-1,1])curved(g,m.trim,[[s*.026,-.03,0],[s*.049,.018,0],[s*.063,.07,-.009],[s*.098,.105,-.013]],.008);
    for(let i=-1;i<=1;i++)tip(g,m.metal,[i*.025,0,0],[i*.052,.08+(i===0?.05:0),.004],.013);
    if(kind==='antlers'||kind==='branches')for(const s of [-1,1])rod(g,m.bone,[s*.052,.04,-.007],[s*.13,.067,0],.009);
  }else if(['ring','moons','knot','knots','chain','coil','spiral','continents','spokes'].includes(kind)){
    const n=kind==='chain'?3:kind==='coil'||kind==='spiral'?3:2;
    for(let i=0;i<n;i++){const o=ring(g,m.trim,[(i-(n-1)/2)*.036,0,i*.007],.043,.007,kind==='moons'?Math.PI*1.4:TAU);o.rotation.z=i*.7;}
  }else if(['coffin','tomb','arches','lantern','shield','cross'].includes(kind)){
    plate(g,m.metal,[[-.034,.067],[.034,.067],[.051,.028],[.037,-.061],[-.037,-.061],[-.051,.028]],.019,[0,0,-.009]);
    edge(g,m.trim,[[-.026,.055,.013],[.026,.055,.013],[.039,.026,.013],[.029,-.048,.013],[-.029,-.048,.013],[-.039,.026,.013]],.004);
    rod(g,m.trim,[0,-.039,.018],[0,.04,.018],.006);rod(g,m.trim,[-.025,.007,.018],[.025,.007,.018],.005);
  }else if(kind==='clock'){
    ring(g,m.trim,[0,0,0],.047,.007);orb(g,m.metal,[0,0,-.006],[.045,.045,.009]);
    for(let i=0;i<8;i++){const a=i*TAU/8,p=box(g,m.trim,[Math.sin(a)*.050,Math.cos(a)*.050,0],[.010,.017,.013]);p.rotation.z=-a;}
    rod(g,m.dark,[0,0,.010],[.020,.027,.010],.003);rod(g,m.dark,[0,0,.010],[-.025,.012,.010],.0025);
  }else if(['heart','eye','pearls','beads','coal','crack','embers'].includes(kind)){
    if(kind==='heart'){orb(g,m.trim,[-.028,.024,0],[.033,.033,.022]);orb(g,m.trim,[.028,.024,0],[.033,.033,.022]);plate(g,m.metal,[[-.059,.021],[.059,.021],[0,-.069]],.022,[0,0,-.01]);}
    else ring(g,m.trim,[0,0,0],.041,.009);
    gem(g,m.glow,[0,0,.027],.029,kind==='eye'?[1.4,.65,.5]:[.7,1.2,.7]);
  }else if(['pennant','veil','cloth','ribbons','straps'].includes(kind)){
    plate(g,m.cloth,[[-.034,.04],[.033,.033],[.044,-.095],[.012,-.076],[-.016,-.13],[-.027,-.079]],.004,[0,0,-.002],0);
    rod(g,m.trim,[-.034,.04,.004],[.033,.033,.004],.004);
  }else if(['nails','bolts','rivets','braces','straps','joints','porcelain','quilt','weave','scales','buttress'].includes(kind)){
    for(let i=-1;i<=1;i++){box(g,m.metal,[i*.032,0,0],[.019,.082,.015]);rivet(g,m.trim,i*.032,.02,.015,.01);}
  }else if(['coins','cage','clapper','bells','magazine','legs','sight','fungus','slit','spines','coral'].includes(kind)){
    for(const s of [-1,1])curved(g,m.trim,[[s*.025,-.055,0],[s*.045,0,.008],[s*.025,.055,0]],.009);
    gem(g,m.glow,[0,0,.012],.025);
  }else throw Error('Unknown unique ornament: '+kind);
  return g;
}

const BLADE_OUTLINES={
 dawn:[[-.6,0],[-1,.13],[-1,.34],[-.7,.34],[-.7,.78],[0,1],[.7,.78],[.7,.34],[1,.34],[1,.13],[.6,0]],
 fork:[[-.75,0],[-1,.18],[-.94,1],[0,.77],[.94,1],[1,.18],[.75,0]],
 saw:[[-.75,0],[-1,.18],[-.68,.27],[-1,.34],[-.65,.42],[-.92,.51],[-.58,.59],[-.8,.69],[0,1],[.85,.77],[.92,.17],[.72,0]],
 cleaver:[[-.7,0],[-1.3,.26],[-1.3,.57],[-.9,.88],[.05,1],[1.65,.77],[1.4,.34],[.5,0]],
 crescent:[[-.6,0],[-1,.26],[-.74,.60],[.07,1],[1.06,.79],[1.22,.42],[.76,.16],[.4,0]],
 obsidian:[[-.55,0],[-.9,.17],[-.62,.32],[-.89,.48],[-.44,.69],[0,1],[.62,.78],[.82,.42],[.64,.14],[.5,0]],
 aurora:[[-.5,0],[-.9,.19],[-.55,.4],[-.78,.62],[.18,1],[.95,.77],[.66,.56],[.94,.34],[.54,0]],
 vow:[[-.72,0],[-.86,.14],[-.66,.77],[0,1],[.66,.77],[.86,.14],[.72,0]],
 flame:[[-.55,0],[-.96,.17],[-.68,.57],[-.21,.82],[0,1],[.42,.84],[.72,.56],[.88,.16],[.55,0]],
 royal:[[-.75,0],[-1,.12],[-.88,.70],[0,1],[.88,.70],[1,.12],[.75,0]],
 lock:[[-.82,0],[-.82,.78],[-.55,.87],[0,1],[.55,.87],[.82,.78],[.82,0]],
 sun:[[-.62,0],[-.95,.22],[-.73,.74],[0,1],[.73,.74],[.95,.22],[.62,0]],
 gilded:[[-.52,0],[-.74,.24],[-.57,.79],[0,1],[.57,.79],[.74,.24],[.52,0]],
 throne:[[-.9,0],[-1.05,.2],[-.77,.2],[-.77,.77],[0,1],[.77,.77],[.77,.2],[1.05,.2],[.9,0]],
 dirk:[[-.7,0],[-.8,.31],[0,1],[.8,.31],[.7,0]],
 fang:[[-.65,0],[-1.13,.26],[-1.08,.66],[.6,1],[.73,.62],[.7,.22],[.4,0]],
 moon:[[-.55,0],[-1.25,.32],[-.9,.69],[.8,1],[1,.61],[.36,.47],[.22,.12]],
 coffin:[[-.9,0],[-1.08,.15],[0,1],[1.08,.15],[.9,0]],
 segments:[[-.7,0],[-.97,.14],[-.71,.75],[0,1],[.71,.75],[.97,.14],[.7,0]],
 serpent:[[-.52,0],[-.73,.3],[-.3,.56],[-.55,.71],[.4,1],[.84,.62],[.52,.26],[.42,0]],
 thorn:[[-.48,0],[-.93,.19],[-.55,.31],[-1.16,.44],[-.43,.58],[-.89,.7],[.16,1],[.71,.74],[.47,.27],[.4,0]],
 leaf:[[-.4,0],[-.91,.32],[-.93,.57],[0,1],[.93,.57],[.91,.32],[.4,0]],
};
function blade(root,m,r,start=.1,length=r.length){
  const points=BLADE_OUTLINES[r.shape];if(!points)throw Error('Unknown unique blade: '+r.shape);
  const outline=points.map(([x,y])=>[x*r.width,start+y*length]);
  if(r.shape==='segments'){
    for(const [a,b] of [[0,.42],[.50,1]])plate(root,m.metal,[[-r.width*.76,start+a*length],[r.width*.76,start+a*length],[r.width*.5,start+b*length],[-r.width*.5,start+b*length]],.021,[0,0,-.01]);
    for(const s of [-1,1])rod(root,m.dark,[s*r.width*.4,start+.38*length,.01],[s*r.width*.4,start+.56*length,.01],.006);
  }else plate(root,m.metal,outline,.024,[0,0,-.012],r.refinement.bevel);
  edge(root,m.edge,outline.map(([x,y])=>[x,y,.007]),.0024);
  // Faceted blade shoulders form a physical cross-section around a dark fuller.
  const channelEnd=r.shape==='fork'?.71:r.shape==='segments'?.37:.78;
  for(const s of [-1,1]){
    const lozenge=plate(root,m.metal,[[-r.width*.40,start+.026],[0,start+.01],[r.width*.40,start+.026],[r.width*.27,start+length*channelEnd],[0,start+length*(channelEnd+.09)],[-r.width*.27,start+length*channelEnd]],.004,[0,0,s*.015],r.refinement.bevel*.7);
    if(s<0)lozenge.rotation.y=Math.PI;
    rod(root,r.refinement.detail==='flame-fuller'||r.refinement.detail==='crossed-vows'?m.glow:m.dark,[0,start+.043,s*.020],[0,start+length*(channelEnd-.04),s*.020],.0021);
    if(r.shape==='segments')rod(root,m.edge,[0,start+length*.53,s*.016],[0,start+length*.87,s*.016],.002);
  }
}
function swordGuard(root,m,r){
  const dagger=r.category==='dagger',width=(dagger?.069:r.twoHand?.133:.100)*r.refinement.taper,detail=r.refinement.detail;
  if(['sunrise-fan','half-sun'].includes(detail)){
    for(let i=0;i<7;i++){const a=(i/6-.5)*Math.PI*.85;plate(root,m.trim,[[-.008,.064],[.008,.064],[Math.sin(a)*width+.01,.072+Math.cos(a)*.065],[Math.sin(a)*width-.01,.072+Math.cos(a)*.065]],.023,[0,0,-.011],r.refinement.bevel);}
    ring(root,m.trim,[0,.078,0],.033,.006,Math.PI);
  }else if(['crown-cage','broken-band','promise-ring'].includes(detail)){
    const cage=ring(root,m.trim,[0,.078,0],width*.77,.009,detail==='broken-band'?Math.PI*1.6:TAU);cage.scale.y=detail==='promise-ring'?.43:.65;
    if(detail==='crown-cage')for(const s of [-1,1])rod(root,m.metal,[s*width*.73,.07,0],[s*.023,.14,0],.009);
  }else if(['crescent-slit','feather-arches','arched-wings'].includes(detail)){
    for(const s of [-1,1]){
      const wing=plate(root,detail==='feather-arches'?m.bone:m.trim,[[s*.013,.059],[s*.055,.096],[s*width,.117],[s*width*.79,.069],[s*.045,.047]],.024,[0,0,-.012],r.refinement.bevel);
      wing.rotation.y=s*.15;for(let i=0;i<3;i++)rod(root,m.dark,[s*(.046+i*.018),.078+i*.006,.015],[s*(.052+i*.021),.063+i*.006,.015],.0017);
    }
  }else if(['thorn-twig','jaw-fang','hollow-ribs'].includes(detail)){
    for(const s of [-1,1])curved(root,detail==='thorn-twig'?m.metal:m.bone,[[s*.015,.065,0],[s*width*.58,.079,0],[s*width,.126,0]],.007);
  }else{
    const heights=detail==='split-wedge'?[.035,.092,.102]:detail==='throne-seal'?[.034,.071,.151]:[.045,.084,.112];
    plate(root,m.trim,[[-width,heights[0]],[-width*.93,heights[1]],[-.026,heights[2]],[0,.080],[.026,heights[2]],[width*.93,heights[1]],[width,heights[0]],[0,.057]],.029,[0,0,-.014],r.refinement.bevel);
  }
  for(const s of [-1,1])rivet(root,m.metal,s*width*.69,.072,.020,.004);
}
const AXE_OUTLINES={
 jaw:[[.02,.13],[.48,.40],[.90,.35],[1,.04],[.83,-.43],[.32,-.63],[.44,-.2],[.04,-.18]],
 crown:[[.02,.16],[.48,.27],[.54,.5],[.66,.28],[.78,.5],[.9,.27],[1,.16],[.91,-.39],[.37,-.6],[.38,-.18]],
 hook:[[0,.12],[.39,.4],[.87,.34],[1,.08],[.85,-.42],[.42,-.57],[.69,-.16],[.02,-.18]],
 double:[[.04,.20],[.60,.43],[1,.18],[.91,-.28],[.44,-.53],[.59,-.17],[.02,-.13]],
 square:[[.03,.19],[.93,.3],[1,.19],[.99,-.44],[.34,-.45],[.34,-.12],[.01,-.1]],
 fragment:[[.04,.15],[.37,.34],[.54,.13],[.7,.34],[1,.14],[.75,-.04],[.95,-.35],[.63,-.48],[.53,-.20],[.32,-.52],[.30,-.10]],
 femur:[[.02,.15],[.43,.47],[.82,.37],[1,.07],[.74,-.36],[.32,-.57],[.49,-.19],[.02,-.12]],
 cathedral:[[0,.14],[.38,.45],[.82,.36],[1,.10],[.88,-.37],[.40,-.66],[.39,-.21],[.03,-.14]],
 tusk:[[.01,.1],[.39,.39],[.72,.43],[1,.2],[.97,-.13],[.63,-.58],[.26,-.8],[.48,-.33],[.02,-.14]],
 cleaver:[[.02,.18],[.8,.29],[1,.18],[1,-.13],[.85,-.17],[.87,-.27],[.66,-.29],[.68,-.39],[.36,-.4],[.33,-.09]],
 ribs:[[.04,.15],[.38,.4],[.92,.28],[1,.04],[.79,-.33],[.34,-.52],[.40,-.23],[.67,-.22],[.77,.03],[.39,.14],[.03,-.12]],
 wolf:[[.02,.20],[.74,.34],[1,.11],[.93,-.33],[.30,-.51],[.22,-.16],[.02,-.1]],
 dragon:[[.02,.15],[.5,.47],[.99,.32],[.8,.14],[1,-.12],[.71,-.14],[.88,-.37],[.43,-.58],[.41,-.19],[.02,-.11]],
 antler:[[.02,.15],[.5,.45],[.91,.25],[1,.01],[.75,-.39],[.33,-.6],[.41,-.24],[.02,-.15]],
};
function axe(root,m,r){
  const y=r.length;rod(root,r.shape==='femur'?m.bone:m.wood,[0,.025,0],[0,y+.07,0],.024);
  const raw=AXE_OUTLINES[r.shape],rounded=['jaw','hook','tusk','femur','cathedral','wolf','antler'].includes(r.shape)?smoothOutline(raw,.12):raw;
  const outline=rounded.map(([x,z])=>[x*r.width*r.refinement.taper,y+z*.36]);
  plate(root,m.metal,outline,.038,[0,0,-.019],r.refinement.bevel);edge(root,m.edge,outline.map(([x,y])=>[x,y,.009]),.004);
  if(r.shape==='double')plate(root,m.metal,outline.map(([x,z])=>[-x,z]),.048,[0,0,-.024]);
  else if(r.shape==='antler')relief(root,m,'antlers',[-.02,y,0],1.1);
  else tip(root,m.metal,[-.012,y,0],[-.14,y-.13,0],.034);
  if(r.shape==='cathedral')for(let i=0;i<3;i++)relief(root,m,'arches',[.07+i*.052,y-.014,0],.6);
  relief(root,m,r.motif,[.016,y-.04,.033],.74);
  if(r.motif==='nails')for(let i=0;i<3;i++)rivet(root,m.dark,.11+i*.052,y-.04-i*.037,.032,.012);
  for(const s of [-1,1]){
    plate(root,m.trim,[[-.032,y-.087],[-.041,y+.052],[.038,y+.059],[.031,y-.093]],.009,[0,0,s*.026],r.refinement.bevel);
    rivet(root,m.dark,.002,y+.008,s*.041,.006);
  }
  if(['jaw','dragon','tusk','femur'].includes(r.shape))for(let i=0;i<4;i++)tip(root,m.bone,[.080+i*.034,y-.068-i*.026,.021],[.075+i*.030,y-.11-i*.029,.020],.010);
  if(r.shape==='hook')curved(root,m.dark,[[.06,y+.063,.026],[.16,y+.061,.026],[.23,y-.02,.026],[.16,y-.096,.026]],.004);
  band(root,m.trim,y-.15,.037,.09);wrap(root,m.leather,.11,y-.30,.026);
}
function bell(root,m,pos,radius=.12,height=.18){
  const profile=[[radius,-height*.50],[radius*.98,-height*.44],[radius*.82,-height*.34],[radius*.64,-height*.03],[radius*.44,height*.35],[radius*.20,height*.50],[.008,height*.53]].map(([x,y])=>new THREE.Vector2(x,y));
  const o=mesh(root,new THREE.LatheGeometry(profile,16),m.trim,pos);
  band(o,m.metal,-height*.46,radius,.012);band(o,m.dark,-height*.46,radius*.90,.009);
  rod(root,m.dark,[pos[0],pos[1]+height*.35,pos[2]],[pos[0],pos[1]-height*.48,pos[2]],.010);
  orb(root,m.metal,[pos[0],pos[1]-height*.5,pos[2]],[.025,.031,.025]);return o;
}
function mace(root,m,r){
  const y=r.length,w=r.width;rod(root,m.wood,[0,.02,0],[0,y+.09,0],.025);
  if(r.shape==='stone'||r.shape==='anvil'){
    plate(root,r.shape==='stone'?m.stone:m.metal,[[-w,-.09],[-w*1.1,-.04],[-w,.08],[w,.10],[w*1.15,.05],[w,.0],[w,-.09]],.15,[0,y,-.075],.008);
    for(const s of [-1,1])box(root,m.trim,[s*w*.68,y,.085],[.034,.21,.014]);
    if(r.shape==='anvil')curved(root,m.glow,[[-.13,y+.085,.082],[-.025,y+.02,.084],[.012,y-.08,.082]],.005);
  }else if(r.shape==='globe'){
    orb(root,m.metal,[0,y,0],[w,w,w]);for(let i=0;i<5;i++){const a=i*TAU/5;const p=plate(root,m.trim,[[-.07,-.04],[.02,-.09],[.09,-.02],[.04,.09],[-.07,.06]],.01,[Math.sin(a)*w*.83,y,Math.cos(a)*w*.83]);p.rotation.y=a;}
  }else if(['bell-cage','skull-bell','diving-bell','handbell','triple-bell'].includes(r.shape)){
    if(r.shape==='triple-bell')for(let i=0;i<3;i++)bell(root,m,[Math.sin(i*TAU/3)*.063,y,Math.cos(i*TAU/3)*.063],w*.57,.15);
    else bell(root,m,[0,y,0],w,r.twoHand?.25:.17);
    if(r.shape==='bell-cage')for(const s of [-1,1])rod(root,m.dark,[s*w*1.1,y-.16,-.06],[s*w*.45,y+.16,.04],.018);
    if(r.shape==='skull-bell')relief(root,m,'skull',[0,y,.13],1.45);
    if(r.shape==='diving-bell')relief(root,m,'coral',[0,y,.17],1.15);
  }else if(r.shape==='coffin'){relief(root,m,'coffin',[0,y,0],2);for(const s of [-1,1])box(root,m.metal,[s*.093,y,0],[.059,.04,.08]);}
  else if(r.shape==='cross'){box(root,m.metal,[0,y,0],[.06,.27,.075]);box(root,m.trim,[0,y+.035,0],[.23,.06,.07]);gem(root,m.glow,[0,y+.035,.057],.039);}
  else if(r.shape==='star'){for(let i=0;i<7;i++){
    const a=i*TAU/7;curved(root,m.metal,[[Math.sin(a)*w*.24,y+Math.cos(a)*w*.24,0],[Math.sin(a+.13)*w*.65,y+Math.cos(a+.13)*w*.65,0],[Math.sin(a)*w*.89,y+Math.cos(a)*w*.89,0]],.012);
    tip(root,m.metal,[Math.sin(a)*w*.84,y+Math.cos(a)*w*.84,0],[Math.sin(a-.12)*w*1.10,y+Math.cos(a-.12)*w*1.10,0],.015);
  }gem(root,m.glow,[0,y,0],.043);}
  else if(r.shape==='chalice'){mesh(root,new THREE.CylinderGeometry(w,w*.35,.17,12,1,true),m.metal,[0,y,0]);band(root,m.trim,y+.084,w,.017);for(let i=0;i<8;i++){const a=i*TAU/8;orb(root,m.trim,[Math.sin(a)*w,y+.071,Math.cos(a)*w],[.016,.018,.01]);}}
  else if(r.shape==='moon-lantern'){ring(root,m.trim,[0,y,0],w,.03,Math.PI*1.58);relief(root,m,'lantern',[0,y,.008],1.18);}
  else throw Error('Unknown unique mace: '+r.shape);
  band(root,m.trim,y-.15,.038,.032);
  if(r.shape==='stone')for(let i=0;i<3;i++)rod(root,m.trim,[-w*.93,y-.072+i*.062,.086],[w*.92,y-.067+i*.054,.086],.005);
  if(r.shape==='coffin'||r.shape==='cross')for(const s of [-1,1])rivet(root,m.trim,s*.039,y-.061,.044,.007);
}
function pole(root,m,r){
  const y=r.length,isWand=r.category==='wand';
  const shaft=isWand&&['bone','wood'].includes(r.refinement.solid)?m.metal:r.category==='spear'&&['wing','feather'].includes(r.shape)?m.bone:m.wood;
  curved(root,shaft,[[0,isWand?.035:-.55,0],[.008,.1,0],[-.008,y*.53,0],[0,y,0]],(isWand?.016:.023)*r.refinement.taper);
  for(const h of isWand?[.16,.27]:[-.46,-.26,.08,y-.08])band(root,m.trim,h,isWand?.02:.03,.027);
  if(r.category==='spear'){
    const outlines={comet:[[-1,0],[-.7,.35],[0,1],[.7,.35],[1,0]],zigzag:[[-.8,0],[-1,.36],[-.35,.46],[-.55,.76],[.1,1],[.75,.5],[.45,.32],[.8,0]],wing:[[-.5,0],[-1,.48],[0,1],[1,.48],[.5,0]],trident:[[-1.1,0],[-1.1,.76],[-.75,.38],[-.22,.24],[0,1],[.22,.24],[.75,.38],[1.1,.76],[1.1,0]],ribbon:[[-.65,0],[-.9,.32],[-.65,.70],[0,1],[.65,.7],[.9,.32],[.65,0]],feather:[[-.45,0],[-.75,.52],[0,1],[.75,.52],[.45,0]]};
    plate(root,m.metal,outlines[r.shape].map(([x,h])=>[x*r.width,y+h*.34]),.023,[0,0,-.012],r.refinement.bevel);
    for(const s of [-1,1])rod(root,m.edge,[0,y+.014,s*.016],[0,y+.295,s*.016],.003);
    relief(root,m,r.motif,[0,y+.012,.02],.8);
  }else if(r.category==='staff'){
    if(r.shape==='vortex'||r.shape==='ice')for(const s of [-1,1])curved(root,r.shape==='ice'?m.metal:m.trim,[[0,y,0],[s*r.width,y+.08,0],[s*r.width*.75,y+.22,0],[-s*r.width*.3,y+.25,0],[0,y+.16,0]],.015);
    else if(r.shape==='heart')relief(root,m,'heart',[0,y+.08,0],1.9);
    else if(r.shape==='lantern'){box(root,m.metal,[0,y+.08,0],[.16,.18,.09]);for(const s of [-1,1])box(root,m.trim,[s*.063,y+.08,.052],[.014,.15,.016]);}
    else if(r.shape==='crown')relief(root,m,'crown',[0,y+.02,0],1.9);
    else if(r.shape==='veil')relief(root,m,'veil',[0,y+.12,0],2.4);
    else if(r.shape==='spire'){for(let i=0;i<3;i++)relief(root,m,'branches',[0,y+i*.071,0],1-i*.18);tip(root,m.metal,[0,y+.08,0],[0,y+.31,0],.032);}
    gem(root,m.glow,[0,y+.11,.014],.065,[.85,1.25,.85]);
    if(r.shape==='ice')for(const s of [-1,1])tip(root,m.metal,[s*.09,y+.03,0],[s*.17,y+.14,0],.025);
    const socket=plate(root,m.trim,[[-.034,y-.054],[-.043,y+.027],[0,y+.055],[.043,y+.027],[.034,y-.054]],.032,[0,0,-.016],r.refinement.bevel);
    socket.name=r.refinement.detail+' socket';
  }else{
    if(r.shape==='finger'){for(let i=0;i<3;i++)orb(root,m.bone,[Math.sin(i*.6)*.022,y-.10+i*.049,0],[.024,.032,.019]);tip(root,m.bone,[.03,y+.01,0],[.06,y+.08,0],.018);}
    else if(r.shape==='mouth'){ring(root,m.metal,[0,y,0],.055,.015);for(const s of [-1,1]){rod(root,m.trim,[s*.035,y-.01,0],[s*.05,y-.09,0],.004);orb(root,m.bone,[s*.05,y-.1,0],[.019,.026,.017]);}}
    else if(r.shape==='tomb'){relief(root,m,'tomb',[0,y,0],1.08);relief(root,m,'ribs',[0,y-.06,-.014],.75);}
    else if(r.shape==='pod'){for(let i=0;i<3;i++){const a=i*TAU/3;curved(root,m.wood,[[0,y-.05,0],[Math.sin(a)*.064,y+.04,Math.cos(a)*.064],[0,y+.08,0]],.014);}gem(root,m.glow,[0,y,0],.025);}
    else if(r.shape==='quill')plate(root,m.bone,[[-.02,y-.04],[-.052,y+.06],[-.025,y+.13],[0,y+.17],[.047,y+.05],[.02,y-.04]],.014,[0,0,-.007]);
    else if(r.shape==='splinter')for(const s of [-1,0,1])tip(root,m.glow,[s*.015,y-.045,0],[s*.045,y+.1+(s===0?.045:0),0],.02);
  }
}

function arrow(root,m,crossbow=false){
  const g=group(crossbow?'Loaded quarrel':'Nocked arrow');root.add(g);
  rod(g,m.wood,[0,crossbow?.055:0,-.08],[0,crossbow?.055:0,crossbow?.52:.70],.005);
  const head=mesh(g,new THREE.ConeGeometry(.015,.06,4),m.edge,[0,crossbow?.055:0,crossbow?.55:.73]);head.rotation.x=Math.PI/2;
  for(const s of [-1,1]){const p=plate(g,m.cloth,[[-.014,-.055],[.014,-.055],[.024,.03],[0,.018]],.002,[0,crossbow?.055:0,0],0);p.rotation.x=Math.PI/2;p.rotation.y=s*Math.PI/3;}
  combineStatic(g);return g;
}
function bow(root,m,r){
  rod(root,m.leather,[0,-.10,.2],[0,.10,.2],.03);
  const limbs=[];
  const zProfile={crystal:[.18,.11,-.075],zigzag:[.15,.045,-.07],fork:[.22,.09,-.09],feather:[.21,.065,-.085],vertebra:[.16,.11,-.10],scroll:[.22,.035,-.08]}[r.shape];
  for(const s of [-1,1]){
    const limb=group(s>0?'Upper bow limb':'Lower bow limb');limb.position.set(0,s*.10,.2);limb.userData.side=s;root.add(limb);
    const toLocal=([x,y,z])=>[x,y-s*.10,z-.2];
    const points=[[0,s*.10,.2],[0,s*r.length*.36,zProfile[0]],[0,s*r.length*.76,zProfile[1]],[0,s*r.length,zProfile[2]]].map(toLocal);
    curved(limb,r.shape==='crystal'||r.shape==='vertebra'?m.metal:m.wood,points,r.width);
    curved(limb,m.trim,points.map(([x,y,z])=>[x+.012,y,z+.013]),.005);
    if(r.shape==='fork')curved(limb,m.metal,points.map(([x,y,z],i)=>[x+(i===1||i===2?.046:0),y,z]),.01);
    if(r.shape==='zigzag')for(let i=1;i<=3;i++)relief(limb,m,'lightning',toLocal([0,s*(.15+i*.115),.16-i*.043]),.38);
    if(r.shape==='vertebra')for(let i=1;i<=5;i++){const t=i/6,p=new THREE.Vector3(...points[0]).lerp(new THREE.Vector3(...points[3]),t);const joint=band(limb,m.bone,p.y,.038,.025);joint.position.z=p.z;}
    if(r.shape==='feather')for(let i=0;i<3;i++)relief(limb,m,'feathers',toLocal([0,s*(.29+i*.1),.14-i*.048]),.45);
    if(r.shape==='scroll')for(let i=0;i<2;i++)ring(limb,m.trim,toLocal([0,s*(.3+i*.2),.11-i*.07]),.055,.008,Math.PI*1.65);
    if(r.shape==='crystal')gem(limb,m.glow,points.at(-1),.038,[.75,1.75,.6]);
    limb.userData.tip=points.at(-1).slice();limb.userData.flex=.11;combineStatic(limb);limbs.push(limb);
  }
  const endpoints=[limbs[0],limbs[1]].sort((a,b)=>a.userData.side-b.userData.side).map(l=>new THREE.Vector3(...l.userData.tip).add(l.position));
  const stringGeometry=new THREE.BufferGeometry();stringGeometry.setAttribute('position',new THREE.Float32BufferAttribute([...endpoints[0].toArray(),0,0,-.08,...endpoints[1].toArray()],3));
  const string=new THREE.Line(stringGeometry,new THREE.LineBasicMaterial({color:'#b9ad97'}));root.add(string);
  relief(root,m,r.motif,[0,0,.238],.60);
  return {string,arrow:arrow(root,m),bowLimbs:limbs};
}
function crossbow(root,m,r){
  const l=r.length,w=r.width;
  const stockProfiles={heart:[[-.043,-l],[.043,-l],[.03,l],[-.03,l]],repeater:[[-.06,-l],[.06,-l],[.045,l],[-.045,l]],spider:[[-.026,-l],[.026,-l],[.039,l],[-.039,l]],heavy:[[-.06,-l],[.06,-l],[.065,l],[-.065,l]],pulse:[[-.038,-l],[.038,-l],[.05,l],[-.05,l]],quarrel:[[-.033,-l],[.033,-l],[.02,l*.9],[0,l*1.13],[-.02,l*.9]],clock:[[-.036,-l],[.036,-l],[.035,l],[-.035,l]]};
  const stock=plate(root,m.wood,stockProfiles[r.shape],.067,[0,.025,.14],r.refinement.bevel);stock.rotation.x=Math.PI/2;
  box(root,m.leather,[0,-.10,-.065],[.052,.16,.065]);box(root,m.metal,[0,.027,.2],[.068,.025,.23]);
  const sweep=r.shape==='spider'?.42:r.shape==='heart'?.39:r.shape==='heavy'?.32:.36;
  curved(root,m.metal,[[-w,0,.19],[-w*.67,0,sweep],[0,0,.36],[w*.67,0,sweep],[w,0,.19]],r.shape==='heavy'?.031:.019);
  for(const s of [-1,1]){
    if(r.shape==='spider')for(let i=0;i<3;i++)curved(root,m.dark,[[s*.08,.03,.31],[s*(.19+i*.022),.04,.26],[s*(.22+i*.06),.01,.14]],.009);
    if(r.shape==='quarrel')tip(root,m.trim,[s*.023,.018,.33],[s*.057,.024,.47],.016);
    rod(root,m.trim,[s*.029,.058,-l*.55+.14],[s*.031,.058,.23],.003);
    rivet(root,m.metal,s*.044,.042,.15,.005);
  }
  if(r.shape==='repeater'){
    for(let i=0;i<3;i++)box(root,m.metal,[0,.07+i*.032,.15],[.13,.026,.19]);
    rod(root,m.trim,[.08,.017,.11],[.114,-.005,.11],.007);rod(root,m.metal,[.114,-.005,.11],[.114,-.038,.063],.006);
  }
  else if(r.shape==='heavy'){box(root,m.dark,[0,.077,.35],[.13,.022,.025]);for(const s of [-1,1])box(root,m.metal,[s*.067,.11,.35],[.012,.079,.02]);}
  else {const o=relief(root,m,r.motif,[0,.035,.22],r.shape==='pulse'?1.2:.75);o.rotation.x=-Math.PI/2;}
  curved(root,m.dark,[[-.021,-.106,-.031],[-.046,-.15,-.006],[.046,-.15,-.006],[.021,-.106,-.031]],.005);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-w,0,.19,0,0,.19,w,0,.19],3));
  const string=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#ad9c84'}));root.add(string);
  return {string,arrow:arrow(root,m,true),bowLimbs:[]};
}
export function createUniqueWeapon(item){
  const r=recipe(item),root=group(item.name),m=materials(item,r);root.userData.itemKey=item.key;root.userData.modelId=r.id;
  const category=r.category,two=item.twoHand;let moving=null;
  if(!['bow','crossbow'].includes(category)){
    const bottom=two?-.32:-.18;
    rod(root,m.leather,[0,bottom,0],[0,.055,0],category==='dagger'?.017:.022);wrap(root,m.dark,bottom,.04,category==='dagger'?.018:.023);
    for(const h of [bottom,.035])band(root,m.trim,h,.026,.018);
    if(r.shape==='dirk')gem(root,m.dark,[0,bottom-.035,0],.033,[.65,1.45,.7]);
    else gem(root,r.finish==='bone'?m.bone:m.trim,[0,bottom-.028,0],.029,[1,1.2,.85]);
  }
  if(category==='sword'||category==='dagger'){
    blade(root,m,r);swordGuard(root,m,r);
    relief(root,m,r.motif,[0,.078,.024],category==='dagger'?.55:.95);
    if(r.shape==='gilded')for(const s of [-1,1])curved(root,m.trim,[[s*.016,.16,.016],[s*.027,.34,.016],[s*.008,.63,.016]],.0025);
    if(r.shape==='aurora')for(const s of [-1,1])curved(root,m.trim,[[s*.027,.19,.02],[s*.008,.4,.02],[s*.03,.64,.02],[s*.008,.88,.02]],.004);
  }else if(category==='axe')axe(root,m,r);
  else if(category==='mace')mace(root,m,r);
  else if(['spear','staff','wand'].includes(category))pole(root,m,r);
  else if(category==='bow')moving=bow(root,m,r);
  else if(category==='crossbow')moving=crossbow(root,m,r);
  else throw Error('Unsupported unique weapon: '+category);
  root.userData.category=category;
  Object.assign(root.userData,JSON.parse(JSON.stringify(r.attachment)),moving||{string:null,arrow:null,bowLimbs:[]});
  return finish([root],m,new Set([root.userData.string,root.userData.arrow,...root.userData.bowLimbs]));
}

function shield(root,m,r){
  const h=r.length,w=r.width*r.refinement.taper;
  if(r.shape==='concentric'){
    for(const radius of [w,w*.75,w*.45]){
      ring(root,m.metal,[0,0,.020],radius,.016);ring(root,m.trim,[0,0,.032],radius,.004);
    }
    for(let i=0;i<8;i++){const a=i*TAU/8;rod(root,m.metal,[Math.sin(a)*w*.28,Math.cos(a)*w*.28,.034],[Math.sin(a)*w*.94,Math.cos(a)*w*.94,.034],.014);}
    orb(root,m.metal,[0,0,.054],[.073,.073,.037]);
  }else{
    const profiles={kite:[[-.94,.45],[0,.53],[.94,.45],[.85,-.06],[0,-.54],[-.85,-.06]],lantern:[[-.65,.42],[0,.56],[.65,.42],[.81,-.04],[0,-.54],[-.81,-.04]],wall:[[-.92,.50],[.92,.50],[1,-.38],[.8,-.50],[-.8,-.50],[-1,-.38]],oval:[[-.65,.46],[0,.53],[.65,.46],[1,.15],[.97,-.25],[.55,-.49],[0,-.53],[-.55,-.49],[-.97,-.25],[-1,.15]],rib:[[-.76,.40],[0,.52],[.76,.40],[.78,-.1],[0,-.55],[-.78,-.1]],hood:[[-.92,.25],[-.70,.48],[0,.56],[.70,.48],[.92,.25],[.72,-.28],[0,-.51],[-.72,-.28]]};
    const outline=profiles[r.shape].map(([x,y])=>[x*w,y*h]);
    plate(root,m.leather,outline,.035,[0,0,-.021],.004);
    domedPlate(root,m.metal,outline,.018,.035,[0,0,.012]);
    edge(root,m.trim,outline.map(([x,y])=>[x,y,.036]),.007);
    edge(root,m.edge,outline.map(([x,y])=>[x*.96,y*.96,.041]),.003);
    if(r.shape==='wall')for(let i=-2;i<=2;i++)box(root,m.trim,[i*.076,0,.056],[.025,h*.88,.017]);
    if(r.shape==='rib')for(let i=0;i<5;i++)for(const s of [-1,1])curved(root,m.bone,[[s*.014,.22-i*.075,.06],[s*w*.68,.18-i*.06,.06],[s*w*.78,.1-i*.069,.048]],.015);
    const ornament=relief(root,m,r.motif==='oath'?'cross':r.motif==='angel'?'wings':r.motif==='hearth'?'heart':r.motif,[0,0,.061],1.8);
    if(r.shape==='hood')ornament.position.y=-.015;
    if(r.shape==='lantern')gem(root,m.glow,[0,.012,.095],.048);
  }
  // A physical rear grip and boss remain visible from the back.
  curved(root,m.leather,[[-.06,-.025,-.026],[-.06,.065,-.075],[.06,.065,-.075],[.06,-.025,-.026]],.013);
  for(const s of [-1,1])box(root,m.metal,[s*.058,-.023,-.030],[.031,.034,.012]);
}
function helmet(root,m,r){
  const open=['hollow','coral'].includes(r.shape);
  const w=r.width*r.refinement.taper;
  if(!open){
    const height=r.shape==='skull'?.91:r.shape==='mask'?1.05:r.shape==='hood'?.96:1;
    shell(root,m.metal,[[.035,w*.96,w*.92,-.012],[.087,w,w*.95,-.012],[.16,w*.82,w*.80,-.009],[.216,w*.42,w*.47,-.015],[.233,.002,.003,-.017]].map(([y,x,z,off])=>[y*height,x,z,off]),undefined,r.shape==='mask'?16:20);
    for(const s of [-1,1]){
      const ridge=curved(root,m.edge,[[s*w*.83,.063,-.073],[s*w*.70,.148,-.070],[s*.037,.212*height,-.025],[s*.017,.223*height,.007]],.004);
      ridge.name='Forged crown ridge';
    }
  }
  else {band(root,m.dark,.055,w*.96,.041,.95);band(root,r.shape==='coral'?m.trim:m.bone,.075,w,.025,.96);}
  const rim=ring(root,m.trim,[0,.053,-.008],w,.006);rim.rotation.x=Math.PI/2;
  if(r.shape==='hollow'||r.shape==='coral'||r.shape==='flame'){
    for(let i=0;i<7;i++){
      const a=i*TAU/7,x=Math.sin(a)*r.width,z=Math.cos(a)*r.width-.008;
      if(r.shape==='coral'){
        curved(root,m.bone,[[x,.08,z],[x*1.06,.15,z*1.05],[x*1.18,.21,z*1.16],[x*1.27,r.length+.04,z*1.23]],.009);
        if(i%2===0)curved(root,m.bone,[[x*1.1,.16,z*1.08],[x*1.37,.19,z*1.27],[x*1.47,.24,z*1.28]],.006);
        orb(root,m.glow,[x,.069,z+.006],[.014,.019,.014]);
      }
      else tip(root,r.shape==='hollow'?m.bone:m.metal,[x,.077,z],[x*1.12,.18+(i%3)*.028,z*1.12],.019);
    }
    if(r.shape==='hollow')relief(root,m,'skull',[0,.105,r.width+.003],.6);
    else gem(root,m.glow,[0,.102,r.width+.009],.031);
  }else if(r.shape==='hood'){
    plate(root,m.metal,[[-.146,.09],[-.10,.16],[.1,.16],[.146,.09],[.095,.008],[0,.033],[-.095,.008]],.022,[0,0,.105]);
    for(const s of [-1,1])tip(root,m.metal,[s*.12,.064,0],[s*.20,.14,-.02],.026);
    gem(root,m.glow,[0,.095,.134],.017);
  }else if(r.shape==='mask'){
    domedPlate(root,m.metal,[[-.083,.09],[.083,.09],[.10,.051],[.062,-.10],[0,-.125],[-.062,-.10],[-.10,.051]],.015,.026,[0,0,.113]);
    for(const s of [-1,1]){
      const eye=box(root,m.dark,[s*.041,.039,.153],[.043,.009,.003]);eye.rotation.z=s*-.11;
      curved(root,m.edge,[[s*.088,.065,.137],[s*.047,.060,.151],[s*.013,.065,.154]],.003);
    }
    tip(root,m.metal,[0,.071,.150],[0,-.031,.179],.012);
    curved(root,m.trim,[[-.084,.018,.138],[-.072,-.075,.132],[-.036,-.12,.138]],.004);
  }else if(r.shape==='skull'){
    orb(root,m.metal,[0,.024,.105],[.106,.119,.044]);
    for(const s of [-1,1])orb(root,m.dark,[s*.045,.043,.155],[.029,.024,.008]);
    for(const s of [-1,1]){
      curved(root,m.edge,[[s*.089,.038,.145],[s*.067,.0,.16],[s*.033,-.03,.155]],.008);
      curved(root,m.metal,[[s*.076,.067,.148],[s*.041,.079,.162],[s*.012,.061,.164]],.009);
      plate(root,m.metal,[[s*.035,-.042],[s*.091,-.018],[s*.072,-.091],[s*.035,-.10]],.018,[0,0,.131],r.refinement.bevel);
    }
    for(let i=-3;i<=3;i++)box(root,m.metal,[i*.018,-.091,.141],[.013,.04,.015]);
    tip(root,m.metal,[0,.03,.155],[0,-.024,.161],.016);
  }else if(r.shape==='rib'){
    for(let i=-1;i<=1;i++)curved(root,m.bone,[[i*.057,-.085,.116],[i*.082,.017,.163],[i*.055,.14,.117],[i*.04,.205,-.05]],.014);
    for(let i=0;i<3;i++)for(const s of [-1,1])curved(root,m.bone,[[s*.017,-.06+i*.051,.166],[s*.093,-.03+i*.039,.13],[s*.125,-.026+i*.036,.079]],.013);
    gem(root,m.dark,[0,.145,.137],.026);
  }
  if(!open)for(const s of [-1,1]){
    const guard=plate(root,m.metal,[[s*.09,.044],[s*.132,.012],[s*.117,-.102],[s*.078,-.115],[s*.062,-.035]],.017,[0,0,.071],r.refinement.bevel);guard.rotation.y=s*.08;
    rivet(root,m.trim,s*.118,.012,.094,.005);
  }
  if(!open&&r.shape!=='rib')curved(root,m.edge,[[0,.054,-.147],[0,.147,-.118],[0,.213,-.056],[0,.234,-.012]],.005);
  root.userData.openHelmet=open;
}
function gloves(root,m,r){
  const h=r.length,w=r.width*r.refinement.taper;
  orb(root,m.leather,[0,-.045,.007],[.048,.07,.044]);
  shell(root,r.shape==='skeletal'?m.dark:m.leather,[[-.016,w*.78,w*.64],[.043,w*.88,w*.75],[h*.60,w,w*.86],[h*.83,w*1.02,w*.90]],undefined,12);
  if(['bone','skeletal'].includes(r.shape)){
    for(let i=0;i<4;i++){
      const x=-.031+i*.021;
      for(let j=0;j<3;j++){const p=box(root,m.bone,[x,-.018-j*.026,.046-j*.001],[.013,.020-j*.002,.014]);p.rotation.z=(i-1.5)*.055;}
      rod(root,m.bone,[x,-.012,.043],[x*.78,.06,.047],.007);
    }
    if(r.shape==='bone')relief(root,m,'skull',[0,.083,.055],.4);
  }else{
    const outline=r.shape==='tomb'?[[-w,.0],[-w,.11],[0,.16],[w,.11],[w,0]]:
      r.shape==='vise'?[[-w*1.25,0],[-w*1.25,.13],[-w*.8,.16],[w*.8,.16],[w*1.25,.13],[w*1.25,0]]:
      [[-w,0],[-w*1.1,.10],[0,.14],[w*1.1,.1],[w,0]];
    plate(root,m.metal,outline,.013,[0,-.01,.041]);
    for(let i=0;i<4;i++){
      for(let joint=0;joint<3;joint++){
        const p=box(root,m.metal,[-.033+i*.021,-.014-joint*.020,.048-joint*.002],[.017,.018,.014]);p.rotation.z=(i-1.5)*.033;
      }
      if(r.shape==='hooks'||r.shape==='eye')tip(root,r.shape==='eye'?m.dark:m.metal,[-.033+i*.021,-.057,.05],[-.043+i*.024,-.111,.03],.01);
    }
    if(r.shape==='blocks')for(let i=0;i<4;i++)box(root,m.metal,[-.035+i*.024,-.024,.067],[.02,.025,.025]);
    if(r.shape==='vise')for(const s of [-1,1])rivet(root,m.trim,s*w*.9,.05,.061,.012);
    if(r.shape==='eye')relief(root,m,'eye',[0,-.018,-.045],.64);
    else relief(root,m,r.motif==='hook'?'horns':r.motif,[0,.085,.063],.5);
  }
  for(const s of [-1,1]){
    const seam=plate(root,m.metal,[[-.010,0],[.010,0],[.007,h*.57],[-.007,h*.57]],.008,[s*w*.72,.008,.04],r.refinement.bevel*.5);seam.rotation.y=s*.3;
  }
  curved(root,r.shape==='bone'||r.shape==='skeletal'?m.bone:m.metal,[[.038,-.012,.023],[.059,-.024,.021],[.068,-.052,.019]],.009);
  band(root,m.trim,h*.68,w*1.02,.009);
}
function boots(root,m,r){
  const w=r.width*r.refinement.taper,h=r.length,longToe=['bell','spectral','mask'].includes(r.shape);
  const toe=longToe?.195:.153;
  // Closed shoe and shaft; their underside stays inside the existing foot anchor.
  const foot=[[-w*.75,-.055],[-w,-.012],[-w*.8,toe*.68],[-w*.26,toe*.95],[0,toe],[w*.26,toe*.95],[w*.8,toe*.68],[w,-.012],[w*.75,-.055]];
  const shoe=plate(root,m.leather,smoothOutline(foot,.12),.064,[0,.02,0],r.refinement.bevel);shoe.rotation.x=Math.PI/2;
  shell(root,m.leather,[[.015,w*.70,w*.74,-.022],[.08,w*.72,w*.79,-.021],[h*.62,w*.94,w*.86,-.025],[h*.91,w,w*.87,-.024],[h,w*.96,w*.86,-.024]],undefined,14);
  if(r.refinement.solid==='metal'||r.refinement.solid==='bone'){
    const cap=plate(root,m.metal,[[-w*.73,toe*.37],[-w*.75,toe*.63],[-w*.23,toe*.93],[0,toe*.98],[w*.23,toe*.93],[w*.75,toe*.63],[w*.73,toe*.37]],.017,[0,.053,0],r.refinement.bevel);cap.rotation.x=Math.PI/2;
    for(const s of [-1,1])rod(root,m.edge,[s*w*.60,.061,toe*.43],[s*w*.19,.063,toe*.84],.0025);
    for(let i=0;i<3;i++){
      const z=toe*(.34+i*.16),width=w*(.75-i*.13);
      curved(root,m.metal,[[-width,.047,z],[0,.069+i*.002,z+.011],[width,.047,z]],.006);
    }
  }
  const outline=r.shape==='banner'?[[-w,.02],[-w,h*.85],[0,h*1.13],[w,h*.85],[w,.02],[0,-.008]]:
    r.shape==='vane'?[[-w*.8,.01],[-w*1.1,h*.6],[0,h*1.06],[w*.6,h*.82],[w*.85,.07],[0,.0]]:
    [[-w*.8,.02],[-w,h*.82],[0,h],[w,h*.82],[w*.8,.02],[0,0]];
  if(!['bell','spectral','lantern'].includes(r.shape)){
    plate(root,m.metal,outline,.015,[0,0,.04],r.refinement.bevel);
    for(const s of [-1,1])curved(root,m.edge,[[s*w*.62,.037,.063],[s*w*.8,h*.60,.059],[0,h*.98,.06]],.003);
  }
  if(['spectral','skeletal','lantern'].includes(r.shape)){
    for(let i=0;i<4;i++){
      const y=.035+i*h*.22;curved(root,r.shape==='lantern'?m.trim:m.bone,[[-w*.88,y,.04],[0,y-.017,.077],[w*.88,y,.04]],.008);
    }
    if(r.shape==='lantern')for(const s of [-1,1]){
      rod(root,m.trim,[s*w*.64,.02,.068],[s*w*.72,h*.85,.054],.007);
      plate(root,m.leather,[[s*.018,0],[s*.044,.009],[s*.052,-.18],[s*.035,-.15],[s*.026,-.21]],.004,[s*w*.82,h*.88,-.045],0);
    }
    if(r.shape==='skeletal')for(let i=-2;i<=2;i++)rod(root,m.bone,[i*.025,.026,.072],[i*.026,.022,toe*.85],.007);
  }else if(r.shape==='wing'||r.shape==='vane')for(const s of [-1,1]){
    const fin=relief(root,m,r.shape==='wing'?'wings':'leaves',[s*w,.083,-.024],.67);fin.rotation.y=s*Math.PI/2;
  }else if(r.shape==='mask')relief(root,m,'skull',[0,h*.65,.069],.8);
  else if(r.shape==='bell')for(const s of [-1,1]){rod(root,m.trim,[s*w,.24,.014],[s*w,.19,.045],.003);bell(root,m,[s*w,.178,.045],.023,.04);}
  else if(r.shape==='banner')relief(root,m,'pennant',[0,h*.82,.067],.85);
  if(['spectral','mask','lantern'].includes(r.shape))for(const s of [-1,1])relief(root,m,'cloth',[s*w*.7,h*.85,-.04],.7);
  for(const y of [.05,h*.86])band(root,m.leather,y,w*1.01,.022,.92);
  if(r.shape==='spectral')for(const s of [-1,1])curved(root,m.bone,[[s*w*.67,.023,-.055],[s*w*.94,.06,-.083],[s*w*.72,.13,-.074]],.006);
  if(r.shape==='vane')for(const s of [-1,1])curved(root,m.trim,[[s*w*.73,.014,-.061],[s*w*1.14,.039,-.086],[s*w*1.05,.087,-.115],[s*w*.75,.112,-.093]],.006);
}
export function createUniqueWearable(item,classId,side='L'){
  const r=recipe(item),root=group(item.name),m=materials(item,r);
  root.userData.itemKey=item.key;root.userData.modelId=r.id;
  root.userData.attachment=r.attachment;
  if(r.category==='shield')shield(root,m,r);
  else if(r.category==='helm')helmet(root,m,r);
  else if(r.category==='gloves')gloves(root,m,r);
  else if(r.category==='boots')boots(root,m,r);
  else throw Error('Unsupported unique wearable: '+r.category);
  if(side==='R'&&['gloves','boots'].includes(r.category))root.scale.x=-1;
  return finish([root],m);
}

export function uniqueTorsoGeometry(item){
  const r=recipe(item),w=r.width;
  const profile={ragged:[[.92,.77,.125],[1.05,.68,.13],[1.19,.75,.14],[1.33,1,.153],[1.43,.97,.13],[1.47,.4,.083]],
    shield:[[.96,.77,.137],[1.07,.7,.136],[1.2,.77,.14],[1.33,1,.156],[1.43,.95,.138],[1.47,.43,.087]],
    scales:[[.935,.8,.14],[1.055,.71,.145],[1.2,.8,.146],[1.33,1,.165],[1.43,.96,.139],[1.48,.42,.088]],
    wall:[[.95,.81,.145],[1.05,.78,.15],[1.2,.81,.154],[1.34,1,.162],[1.43,.99,.14],[1.49,.44,.091]],
    cracked:[[.945,.8,.14],[1.07,.72,.143],[1.2,.81,.145],[1.34,1,.159],[1.43,.95,.135],[1.49,.41,.087]],
    lattice:[[.96,.76,.135],[1.06,.70,.142],[1.2,.8,.149],[1.34,1,.163],[1.44,.94,.138],[1.48,.41,.087]],
    forge:[[.925,.83,.143],[1.055,.75,.15],[1.2,.82,.15],[1.33,1,.162],[1.44,.98,.14],[1.49,.45,.089]],
    tower:[[.93,.82,.145],[1.06,.74,.15],[1.2,.81,.152],[1.34,1,.167],[1.44,.97,.144],[1.49,.44,.094]]}[r.shape];
  const p=[],uv=[],indices=[],segments=20;
  for(let row=0;row<profile.length;row++)for(let i=0;i<=segments;i++){
    const a=i/segments*TAU,[y,rx,rz]=profile[row];
    const rag=row===0&&r.shape==='ragged'?-.033*(i%3):0;
    const waist=row<3?1+(r.refinement.taper-1)*(1-row*.22):1;
    p.push(Math.sin(a)*rx*w*waist,y+rag,Math.cos(a)*rz);uv.push(i/segments,(y-.85)*2);
  }
  for(let row=0;row<profile.length-1;row++)for(let i=0;i<segments;i++){const a=row*(segments+1)+i,b=a+segments+1;indices.push(a,a+1,b,b,a+1,b+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return shadeUniqueGeometry(g,r.refinement);
}
export function uniqueTorsoMaterial(item){const r=recipe(item);return uniqueSurface(r.shape==='ragged'?item.material.cloth:r.shape==='shield'?item.material.leather:item.material.metal,r.shape==='ragged'?'cloth':r.shape==='shield'?'leather':r.shape==='wall'?'mail':'metal',r.refinement);}
export function createUniqueArmorDetails(item,classId){
  const r=recipe(item),m=materials(item,r),parts={};
  for(const joint of ['Chest','Spine','Hips','UpperArmL','UpperArmR']){parts[joint]=group(item.name+' / '+joint);parts[joint].userData.modelId=r.id;}
  const front=parts.Chest,back=parts.Spine,hips=parts.Hips;
  if(r.shape==='ragged'){
    for(let i=-2;i<=2;i++){
      const strip=plate(front,m.cloth,[[i*.056-.023,.063],[i*.056+.022,.055],[i*.044+.022,-.18],[i*.044-.018,-.23-(i%2)*.024]],.009,[0,0,.147],0);
      strip.rotation.y=i*.065;rod(front,m.glow,[i*.055,.052,.16],[i*.043,-.17,.18],.002);
    }
    for(let i=-2;i<=2;i++)relief(hips,m,'ribbons',[i*.053,-.025,.143],.76);
    // Scorched quilt panels have physical puffed centers and dark seams.
    for(let row=0;row<3;row++)for(let col=-2;col<=2;col++){
      const x=col*.051,y=.045-row*.063,z=.154-Math.abs(x)*.12;
      const tile=box(front,m.cloth,[x,y,z],[.045,.054,.009]);tile.rotation.y=col*.055;
      rivet(front,m.dark,x,y+.024,z+.008,.003);
    }
  }else if(r.shape==='scales'||r.shape==='forge'){
    const n=r.shape==='forge'?3:4;
    for(let row=0;row<3;row++)for(let col=0;col<n;col++){
      const x=(col-(n-1)/2)*(.34/n)+(row%2?.006:0),y=.047-row*.066,z=.173-Math.abs(x)*.24;
      const tile=plate(front,m.metal,[[-.042,.022],[.042,.022],[.038,-.017],[0,-.061],[-.038,-.017]],.013,[x,y,z],r.refinement.bevel);
      tile.rotation.y=x*1.7;rod(front,m.edge,[x-.025,y+.018,z+.018],[x+.025,y+.018,z+.018],.002);
    }
    relief(front,m,r.shape==='scales'?'eye':'scales',[0,.055,.187],.60);
  }else if(r.shape==='wall'||r.shape==='tower'){
    plate(front,m.metal,[[-.18,.062],[.18,.062],[.19,-.087],[.13,-.19],[-.13,-.19],[-.19,-.087]],.02,[0,0,.143]);
    for(let i=0;i<3;i++)rod(front,m.trim,[-.16,.035-i*.073,.175],[.16,.035-i*.073,.175],r.shape==='wall'?.012:.008);
    if(r.shape==='tower'){
      plate(front,m.trim,[[-.039,-.18],[-.039,.074],[-.016,.074],[0,.117],[.016,.074],[.039,.074],[.039,-.18]],.017,[0,0,.174]);
      plate(hips,m.cloth,[[-.10,-.035],[-.085,-.26],[0,-.34],[.085,-.26],[.10,-.035]],.005,[0,0,.153],0);
      for(const s of [-1,1])box(front,m.trim,[s*.145,-.057,.168],[.014,.206,.016]);
    }
  }else if(r.shape==='cracked'){
    for(const s of [-1,1])for(let i=0;i<3;i++){
      const y=.055-i*.076;plate(front,m.metal,[[s*.018,y],[s*.17,y+.018],[s*.16,y-.05],[s*.038,y-.06]],.016,[0,0,.154]);
      curved(front,m.glow,[[s*.025,y,.174],[s*.07,y-.03,.181],[s*.12,y-.046,.174]],.003);
    }
  }else if(r.shape==='lattice'){
    for(let i=-2;i<=2;i++)for(const s of [-1,1])rod(front,m.trim,[i*.036-.048,.065,.159],[i*.029+s*.08,-.17,.171],.005);
    relief(front,m,'coal',[0,-.019,.194],.8);
    for(const s of [-1,1])curved(front,m.edge,[[s*.04,.07,.174],[s*.17,.016,.152],[s*.145,-.13,.164],[s*.062,-.19,.169]],.004);
  }else if(r.shape==='shield'){
    plate(front,m.leather,[[-.17,.05],[.15,.04],[.19,-.05],[.045,-.19],[-.12,-.14]],.018,[0,0,.143]);
    for(let i=0;i<10;i++){const a=i*TAU/10;rivet(front,m.trim,Math.sin(a)*.106,-.034+Math.cos(a)*.091,.171,.005);}
  }
  // Neck frames and rear construction are specific to the breast piece.
  if(r.shape!=='ragged'){
    const collar=curved(front,r.shape==='shield'?m.leather:m.trim,[[-.112,.062,.123],[-.079,.10,.154],[0,.085,.174],[.079,.10,.154],[.112,.062,.123]],r.shape==='forge'?.010:.006);
    if(r.shape==='cracked')for(const s of [-1,1])tip(front,m.metal,[s*.074,.091,.145],[s*.102,.15,.123],.013);
    collar.name='Authored collar';
    if(r.shape!=='shield'){
      const high=r.shape==='tower'?.163:r.shape==='cracked'?.148:.126;
      shell(front,m.metal,[[.067,.095,.079],[high,.090,.075],[high+.009,.089,.074]],undefined,16);
      const rim=ring(front,m.edge,[0,high+.008,0],.09,.003);rim.rotation.x=Math.PI/2;rim.scale.y=.84;
    }
  }
  if(r.shape!=='ragged'){
    const rearOutline=r.shape==='shield'?[[-.13,.102],[.135,.090],[.14,-.065],[.012,-.145],[-.128,-.096]]:
      r.shape==='tower'?[[-.13,.091],[-.058,.112],[0,.163],[.058,.112],[.13,.091],[.142,-.067],[0,-.163],[-.142,-.067]]:
      [[-.132,.104],[0,.14],[.132,.104],[.15,-.065],[.062,-.14],[-.062,-.14],[-.15,-.065]];
    const rear=domedPlate(back,r.shape==='shield'?m.leather:m.metal,rearOutline,.012,.017,[0,.179,-.145]);rear.rotation.y=Math.PI;
    for(const s of [-1,1]){
      curved(back,r.shape==='shield'?m.trim:m.edge,[[s*.125,.276,-.160],[s*.103,.184,-.185],[s*.075,.106,-.174]],.004);
      if(r.shape==='scales'||r.shape==='forge')for(let i=0;i<3;i++){
        const p=plate(back,m.metal,[[s*.018,.026],[s*.11,.038],[s*.128,-.027],[s*.054,-.052]],.010,[0,.238-i*.051,-.179],r.refinement.bevel);p.rotation.y=Math.PI;
      }
    }
    if(r.shape==='cracked')curved(back,m.glow,[[0,.281,-.181],[.025,.231,-.188],[-.007,.196,-.188],[.017,.128,-.180]],.002);
  }
  for(let i=0;i<3;i++){
    const y=.044-i*.072;
    let outline=[[-.125,.024],[.125,.024],[.138,-.034],[-.138,-.034]],mat=m.metal;
    if(r.shape==='ragged'){outline=[[-.118,.029],[.104,.02],[.112,-.035],[.04,-.059],[-.09,-.043]];mat=m.cloth;}
    else if(r.shape==='shield'){outline=[[-.13,.025],[.11,.021],[.128,-.031],[-.12,-.046]];mat=m.leather;}
    else if(r.shape==='scales'||r.shape==='forge')outline=[[-.13,.031],[.13,.031],[.11,-.031],[0,-.072],[-.11,-.031]];
    else if(r.shape==='cracked')outline=[[-.13,.03],[-.03,.02],[0,-.002],[.039,.027],[.13,.016],[.122,-.043],[-.022,-.025],[-.119,-.049]];
    else if(r.shape==='lattice')outline=[[-.09,.029],[.09,.029],[.13,-.017],[.084,-.053],[-.084,-.053],[-.13,-.017]];
    else if(r.shape==='tower')outline=[[-.115,.036],[-.035,.036],[-.035,.058],[.035,.058],[.035,.036],[.115,.036],[.123,-.039],[-.123,-.039]];
    const panel=plate(back,mat,outline,.014,[0,y,-.15-i*.001],r.refinement.bevel);panel.rotation.y=Math.PI;
    if(r.shape==='wall'||r.shape==='tower')for(const s of [-1,1])rivet(back,m.trim,s*.10,y-.017,-.178,.005);
  }
  if(r.shape==='lattice')for(const s of [-1,1])curved(back,m.trim,[[s*.095,.056,-.175],[s*.057,-.04,-.178],[0,-.128,-.176]],.004);
  if(r.shape!=='ragged'&&r.shape!=='tower')for(const s of [-1,1]){
    const mat=r.shape==='shield'?m.leather:m.metal;
    plate(hips,mat,[[s*.08,-.015],[s*.17,-.015],[s*.145,-.123],[s*.102,-.144]],.012,[0,0,.106],r.refinement.bevel);
  }
  for(const [side,s] of [['L',1],['R',-1]]){
    const shoulder=parts['UpperArm'+side];
    if(r.shape==='ragged'||r.shape==='shield'){
      shell(shoulder,r.shape==='ragged'?m.cloth:m.leather,[[-.116,.067,.060],[-.044,.087,.079],[.038,.084,.077],[.074,.049,.045],[.083,.004,.004]],[-s*.01,0,0],12);
      curved(shoulder,r.shape==='ragged'?m.cloth:m.leather,[[s*-.045,.04,.085],[s*.015,.059,.08],[s*.07,.047,.012],[s*.10,.017,-.066]],.012);
      if(r.shape==='ragged')for(let i=0;i<3;i++){
        curved(shoulder,m.trim,[[-.063,-.018-i*.027,.061],[0,-.023-i*.027,.085],[.062,-.014-i*.027,.064]],.002);
      }
      if(r.shape==='shield'&&side==='L'){
        plate(shoulder,m.leather,[[-.073,.027],[0,.061],[.086,.023],[.066,-.041],[-.055,-.03]],.104,[0,-.015,-.047],.004);
        rivet(shoulder,m.trim,s*.035,.013,.065,.005);
      }
    }else{
      const width=(r.shape==='wall'?.118:r.shape==='tower'?.119:.099)*r.refinement.taper;
      shell(shoulder,m.metal,[[-.087,width*.75,.076],[-.038,width*1.05,.092],[.032,width,.086],[.076,width*.61,.054],[.092,.004,.004]],[-s*.013,0,0],14);
      for(const z of [-.079,.079])curved(shoulder,m.edge,[[-width*.72,-.049,z*.83],[-width*.78,.029,z*.85],[0,.072,z*.62],[width*.77,.023,z*.84],[width*.76,-.047,z*.83]],.003);
      if(r.shape==='wall'){
        for(let i=0;i<3;i++){
          const outline=[[-width,.022],[0,.051],[width,.022],[width*.92,-.021],[0,-.040],[-width*.92,-.021]];
          domedPlate(shoulder,m.metal,outline,.009,.014,[s*.006,-.039-i*.034,.067]);
        }
        for(const x of [-.064,.064])rivet(shoulder,m.trim,x,.012,.084,.005);
      }else if(r.shape==='tower'){
        domedPlate(shoulder,m.metal,[[-width,.01],[-width,.058],[-.068,.088],[.07,.088],[width,.045],[width,-.016]],.013,.019,[-s*.013,-.049,.077]);
        for(const x of [-.073,.073])box(shoulder,m.trim,[x,.027,.003],[.011,.046,.141]);
        relief(shoulder,m,'buttress',[s*.038,.003,.085],.37);
      }else{
        const outline=r.shape==='lattice'?[[-width,-.009],[-width*.90,.046],[0,.086],[width*.90,.036],[width,-.032],[0,-.068]]:
          r.shape==='cracked'?[[-width,.005],[-width*.89,.052],[-.034,.068],[0,.053],[.035,.084],[width,.025],[width*.91,-.025]]:
          [[-width,.009],[-width,.042],[0,.083],[width,.037],[width,-.013]];
        domedPlate(shoulder,m.metal,outline,.013,.022,[-s*.012,-.048,.076]);
        for(let i=0;i<2;i++){
          const layer=plate(shoulder,m.metal,[[-width*.87,.025],[width*.85,.025],[width*.65,-.03],[0,-.063],[-width*.68,-.029]],.012,[s*.009,-.051-i*.03,.078-i*.002],r.refinement.bevel);layer.rotation.y=s*.11;
        }
        if(r.shape==='lattice')curved(shoulder,m.trim,[[-.077,.01,.088],[0,.05,.088],[.079,.002,.088]],.003);
        if(r.shape==='cracked')tip(shoulder,m.metal,[0,.056,.01],[s*.072,.131,0],.018);
      }
    }
  }
  finish(Object.values(parts),m);return parts;
}
