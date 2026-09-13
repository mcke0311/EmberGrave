// The campaign now lives in a worker; inspect it through its runtime contract.
// Live browser coverage exercises rendering and the actual relay independently.
const {spawnSync}=require('node:child_process');
for(const args of [
  ['--test','--test-name-pattern=four worlds','tests/coop_runtime.test.cjs'],
  ['tests/coop_independent_browser.cjs']
]){
  const result=spawnSync(process.execPath,[...process.execArgv,...args],{stdio:'inherit',env:process.env});
  if(result.status!==0)process.exit(result.status||1);
}
