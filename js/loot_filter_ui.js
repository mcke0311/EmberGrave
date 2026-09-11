/* Display-only filter workshop. Preset edits always operate on a fresh custom copy. */
"use strict";
const LootFilterUI = (() => {
  const clone = value => JSON.parse(JSON.stringify(value));
  const presets = [
    ["showall", "Show all", "Every drop, every possibility.", "No hiding"],
    ["standard", "Standard", "Keep useful gear and crafting finds.", "Recommended"],
    ["strict", "Strict", "Less clutter. Focus on rare gear.", "Selective"],
    ["endgame", "Endgame", "Top rarities and powerful rares.", "Very selective"],
  ];
  const props = [["rarity","Rarity"],["type","Item type"],["name","Item name"],["sockets","Socket count"],["mods","Affix count"],["reqLvl","Required level"],["power","Item level"],["phys","Physical damage"],["armor","Armor"],["value","Sell value"],["craft","Crafting score"],["slot","Equipment slot"],["hasMod","Has affix"],["skill","Skill bonus"],["quest","Quest item"],["unique","Unique item"],["legendary","Set item"]];
  const rarities = [[0,"Common"],[1,"Enhanced"],[2,"Rare"],[3,"Set"],[4,"Unique"]];
  const operators = [[">=","at least"],["<=","at most"],["==","is"],["!=","is not"],[">","greater than"],["<","less than"],["contains","contains"]];
  const boolProps = ["quest","unique","legendary"];
  const sounds = [["","Default"],["none","Silent"],["dropUnique","Fanfare"],["dropRare","Chime"],["drop","Thud"],["pickup","Blip"],["forge","Forge"],["crit","Crit"]];
  function el(tag, cls, text) { const n=document.createElement(tag); if(cls)n.className=cls; if(text!=null)n.textContent=text; return n; }
  function button(text, fn, cls="lf-button") { const b=el("button",cls,text);b.type="button";b.onclick=fn;return b; }
  function select(opts, value, fn, label) {
    const s=el("select");s.setAttribute("aria-label",label);
    // Keep values from older/shared filters editable even if absent from our suggestions.
    if(!opts.some(o=>String(o[0])===String(value)))opts=opts.concat([[value,String(value)]]);
    opts.forEach(([v,t])=>{const o=el("option","",t);o.value=v;s.append(o);});s.value=String(value);s.onchange=()=>fn(s.value);return s;
  }
  function field(label, control) { const l=el("label","lf-field");l.append(el("span","lf-label",label),control);return l; }
  function choices(prop) {
    if(prop==="rarity")return rarities;
    if(boolProps.includes(prop))return [["true","Yes"],["false","No"]];
    if(prop==="skill")return [["any","Any class"],...Object.entries(DATA.CLASSES).map(([k,v])=>[k,v.name])];
    if(prop==="type")return [...new Set(["glyph","jewel","charm","consumable","gold",...Object.values(DATA.BASES||{}).map(b=>b.cat).filter(Boolean)])].sort().map(v=>[v,v[0].toUpperCase()+v.slice(1)]);
    if(prop==="slot")return [["","None"],...["main","off","head","chest","gloves","boots","belt","amulet","ring","charm"].map(v=>[v,v[0].toUpperCase()+v.slice(1)])];
    if(prop==="hasMod")return Object.entries(DATA.STAT_TEXT).map(([k,fn])=>[k,fn(1)]);
    return null;
  }
  function summary(c) {
    const label=props.find(p=>p[0]===c.prop)?.[1]||c.prop;
    const value=choices(c.prop)?.find(o=>String(o[0])===String(c.value))?.[1]??c.value;
    return label+" "+(["skill","hasMod",...boolProps].includes(c.prop)?"is":operators.find(o=>o[0]===c.op)?.[1]||c.op)+" "+value+(c.min!=null?" (minimum "+c.min+")":"");
  }
  function samples() {
    const base={kind:"equipment",type:"sword",slot:"main",rarity:0,reqLvl:5,power:10,phys:12,armor:0,value:40,mods:0,modList:[],sockets:0,craft:0,quest:false,unique:false,legendary:false,marked:false,currency:false};
    return [
      ["Iron Sword",{}], ["Socketed Axe",{type:"axe",sockets:2,craft:2}],
      ["Enhanced Boots",{type:"boots",slot:"boots",rarity:1,mods:1}],
      ["Rare Warblade",{rarity:2,mods:4,modList:[{stat:"dmgPct",val:30},{stat:"str",val:8},{stat:"life",val:20},{stat:"frw",val:10}]}],
      ["Crafting Jewel",{kind:"jewel",type:"jewel",slot:"",craft:3}],
      ["Unique Amulet",{type:"amulet",slot:"amulet",rarity:4,unique:true}],
      ["Set Helm",{type:"helm",slot:"head",rarity:3,legendary:true}],
      ["120 Gold",{kind:"gold",type:"gold",slot:"",currency:true,value:120}],
    ].map(([name,p])=>({_props:{...base,...p,name}}));
  }
  function open(box, navigation) {
    const LF=LootFilter;
    let selected=0, undo=null, notice="", transfer=null, transferText="", transferError="", reveal=false;
    box.classList.add("loot-workshop");box.setAttribute("role","dialog");box.setAttribute("aria-modal","true");box.setAttribute("aria-label","Loot filter");
    function restore() { const previous=undo;undo=null;LF.importJSON(previous);notice="Previous filter restored";render(); }
    function change(fn, message="Changes saved", redraw=true) { undo=LF.exportJSON();fn();notice=message;if(redraw)render();else refresh(); }
    function patch(fn, message, redraw=true) {
      change(()=>{LF.setPreset("custom");const r=clone(LF.rules()[selected]);fn(r);LF.editRule(r.id,r);},message,redraw);
    }
    // Text-field blur must not remove the button receiving the user's next click.
    function refresh() {
      const r=LF.rules()[selected],row=box.querySelectorAll(".lf-rule")[selected];
      if(row){row.querySelector("strong").textContent=r.name;row.querySelector(".lf-rule-summary").textContent=r.conditions.map(summary).join(r.logic==="OR"?" or ":" and ")||"Matches every drop";}
      box.querySelector(".lf-rules-area h3").textContent="Your custom rules";
      box.querySelector(".lf-copy-note")?.remove();
      const preview=box.querySelector(".lf-preview");preview.replaceChildren();renderPreview(preview);
      box.querySelector(".lf-save").textContent=notice;
      if(!box.querySelector(".lf-undo")){const b=button("Undo",restore,"lf-button lf-undo");box.querySelector(".lf-save").after(b);}
    }
    function exit(fn) { box.onkeydown=null;fn(); }
    box.onkeydown=e=>{
      if(e.key==="Escape"){e.preventDefault();e.stopPropagation();if(transfer){transfer=null;render();}else exit(navigation.back);return;}
      if(e.key==="Tab"){
        const nodes=[...box.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea')].filter(n=>n.getClientRects().length);
        const first=nodes[0],last=nodes.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    };
    function render() {
      const focus=document.activeElement?.dataset.lfFocus, scroll=box.querySelector(".lf-body")?.scrollTop||0;
      box.replaceChildren();
      const head=el("header","lf-header"),titles=el("div");
      titles.append(el("div","lf-eyebrow","FIELD KIT / LOOT VISIBILITY"),el("h2","","Loot filter"),el("p","lf-muted","Find the drops worth stopping for."));
      const enabled=button(LF.config.enabled?"● Filter on":"○ Filter off",()=>change(()=>LF.setEnabled(!LF.config.enabled)),"lf-button lf-toggle");
      enabled.setAttribute("role","switch");enabled.setAttribute("aria-checked",String(LF.config.enabled));enabled.setAttribute("aria-label","Enable loot filter");
      head.append(titles,enabled,button("×",()=>exit(navigation.close),"lf-close"));head.lastChild.setAttribute("aria-label","Close loot filter");box.append(head);
      const body=el("div","lf-body");box.append(body);
      if(!LF.config.enabled)body.append(el("div","lf-warning","Filter is off. All drops are visible; your rules are saved for later."));
      const section=el("div","lf-section-heading");section.append(el("h3","","Choose your starting point"),el("span","lf-muted","Changes apply immediately"));body.append(section);
      const cards=el("div","lf-presets");
      presets.forEach(([key,name,desc,tag])=>{
        const b=button("",()=>change(()=>{LF.setPreset(key);selected=0;},name+" active"),"lf-preset");b.dataset.preset=key;b.setAttribute("aria-pressed",String(LF.config.preset===key));
        b.append(el("small","",tag),el("strong","",name),el("span","",desc));cards.append(b);
      });body.append(cards);
      const safety=el("div","lf-safety");safety.append(el("span","","◇ Always visible"),document.createTextNode("Unique, set, quest and marked items, gold and scrolls stay visible."));body.append(safety);
      const layout=el("div","lf-layout"),work=el("section","lf-rules-area"),preview=el("aside","lf-preview");layout.append(work,preview);body.append(layout);
      const rules=LF.rules();selected=Math.max(0,Math.min(selected,rules.length-1));
      const bar=el("div","lf-section-heading");bar.append(el("h3","",LF.config.preset==="custom"?"Your custom rules":"Filter rules"),el("span","lf-count",rules.length+" rules"));
      if(LF.config.preset!=="custom"&&LF.config.rules.length)bar.append(button("Restore custom",()=>change(()=>{LF.importJSON(JSON.stringify({...LF.config,preset:"custom"}));selected=0;})));
      bar.append(button("+ Add rule",()=>change(()=>{LF.addRule({name:"Highlight rare gear",conditions:[{prop:"rarity",op:">=",value:2}],action:{glow:"#e8d060"}});selected=LF.rules().length-1;},"Rule added. Move it up to give it priority.")));work.append(bar);
      work.append(el("p","lf-muted lf-rule-help","First matching rule wins. Unmatched drops stay visible."));
      const split=el("div","lf-rule-split"),list=el("nav","lf-rule-list");list.setAttribute("aria-label","Filter rules in priority order");split.append(list);work.append(split);
      if(!rules.length)list.append(el("p","lf-empty","No rules yet. Every drop is shown. Add a rule to customize your filter."));
      rules.forEach((r,i)=>{
        const b=button("",()=>{selected=i;render();},"lf-rule");b.dataset.lfFocus="rule-"+i;b.setAttribute("aria-pressed",String(selected===i));b.classList.toggle("is-disabled",!r.enabled);
        const title=el("div","lf-rule-title");title.append(el("span","lf-number",String(i+1).padStart(2,"0")),el("strong","",r.name||"Untitled rule"));
        const desc=(r.conditions||[]).map(summary).join(r.logic==="OR"?" or ":" and ");
        b.append(title,el("span","lf-rule-summary",desc||"Matches every drop"),el("span","lf-badge "+(r.action?.hide?"hide":"show"),!r.enabled?"Disabled":r.action?.hide?"Hide":"Show"));list.append(b);
      });
      if(rules.length)split.append(editor(rules[selected],rules.length));
      renderPreview(preview);
      const foot=el("footer","lf-footer"),status=el("span","lf-save",notice||"Saved automatically on this device");status.setAttribute("role","status");
      foot.append(button("← Back",()=>exit(navigation.back)),status);
      if(undo)foot.append(button("Undo",restore,"lf-button lf-undo"));
      foot.append(button("Import / export",()=>{transfer="export";transferText=LF.exportJSON();transferError="";render();}),button("Reset",()=>change(()=>{LF.reset();selected=0;},"Reset to Standard. Undo is available.")),button("Done",()=>exit(navigation.close),"lf-button lf-primary"));box.append(foot);
      if(transfer)renderTransfer(body);
      box.querySelectorAll("button,input,select,textarea").forEach((n,i)=>{if(!n.dataset.lfFocus)n.dataset.lfFocus="control-"+i;});
      if(focus) [...box.querySelectorAll("[data-lf-focus]")].find(n=>n.dataset.lfFocus===focus)?.focus({preventScroll:true});
      body.scrollTop=scroll;
    }
    function editor(rule,total) {
      const wrap=el("section","lf-editor");wrap.setAttribute("aria-label","Edit selected rule");
      const top=el("div","lf-section-heading");top.append(el("span","lf-eyebrow","RULE "+String(selected+1).padStart(2,"0")));
      const on=el("input");on.type="checkbox";on.checked=rule.enabled;on.onchange=()=>patch(r=>r.enabled=on.checked);const toggle=el("label","lf-check");toggle.append(on,document.createTextNode("Enabled"));top.append(toggle);wrap.append(top);
      const name=el("input");name.value=rule.name||"";name.maxLength=100;name.dataset.lfFocus="rule-name";
      name.onchange=()=>patch(r=>r.name=name.value.trim()||"Untitled rule",undefined,false);wrap.append(field("Rule name",name));
      const actions=el("div","lf-rule-actions");
      [["↑ Move up",-1],["↓ Move down",1]].forEach(([label,dir])=>{const b=button(label,()=>change(()=>{LF.setPreset("custom");LF.moveRule(LF.rules()[selected].id,dir);selected+=dir;}));b.disabled=selected+dir<0||selected+dir>=total;actions.append(b);});
      actions.append(button("Duplicate",()=>change(()=>{LF.setPreset("custom");LF.duplicateRule(LF.rules()[selected].id);selected++;})),button("Delete",()=>change(()=>{LF.setPreset("custom");LF.deleteRule(LF.rules()[selected].id);},"Rule deleted. Undo is available."),"lf-button lf-danger"));wrap.append(actions);
      wrap.append(el("h4","","When an item matches"),field("Condition logic",select([["AND","All conditions (AND)"],["OR","Any condition (OR)"]],rule.logic||"AND",v=>patch(r=>r.logic=v),"Condition logic")));
      (rule.conditions||[]).forEach((c,ci)=>{
        const row=el("div","lf-condition");
        row.append(select(props,c.prop,v=>patch(r=>{r.conditions[ci]={prop:v,op:["name","type","slot"].includes(v)?"==":">=",value:choices(v)?.[0]?.[0]??0};if(boolProps.includes(v))r.conditions[ci].value=true;}),"Condition "+(ci+1)+" property"));
        if(!["skill","hasMod",...boolProps].includes(c.prop))row.append(select(["name","type","slot"].includes(c.prop)?operators.filter(o=>["==","!=","contains"].includes(o[0])):operators.filter(o=>o[0]!=="contains"),c.op,v=>patch(r=>r.conditions[ci].op=v),"Condition "+(ci+1)+" comparison"));
        const opts=c.op==="contains"?null:choices(c.prop);
        const setValue=(v,redraw=true)=>patch(r=>{r.conditions[ci].value=boolProps.includes(c.prop)?v==="true":!["name","type","slot","hasMod","skill"].includes(c.prop)&&v!==""&&Number.isFinite(+v)?+v:v;},undefined,redraw);
        if(opts)row.append(select(opts,c.value,setValue,"Condition "+(ci+1)+" value"));
        else {const value=el("input");value.value=c.value??"";value.maxLength=200;value.setAttribute("aria-label","Condition "+(ci+1)+" value");value.placeholder=c.prop==="name"?"Item name":"e.g. 10 or player-5";
          value.oninput=()=>value.setCustomValidity("");
          value.onchange=()=>{const v=value.value.trim();if(!["name","type","slot"].includes(c.prop)&&!/^(?:-?\d+(?:\.\d+)?|player\s*(?:[-+]\s*\d+)?)$/i.test(v)){value.setCustomValidity("Enter a number or a level reference such as player-5.");value.reportValidity();return;}setValue(v,false);};row.append(value);}
        const remove=button("×",()=>patch(r=>r.conditions.splice(ci,1)),"lf-button lf-remove");remove.setAttribute("aria-label","Remove condition "+(ci+1));row.append(remove);
        if(c.prop==="hasMod"){const min=el("input");min.type="number";min.value=c.min??"";min.placeholder="Any amount";min.onchange=()=>patch(r=>{if(min.value==="")delete r.conditions[ci].min;else r.conditions[ci].min=+min.value;},undefined,false);row.append(field("Minimum affix value",min));}
        wrap.append(row);
      });
      if(!rule.conditions?.length)wrap.append(el("p","lf-warning","This rule matches every drop. Rules below it will not run."));
      wrap.append(button("+ Add condition",()=>patch(r=>{(r.conditions||(r.conditions=[])).push({prop:"rarity",op:">=",value:2});})));
      if(rule.conditions?.some(c=>!choices(c.prop)&&c.prop!=="name"))wrap.append(el("p","lf-muted","Numbers can use your level: player, player-10 or player+5."));
      wrap.append(el("h4","","Then display it as"));
      const visibility=el("div","lf-segment");[[false,"Show item"],[true,"Hide item"]].forEach(([hide,label])=>{const b=button(label,()=>patch(r=>r.action={...r.action,hide}));b.setAttribute("aria-pressed",String(!!rule.action?.hide===hide));visibility.append(b);});wrap.append(visibility);
      if(rule.action?.hide)wrap.append(el("p","lf-muted","Protected items remain visible, even when this rule matches."));
      else {
        const appearance=el("details","lf-appearance");appearance.open=true;appearance.append(el("summary","","Appearance & sound"));
        const grid=el("div","lf-appearance-grid");
        [["color","Label color"],["glow","Glow"],["beam","Light beam"],["minimap","Minimap dot"]].forEach(([key,label])=>{
          const group=el("div","lf-color-control"),current=rule.action?.[key];
          const opts=key==="color"?[["default","Rarity default"],["custom","Custom"]]:[["default","Rarity default"],["custom","Custom"],["off","Off"]];
          group.append(field(label,select(opts,current===null?"off":current?"custom":"default",v=>patch(r=>{r.action={...r.action};if(v==="default")delete r.action[key];else r.action[key]=v==="off"?null:"#e8c681";}),label+" mode")));
          if(current){const color=el("input");color.type="color";color.value=current;color.setAttribute("aria-label",label);color.onchange=()=>patch(r=>r.action[key]=color.value,undefined,false);group.append(color);}grid.append(group);
        });
        const size=el("input");size.type="number";size.min="0.8";size.max="1.8";size.step="0.1";size.value=rule.action?.size??1;size.onchange=()=>{if(!size.checkValidity()||!size.value){size.reportValidity();return;}patch(r=>r.action={...r.action,size:+size.value},undefined,false);};grid.append(field("Label size (0.8–1.8×)",size));
        grid.append(field("Drop sound",select(sounds,rule.action?.sound===null?"none":rule.action?.sound||"",v=>{patch(r=>{r.action={...r.action};if(!v)delete r.action.sound;else r.action.sound=v==="none"?null:v;});},"Drop sound")));
        appearance.append(grid);if(rule.action?.sound)appearance.append(button("▷ Test sound",()=>Sfx.play(rule.action.sound)));wrap.append(appearance);
      }
      if(LF.config.preset!=="custom")wrap.append(el("p","lf-muted lf-copy-note","Editing creates your own custom filter. Built-in presets stay available."));
      return wrap;
    }
    function renderPreview(target) {
      const results=samples().map(gi=>({gi,d:LF.evaluate(gi,Game.state?.player)})),hidden=results.filter(r=>r.d.hide).length;
      target.append(el("div","lf-eyebrow","LIVE PREVIEW"),el("h3","","A look at your drops"),el("p","lf-muted","Example items, evaluated with your current filter and hero level."));
      const stats=el("div","lf-preview-stats");stats.append(el("strong","",(results.length-hidden)+" shown"),el("span","",hidden+" hidden"));target.append(stats);
      const show=el("input");show.type="checkbox";show.checked=reveal;show.onchange=()=>{reveal=show.checked;render();};const label=el("label","lf-check");label.append(show,document.createTextNode("Reveal hidden samples"));target.append(label);
      const stage=el("div","lf-preview-stage");
      results.forEach(({gi,d})=>{
        const row=el("div","lf-sample");row.classList.toggle("is-hidden",d.hide);row.dataset.sample=gi._props.name;
        const item=el("span","lf-drop",d.hide&&!reveal?"Hidden item":gi._props.name);item.style.color=d.hide&&!reveal?"#929da8":d.color;item.style.fontSize=(13*d.size)+"px";
        if(!d.hide||reveal){if(d.glow)item.style.boxShadow="0 0 12px "+d.glow+"55, inset 0 0 0 1px "+d.glow;if(d.beam)item.style.borderLeft="3px solid "+d.beam;}
        const reason=d.protected?"Protected · always visible":d.rule||"No match · shown by default";
        row.append(item,el("small","",reason));
        if(!d.hide&&(d.minimap||d.sound))row.append(el("small","lf-preview-effects",[d.minimap?"◆ Minimap":"",d.sound?"♪ Sound":""].filter(Boolean).join(" · ")));stage.append(row);
      });target.append(stage);
      const key=button(LF.config.revealKey.toUpperCase(),()=>{
        key.textContent="Press a key…";key.focus();
        key.onkeydown=e=>{e.preventDefault();e.stopPropagation();if(e.key==="Tab"||e.key==="Escape"){key.onkeydown=null;render();return;}if(e.repeat)return;change(()=>LF.setRevealKey(e.key));};
        key.onblur=()=>{key.onkeydown=null;key.textContent=LF.config.revealKey.toUpperCase();};
      });key.setAttribute("aria-label","Change reveal hidden key");const help=el("div","lf-reveal-key");help.append(el("span","","Hold to reveal hidden loot"),key);target.append(help,el("p","lf-muted","Click the key to rebind. Escape cancels."));
    }
    function renderTransfer(body) {
      const panel=el("section","lf-transfer");panel.setAttribute("aria-label","Import or export filter");panel.append(el("h3","","Share your filter"),el("p","lf-muted","Copy this filter to keep a backup, or paste a shared filter below. Import replaces your current settings; Undo restores them."));
      const text=el("textarea");text.value=transferText;text.spellcheck=false;text.setAttribute("aria-label","Filter JSON");text.oninput=()=>transferText=text.value;panel.append(text);
      const error=el("p","lf-warning",transferError);error.setAttribute("role","alert");if(transferError)panel.append(error);
      const bar=el("div","lf-rule-actions");bar.append(button("Select all",()=>{text.focus();text.select();}),button("Import filter",()=>{
        const previous=LF.exportJSON();if(!LF.importJSON(text.value)){transferText=text.value;transferError="This filter is invalid. Check the JSON, rule conditions and display values, then try again.";render();return;}
        undo=previous;notice="Filter imported";transfer=null;selected=0;render();
      },"lf-button lf-primary"),button("Close sharing",()=>{transfer=null;render();}));panel.append(bar);body.prepend(panel);text.focus({preventScroll:true});
    }
    render();box.querySelector("button")?.focus();
  }
  return {open};
})();
