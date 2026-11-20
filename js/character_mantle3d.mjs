import * as THREE from './vendor/three/three.module.min.js';
import {surface} from './character_painted3d.mjs?v=mantles-1';
import {hemRegion,heroColumn,heroPanelV} from './character_finish3d.mjs?v=mantles-1';

const pi=Math.PI;
const mix=THREE.MathUtils.lerp;
const point=(u,center,width)=>Math.max(0,1-Math.abs(u-center)/width);

// Angles run from the left shoulder around the back to the right shoulder.
// Each cut has its own pattern pieces, attachment points and hemline.
const patterns={
  vanguard: {
    width:.258, flare:.066, folds:4, flex:.72,
    pieces:[[.19,1.53]], length:u=>.93-.43*u+.055*point(u,.31,.22),
  },
  emberwitch: {
    width:.218, flare:.105, folds:3, flex:1,
    pieces:[[.27,.99],[1.01,1.73]], length:u=>.43+.57*point(u,.58,.58),
  },
  gravebinder: {
    width:.242, flare:.054, folds:6, flex:.82,
    pieces:[[.30,1.70]], length:u=>.70+.30*Math.max(point(u,.5,.19),.74*point(u,.16,.16),.74*point(u,.84,.16)),
  },
  wildkeeper: {
    width:.278, flare:.044, folds:4, flex:.50,
    pieces:[[.24,1.76]], length:u=>.30+.34*point(u,.54,.55)+.09*point((u*7)%1,.5,.5),
  },
  veilranger: {
    width:.245, flare:.087, folds:4, flex:.90,
    pieces:[[.16,1.52]], length:u=>.31+.53*point(u,.31,.69)-.065*point(u,.70,.075),
  },
};

