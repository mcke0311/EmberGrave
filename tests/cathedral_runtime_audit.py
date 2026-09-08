"""Compare legacy runtime guard failures with the captured pre-change sources."""
from pathlib import Path
import json
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools'))
import validate_sprite_assets as validator
current=[];validator.validate_runtime(current)
original=Path.read_text
baseline_root=ROOT/'tmp/cathedral/before'
def read_baseline(path,*args,**kwargs):
    try:
        relative=path.relative_to(ROOT)
    except ValueError:
        return original(path,*args,**kwargs)
    candidate=baseline_root/relative
    return original(candidate if relative.parts[0] in ('js','css') and candidate.exists() else path,*args,**kwargs)
before=[]
try:
    Path.read_text=read_baseline
    validator.validate_runtime(before)
finally:
    Path.read_text=original
new=[e for e in current if e not in before]
report={'status':'PASS' if not new else 'FAIL','baseline':before,'current':current,'introduced':new}
(ROOT/'tests/qa/cathedral/runtime_audit.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,indent=2));sys.exit(bool(new))
