const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const motion=()=>vm.runInNewContext(fs.readFileSync('js/coop_motion.js','utf8')+'\nCoopMotion');
test('60 Hz display samples preserve 30 Hz authoritative movement and actor ownership',()=>{
  const m=motion(),actor={x:0,y:1,surfaceId:0,visAng:0,owner:{id:'hero'},action:{t:0,dur:1}};
  const world={players:[actor]},positions=[];let updates=0;
  for(let frame=0;frame<60;frame++){
    if(frame%2===0){m.capture(world);actor.x+=.1;actor.action.t+=1/30;updates++;}
    const simulationX=actor.x,time=actor.action.t,view=m.sample(actor,frame%2*.5);
    positions.push(view.x);assert.equal(actor.x,simulationX);assert.equal(actor.action.t,time);assert.equal(view.owner,actor.owner);
    assert.notEqual(view,actor);assert.ok(view.action.t<=actor.action.t);
  }
  assert.equal(updates,30);
  for(let i=1;i<positions.length;i++)assert.ok(Math.abs(positions[i]-positions[i-1]-.05)<1e-9,'every displayed frame advances evenly');
});
test('teleports, new actors and surface transitions snap instead of drifting through terrain',()=>{
  const m=motion(),p={x:0,y:0,surfaceId:0};assert.equal(m.sample(p,.5),p);
  m.capture({players:[p]});p.x=10;assert.equal(m.sample(p,.5),p);
  p.x=1;p.surfaceId=1;assert.equal(m.sample(p,.5),p);
});
test('turning takes the short arc and action transitions keep their own clock',()=>{
  const m=motion(),p={x:0,y:0,visAng:Math.PI-.1,action:{t:.2,dur:1}};
  m.capture({players:[p]});p.visAng=-Math.PI+.1;p.action.t=.4;
  const mid=m.sample(p,.5);assert.ok(Math.abs(mid.visAng-Math.PI)<1e-9);assert.ok(Math.abs(mid.action.t-.3)<1e-9);
  const next={t:0,dur:.5};p.action=next;assert.equal(m.sample(p,.5).action,next);p.action=null;assert.equal(m.sample(p,.5).action,null);
});
