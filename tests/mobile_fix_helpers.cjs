const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium,webkit}=require('playwright');
const base=process.env.GAME_REVIEW_URL||'http://127.0.0.1:8741';
const out='tmp/mobile-fixes';fs.mkdirSync(out,{recursive:true});
const settle=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
async function setup({manual=false,engine='chromium'}={}){
 const browser=await (engine==='webkit'?webkit:chromium).launch({...(engine==='webkit'?{}:{channel:'chrome'}),headless:true});
 const context=await browser.newContext({viewport:{width:844,height:390},screen:{width:844,height:390},isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const store=new Map([['embergrave_options',JSON.stringify({vol:{master:0,sfx:0,music:0}})]]);
  Object.defineProperty(window,'localStorage',{value:{get length(){return store.size},key:i=>[...store.keys()][i]??null,getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(String(k),String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()}});
 });
 if(manual)await page.route('**/js/game.js*',async route=>{
  let source=fs.readFileSync('js/game.js','utf8').replace(/\r\n/g,'\n');
  source=source.replace('    requestAnimationFrame(tick);','    requestAnimationFrame(tick);\n    if(window.__manualMobile)return;');
  source=source.replace('    init, newGame, loadGame,',`    __mobileTest:{opening,setupBeaconQuest,setupRitualQuest,triggerEvent,updateHover,step(seconds){for(let t=0;t<seconds;t+=.05){if(running&&!state.player.dead&&!UI.cinematicActive()&&!MobileWorkspace.paused&&!MobileShell.blocked)update(.05);updateCamera(.05);}MobileControls.sync();render();},project(obj,dy=0){const cam=camera();return {x:U.isoX(obj.x,obj.y)-cam.x,y:U.isoY(obj.x,obj.y)-cam.y-surfaceLift(obj.x,obj.y,obj.surfaceId??0)+dy};}},\n    init, newGame, loadGame,`);
  await route.fulfill({contentType:'text/javascript',body:source});
 });
 await page.goto(base+'/index.html?touch=1',{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>typeof Game!=='undefined'&&document.querySelector('#titleMenu button'),null,{timeout:120000});
 if(manual)await page.evaluate(()=>window.__manualMobile=true);
 return {browser,context,page,errors};
}
async function swipe(page,client,up=true){
 const header=await page.locator('#workspaceHeader').boundingBox(),height=page.viewportSize().height;
 const top=(header?.y||0)+(header?.height||0)+16,bottom=height-18;
 const x=page.viewportSize().width*.35,from=up?bottom:top,to=up?top:bottom;
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x,y:from}]});
 for(let i=1;i<=6;i++){await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x,y:from+(to-from)*i/6}]});await page.waitForTimeout(20);}
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
}
async function revealBySwipe(page,client,locator){
 for(let i=0;i<30;i++){
  const r=await locator.boundingBox(),h=await page.locator('#workspaceHeader').boundingBox();assert.ok(r,'control is hidden');
  if(r.y>h.y+h.height+1&&r.y+r.height<page.viewportSize().height-2)return;
  await swipe(page,client,r.y>=h.y+h.height);
 }
 throw Error('Trusted swipes could not reach '+await locator.textContent());
}

async function touchDriver(page,context){
 const client=await context.newCDPSession(page);let mode=null,origin=null;
 const release=async()=>{if(mode)await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});mode=null;};
 const step=seconds=>page.evaluate(seconds=>Game.__mobileTest.step(seconds),seconds);
 async function steer(dx,dy){
  if(mode!=='move'){
   await release();const r=await page.locator('#mobileMoveZone').boundingBox();origin={x:r.x+r.width/2,y:r.y+r.height/2};
   await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,...origin}]});mode='move';
  }
  const sx=(dx-dy)*2,sy=dx+dy,d=Math.hypot(sx,sy)||1;
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:origin.x+sx/d*34,y:origin.y+sy/d*34}]});
 }
 async function attack(){
  if(mode==='attack')return;await release();const r=await page.locator('#mobileAttack').boundingBox();
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:2,x:r.x+r.width/2,y:r.y+r.height/2}]});mode='attack';
 }
 async function approach(target,stop=1){
  const route=await page.evaluate(({target,stop})=>{
   const p=Game.state.player,d=Math.hypot(p.x-target.x,p.y-target.y);if(d<stop)return {done:true};
   const route=TerrainNavigation.findPath(Game.state.map,p,target,{radius:p.radius,hop:false,speed:p.stats.moveSpeed});
   if(!route?.length)return {error:'No walking route',from:{x:p.x,y:p.y},target};
   let point=route[0];if(Math.hypot(point.cx-p.x,point.cy-p.y)<.25&&route.length>1)point=route[1];
   return {dx:point.cx-p.x,dy:point.cy-p.y,speed:p.stats.moveSpeed};
  },{target,stop});
  if(route.error)throw Error(JSON.stringify(route));
  if(route.done){await release();return true;}
  await steer(route.dx,route.dy);
  await step(Math.min(.35,Math.max(.05,(Math.hypot(route.dx,route.dy)-.1)/route.speed)));
  return false;
 }
 async function walk(target,stop=1){for(let n=0;n<3000;n++)if(await approach(target,stop))return;throw Error('Walk stalled: '+JSON.stringify({target,state:await page.evaluate(()=>({x:Game.state.player.x,y:Game.state.player.y,stage:Game.state.flags.opening?.stage}))}));}
 async function tapWorld(target,offset=-25){
  await release();await step(.1);
  const point=await page.evaluate(({target,offset})=>Game.__mobileTest.project(target,offset),{target,offset});
  assert.ok(point.x>0&&point.y>0&&point.x<page.viewportSize().width&&point.y<page.viewportSize().height,'world target is on screen '+JSON.stringify(point));
  await page.touchscreen.tap(point.x,point.y);await step(.25);
 }
 return {release,step,steer,attack,approach,walk,tapWorld};
}
module.exports={assert,fs,base,out,settle,setup,swipe,revealBySwipe,touchDriver};
