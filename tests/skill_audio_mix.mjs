// Render the actual production mixer, including its accents, rates, voice
// admission and compressor, at maximum user volume with 24 heavy critical hits.
export async function renderSkillMix(catalog, host=window){
  const offline=new host.OfflineAudioContext(2,44100*3,44100);
  const context={state:'running',get currentTime(){return offline.currentTime;}};
  for(const key of ['createDynamicsCompressor','createGain','createStereoPanner','createBufferSource','decodeAudioData'])context[key]=offline[key].bind(offline);
  const source=await fetch(new URL('../js/skill_audio.js',import.meta.url),{cache:'no-store'}).then(r=>r.text());
  const create=new Function('SkillAudioCatalog','document',source+'\nreturn SkillAudio;');
  const audio=create(catalog,{baseURI:new URL('../index.html',import.meta.url).href});
  await audio.init(context,offline.destination,{master:1,sfx:1,music:1});
  if(audio.snapshot().failed.length)throw Error('Offline mixer could not decode every texture');
  const p={x:0,y:0,stats:{},form:null};
  const ids=Object.keys(catalog.recipes).filter(id=>!catalog.recipes[id].passive).sort((a,b)=>catalog.recipes[b].weight-catalog.recipes[a].weight).slice(0,24);
  for(const id of ids)audio.play(id,'impact',{owner:p,crit:true});
  const admitted=audio.snapshot().totalVoices;
  const buffer=await offline.startRendering();let peak=0,sum=0;
  for(let channel=0;channel<buffer.numberOfChannels;channel++)for(const sample of buffer.getChannelData(channel)){peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;}
  return {peak,peakDb:20*Math.log10(peak),energy:sum,admitted,ids};
}
