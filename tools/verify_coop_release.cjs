const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),P=require('../js/coop_protocol.js');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
assert.equal(P.VERSION,2);assert.equal(P.BUILD,'embergrave-coop-3');
const html=read('index.html'),files=new Set(['index.html','js/coop_worker.js','js/coop_runtime.js','js/character3d.mjs','server/relay.cjs','server/package.json','server/package-lock.json','server/Dockerfile']);
for(const [,url]of html.matchAll(/(?:src|href)="((?:js|css)\/[^" ]+)"/g)){
  const [file,query]=url.split('?');files.add(file);
  if(file.startsWith('js/'))assert.equal(new URLSearchParams(query).get('v'),P.BUILD,'Frontend version: '+file);
}
const worker=read('js/coop_worker.js');assert.ok(worker.includes("path+'?v="+P.BUILD));
for(const [,file]of worker.matchAll(/'([^']+\.js)'/g))files.add('js/'+file);
assert.ok(read('js/coop.js').includes("'js/coop_worker.js?v='+P.BUILD"));
assert.ok(read('js/player3d.js').includes('character3d.mjs?v='+P.BUILD));
assert.ok(read('server/relay.cjs').includes("require('../js/coop_protocol.js')"));
assert.ok(read('server/Dockerfile').includes('coop_protocol.js'));
const manifest={build:P.BUILD,protocol:P.VERSION,campaignSchema:2,preparedAt:new Date().toISOString(),
  files:Object.fromEntries([...files].sort().map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]))};
fs.mkdirSync(path.join(root,'tmp/coop-qa'),{recursive:true});fs.writeFileSync(path.join(root,'tmp/coop-qa/release-manifest.json'),JSON.stringify(manifest,null,2));
console.log('PASS matching frontend/worker/relay release: '+P.BUILD+' ('+files.size+' hashed files)');
