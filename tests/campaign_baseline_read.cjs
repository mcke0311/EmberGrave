// Read-only test adapter: run an existing contract against the saved source.
const fs=require('node:fs'),path=require('node:path'),{fileURLToPath}=require('node:url');
const read=fs.readFileSync,root=path.resolve('js')+path.sep,base=path.resolve('tmp/campaign_visual/before/js');
fs.readFileSync=function(input,...args){
 const p=input instanceof URL?fileURLToPath(input):typeof input==='string'?input:null;
 if(p){const full=path.resolve(p);if(full.startsWith(root))return read.call(fs,path.join(base,full.slice(root.length)),...args);}
 return read.call(fs,input,...args);
};
require('node:module').syncBuiltinESMExports();
