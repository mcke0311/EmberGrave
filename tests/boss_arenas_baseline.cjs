// The working tree at the start of this change, including the campaign refresh.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const archive=path.join(__dirname,'fixtures/boss_arenas_before.json.gz');
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
function ensureSnapshot(directory='tmp/boss_arenas/before',sourceArchive=archive){
 const root=path.resolve(directory),pack=JSON.parse(zlib.gunzipSync(fs.readFileSync(sourceArchive)));
 if(pack.format!==1)throw Error('Unsupported arena baseline');
 for(const [file,source]of Object.entries(pack.files)){
  if(!/^(index\.html|js\/[a-zA-Z0-9_-]+\.(js|mjs))$/.test(file))throw Error('Invalid baseline path');
  const target=path.resolve(root,file);
  if(!target.startsWith(root+path.sep)||hash(source)!==pack.hashes[file])throw Error('Invalid baseline source');
  if(fs.existsSync(target)){if(hash(fs.readFileSync(target))!==pack.hashes[file])throw Error('Arena baseline changed: '+file);}
  else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,source);}
 }
 return path.join(root,'js');
}
module.exports={ensureSnapshot};
