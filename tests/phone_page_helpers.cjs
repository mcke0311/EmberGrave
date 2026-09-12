// Reach a production control through the public tabs, then scroll it into view.
async function reveal(locator){
  await locator.waitFor({state:'attached'});
  await locator.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await locator.evaluate(target=>{
    const panel=target.closest('#panelWorkspace > .panel');
    if(panel?.classList.contains('workspace-inactive'))document.querySelector('#workspaceTabs [data-side="'+(panel.id==='panelRight'?'right':panel.id==='panelLeft'?'left':'center')+'"]')?.click();
    if(panel?.dataset.kind==='inv'){
      const tab=target.closest('#equipwrap')?'equipment':target.closest('.phone-belt-page')?'belt':'pack';
      if(!target.closest('.phone-subtabs'))panel.querySelector('.phone-subtabs [data-mobile-tab="'+tab+'"]')?.click();
    }
    if(panel?.dataset.kind==='skills'&&!target.getClientRects().length){
      if(target.closest('.phone-loadout'))panel.querySelector('.phone-loadout-tab')?.click();
      else {panel.querySelector('.treetab.on')?.click();if(target.closest('#skillDetail'))panel.querySelector('.talent-node[aria-pressed=true]')?.click();}
    }
  });
  await locator.waitFor({state:'visible'});await locator.scrollIntoViewIfNeeded();
}
module.exports={reveal};
