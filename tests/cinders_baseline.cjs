// Capture the actual working tree once, including concurrent uncommitted work.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'tmp/cinders/before');
if(fs.existsSync(path.join(dest,'baseline.json')))throw Error('Baseline already captured; refusing to overwrite it.');
const files=[];
function copy(relative){const source=path.join(root,relative),target=path.join(dest,relative);if(fs.statSync(source).isDirectory()){for(const name of fs.readdirSync(source))copy(path.join(relative,name));return;}fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);files.push({path:relative.replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')});}
for(const name of ['index.html','js','css','assets/sprites_src/gameplay_art/gameplay_art_v1.json','assets/sprites/coverage.json'])copy(name);
fs.writeFileSync(path.join(dest,'baseline.json'),JSON.stringify({capturedAt:new Date().toISOString(),source:'working tree before Act 5 implementation',files},null,2)+'\n');
console.log('Captured '+files.length+' working-tree files in tmp/cinders/before.');
