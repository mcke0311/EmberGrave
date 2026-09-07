import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

let checks = 0, now = 0, timerId = 0;
const ok = (value, message) => { assert.ok(value, message); checks++; };
const players = [], calls = [], timers = new Map(), store = new Map();
class Audio {
  constructor(src) { this.src = src; this.paused = true; this.currentTime = 0; this.volume = 1; players.push(this); }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
}
const element = () => ({ style: {}, remove() {}, getContext: () => ({
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {},
}) });
const scope = vm.createContext({
  console, Math: Object.create(Math), Date, URL, Audio, performance: { now: () => now },
  Uint8Array, Uint16Array, Uint32Array, Float32Array, Uint8ClampedArray, Set, Map, JSON,
  setInterval: fn => { const id = ++timerId; timers.set(id, fn); return id; },
  clearInterval: id => timers.delete(id), setTimeout() {}, clearTimeout() {},
  fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(0) }),
  window: { addEventListener() {} },
  document: { baseURI: 'http://localhost:8741/index.html', body: { appendChild() {} },
    addEventListener() {}, createElement: element, getElementById: element },
  localStorage: { getItem: k => store.get(k) || null, setItem: (k, v) => store.set(k, v) },
  Player3D: { assets: {} },
  SpriteAssets: { loadBundle: async () => {}, actorGeometry: () => null, hitTestGeometry: () => false },
  UI: new Proxy({}, { get: () => () => {} }),
});
for (const name of ['utils', 'data', 'data_overrides', 'boss_encounters', 'audio', 'sprite_manifest', 'mapgen', 'navigation', 'items', 'lootfilter', 'entities']) {
  vm.runInContext(fs.readFileSync(new URL('../js/' + name + '.js', import.meta.url), 'utf8'), scope);
}
const source = fs.readFileSync(new URL('../js/game.js', import.meta.url), 'utf8').replace(
  '    init, newGame, loadGame,',
  '    __musicTest: { freshState, update, setState: s => { state = s; canvas = {width: 800, height: 600}; } },\n    init, newGame, loadGame,',
);
vm.runInContext(source, scope);
const { Sfx, DATA, Game, Player, Monster } = vm.runInContext('({ Sfx, DATA, Game, Player, Monster })', scope);
const music = Sfx.music;
Sfx.music = theme => { calls.push(theme); music(theme); };
Sfx.play = () => {}; // One-shot effects are covered by the death/UI audio suites.
const settle = () => { now += 500; for (const fn of [...timers.values()]) fn(); };
const active = () => players.filter(p => !p.paused).map(p => p.id).join(',');
const caveTracks = ['cavernsOfShadow', 'cavernsHeart', 'caveEchoes'];
const fixed = new Set(['town', 'frosthaven', 'frosthaven_approach', 'marshcamp', 'khalcamp', 'hellgate',
  'fields', 'north_wild', 'weeping_marsh', 'desert_wastes', 'ash_wastes']);

