// Restore the immutable source fixture into the ignored test working directory.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
function ensureSnapshot(directory='tmp/boss_animation/before'){
 const root=path.resolve(directory),pack=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(__dirname,'fixtures/boss_animation_before.json.gz'))));
 if(pack.format!==1)throw Error('Unsupported boss animation baseline');
 const entries=Object.entries(pack.files).map(([file,source])=>{
  if(!/^(index\.html|js\/[a-zA-Z0-9_-]+\.js)$/.test(file))throw Error('Invalid baseline path');
  const target=path.resolve(root,file),hash=crypto.createHash('sha256').update(source).digest('hex');
  if(!target.startsWith(root+path.sep)||hash!==pack.hashes[file])throw Error('Invalid baseline source');
  if(fs.existsSync(target)&&crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')!==hash)throw Error('Existing baseline differs from the archived pre-animation source: '+file);
  return {target,source};
 });
 for(const {target,source} of entries)if(!fs.existsSync(target)){fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,source);}
 return root;
}
module.exports={ensureSnapshot};
