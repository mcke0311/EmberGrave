/* The shared management UI keeps solo callbacks local and sends only IDs in co-op. */
const InventoryActions=(()=>{
  let pending=false;
  const active=()=>typeof Coop!=='undefined'&&Coop.active;
  async function submit(command){
    if(!active()||pending)return false;
    pending=true;document.body.classList.add('inventory-pending');
    UI.managementStatus('Saving item change…');
    try{
      const ok=await Game.submitCommand(command);
      if(ok)UI.managementStatus('');return ok;
    }finally{
      pending=false;document.body.classList.remove('inventory-pending');
      UI.refreshManagement(true);UI.refreshHUD();UI.refreshBelt();
    }
  }
  function run(command,local){return active()?submit(command):local();}
  return {run,submit,get active(){return active();},get pending(){return pending;}};
})();
