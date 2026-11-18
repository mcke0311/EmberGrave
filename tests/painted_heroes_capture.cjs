// Capture the production renderer through the campaign review's isolated game.
// Run against the same seed on either revision with the local server running.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');

const version = process.argv[2];
assert.ok(['before', 'after'].includes(version), 'Pass before or after');
const out = path.join(process.env.HERO_CAPTURE_DIR || path.join(__dirname, 'qa', 'painted_heroes'), version);
const base = process.env.GAME_REVIEW_URL || 'http://127.0.0.1:8741';
const classes = ['vanguard', 'emberwitch', 'gravebinder', 'wildkeeper', 'veilranger'];
fs.mkdirSync(out, {recursive: true});
// Reproduce the baseline after a change without checking out the old game
// over the working copy. Only version-controlled renderer files are served.
const original = new Map();
if (version === 'before' && process.argv[3]) {
  const revision = execFileSync('git',['rev-parse','--verify',process.argv[3]+'^{commit}'],{encoding:'utf8'}).trim();
  const changed = execFileSync('git',['diff','--name-only','--diff-filter=M',revision,'--','index.html','js'],{encoding:'utf8'});
  for (const file of changed.trim().split(/\r?\n/).filter(Boolean)) {
    original.set('/'+file,execFileSync('git',['show',revision+':'+file],{maxBuffer:16*1024*1024}));
  }
}
function save(name, url) {
  fs.writeFileSync(path.join(out, name + '.webp'), Buffer.from(url.split(',')[1], 'base64'));
}

async function checkStarterSwaps(page) {
  const result = await page.evaluate(async ids => {
    const {createCharacterRenderer} = await import('../js/character3d.mjs');
    const {win, game} = campaignReview, report = {};
    for (const id of ids) {
      const stage = createCharacterRenderer({size:256});
      try {
        const hero = game.coop.makeHero('Outfit review', id);
        const resolve = raw => win.Player3D.assets.resolvePlayerVisual(id, raw).equipment;
        const starter = resolve(hero.equip);
        const armored = resolve({...hero.equip, head:{baseId:'helm_t4'}, chest:{baseId:'chest_t7'},
          gloves:{baseId:'gloves_t7'}, boots:{baseId:'boots_t7'}});
        let maxCalls = 0;
        const render = (gear, direction) => {
          stage.render({state:'idle', t:0, ang:direction*Math.PI/4, ex:{}}, gear, id);
          maxCalls = Math.max(maxCalls, stage.renderer.info.render.calls);
        };
        const resources = () => ({...stage.renderer.info.memory, programs:stage.renderer.info.programs.length});
        for (let facing=0; facing<8; facing++) render(starter, facing);
        render(armored, 0);
        render(starter, 0);
        const warm = resources();
        const atlas = stage.model.armor.light.material.map.source, uploadVersion = atlas.version;
        for (let cycle=0; cycle<20; cycle++) {
          render(armored, cycle%8);
          render(starter, cycle%8);
        }
        if (!stage.model.armor.light.visible || stage.model.armor.light.name !== 'QuiltedVest')
          throw Error(id + ': the painted vest did not return after the swap');
        if (atlas.version !== uploadVersion)
          throw Error(id + ': an outfit swap marked the shared atlas for reupload');
        report[id] = {facings:8, outfitCycles:20, warm, settled:resources(), maxCalls};
      } finally { stage.dispose(); }
    }
    return report;
  }, classes);
  for (const [id, sample] of Object.entries(result)) {
    assert.deepEqual(sample.settled, sample.warm, id + ': starter outfit resource leak');
    assert.ok(sample.maxCalls <= 73, id + ': starter outfit exceeded 73 draw calls');
  }
  fs.writeFileSync(path.join(out, '..', 'starter-swaps.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('Passed five starter outfit swap and facing checks.');
}

(async () => {
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  try {
    for (const [width, height] of [[1920, 1080], [844, 390]]) {
      const page = await browser.newPage({viewport: {width, height}, isMobile: width === 844, hasTouch: width === 844});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', entry => {if (/THREE\.WebGLProgram: Shader Error/.test(entry.text())) errors.push(entry.text());});
      for (const [file,body] of original) {
        await page.route(url=>url.pathname===file,route=>route.fulfill({body,contentType:file.endsWith('.html')?'text/html':'text/javascript'}));
      }
      // The review seeds the map, but current solo saves also roll a session seed.
      await page.route('**/js/utils.js*', async route => {
        const response = await route.fetch();
        await route.fulfill({response, body: (await response.text()) + '\nU.newWorldSeed = () => 12345; Math.random = U.rng(3482);'});
      });
      await page.goto(base + '/tests/campaign_visual_review.html?zone=frosthaven&seed=12345&width=' + width);
      await page.waitForFunction(() => ['passed','failed'].includes(document.body.dataset.testStatus), null, {timeout: 120000});
      assert.equal(await page.locator('#error').textContent(), '');
      for (const zone of ['frosthaven','mines']) {
        if (zone === 'mines') await page.evaluate(() => campaignReview.load('after','mines'));
        for (const id of classes) {
          const capture = await page.evaluate(async ({id, zone, width}) => {
            const {game, win, api, map} = campaignReview;
            const hero = game.coop.makeHero('Art review', id);
            await game.coop.prepareHero(hero);
            const spawn = map.spawns.default;
            hero.ang = hero.visAng = zone === 'frosthaven' ? -Math.PI / 3 : Math.PI / 3;
            game.state.player = hero;
            game.state.players = [hero];
            game.state.time = 2;
            // Step clear of the town resident and mine doorway to expose the
            // hem and contact shadow. Both versions use the same walkable tile.
            const point = [[1.5,-1.5],[2,-1],[-1.5,1.5],[0,0]]
              .map(([dx,dy])=>({x:spawn.x+dx,y:spawn.y+dy}))
              .find(p=>api.TerrainSurface.supported(map,p.x,p.y,.4));
            game.__frontier.place(point.x, point.y);
            game.__frontier.render();
            const canvas = win.document.getElementById('view');
            if (canvas.width !== width || win.__errors.length) throw Error('Scene capture failed: ' + win.__errors);
            const result = {world: canvas.toDataURL('image/webp', .94)};
            if (zone === 'frosthaven' && width === 1920) {
              const kit = hero.equip, close = win.Player3D.createShowcase();
              try {
                const sheet = document.createElement('canvas'); sheet.width=900; sheet.height=340;
                const ctx = sheet.getContext('2d'); ctx.fillStyle='#26272b'; ctx.fillRect(0,0,900,340);
                for (const [column, ang] of [1.25,-1.1,1.25].entries()) {
                  const equipment = column === 2 ? {...kit,head:{baseId:'helm_t4'}} : kit;
                  close.draw(ctx,id,{ang,t:.1,regalia:false,equipment,bounds:{x:column*300,y:0,width:300,height:340}});
                }
                result.armory=sheet.toDataURL('image/webp', .97);
              } finally { close.dispose(); }
            }
            return result;
          }, {id, zone, width});
          save([zone,width,id].join('-'), capture.world);
          if (capture.armory) save('armory-' + id, capture.armory);
        }
        console.log(version, zone, width, 'five starter kits');
      }
      if (version === 'after' && width === 1920) await checkStarterSwaps(page);
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode = 1;});
