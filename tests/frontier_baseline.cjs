// Restore the exact pre-redesign sources for the isolated visual/performance review.
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const ref='b036a3bae9be7cd656ed76d8a472f6b212aacf42';
const root=path.resolve(__dirname,'../tmp/frontier/before');
const files=execFileSync('git',['ls-tree','-r','--name-only',ref,'js','css','index.html'],{encoding:'utf8'}).trim().split('\n');
for(const file of files){
 const dest=path.resolve(root,file);
 if(!dest.startsWith(root+path.sep))throw Error('Invalid baseline path');
 fs.mkdirSync(path.dirname(dest),{recursive:true});
 fs.writeFileSync(dest,execFileSync('git',['show',ref+':'+file],{maxBuffer:32*1024*1024}));
}
fs.writeFileSync(path.join(root,'baseline.json'),JSON.stringify({ref,files},null,2)+'\n');
console.log('Restored frontier baseline '+ref+' ('+files.length+' files).');
