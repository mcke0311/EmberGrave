/* Co-op never reads or writes the solo localStorage save namespace. */
const CoopStore=(()=>{
  let pending;
  function db(){
    return pending||(pending=new Promise((resolve,reject)=>{
      const req=indexedDB.open('embergrave-coop',1);
      req.onupgradeneeded=()=>{for(const name of ['heroes','campaigns'])req.result.createObjectStore(name,{keyPath:'id'});};
      req.onsuccess=()=>{req.result.onversionchange=()=>{req.result.close();pending=null;};resolve(req.result);};
      req.onerror=()=>{pending=null;reject(req.error);};
      req.onblocked=()=>{pending=null;reject(Error('Close other Embergrave tabs to open co-op saves.'));};
    }));
  }
  async function read(store,id){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(store),r=id===undefined?tx.objectStore(store).getAll():tx.objectStore(store).get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function commit(campaign,heroes=[]){
    const d=await db();return new Promise((resolve,reject)=>{
      const tx=d.transaction(['campaigns','heroes'],'readwrite');
      tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(tx.error||Error('Co-op save failed'));
      if(campaign)tx.objectStore('campaigns').put(campaign);
      for(const hero of heroes)tx.objectStore('heroes').put(hero);
    });
  }
  async function deleteHero(id){
    const d=await db();return new Promise((resolve,reject)=>{
      const tx=d.transaction(['heroes','campaigns'],'readwrite');
      tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(tx.error||Error('Could not delete hero'));
      tx.objectStore('heroes').delete(id);
      const cursor=tx.objectStore('campaigns').openCursor();cursor.onsuccess=()=>{const row=cursor.result;if(!row)return;if(row.value.ownerHeroId===id)row.delete();row.continue();};
    });
  }
  return {read,commit,deleteHero,heroes:()=>read('heroes'),campaigns:()=>read('campaigns')};
})();
