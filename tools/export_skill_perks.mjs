// Export the playable catalog so designers can review every choice in one file.
import fs from 'node:fs';
import vm from 'node:vm';
const scope=vm.createContext({console});
for(const name of ['utils','data','data_overrides','skill_perks'])vm.runInContext(fs.readFileSync(new URL(`../js/${name}.js`,import.meta.url),'utf8'),scope);
const data=vm.runInContext('DATA',scope);
const lines=[
  '# Class skill perks','',
  'Generated from the playable catalog with `node tools/export_skill_perks.mjs`.','',
  'Each of the 107 class skills offers three free choices at invested rank 5 and three at rank 10. Choose one per tier; both selections stack. Choices can be postponed and are saved with the hero. Equipment bonuses do not unlock milestones. The existing talent reset clears skills, perk picks, and ongoing skill effects.','',
  'Active skill modifiers apply on the next use. Existing projectiles, fields, summons, buffs, and stances keep their cast values. Passive perks apply immediately. Temporary bonuses from using a skill last three seconds and refresh without stacking with themselves.','',
  'Implementation: `js/skill_perks.js` owns the catalog, selection validation, save normalization, immutable skill resolution and displayed values. `Player.resolveSkill()` is shared by combat, targeting and tooltips. Selections are saved as `skillPerks[skillId][5 or 10] = perkId`. Existing saves receive their earned unselected choices.','',
  'Review corrections: form descriptions now describe permanent toggles; Doom, chain counts, execution thresholds and wound multipliers show current scaling. Trap capacity and arming speed are consumed by traps. Bulwark armor updates while holding ground. Totem interval reduction has a 90% cap, so high ranks cannot create frame-dependent attacks and interval perks remain effective.','',
  'Verification: `node tests/skill_perks_contract.mjs` checks all 642 definitions, all 963 two-tier combinations, 819 active-skill casts, concrete combat outcomes, save data and reset cancellation. Open `tests/class_skill_ui.html` for all-class interaction, saved-hero migration and responsive checks. The attack-timing and campaign contract suites also cover regression behavior. On restricted Windows environments, run Node with `--preserve-symlinks --preserve-symlinks-main`.','',
];
const escape=s=>s.replaceAll('|','\\|').replaceAll('\n',' ');
for(const cls of Object.values(data.CLASSES)){
  lines.push(`## ${cls.name}`,'');
  cls.trees.forEach((tree,index)=>{
    lines.push(`### ${tree}`,'');
    for(const sk of Object.values(data.SKILLS).filter(s=>s.cls===cls.id&&s.tree===index)){
      lines.push(`#### ${sk.name}`,'','| Rank | Choice 1 | Choice 2 | Choice 3 |','| --- | --- | --- | --- |');
      for(const tier of [5,10])lines.push(`| ${tier} | ${data.SKILL_PERKS[sk.id][tier].map(p=>`**${escape(p.title)}** — ${escape(p.description)}`).join(' | ')} |`);
      lines.push('');
    }
  });
}
fs.writeFileSync(new URL('../docs/SKILL_PERKS.md',import.meta.url),lines.join('\n')+'\n');
console.log('Exported 107 skills and 642 perk options to docs/SKILL_PERKS.md');
