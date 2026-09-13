/* Test-only worker inspection. This bridge is injected by Playwright, never shipped. */
const fs=require('node:fs');
async function installWorkerBridge(context){
  await context.route('**/js/coop_worker.js*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('js/coop_worker.js','utf8')+`
    const productionMessage=self.onmessage;
    self.onmessage=async e=>{const m=e.data;if(m.type!=='qa')return productionMessage(e);
      try{const value=await new Function('arg',m.source)(m.arg);postMessage({type:'qaReply',id:m.id,value});}
      catch(e){postMessage({type:'qaReply',id:m.id,error:e.stack});}
    };
  `}));
  await context.addInitScript(()=>{
    const NativeWorker=Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);window.qaWorker=this;}};
    let qaId=0;
    window.qaHost=(source,arg)=>new Promise((resolve,reject)=>{
      const id=++qaId,receive=e=>{if(e.data.type!=='qaReply'||e.data.id!==id)return;qaWorker.removeEventListener('message',receive);e.data.error?reject(Error(e.data.error)):resolve(e.data.value);};
      qaWorker.addEventListener('message',receive);qaWorker.postMessage({type:'qa',id,source,arg});
    });
  });
}
async function hostState(page,fn,arg){
  const source=`const p=Coop.players.get(Coop.hostId),w=Coop.worlds.get(p.worldId);return Game.coop.withWorld(w,()=>(${fn.toString()})(arg));`;
  return page.evaluate(({source,arg})=>qaHost(source,arg),{source,arg});
}
async function waitHostState(page,fn,arg,timeout=15000){
  const deadline=Date.now()+timeout;
  do{if(await hostState(page,fn,arg))return;await page.waitForTimeout(100);}while(Date.now()<deadline);
  throw Error('Host condition timed out: '+fn.toString());
}
module.exports={installWorkerBridge,hostState,waitHostState};
