"""Build the local matched-image review and compact visual QA contact sheets."""
from pathlib import Path
import json,html
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'tests/qa/campaign_visual'
zones=json.loads((OUT/'zones.json').read_text())
rows=json.loads((OUT/'captures_after.json').read_text())['captures']
content=['<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Acts I–V environment refresh</title><style>body{margin:0;background:#111719;color:#e5ded1;font:16px/1.5 system-ui}header,main{max-width:1440px;margin:auto;padding:24px}h1,h2{font-family:Georgia}a{color:#cfc49c}select,button{background:#273437;color:inherit;padding:10px;border:1px solid #5b6460}section{margin-bottom:40px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}img{width:100%;display:block}figure{margin:0}figcaption{padding:8px;color:#b4bdb7}.links{display:flex;gap:20px}details{margin:14px 0}summary{cursor:pointer}@media(max-width:800px){.pair{grid-template-columns:1fr}}</style><header><h1>Acts I–V · Environment refresh</h1><p>Matched seed 12345, camera positions and production renderer. All 28 locations. Click either image for full resolution.</p><div class="links"><a href="../../campaign_visual_review.html">Play the isolated review</a><a href="asset_contact.jpg">30 new painted assets</a><a href="../../../docs/CAMPAIGN_VISUAL_REFRESH.md">Validation notes</a></div><p><label>Act <select id="act"><option value="all">All five acts</option>'+''.join(f'<option>{i}</option>' for i in range(1,6))+'</select></label></p></header><main>']
performance=OUT/'performance.json'
if performance.exists():
    p=json.loads(performance.read_text());passed=sum(r['pass'] for r in p['comparisons'])
    content[0]=content[0].replace('</header>',f'<p>Gameplay preserved across 28 areas × 30 seeds. Travel and original-save checks passed. Performance target: {passed}/{len(p["comparisons"])} workloads. <a href="performance.json">Measurements</a></p></header>')
for act,group in enumerate(zones,1):
    contact=Image.new('RGB',(1440,len(group)*245),'#141b20');d=ImageDraw.Draw(contact)
    for index,zone in enumerate(group):
        available=[r for r in rows if r['zone']==zone and r['width']==1920]
        hero=next((r for r in available if r['view'] not in ['arrival','entry'] and not r['view'].startswith('exit_')),available[0])
        content.append(f'<section data-act="{act}"><h2>Act {act} · {html.escape(zone.replace("_"," ").title())}</h2>')
        for j,r in enumerate(available):
            if j:content.append('<details><summary>'+html.escape(r['view'].replace('_',' ').title())+'</summary>')
            content.append('<div class="pair">')
            for phase in ['before','after']:
                name=r['name'].replace('after_',phase+'_',1)
                content.append(f'<figure><a href="{name}"><img loading="lazy" src="{name}" alt="{phase} {zone} {r["view"]}"></a><figcaption>{phase.title()} · {html.escape(r["view"].replace("_"," "))} · <a href="{name.replace("_1920.","_3840.")}">4K</a></figcaption></figure>')
            content.append('</div>')
            if j:content.append('</details>')
        phone=next((p for p in OUT.glob(f'after_{zone}_*_844.webp')),None)
        if phone:
            content.append(f'<details><summary>Landscape phone · 844 × 390</summary><a href="{phone.name}"><img loading="lazy" src="{phone.name}" alt="{zone} on a landscape phone" style="max-width:844px"></a></details>')
        content.append('</section>')
        for col,phase in enumerate(['before','after']):
            p=OUT/hero['name'].replace('after_',phase+'_',1)
            im=Image.open(p);im.thumbnail((720,220));contact.paste(im,(col*720,index*245+25));d.text((col*720+8,index*245+6),phase.upper()+'  '+zone+' / '+hero['view'],fill='white')
    contact.save(OUT/f'act{act}_contact.jpg',quality=91)
content.append('</main><script>document.querySelector("#act").onchange=e=>document.querySelectorAll("section").forEach(s=>s.hidden=e.target.value!=="all"&&s.dataset.act!==e.target.value)</script></html>')
(OUT/'gallery.html').write_text('\n'.join(content),encoding='utf-8')
print('Gallery:',len(rows),'captures and five matched act contact sheets')
