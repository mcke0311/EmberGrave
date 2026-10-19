import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {fixture} from './boss_fixture.mjs';

const f=fixture({gameExports:['setSaveSlot:slot=>{saveSlotKey=slot;}']});
const {Game:G,Items:I,Player,DATA:D,ctx,store,messages}=f;
const slot='embergrave_save_item_persistence';
let checks=0;
const ok=(value,label)=>{checks++;assert.ok(value,label);};
const plain=value=>JSON.parse(JSON.stringify(value));
const tonicCount=grid=>grid.items.filter(it=>it.baseId==='respec').reduce((n,it)=>n+it.count,0);
const savedCount=(hero,grid)=>hero[grid].filter(it=>it.b==='respec').reduce((n,it)=>n+it.c,0);

Object.assign(ctx.Player3D.assets,{
  resolvePlayerVisual:()=>({}),loadPlayerLoadout:async()=>{},
  activatePlayerLoadout(){},discardPlayerLoadout(){},deactivatePlayerLoadout(){},
});
Object.assign(ctx,{vendorCtx:null,coopItems:()=>false,refreshGrids(){},refreshBelt(){},msg:message=>messages.push(message)});
// Exercise the production item handler with the fixture's real game and saves.
const uiSource=fs.readFileSync(new URL('../js/ui.js',import.meta.url),'utf8');
const start=uiSource.indexOf('  function gridItemRClick('),end=uiSource.indexOf('  async function prepareEquipmentChange(');
assert.ok(start>=0&&end>start,'item handler boundaries');
vm.runInContext(uiSource.slice(start,end),ctx);
const useItem=vm.runInContext('gridItemRClick',ctx);
const skill=Object.values(D.SKILLS).find(sk=>sk.cls==='vanguard'&&sk.type!=='passive').id;

function fresh(count,grid,learned=true){
  const p=new Player('Item persistence QA','vanguard'),s=G.__bossTest.freshState(p,123);
  s.map={id:'frosthaven',zone:D.ZONES.frosthaven,props:[]};s.flags.opening={v:2,stage:'done'};
  G.__bossTest.setState(s);G.__bossTest.setSaveSlot(slot);
  p.inv=I.makeGrid(10,4);p.stash=I.makeGrid(10,6);
  p.skills=learned?{[skill]:2}:{};p.skillPts=3;
  const tonic=I.makeConsumable('respec',count);I.autoPlace(p[grid],tonic);
  G.saveGame();return {p,tonic};
}

for(const grid of ['inv','stash'])for(const count of [1,3]){
  const {p,tonic}=fresh(count,grid),label=grid+' stack '+count;
  useItem(p[grid],tonic,grid==='inv'?'inv':'storage');
  ok(tonicCount(p[grid])===count-1,label+' consumes exactly one tonic');
  ok(!Object.keys(p.skills).length&&p.skillPts===5,label+' refunds invested talents');
  const saved=JSON.parse(store.get(slot));
  ok(savedCount(saved,grid)===count-1,label+' saves consumption together with refund');
  ok(!Object.keys(saved.skills).length&&saved.skillPts===5,label+' saves refunded points');
  await G.loadGame(slot);
  ok(tonicCount(G.state.player[grid])===count-1,label+' consumption survives loading');
  ok(!Object.keys(G.state.player.skills).length&&G.state.player.skillPts===5,label+' refund survives loading');
}

for(const grid of ['inv','stash'])for(const count of [1,3]){
  const {p,tonic}=fresh(count,grid,false),before=store.get(slot);
  messages.length=0;useItem(p[grid],tonic,grid==='inv'?'inv':'storage');
  ok(tonicCount(p[grid])===count&&p[grid].items.includes(tonic),'empty reset preserves '+grid+' stack '+count);
  ok(p.skillPts===3&&store.get(slot)===before,'empty reset leaves points and save unchanged');
  ok(messages.includes('You have nothing to unlearn.'),'empty reset explains why the tonic was kept');
  ok(G.doRespec()===false,'empty reset reports failure');
}

{
  const {p}=fresh(1,'inv'),before=store.get(slot);
  ok(G.doRespec()===true,'successful reset reports success');
  ok(store.get(slot)===before&&tonicCount(p.inv)===1,'reset leaves consumption and persistence to its caller');
}

Object.assign(ctx,{crypto:webcrypto,structuredClone});
for(const name of ['management','coop_protocol','coop_codec'])vm.runInContext(fs.readFileSync(new URL('../js/'+name+'.js',import.meta.url),'utf8'),ctx);
const C=vm.runInContext('CoopCodec',ctx);
for(const def of D.SET_ITEMS)for(const reduction of [0,25]){
  const item=I.makeSetItem(def);
  if(reduction)item.affixes.push({stat:'reqReduce',val:reduction});
  const label=def.name+' with '+reduction+'% requirement reduction';
  const restored=G.reviveItem(plain(G.serializeItem(item)));
  ok(restored.reqLvl===item.reqLvl,label+' keeps its base requirement');
  ok(I.effReqLvl(restored)===I.effReqLvl(item),label+' keeps its effective requirement');
  ok(restored.setId===item.setId&&restored.setItemId===item.setItemId,label+' keeps set membership');
  const again=G.reviveItem(plain(G.serializeItem(restored)));
  ok(I.effReqLvl(again)===I.effReqLvl(item),label+' remains stable over repeated loading');
  const p=new Player('Set persistence QA','vanguard');p.heroId='set_persistence_qa';p.lvl=70;
  p.inv=I.makeGrid(10,4);p.stash=I.makeGrid(10,6);p.equip={};I.autoPlace(p.inv,item);
  const coopItem=C.restoreHero(plain(C.hero(p))).inv.items[0];
  ok(coopItem.reqLvl===item.reqLvl&&I.effReqLvl(coopItem)===I.effReqLvl(item),label+' survives a co-op hero round trip');
}

console.log(`PASS ${checks} tonic consumption, solo saves and ${D.SET_ITEMS.length} set-item persistence checks`);
