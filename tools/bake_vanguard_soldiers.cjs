// Rebuild the Command troop atlases from the same models and equipment as the hero.
// Run from the repository with Node, Playwright/Chrome and Python/Pillow available.
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const origin = 'http://127.0.0.1:8741';
const packer = path.join(__dirname, 'import_vanguard_soldiers.py');
const loadouts = {
  shieldguard: {main:'shortsword', off:'buckler', head:'warhelm', chest:'hauberk'},
  bowman: {main:'huntbow', head:'cap', chest:'quiltvest'},
  standard_bearer: {head:'warhelm', chest:'quiltvest'}
};

async function bake() {
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    const page = await browser.newPage();
    await page.route(origin + '/**', async route => {
      const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
      if (pathname === '/') return route.fulfill({contentType:'text/html',
        body:'<!doctype html><script src="/js/utils.js"></script><script src="/js/data.js"></script>'});
      const file = path.resolve(root, '.' + pathname);
      if (!file.startsWith(root + path.sep)) return route.fulfill({status:403});
      await fs.access(file);
      await route.fulfill({path:file});
    });
    await page.goto(origin);
    await page.evaluate(async () => {
      const {createCharacterRenderer} = await import('/js/character3d.mjs');
      const {resolveCharacterVisual} = await import('/js/character_catalog3d.mjs');
      window.studio = createCharacterRenderer({classId:'vanguard'});
      studio.setRegion(null);
      window.equipmentFor = ids => resolveCharacterVisual(DATA, 'vanguard',
        Object.fromEntries(Object.entries(ids).map(([slot,baseId]) => [slot,{baseId}]))).equipment;
    });
    for (const [role, loadout] of Object.entries(loadouts)) {
      const png = await page.evaluate(({role,loadout}) => {
        const equip = equipmentFor(loadout), opts = {classId:'vanguard', scale:.84};
        const states = ['idle','walk','attack','hit','death'], turn = Math.PI * 2;
        const cell = document.createElement('canvas'), sheet = document.createElement('canvas');
        cell.width = 192; cell.height = 160;
        sheet.width = 16 * cell.width; sheet.height = 15 * cell.height;
        const ctx = cell.getContext('2d'), atlas = sheet.getContext('2d');
        function drawBanner(pose, step) {
          const hand = studio.effectAnchors(pose, equip, opts).hand;
          ctx.translate(U.isoX(hand.x,hand.y), U.isoY(hand.x,hand.y)-hand.lift);
          ctx.rotate(pose.state === 'death' ? step*.22 : -.06);
          ctx.fillStyle = '#a9824d'; ctx.fillRect(-1,-53,2.5,68);
          ctx.fillStyle = '#244b67'; ctx.strokeStyle = '#deb975'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(1,-50); ctx.lineTo(20,-48); ctx.lineTo(19,-24);
          ctx.lineTo(10,-29); ctx.lineTo(1,-25); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#edc981'; ctx.beginPath(); ctx.moveTo(10,-44); ctx.lineTo(14,-39);
          ctx.lineTo(10,-34); ctx.lineTo(6,-39); ctx.closePath(); ctx.fill();
        }
        let index = 0;
        for (const state of states) for (let step=0; step<6; step++) for (let facing=0; facing<8; facing++) {
          const pose = {state, ang:facing*turn/8, t:step/(state === 'death' ? 5 : 6),
            ex:{walkPh:step*turn/6, speed:3.8}};
          ctx.clearRect(0,0,cell.width,cell.height);
          ctx.save(); ctx.translate(96,134);
          studio.draw(ctx, pose, equip, opts);
          if (role === 'standard_bearer') drawBanner(pose, step);
          ctx.restore();
          atlas.drawImage(cell, (index%16)*cell.width, Math.floor(index/16)*cell.height);
          index++;
        }
        return sheet.toDataURL('image/png').split(',')[1];
      }, {role,loadout});
      execFileSync('python', [packer, '--pack', role], {input:Buffer.from(png,'base64'), stdio:['pipe','inherit','inherit']});
    }
    execFileSync('python', [packer], {stdio:'inherit'});
  } finally { await browser.close(); }
}
bake().catch(error => { console.error(error); process.exitCode = 1; });
