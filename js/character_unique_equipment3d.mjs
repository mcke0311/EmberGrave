import * as THREE from './vendor/three/three.module.min.js';
import {UNIQUE_MODELS3D} from './character_unique_catalog3d.mjs?v=forged-1';
import {FORGINGS} from './character_unique_forgings3d.mjs';
import {paintedUniqueMaterial,paintChestGeometry,paintUniqueRoots} from './character_unique_paint3d.mjs';
import {disposeMaterials} from './character_materials3d.mjs?v=painted-1';
import {uniqueMaterials,uniqueSurface,shadeUnique,shadeUniqueGeometry,packUniqueSurfaces} from './character_unique_surfaces3d.mjs?v=forged-1';
import {box,wrap,shell,domedPlate,forging,bowLimb,shieldFace,visor} from './character_unique_mesh3d.mjs?v=forged-1';
import {mesh,orb,rod,curved,plate,edge,rivet,band,combineStatic} from './character_mesh3d.mjs?v=body-armor-1';

const TAU=Math.PI*2;
const group=name=>{const g=new THREE.Group();g.name=name;return g;};
function recipe(item){const r=UNIQUE_MODELS3D[item.modelId];if(!r)throw Error('Missing unique 3D model: '+item.modelId);return r;}
function materials(item,r){
  const m=uniqueMaterials(item,r);m.profile=r.refinement;m.recipe=r;
  for(const [role,amount] of Object.entries({trim:.55,dark:.24,edge:.49,bone:.78,glow:.20}))
    m[role].userData.paintWeight=amount;
  return m;
}
function finish(roots,m,skip=new Set()){
  for(const root of roots)shadeUnique(root,m.profile);packUniqueSurfaces(roots);
  const used=new Set();for(const root of roots){
    for(const part of skip)if(part?.isGroup)combineStatic(part);
    combineStatic(root,skip);root.traverse(o=>{for(const mat of [].concat(o.material||[]))used.add(mat);});
  }
  disposeMaterials(Object.values(m).filter(mat=>mat?.isMaterial&&!used.has(mat)));
  paintUniqueRoots(roots,m.recipe);
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

function blade(root,m,r){
  const profile=FORGINGS[r.id],base=.10;
  forging(root,m.metal,profile,r.length,base,Math.min(.021,r.width*.32));
  // A short collar frames the joint between the sharpened blade and its guard.
  shell(root,m.trim,[[base-.037,r.width*.66,.021],[base-.015,r.width*.76,.018],[base+.012,r.width*.50,.013]],undefined,12);
  if(r.shape==='segments')for(const s of [-1,1])
    rod(root,m.dark,[s*r.width*.24,base+r.length*.28,0],[s*r.width*.25,base+r.length*.57,0],.0035);
  if(r.shape==='dirk'){
    curved(root,m.leather,[[0,-.19,0],[.04,-.20,-.008],[.068,-.151,-.009]],.003);
    const plume=plate(root,m.dark,[[0,-.004],[.017,.006],[.038,.052],[.045,.096],[.028,.082],[.029,.133],[.014,.115],[.003,.149],[-.003,.065]],.004,[.061,-.154,-.009],.001);
    plume.rotation.z=-.13;
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
function axe(root,m,r){
  const y=r.length,profile=FORGINGS[r.id],top=y+.16;
  const height=(top+(r.twoHand?.37:.23))*(1-profile.cut);
  forging(root,m.metal,profile,height,top-height,.026,.34);
  rod(root,r.shape==='femur'?m.bone:m.wood,[0,.025,0],[0,y+.055,0],.022);
  // The socket wraps both faces, with the thicker metal concentrated at the haft.
  shell(root,r.shape==='femur'?m.bone:m.trim,[[y-.155,.029,.029],[y-.116,.043,.037],[y-.065,.034,.032],[y+.058,.039,.034],[y+.073,.031,.030]],undefined,12);
  for(const h of [y-.135,y+.047])band(root,m.edge,h,.039,.012,.88);
  for(const s of [-1,1]){
    const cheek=plate(root,m.metal,[[-.026,.048],[.033,.054],[.052,.013],[.025,-.064],[0,-.095],[-.021,-.054]],.007,[0,y,s*.033],.002);
    cheek.rotation.y=s<0?Math.PI:0;
    rivet(root,m.trim,.003,y+.016,s*.043,.008);
  }
  relief(root,m,r.motif,[.006,y-.001,.040],.54);
  if(r.shape==='hook')for(const s of [-1,1]){
    const rag=plate(root,m.cloth,[[0,0],[.016,.006],[.040,-.077],[.070,-.128],[.047,-.114],[.059,-.166],[.019,-.110]],.004,[s*.029,y-.104,.008],0);
    rag.rotation.z=-.17+s*.15;
  }
  wrap(root,m.leather,.11,y-.30,.025);
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
    forging(root,m.metal,FORGINGS[r.id],.34,y,.015);
    shell(root,m.trim,[[y-.036,.025,.026],[y+.013,.038,.030],[y+.041,.023,.020]],undefined,12);
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
    else if(r.shape==='quill'){
      curved(root,m.trim,[[0,y-.12,0],[.003,y+.023,.005],[.022,y+.12,.003],[.041,y+.196,0]],.005);
      for(const s of [-1,1])for(let i=0;i<6;i++){
        const t=i/6,b=y-.065+i*.034,x=.001+.028*t*t,w=(.018+.029*Math.sin((t+.12)*Math.PI))*s;
        const vane=domedPlate(root,m.bone,[[0,0],[w*.8,.018],[w,.055],[w*.73,.048],[w*.83,.075],[.003,.026]],.003,.004,[x,b,0]);
        vane.rotation.y=s*.14;
      }
      band(root,m.trim,y-.07,.019,.018);
    }
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
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    bowLimb(limb,r.shape==='crystal'||r.shape==='vertebra'?m.metal:m.wood,points,r.width);
    curved(limb,m.trim,points.map(([x,y,z],i)=>[x+r.width*(.66-i*.15),y,z+.004]),.003);
    if(r.shape==='fork')curved(limb,m.metal,points.map(([x,y,z],i)=>[x+(i===1||i===2?.046:0),y,z]),.01);
    if(r.shape==='zigzag'||r.shape==='feather')for(let i=0;i<3;i++){
      const p=curve.getPoint(.27+i*.23),ornament=relief(limb,m,r.shape==='feather'?'feathers':'lightning',p.toArray(),.49-i*.05);
      ornament.rotation.y=Math.PI/2;ornament.scale.y*=s;
    }
    if(r.shape==='vertebra')for(let i=0;i<7;i++){
      const p=curve.getPoint(.14+i*.117),joint=band(limb,m.bone,p.y,.030-i*.0018,.018);
      joint.position.z=p.z;
      const barb=domedPlate(limb,m.bone,[[0,-.019],[.026,-.004],[.085,.052],[.049,.042],[.027,.053],[.014,.021],[0,.014]],.005,.004,p.toArray());
      barb.rotation.y=-Math.PI/2;barb.scale.y=s;barb.scale.x=1-i*.053;
    }
    if(r.shape==='scroll')for(let i=0;i<3;i++){
      const p=curve.getPoint(.19+i*.23),size=.044-i*.005;
      const curl=ring(limb,m.trim,[p.x,p.y+s*size*.25,p.z+size*.78],size,.005,Math.PI*1.73);curl.rotation.y=Math.PI/2;curl.rotation.z=.35*s;
      curved(limb,m.edge,[[0,p.y,p.z],[0,p.y+s*.015,p.z+size*.50],[0,p.y+s*.027,p.z+size*.98]],.005);
      const drop=curve.getPoint(.27+i*.20);
      rod(limb,m.trim,[0,drop.y,drop.z],[0,drop.y-.024,drop.z-.018],.002);
      orb(limb,m.glow,[0,drop.y-.032,drop.z-.020],[.008,.012,.008]);
    }
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
  const width={heart:.043,repeater:.059,spider:.032,heavy:.063,pulse:.048,quarrel:.034,clock:.043}[r.shape];
  const stock=shell(root,m.wood,[
    [-l,width*.66,.026,.012],[-l*.96,width*1.12,.036,.010],[-l*.82,width*1.05,.035,.007],
    [-l*.59,width*.70,.028,0],[-l*.33,width*.68,.027],[-l*.12,width*.85,.032],
    [l*.14,width,.035],[l*.38,width*1.04,.035],[l*.58,width*.87,.031],
    [l*.79,width*.69,.026],[l*.94,width*.50,.021],[l,width*.25,.014]
  ],[0,-.005,.14],12);
  stock.rotation.x=Math.PI/2;
  box(root,m.leather,[0,-.10,-.065],[.052,.16,.065]);box(root,m.metal,[0,.027,.2],[.068,.025,.23]);
  const sweep=r.shape==='spider'?.42:r.shape==='heart'?.39:r.shape==='heavy'?.32:.36;
  for(const s of [-1,1]){
    const prod=bowLimb(root,m.metal,[[0,.014,.36],[0,w*.37,sweep+.018],[0,w*.70,sweep],[0,w*.90,.264],[0,w,.19]],r.shape==='heavy'?.043:.030);
    prod.rotation.z=-s*Math.PI/2;prod.scale.x=.62;
    gem(root,m.trim,[s*w,0,.19],.012,[.75,.8,1.3]);
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
  else if(r.shape==='clock'||r.shape==='heart'){
    const mount=group('Heart brace');mount.position.set(0,.060,.30);mount.rotation.x=-Math.PI/2;root.add(mount);
    const heart=[[0,-.104],[-.080,-.013],[-.088,.025],[-.068,.061],[-.034,.072],[0,.044],[.034,.072],[.068,.061],[.088,.025],[.080,-.013]];
    const enamel=uniqueSurface(r.shape==='clock'?'#832537':'#a3323c','metal',r.refinement,{metalness:.28,roughness:.36});
    enamel.userData.paintWeight=.10;m.enamel=enamel;
    domedPlate(mount,m.trim,heart,.007,.010);
    domedPlate(mount,enamel,heart.map(([x,y])=>[x*.83,y*.81]),.010,.014,[0,0,.010]);
    if(r.shape==='clock'){
      ring(mount,m.trim,[0,.007,.031],.044,.004);
      for(let i=0;i<8;i++){const a=i*TAU/8;rod(mount,m.trim,[Math.sin(a)*.034,.007+Math.cos(a)*.034,.033],[Math.sin(a)*.040,.007+Math.cos(a)*.040,.033],.002);}
      rod(mount,m.trim,[0,.007,.034],[.009,.037,.034],.0025);rod(mount,m.trim,[0,.007,.034],[-.021,.010,.034],.0025);
    }
  }else if(r.shape==='pulse'){
    const bezel=ring(root,m.trim,[0,.059,.292],.083,.010,Math.PI*1.69);bezel.rotation.x=-Math.PI/2;
    gem(root,m.glow,[0,.070,.286],.050,[.9,.55,1.24]);
  }else {const o=relief(root,m,r.motif,[0,.056,.245],.80);o.rotation.x=-Math.PI/2;}
  curved(root,m.dark,[[-.021,-.106,-.031],[-.046,-.15,-.006],[.046,-.15,-.006],[.021,-.106,-.031]],.005);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-w,0,.19,0,0,.19,w,0,.19],3));
  const string=new THREE.Line(g,new THREE.LineBasicMaterial({color:'#ad9c84'}));root.add(string);
  return {string,arrow:arrow(root,m,true),bowLimbs:[]};
}

// Bend the packed limb vertices, keeping the riser, stock and moving projectile
// independent. The same displacement drives the string at each physical nock.
function rigRangedFlex(root,r){
  const bow=r.category==='bow',stiff=['crystal','heavy','vertebra'].includes(r.shape);
  const reach=bow?r.length-.10:r.width;
  const sweep=bow?(stiff?.054:.076):(stiff?.055:.082);
  const rig={bow,meshes:[],nocks:[]};
  for(const part of bow?root.userData.bowLimbs:[root]){
    const object=part.children.find(child=>child.isMesh);
    const g=object.geometry,p=g.attributes.position,deltas=new Float32Array(p.count*3);
    const side=part.userData.side;
    for(let i=0;i<p.count;i++){
      const distance=bow?Math.abs(p.getY(i)):Math.abs(p.getX(i));
      const t=THREE.MathUtils.clamp(bow?distance/reach:(distance-.082)/(reach-.082),0,1);
      const bend=t*t;
      if(bow)deltas[i*3+1]=-side*.022*bend;
      else deltas[i*3]=-Math.sign(p.getX(i))*.029*bend;
      deltas[i*3+2]=-sweep*bend;
    }
    const target=new THREE.BufferAttribute(deltas,3);target.name='tension';
    g.morphTargetsRelative=true;g.morphAttributes.position=[target];
    g.computeBoundingBox();g.computeBoundingSphere();object.updateMorphTargets();
    rig.meshes.push(object);
    if(bow)rig.nocks.push({part,side,rest:new THREE.Vector3(...part.userData.tip),delta:new THREE.Vector3(0,-side*.022,-sweep)});
  }
  if(!bow)for(const side of [-1,1])rig.nocks.push({side,rest:new THREE.Vector3(side*reach,0,.19),delta:new THREE.Vector3(-side*.029,0,-sweep)});
  root.userData.flexRig=rig;
}

const drawnNock=new THREE.Vector3();
export function poseUniqueFlex(weapon,draw,releasePhase){
  const rig=weapon.userData.flexRig;
  const sinceRelease=releasePhase-.405;
  const spring=sinceRelease>0&&sinceRelease<.24?-.11*Math.exp(-sinceRelease*18)*Math.sin(sinceRelease*86):0;
  const tension=draw+spring;
  for(const mesh of rig.meshes)mesh.morphTargetInfluences[0]=tension;
  const string=weapon.userData.string.geometry.attributes.position;
  for(const nock of rig.nocks){
    drawnNock.copy(nock.rest).addScaledVector(nock.delta,tension);
    if(rig.bow){
      nock.part.rotation.x=-nock.side*.040*tension;
      drawnNock.applyEuler(nock.part.rotation).add(nock.part.position);
    }
    string.setXYZ(nock.side<0?0:2,drawnNock.x,drawnNock.y,drawnNock.z);
  }
  string.needsUpdate=true;
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
  finish([root],m,new Set([root.userData.string,root.userData.arrow,...root.userData.bowLimbs]));
  if(moving)rigRangedFlex(root,r);
  return root;
}

function shield(root,m,r){
  const h=r.length,w=r.width*r.refinement.taper;
  if(r.shape==='concentric'){
    const circle=Array.from({length:32},(_,i)=>[Math.cos(i*TAU/32)*w,Math.sin(i*TAU/32)*w]);
    plate(root,m.leather,circle,.024,[0,0,-.016],.002);
    shieldFace(root,m.metal,circle,.014,.043);
    for(const radius of [w,w*.75,w*.45]){
      const z=.018+.043*(1-(radius/w)**2);
      ring(root,m.metal,[0,0,z],radius,.009);ring(root,m.trim,[0,0,z+.006],radius,.003);
    }
    for(let i=0;i<8;i++){
      const a=i*TAU/8;
      rivet(root,m.trim,Math.sin(a)*w*.88,Math.cos(a)*w*.88,.034,.008);
      const ray=domedPlate(root,m.trim,[[-.013,.039],[.013,.039],[.008,w*.56],[0,w*.72],[-.008,w*.56]],.005,.005,[0,0,.052]);
      ray.rotation.z=-a;
    }
    orb(root,m.trim,[0,0,.063],[.076,.076,.036]);
  }else{
    const profiles={kite:[[-.94,.45],[0,.53],[.94,.45],[.85,-.06],[0,-.54],[-.85,-.06]],lantern:[[-.65,.42],[0,.56],[.65,.42],[.81,-.04],[0,-.54],[-.81,-.04]],wall:[[-.92,.50],[.92,.50],[1,-.38],[.8,-.50],[-.8,-.50],[-1,-.38]],oval:[[-.65,.46],[0,.53],[.65,.46],[1,.15],[.97,-.25],[.55,-.49],[0,-.53],[-.55,-.49],[-.97,-.25],[-1,.15]],rib:[[-.76,.40],[0,.52],[.76,.40],[.78,-.1],[0,-.55],[-.78,-.1]],hood:[[-.92,.25],[-.70,.48],[0,.56],[.70,.48],[.92,.25],[.72,-.28],[0,-.51],[-.72,-.28]]};
    const outline=profiles[r.shape].map(([x,y])=>[x*w,y*h]);
    plate(root,m.leather,outline,.035,[0,0,-.021],.004);
    shieldFace(root,m.metal,outline,.031,.034);
    edge(root,m.trim,outline.map(([x,y])=>[x,y,.036]),.007);
    edge(root,m.edge,outline.map(([x,y])=>[x*.96,y*.96,.041]),.003);
    if(r.shape==='wall')for(let i=-2;i<=2;i++)box(root,m.trim,[i*.076,0,.056],[.025,h*.88,.017]);
    if(r.shape==='rib')for(let i=0;i<5;i++)for(const s of [-1,1])curved(root,m.bone,[[s*.014,.22-i*.075,.06],[s*w*.68,.18-i*.06,.06],[s*w*.78,.1-i*.069,.048]],.015);
    const ornament=relief(root,m,r.motif==='oath'?'cross':r.motif==='angel'?'wings':r.motif==='hearth'?'heart':r.motif,[0,0,.061],1.8);
    if(r.shape==='hood')ornament.position.y=-.015;
    if(r.shape==='lantern'){
      gem(root,m.glow,[0,.014,.095],.060,[.68,1.7,.64]);
      for(const s of [-1,1])curved(root,m.trim,[[0,-.11,.096],[s*.049,-.043,.105],[s*.052,.065,.104],[0,.147,.092]],.006);
    }
  }
  // A physical rear grip and boss remain visible from the back.
  curved(root,m.leather,[[-.06,-.025,-.026],[-.06,.065,-.075],[.06,.065,-.075],[.06,-.025,-.026]],.013);
  curved(root,m.leather,[[-.072,-.15,-.018],[-.074,-.095,-.065],[.062,-.072,-.071],[.071,-.121,-.019]],.009);
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
  else{
    shell(root,r.shape==='coral'?m.trim:m.bone,[[.041,w*.94,w*.91,-.008],[.049,w,w*.98,-.008],[.083,w*1.02,w,-.008],[.098,w*.95,w*.93,-.008]],undefined,24);
    for(const s of [-1,1]){
      const brow=domedPlate(root,r.shape==='coral'?m.metal:m.bone,[[0,-.006],[.021,.028],[.077,.057],[.100,.041],[.091,.013],[.042,.002],[.022,-.032]],.005,.009,[s*.010,.085,w*.91]);
      brow.scale.x=s;brow.rotation.y=s*.49;
      const drop=domedPlate(root,m.trim,[[-.016,.020],[0,.034],[.019,.016],[.014,-.035],[0,-.089],[-.011,-.042]],.005,.008,[s*w*.92,.052,.045]);
      drop.rotation.y=s*1.10;
    }
  }
  if(!open&&r.shape!=='rib')visor(root,m.metal,w,r.shape);
  const rim=ring(root,m.trim,[0,.053,-.008],w,.006);rim.rotation.x=Math.PI/2;
  if(r.shape==='hollow'||r.shape==='coral'||r.shape==='flame'){
    for(let i=0;i<7;i++){
      const a=i*TAU/7,x=Math.sin(a)*r.width,z=Math.cos(a)*r.width-.008;
      if(r.shape==='coral'){
        const b=[x*1.12,.154+(i%3)*.009,z*1.07],elbow=[x*1.24,.188+(i%2)*.021,z*1.16];
        curved(root,m.bone,[[x,.083,z],b,elbow],.008);
        tip(root,m.bone,elbow,[x*1.22+.017*Math.cos(a),r.length+.031-(i%3)*.018,z*1.24],.009);
        tip(root,m.bone,b,[x*1.41+.011*Math.cos(a),.201+(i%2)*.035,z*1.29],.007);
        orb(root,m.glow,[x,.069,z+.006],[.014,.019,.014]);
      }
      else tip(root,r.shape==='hollow'?m.bone:m.metal,[x,.077,z],[x*1.12,.18+(i%3)*.028,z*1.12],.019);
    }
    if(r.shape==='hollow')relief(root,m,'skull',[0,.105,r.width+.003],.6);
    else gem(root,m.glow,[0,.102,r.width+.009],.031);
  }else if(r.shape==='hood'){
    for(const s of [-1,1])tip(root,m.metal,[s*.12,.077,0],[s*.188,.152,-.036],.023);
    gem(root,m.glow,[0,.103,w+.004],.014);
  }else if(r.shape==='mask'||r.shape==='skull'){
    for(const s of [-1,1]){
      curved(root,m.edge,[[s*w*.76,.065,w*.69],[s*w*.47,.060,w*.92],[s*.020,.066,w*1.04]],.0035);
      if(r.shape==='skull'){
        curved(root,m.metal,[[s*w*.84,.032,w*.63],[s*w*.66,-.008,w*.87],[s*w*.31,-.039,w*.98]],.007);
        for(let i=0;i<3;i++){
          const x=s*(.009+i*.018),y=-.077+i*.003,z=w*(.91-i*.034);
          const tooth=box(root,m.metal,[x,y,z],[.014,.039-i*.003,.012]);tooth.rotation.y=s*i*.16;
        }
      }
    }
    if(r.shape==='mask')curved(root,m.trim,[[-w*.72,.008,w*.75],[-w*.62,-.056,w*.78],[-w*.27,-.098,w*.85]],.003);
    const comb=plate(root,m.metal,[[-.113,.127],[-.082,.183],[-.025,.225],[.010,r.shape==='mask'?.266:.239],[.052,.218],[.098,.175],[.128,.103],[.119,.112],[.076,.164],[.024,.204],[-.041,.198]],.009,[-.004,0,0],.002);
    comb.rotation.y=-Math.PI/2;
  }else if(r.shape==='rib'){
    for(let i=-1;i<=1;i++)curved(root,m.bone,[[i*.057,-.085,.116],[i*.082,.017,.163],[i*.055,.14,.117],[i*.04,.205,-.05]],.014);
    for(let i=0;i<3;i++)for(const s of [-1,1])curved(root,m.bone,[[s*.017,-.06+i*.051,.166],[s*.093,-.03+i*.039,.13],[s*.125,-.026+i*.036,.079]],.013);
    gem(root,m.dark,[0,.145,.137],.026);
  }
  if(r.shape==='rib')for(const s of [-1,1]){
    const guard=domedPlate(root,m.metal,[[-.068,.062],[-.018,.083],[.056,.062],[.067,.017],[.042,-.073],[-.010,-.115],[-.043,-.058]],.012,.014,[s*w*.76,.008,.071]);
    guard.scale.x=s;guard.rotation.y=s*.94;
    curved(root,m.edge,[[s*w*.95,.054,.037],[s*w*.90,.007,.082],[s*w*.67,-.082,.108],[s*w*.53,-.107,.119]],.0035);
    rivet(root,m.trim,s*w*.91,.030,.097,.006);
  }
  if(!open&&r.shape!=='rib')for(const s of [-1,1]){
    const pin=orb(root,m.trim,[s*w*.99,.056,.012],[.006,.008,.008]);
    pin.name='Visor hinge';
  }
  if(!open&&r.shape!=='rib')curved(root,m.edge,[[0,.054,-.147],[0,.147,-.118],[0,.213,-.056],[0,.234,-.012]],.005);
  root.userData.openHelmet=open;
}
function gloves(root,m,r){
  const h=r.length,w=r.width*r.refinement.taper;
  shell(root,m.leather,[[-.056,.027,.021,.010],[-.036,.040,.029,.011],[-.008,.044,.031,.009],[.027,.032,.027,.006]],undefined,12);
  for(let i=0;i<4;i++){
    const x=-.032+i*.021,end=-.090+.011*Math.abs(i-1.2);
    const finger=shell(root,m.leather,[[end,.006,.007,.022],[end+.010,.009,.010,.021],[-.051,.010,.012,.017],[-.031,.012,.013,.014]],undefined,8);
    finger.position.x=x;finger.rotation.z=(i-1.5)*.075;
  }
  curved(root,m.leather,[[.031,.002,.008],[.050,-.016,.018],[.058,-.035,.025],[.050,-.054,.029]],.012);
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
  const soleLength=(toe+.057)*.5,center=toe-soleLength;
  shell(root,m.dark,[[-.030,.002,.003,center],[-.030,w*.94,soleLength*.98,center],[-.024,w,soleLength,center],[-.011,w*.99,soleLength,center]],undefined,20);
  shell(root,m.leather,[[-.013,w*.99,soleLength,center],[.014,w*.97,soleLength*.96,center],[.031,w*.91,soleLength*.86,center-.002],[.058,w*.80,soleLength*.65,center-.019],[.088,w*.72,w*.83,-.012],[.112,w*.73,w*.78,-.019]],undefined,20);
  shell(root,m.leather,[[.066,w*.73,w*.80,-.018],[.105,w*.75,w*.80,-.021],[h*.62,w*.94,w*.86,-.025],[h*.91,w,w*.87,-.024],[h,w*.96,w*.86,-.024]],undefined,14);
  if(r.refinement.solid==='metal'||r.refinement.solid==='bone'){
    for(let i=0;i<3;i++){
      const z=toe*(.30+i*.22),width=w*(.90-i*.15),rise=.068-i*.017;
      const lame=domedPlate(root,m.metal,[[-width,-.012],[-width*.92,.015],[0,.025],[width*.92,.015],[width,-.012],[0,-.020]],.005,.011,[0,rise,z]);
      lame.rotation.x=-Math.PI*.38;
      curved(root,m.edge,[[-width*.95,rise+.001,z+.011],[0,rise+.011,z+.023],[width*.95,rise+.001,z+.011]],.0025);
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
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return paintChestGeometry(shadeUniqueGeometry(g,r.refinement),r);
}
export function uniqueTorsoMaterial(item){const r=recipe(item);return paintedUniqueMaterial(uniqueSurface(r.shape==='ragged'?item.material.cloth:r.shape==='shield'?item.material.leather:item.material.metal,r.shape==='ragged'?'cloth':r.shape==='shield'?'leather':r.shape==='wall'?'mail':'metal',r.refinement));}
export function createUniqueArmorDetails(item,classId){
  const r=recipe(item),m=materials(item,r),parts={};
  for(const joint of ['Chest','Spine','Hips','UpperArmL','UpperArmR']){parts[joint]=group(item.name+' / '+joint);parts[joint].userData.modelId=r.id;parts[joint].userData.paintJoint=joint;}
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
