// Navigate the public pager controls to a production control before trusted input.
async function reveal(locator){
  await locator.waitFor({state:'attached'});
  await locator.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const found=await locator.evaluate(target=>{
    if(target.getClientRects().length)return true;
    const root=target.closest('.phone-paged');if(!root)return false;
    const button=text=>[...root.querySelectorAll('.phone-pager-foot button')].find(n=>n.textContent===text);
    const previous=()=>{let n=100;while(!button('Previous').disabled&&n--)button('Previous').click();};
    const scan=()=>{for(let i=0;i<100;i++){if(target.getClientRects().length)return true;if(button('Next').disabled)return false;button('Next').click();}return false;};
    previous();if(scan())return true;
    if(button('Sections').hidden)return false;
    button('Sections').click();const groups=[];
    for(let i=0;i<100;i++){groups.push(...[...root.querySelectorAll('.phone-section-choice:not(.phone-off)')].map(n=>n.textContent));if(button('Next').disabled)break;button('Next').click();}
    for(const group of groups){
      if(root.querySelector('.phone-pager-head strong').textContent!=='Sections')button('Sections').click();previous();
      for(let i=0;i<100;i++){const pick=[...root.querySelectorAll('.phone-section-choice:not(.phone-off)')].find(n=>n.textContent===group);if(pick){pick.click();break;}if(button('Next').disabled)break;button('Next').click();}
      if(scan())return true;
    }return false;
  });
  if(!found)throw new Error('Control is not reachable through phone pages: '+locator);
  await locator.waitFor({state:'visible'});
}
module.exports={reveal};
