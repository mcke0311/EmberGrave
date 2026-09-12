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
