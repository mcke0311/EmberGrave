// Test-only completed save. Call only with an isolated test game/storage context.
// Production never imports this module or exposes a progression shortcut.
export async function loadCompletedHero(game) {
  const player=game.state.player;
  game.state.flags.opening={v:2,stage:'done',rescued:true,supply:true,
    defeated:['guard','rescue0','rescue1','rescue2','gate0','gate1','captain'],hints:{},barks:{},waves:[]};
  game.state.flags.seenIntro=true;
  game.state.home='frosthaven';game.state.portal=null;
  game.saveGame();
  const slot=game.listSaves().find(s=>s.name===player.name&&s.classId===player.classId)?.slot;
  if(!slot)throw Error('Completed hero fixture needs isolated save storage');
  await game.loadGame(slot);
  if(game.state?.map?.id!=='frosthaven'||game.state.flags.opening.stage!=='done')throw Error('Completed hero fixture failed to load');
  return true;
}
