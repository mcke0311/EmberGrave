// Shared by the game, wardrobe and coverage tests. No dependency on sprite atlases.
export const WEAPON_FAMILIES = ['sword_1h','sword_2h','axe_1h','axe_2h','mace_1h','mace_2h','dagger_1h','spear_2h','bow_2h','crossbow_2h','wand_1h','staff_2h'];
export const ARMOR_FAMILIES = ['light','mail','plate','mythic'];
export const EQUIPMENT_SLOTS = ['main','off','head','chest','gloves','boots','belt','ring1','ring2','amulet'];
export const CLASS_STYLES = {
  vanguard:{name:'Vanguard',width:1.2,height:1.06,cloth:'#263b52',lining:'#672c32',skin:'#caa183',hair:'#302017',trim:'#caa44a',magic:'#9ee7ff',coat:.57},
  emberwitch:{name:'Ember Witch',width:1,height:1,cloth:'#642c36',lining:'#361e30',skin:'#c79e89',hair:'#372727',trim:'#be8851',magic:'#ff8b32',coat:1},
  gravebinder:{name:'Gravebinder',width:.95,height:1.06,cloth:'#463451',lining:'#221b30',skin:'#b4ada1',hair:'#cac6bc',trim:'#b5a578',magic:'#69ed9a',coat:1.2},
  wildkeeper:{name:'Wildkeeper',width:1.15,height:1.05,cloth:'#455236',lining:'#493726',skin:'#c89a78',hair:'#573721',trim:'#9e9660',magic:'#98d86f',coat:.8},
  veilranger:{name:'Veil Ranger',width:.94,height:.99,cloth:'#343143',lining:'#231c31',skin:'#c8a088',hair:'#292333',trim:'#957cb5',magic:'#7fcaff',coat:.64}
};
const TIERS=[1,4,8,13,19,26,34,43,52,61,70,80,90,99];
export const TIER_MATERIALS = [
  ['#60574b','#34281d'],['#62666a','#3d2c1f'],['#767d81','#483523'],['#7e868a','#503b26'],
  ['#897851','#45321f'],['#8a949b','#493624'],['#596674','#352c24'],['#697986','#3a3027'],
  ['#899ba5','#47434a'],['#9b937c','#513a26'],['#363b45','#231f23'],['#a4a18e','#534730'],
  ['#987341','#49301e'],['#70887f','#343c2c']
];
export function tierFor(base) {
  const match=/_t(\d+)$/.exec(base.id||base.baseId||'');
  if(match)return Math.min(13,+match[1]);
  let tier=0;for(let i=0;i<TIERS.length;i++)if((base.ilvl||1)>=TIERS[i])tier=i;return tier;
}
export function armorFamily(tier){return tier<=2?'light':tier<=5?'mail':tier<=9?'plate':'mythic';}
export function resolveEquipmentItem(data,item,slot) {
  if(!item)return null;
  const base=data.BASES[item.baseId];if(!base)throw new Error(`Unknown equipped item: ${item.baseId}`);
  const expected=slot.startsWith('ring')?'ring':slot;
  if(base.slot!==expected)throw new Error(`${base.name} belongs in ${base.slot}, not ${slot}`);
  const tier=item.materialTier??base.materialTier??tierFor(base);
  if(!Number.isInteger(tier)||tier<0||tier>13)throw new Error(`Invalid material tier for ${base.id}`);
  const family=slot==='main'?(item.playerVisualFamily||base.playerVisualFamily):slot==='off'?'shield':
    ['head','chest'].includes(slot)?(item.playerVisualFamily||base.playerVisualFamily||armorFamily(tier)):
    ['gloves','boots','belt'].includes(slot)?armorFamily(tier):expected;
  if(slot==='main'&&!WEAPON_FAMILIES.includes(family))throw new Error(`No 3D weapon family: ${family}`);
  if(['head','chest','gloves','boots','belt'].includes(slot)&&!ARMOR_FAMILIES.includes(family))throw new Error(`No 3D armor family: ${family}`);
  if(slot==='off'&&base.cat!=='shield')throw new Error(`No 3D off-hand model: ${base.cat}`);
  const named=item.uniqueId?(data.UNIQUES||[]).find(u=>u.id===item.uniqueId):item.setItemId?(data.SET_ITEMS||[]).find(s=>s.id===item.setItemId):null;
  const art=named?.art||{},[metal,wood]=TIER_MATERIALS[tier];
  const result={baseId:base.id,name:item.name||base.name,slot,family,tier,twoHand:!!base.twoHand,
    namedId:item.uniqueId||item.setItemId||null,rarity:item.rarity||'common',
    material:{metal:art.metal||metal,wood:art.wood||wood,cloth:art.cloth||'#493e34',
      leather:art.leather||art.wood||wood,trim:art.trim||(tier>=4?'#947a4e':'#75716a'),
      glow:art.glow||(item.rarity==='set'?'#4d8869':null)}};
  result.key=JSON.stringify(result);return Object.freeze(result);
}
export function resolveCharacterVisual(data,classId,equip={}) {
  if(!CLASS_STYLES[classId])throw new Error(`No 3D player class: ${classId}`);
  const equipment=Object.fromEntries(EQUIPMENT_SLOTS.map(slot=>[slot,resolveEquipmentItem(data,equip[slot],slot)]));
  if(equipment.main?.twoHand&&equipment.off)throw new Error('Unequip the shield before using a two-handed weapon.');
  return {kind:'player3d',classId,equipment,key:classId+'|'+EQUIPMENT_SLOTS.map(s=>equipment[s]?.key||'-').join('|'),
    rawEquipment:Object.fromEntries(Object.entries(equip).map(([s,it])=>[s,it?{...it}:null]))};
}
export function catalogEntries(data,slot) {
  const baseSlot=slot.startsWith('ring')?'ring':slot;
  const entries=Object.values(data.BASES).filter(b=>b.slot===baseSlot).map(b=>({id:b.id,label:b.name+(['ring','amulet'].includes(baseSlot)?` · tier ${tierFor(b)}`:''),item:{baseId:b.id,name:b.name}}));
  for(const [kind,items] of [['unique',data.UNIQUES||[]],['set',data.SET_ITEMS||[]]])for(const named of items) {
    const base=data.BASES[named.base];if(base?.slot!==baseSlot)continue;
    entries.push({id:named.id,label:`${named.name} · ${kind}`,item:{baseId:base.id,name:named.name,rarity:kind,...(kind==='unique'?{uniqueId:named.id}:{setItemId:named.id})}});
  }
  return entries;
}
