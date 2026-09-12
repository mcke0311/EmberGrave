const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function fixture(host){
  let now=0;const commands=[],noop=()=>{},classList={toggle:noop,contains:()=>true},party={hidden:true,setAttribute:noop},root={hidden:true,classList,querySelector:()=>party};
  const p={skillL:'basic',skillR:'basic',x:10,y:10},Game={state:{player:p,players:[p]},options:{},coop:{repeatSkill:()=>true},touchReady:()=>true,submitCommand:c=>commands.push(c)};
  const ctx=vm.createContext({console,URLSearchParams,location:{search:''},Map,performance:{now:()=>now},Coop:{active:true,host,loading:false,paused:''},Game,document:{body:{classList},getElementById:()=>({classList})},U:{dist:(x,y,a,b)=>Math.hypot(x-a,y-b)}});
  vm.runInContext(fs.readFileSync('js/coop_input.js','utf8'),ctx);const input=vm.runInContext('CoopInput',ctx);
  Game.resetTouch=()=>input.resetTouch();
  const src=fs.readFileSync('js/mobile-controls.js','utf8').replace('return {init,sync,reset,','return {__test:{setup:r=>{root=r;}},init,sync,reset,');
  vm.runInContext(src,ctx);const mobile=vm.runInContext('MobileControls',ctx);mobile.__test.setup(root);
  return {commands,p,input,mobile,root,advance:ms=>now+=ms};
}
for(const host of [true,false])test(`${host?'host':'guest'} desktop frames preserve mouse movement and held steering`,()=>{
  const f=fixture(host),info={mouse:{l:true,shift:false},point:{x:14,y:10}};
  f.input.click(false,info);
  for(let i=0;i<12;i++){f.advance(17);f.mobile.sync();f.input.hold(info);}
  assert.equal(f.commands[0].type,'move');
  assert.equal(f.commands.at(-1).type,'steer');
  assert.ok(!f.commands.some(c=>c.type==='stop'),'disabled phone controls must not stop mouse movement');
  if(!host)assert.equal(f.p._coopMotion.type,'steer','guest prediction survives desktop frames');
  f.input.release();assert.equal(f.commands.at(-1).type,'stop');
});
test('hiding active touch controls still cancels input exactly once',()=>{
  const f=fixture(false);f.root.hidden=false;f.input.click(false,{mouse:{shift:false},point:{x:14,y:10}});
  f.mobile.sync();f.mobile.sync();assert.equal(f.commands.filter(c=>c.type==='stop').length,1);assert.equal(f.p._coopMotion,null);
});

function directFixture(){
  const commands=[],p={x:5,y:5,visAng:0,surfaceId:0,skillL:'basic',skillR:'old',skills:{one:1,two:1,three:1,four:1},quickSlots:['one','two','three','four']};
  let ready=true;
  const Game={state:{player:p,map:{w:20,h:20},monsters:[]},touchReady:()=>ready,coop:{repeatSkill:id=>id!=='one'},submitCommand:c=>commands.push(c)};
  const ctx=vm.createContext({Game,Coop:{active:true,host:false,paused:'',loading:false},DATA:{SKILLS:{one:{type:'buff'},two:{type:'spell'},three:{type:'spell'},four:{type:'spell'}}},performance:{now:()=>100},U:{unisoX:x=>x,unisoY:(x,y)=>y,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),screenVecToWorld:()=>[1,0],dist:()=>0},TerrainLayers:{same:()=>true}});
  vm.runInContext(fs.readFileSync('js/coop_input.js','utf8'),ctx);
  return {p,commands,input:vm.runInContext('CoopInput',ctx),block:()=>ready=false};
}
test('all four co-op direct slots cast IDs without binding commands',()=>{
  const f=directFixture();for(let i=0;i<4;i++){f.input.touchQuickSlot(i,true);f.input.touchQuickSlot(i,false);}
  assert.deepEqual(f.commands.filter(c=>c.type==='cast').map(c=>c.skill),['one','two','three','four']);
  assert.equal(f.p.skillR,'old');assert.equal(f.p.skillL,'basic');assert.ok(!f.commands.some(c=>c.type==='bind'));
});
test('co-op direct input retains combat ownership, snapshots the binding and cancels without release',()=>{
  const f=directFixture();f.input.touchMove(1,0);f.input.touchQuickSlot(0,true);f.p.quickSlots[0]='two';
  f.input.touchQuickSlot(1,true);f.input.touchQuickSlot(1,false);f.input.touchMove(0,0);
  assert.deepEqual(f.commands.filter(c=>c.type==='cast').map(c=>c.skill),['one']);
  assert.ok(!f.commands.some(c=>c.type==='release'||c.type==='stop'));
  f.input.resetTouch();assert.equal(f.commands.at(-1).type,'stop');assert.ok(!f.commands.some(c=>c.type==='release'));
});
test('co-op empty, unlearned, invalid and blocked direct slots do not submit combat',()=>{
  const f=directFixture();f.input.touchQuickSlot(-1,true);f.input.touchQuickSlot(4,true);f.p.quickSlots[0]=null;f.input.touchQuickSlot(0,true);
  f.p.skills.two=0;f.input.touchQuickSlot(1,true);f.block();f.input.touchQuickSlot(2,true);assert.equal(f.commands.length,0);
});
