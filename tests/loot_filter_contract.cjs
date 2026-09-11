const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const saved=new Map(),ctx=vm.createContext({localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)},Items:{RARITY_ORDER:{common:0,enhanced:1,rare:2,set:3,unique:4},value:()=>10}});
vm.runInContext(fs.readFileSync('js/lootfilter.js','utf8')+'\nglobalThis.LF=LootFilter;',ctx);
const LF=ctx.LF;let checks=0;const ok=(v,m)=>{assert.ok(v,m);checks++;};
const ground=(rarity,extra={})=>({item:{kind:'equipment',cat:'sword',name:'Sword',rarity,affixes:[],sockets:[],...extra}});
LF.init();
ok(LF.evaluate(ground('common')).hide,'standard hides common');
ok(!LF.evaluate(ground('rare')).hide,'standard keeps rare');
const builtins=JSON.stringify(LF.PRESETS);LF.setPreset('custom');LF.editRule(LF.rules()[0].id,{name:'My rare gear'});
ok(JSON.stringify(LF.PRESETS)===builtins,'custom edits preserve presets');
LF.addRule({name:'Catch all',conditions:[],action:{hide:true}});
const rules=JSON.parse(LF.exportJSON()).rules;rules.unshift({name:'Hide all',enabled:true,logic:'AND',conditions:[],action:{hide:true}});
ok(LF.importJSON(JSON.stringify({preset:'custom',rules})),'catch-all filter import');
for(const item of [ground('unique'),ground('set'),ground('common',{quest:true}),ground('common',{marked:true}),{gold:10},ground('common',{kind:'consumable',baseId:'tp'})])ok(!LF.evaluate(item).hide,'protected item survives hide all');
ok(LF.evaluate(ground('rare')).hide,'catch-all hides ordinary rare');
LF.setEnabled(false);ok(!LF.evaluate(ground('common')).hide,'master off bypasses rules');LF.setEnabled(true);
const snapshot=LF.exportJSON(),version=LF.version,storage=saved.get('embergrave_lootfilter');
for(const bad of ['{','null','[]','{"preset":"missing"}','{"rules":[null]}',JSON.stringify({rules:[{...rules[0],action:{size:8}}]}),JSON.stringify({rules:[{...rules[0],conditions:[{prop:'skill',op:'==',value:'['}]}]}),JSON.stringify({rules:[{...rules[0],action:{glow:'url(evil)'}}]})]){
  ok(!LF.importJSON(bad),'invalid filter rejected');ok(LF.exportJSON()===snapshot&&LF.version===version&&saved.get('embergrave_lootfilter')===storage,'invalid import changes nothing');
}
ok(LF.importJSON(snapshot),'export round-trip');
LF.reset();LF.setPreset('custom');const id=LF.rules()[0].id;
LF.editRule(id,{conditions:[{prop:'reqLvl',op:'>=',value:'player-5'}],action:{glow:'#123456',minimap:null,size:1.4,sound:null}});
const result=LF.evaluate(ground('rare',{reqLvl:15}),{lvl:20});ok(result.glow==='#123456'&&result.minimap===null&&result.size===1.4&&result.sound===null,'level-relative condition and appearance overrides');
ok(LF.importJSON(LF.exportJSON()),'appearance filter round-trip');
console.log(JSON.stringify({status:'PASS',checks}));