export function createMantle(id) {
  const cut=patterns[id];
  const positions=[],uv=[],indices=[],free=[],sections=[];
  function panel(columns,rows,section,flex,sample) {
    const patch=surface(columns,rows,sample);
    const first=free.length;
    positions.push(...patch.attributes.position.array);
    uv.push(...patch.attributes.uv.array);
    for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++)free.push(flex*(1-j/rows)**1.8);
    for(const i of patch.index.array)indices.push(first+i);
    sections.push({first,end:free.length,section});
    patch.dispose();
  }

  for(const [piece,[start,end]] of cut.pieces.entries()){
    panel(36,12,'hem',cut.flex,(u,v)=>{
      const drop=1-v;
      const along=piece===1?1-u:u;
      const a=mix(start,end,u)*pi;
      const fold=along*cut.folds+drop*(.12+.23*Math.sin(pi*along));
      const pleat=Math.cos(fold*2*pi)*(.007+.023*drop);
      const width=cut.width+cut.flare*drop+pleat;
      const front=Math.max(0,Math.cos(a));
      const z=Math.cos(a)*(.150+.047*drop+pleat)-.030-.090*drop*(1-front);
      const seam=.113-.045*Math.sin(pi*u)**2-.027*front;
      return [Math.sin(a)*width,seam-drop*cut.length(along),z,
        (piece+u)/cut.pieces.length,.02+.96*v];
    });
  }
  const backIndices=indices.length;

  // The shoulder yoke overlaps the hanging panels. Its two front ends fasten
  // above the chest painting and leave a clear path for the weapon arm.
  panel(44,6,'yoke',.055,(u,v)=>{
    const drop=1-v,a=(.085+1.83*u)*pi;
    const side=Math.abs(Math.sin(a)),front=Math.max(0,Math.cos(a));
    const fold=.006*Math.sin(drop*2.5*pi)*Math.sin(drop*pi);
    const outer=cut.width+.020;
    return [Math.sin(a)*(mix(.088,outer,drop)+fold),
      .157-drop*(.068+.092*front+.038*(1-side)),
      Math.cos(a)*(mix(.085,.157,drop)+fold)-.018,
      .035+.93*u,.64+.33*v];
  });

  if(id==='emberwitch'){
    // Two turned-up collar leaves frame the hair above the phoenix tails.
    for(const s of [-1,1])panel(14,6,'yoke',.04,(u,v)=>{
      const a=(.30+.68*(s>0?u:1-u))*pi;
      const crest=Math.sin(u*pi);
      return [s*Math.sin(a)*(.144+v*(.032+crest*.042)),
        .103+v*(.075+.108*crest),Math.cos(a)*(.137+.053*v)-.018,
        .035+.28*u,.59+.39*v];
    });
  }else if(id==='gravebinder'){
    // Paired ivory stays curve around the cowl and close at the sternum.
    for(const s of [-1,1])for(let rib=0;rib<3;rib++)panel(12,6,'bone',0,(u,v)=>{
      const along=s>0?u:1-u,a=v*2*pi;
      const girth=(.004+.007*Math.sin(along*pi))*(1-rib*.10);
      return [s*mix(.028,.195,along),.100-.055*along-.033*Math.sin(pi*along)-rib*.030+Math.cos(a)*girth,
        .166-.086*along*along+.011*Math.sin(pi*along)+Math.sin(a)*girth,
        .49+.035*Math.cos(a),.76+.14*along];
    });
  }else if(id==='wildkeeper'){
    // Two overlapping hide edges break into broad locks over the shoulders.
    for(let layer=0;layer<2;layer++)panel(96,5,'pelt',.17,(u,v)=>{
      const drop=1-v,a=(.10+1.8*u)*pi,tip=point((u*(layer?12:16)+layer*.5)%1,.5,.5);
      const width=(layer?.16:.208)+drop*(layer?.122:.104);
      return [Math.sin(a)*(width+tip*.011*drop),
        .146-layer*.008-drop*(layer?.082+.089*tip:.12+.118*tip),
        Math.cos(a)*(.104+drop*(layer?.078:.094))-.017,
        .025+.27*(.5+.5*Math.cos(a*2)),.77+.21*v];
    });
  }else{
    // The Vanguard's baldric and Ranger's folded scarf take different paths
    // across the front of the harness.
    const scarf=id==='veilranger';
    panel(8,16,'yoke',.09,(u,v)=>{
      const drop=1-v,width=scarf?.046:.034;
      return [mix(.172,scarf?-.152:-.068,drop)+(u-.5)*2*width,
        .116-drop*(scarf?.235:.284)+(u-.5)*.040,
        .109+.071*Math.sin(drop*pi*.88)+.010*Math.sin(u*pi),
        .04+.21*u,.57+.39*v];
    });
  }

  // Raised clasps join the two cloth surfaces above the breastbone or shoulder.
  const clasps={
    vanguard:[.146,.087,.142,.029,.030],emberwitch:[0,.057,.155,.021,.037],
    gravebinder:[0,.044,.170,.023,.058],wildkeeper:[0,.064,.160,.021,.043],
    veilranger:[.134,.083,.147,.023,.032],
  };
  const [cx,cy,cz,rx,ry]=clasps[id];
  panel(24,6,id==='gravebinder'?'bone':'clasp',0,(u,v)=>{
    const a=u*2*pi,r=1-v,edge=id==='vanguard'?1+.14*Math.cos(a*8):1-.14*Math.cos(a*4);
    return [cx+rx*r*edge*Math.cos(a),cy+ry*r*edge*Math.sin(a),cz+.014*v+.004*Math.sin(v*2*pi)**2,
      .50+.095*r*Math.cos(a),(id==='gravebinder'?.80:.32)+.085*r*Math.sin(a)];
  });

  const g=new THREE.BufferGeometry();
  const attribute=(values,size)=>new THREE.Float32BufferAttribute(values,size);
  g.setAttribute('position',attribute(positions,3));
  g.setAttribute('uv',attribute(uv,2));g.setIndex(indices);g.computeVertexNormals();
  // Morphs deform the cut pieces below the seam. Bake the corresponding
  // normals once so the highlights travel with each fold at every frame rate.
  const shapes={trail:[],swing:[],ripple:[],fold:[]};
  for(let i=0;i<free.length;i++){
    const w=free[i],x=positions[i*3],z=positions[i*3+2];
    shapes.trail.push(x*.19*w,.20*w,-.35*w);
    shapes.swing.push(.23*w,.045*x*w,.43*x*w);
    shapes.ripple.push(.052*Math.cos(z*19+w*4)*w,.064*Math.sin(x*20+w*4)*w,.082*Math.sin(x*18+w*3.7)*w);
    shapes.fold.push(-.12*x*w,.052*w,-z*.70*w);
  }
  g.morphTargetsRelative=true;
  g.morphAttributes.position=[];g.morphAttributes.normal=[];
  for(const [name,deltas] of Object.entries(shapes)){
    const displacement=attribute(deltas,3);displacement.name=name;
    g.morphAttributes.position.push(displacement);
    const bent=new THREE.BufferGeometry();
    bent.setAttribute('position',attribute(positions.map((p,i)=>p+deltas[i]),3));
    bent.setIndex(g.index);bent.computeVertexNormals();
    const normals=bent.attributes.normal.array;
    for(let i=0;i<normals.length;i++)normals[i]-=g.attributes.normal.array[i];
    g.morphAttributes.normal.push(bent.attributes.normal);bent.dispose();
  }
  const mesh=new THREE.Mesh(g,heroColumn(id));mesh.name='ClassCape';
  let lastRank=-1;
  function fit(rank,bespoke) {
    mesh.visible=!bespoke;
    if(rank===lastRank)return;
    lastRank=rank;
    const [,base,,span]=hemRegion(rank);
    const map=g.attributes.uv;
    for(const {first,end,section} of sections){
      const row=section==='bone'||section==='clasp'?3:section==='pelt'?0:rank;
      for(let i=first;i<end;i++){
        const v=uv[i*2+1];
        map.setY(i,heroPanelV(row,section==='hem'?base+span*v:v));
      }
    }
    map.needsUpdate=true;
    g.setDrawRange(0,rank<2?indices.length:backIndices);
    mesh.scale.x=1+rank*.036;
  }
  return {mesh,fit};
}