for (const key of [...caveTracks, 'boss']) {
  ok(fs.statSync(new URL('../assets/music/' + Sfx.TRACKS[key], import.meta.url)).size > 0, key + ': missing recording');
}
// Exercise every zone with the full range of random draws, including side areas
// and the optional campaign. No boss track may leak into exploration.
for (const zone of Object.values(DATA.ZONES)) {
  const selected = new Set();
  for (const draw of [0, .26, .51, .76, .999999]) {
    scope.Math.random = () => draw;
    selected.add(Sfx.chooseZoneMusic(zone));
  }
  if (fixed.has(zone.id)) {
    ok(selected.size === 1 && selected.has(zone.musicTrack || zone.music), zone.id + ': lost dedicated music');
  } else {
    ok(caveTracks.every(key => selected.has(key)), zone.id + ': missing random cave track');
    ok(!selected.has('boss'), zone.id + ': exploration selected boss music');
    if (zone.musicTrack) ok(selected.has(zone.musicTrack), zone.id + ': lost regional recording');
    for (const previous of selected) for (const draw of [0, .5, .999999]) {
      scope.Math.random = () => draw;
      ok(Sfx.chooseZoneMusic(zone, previous) !== previous, zone.id + ': repeated previous zone track');
    }
  }
}
scope.Math.random = Math.random;
const p = new Player('Music QA', 'vanguard'), state = Game.__musicTest.freshState(p, 123);
Game.__musicTest.setState(state);
async function enter(id) {
  ok(await Game.enterMap(id, 'default'), id + ': entry failed');
  // Keep encounter checks isolated from random spawns and world interactions.
  state.monsters = []; state.npcs = []; state.map.props = []; state.map.exits = [];
  settle();
}
function boss(id = 'gravecaller') {
  const mon = new Monster(id, p.x + 2, p.y, {});
  mon.update = () => {}; state.monsters.push(mon); return mon;
}
function tick() { Game.__musicTest.update(1 / 60); settle(); }
p.update = () => {};
await enter('mines');
const selected = state.zoneMusic;
ok(caveTracks.includes(selected) || selected === 'fallenNorth', 'entry did not select exploration music');
const mini = boss(); tick();
ok(state.bossBar === null && active() === 'music-' + selected, 'unengaged boss triggered encounter');
mini.aggro = true; tick();
ok(state.bossBar === mini && active() === 'music-boss', 'miniboss bar did not start Hellscape Assault');
const bossPlayer = players.find(a => a.id === 'music-boss');
bossPlayer.currentTime = 42;
const callCount = calls.length;
for (let i = 0; i < 120; i++) tick();
ok(calls.length === callCount && bossPlayer.currentTime === 42, 'ongoing encounter restarted music');
Sfx.setVol('master', .5); Sfx.setVol('music', .4);
ok(Math.abs(bossPlayer.volume - .2) < .0001 && bossPlayer.loop, 'boss volume or looping failed');
Sfx.setVol('music', 0); ok(bossPlayer.volume === 0, 'boss music ignored mute'); Sfx.setVol('music', .4);
const actBoss = boss('morthul'); actBoss.aggro = true; tick();
ok(state.bossBar === actBoss && calls.length === callCount, 'second boss restarted encounter track');
actBoss.die(p); settle();
ok(state.bossBar === mini && active() === 'music-boss', 'killing one boss ended a multi-boss soundtrack');
mini.aggro = false; tick();
ok(state.zoneMusic === selected && active() === 'music-' + selected, 'disengagement rerolled or lost zone music');
mini.aggro = true; tick(); mini.die(p); settle();
ok(!state.bossBar && active() === 'music-' + selected, 'last boss death did not restore zone music');
await enter('deepfreeze_cavern');
ok(state.zoneMusic !== selected, 'zone transition repeated exploration song');
const next = boss('hoarfang'); next.aggro = true; tick();
Game.onPlayerDeath(); tick();
ok(active() === '' && !state.bossBar, 'player death restarted exploration or boss music');
ok(await Game.returnToTown(), 'town revival failed'); settle();
ok(!p.dead && active() === 'music-frosthaven', 'revival did not restore town theme');
await enter('north_wild');
ok(active() === 'music-fallenNorth', 'first area outside town lost its theme');
const townBoss = boss(); townBoss.aggro = true; tick();
await enter('marshcamp');
ok(active() === 'music-marshTown' && !state.bossBar, 'leaving a boss for another zone retained boss music');
Sfx.stopMusic(); Sfx.music('title'); settle();
ok(active() === 'titleMusic', 'title handoff retained gameplay music');
ok(players.length === new Set(players.map(a => a.id)).size, 'duplicate recorded audio players');
Sfx.stopMusic();
console.log(`PASS ${checks} zone and boss music checks: all zones, random pool, fixed first areas, entry, boss/miniboss bars, multiple bosses, disengagement, deaths, revival, volume, fades, continuity and title handoff.`);
