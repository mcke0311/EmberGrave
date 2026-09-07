import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
for(const f of ['utils','data','items','management'])vm.runInThisContext(fs.readFileSync(new URL('../js/'+f+'.js',import.meta.url),'utf8'));
const {Items:I,ForgeRecipes:F,DATA:D,U}=vm.runInThisContext('({Items,ForgeRecipes,DATA,U})');
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m)};
const glyph=()=>I.makeGlyph(Object.keys(D.GLYPHS)[0]),base=Object.keys(D.BASES)[0],gear=()=>I.fromBase(base);
ok(!F.evaluate([],'glyph').valid,'empty recipe');ok(F.evaluate([glyph(),glyph(),glyph()],'glyph').valid,'matching glyphs');
ok(!F.evaluate([glyph(),glyph(),I.makeGlyph(Object.keys(D.GLYPHS)[1])],'glyph').valid,'mixed glyphs');
ok(F.evaluate([gear(),glyph()],'temper').valid,'common temper');ok(!F.evaluate([gear(),glyph(),glyph()],'temper').valid,'extra material accepted');
const rare=gear();rare.rarity='rare';rare.identified=false;ok(!F.evaluate([rare,glyph(),glyph(),glyph()],'reweave').valid,'unidentified rare');rare.identified=true;ok(F.evaluate([rare,glyph(),glyph(),glyph()],'reweave').valid,'identified rare');
for(const id of ['hp1','mp1','hp2','mp2']){ok(F.evaluate([I.makeConsumable(id,3)],'potion').valid,id+' recipe');ok(!F.evaluate([I.makeConsumable(id,2)],'potion').valid,id+' insufficient quantity');}
ok(!F.evaluate([I.makeConsumable('hp1',2),I.makeConsumable('mp1',2)],'potion').valid,'mixed draughts');ok(!F.evaluate([I.makeConsumable('rejuv',3)],'potion').valid,'terminal draught upgrade');
let pack=I.makeGrid(2,1);I.place(pack,I.makeConsumable('hp1',9),0,0);I.place(pack,glyph(),1,0);const incoming=I.makeConsumable('hp1',2),before=JSON.stringify(pack);
ok(!I.canAutoPlace(pack,incoming),'partial stack counted as whole purchase');ok(JSON.stringify(pack)===before&&incoming.count===2,'preflight consumed a partial stack');
ok(I.canAutoPlace(pack,I.makeConsumable('hp1',1)),'merge-only purchase rejected');
// Partition a pack into valid rectangles, exercising deterministic greedy success and failure.
let failures=0;const rng=U.rng(17);
for(let trial=0;trial<100;trial++){
 const rectangles=[{gx:0,gy:0,w:6,h:4}];
 for(let split=0;split<7;split++){const candidates=rectangles.filter(r=>r.w>1||r.h>1);if(!candidates.length)break;const r=candidates[Math.floor(rng()*candidates.length)];rectangles.splice(rectangles.indexOf(r),1);const horizontal=r.w>1&&(r.h===1||rng()<.5),n=1+Math.floor(rng()*((horizontal?r.w:r.h)-1));rectangles.push({...r,w:horizontal?n:r.w,h:horizontal?r.h:n},{...r,gx:r.gx+(horizontal?n:0),gy:r.gy+(horizontal?0:n),w:horizontal?r.w-n:r.w,h:horizontal?r.h:r.h-n});}
 pack={w:6,h:4,items:rectangles.map((r,i)=>({...r,uid:i,kind:'gear',count:1}))};const snapshot=JSON.stringify(pack);
 if(!I.tidy(pack)){failures++;ok(JSON.stringify(pack)===snapshot,'failed tidy mutated items');}
 else {const grid=I.makeGrid(6,4);for(const it of pack.items){ok(I.fits(grid,it,it.gx,it.gy),'tidy overlap or out of bounds');I.place(grid,{...it},it.gx,it.gy)}const once=JSON.stringify(pack);I.tidy(pack);ok(JSON.stringify(pack)===once,'tidy is not deterministic');}
}
ok(failures>0,'failure rollback fixture not exercised');
console.log(`PASS ${checks} management checks, including ${failures} atomic tidy rollbacks.`);
