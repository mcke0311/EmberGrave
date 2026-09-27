// Event placement before the shared dashboard extraction. Used for RNG parity.
  function placeEvents(map) {
    if (map.cathedral) return; // encounters and rewards have reserved places in these compositions
    if (map.eventsPlaced) return;                   // events are one-time per map instance — don't re-roll (or re-spawn used shrines) on re-entry
    map.eventsPlaced = true;
    map.props = map.props.filter(p => !p.event);
    const z = map.zone;
    if (z.kind === "town" || z.kind === "camp" || z.opening) return;
    const lvl = DATA.effectiveLevel(z.lvl, state.difficulty);
    const pool = DATA.EVENTS.filter(e => (e.minLvl || 1) <= lvl + 2);
    if (!pool.length) return;
    const composition=map.composition||map.act2||map.frontier;
    const random=composition?U.rng(state.seed^U.hash(map.id)^0x77e17):Math.random;
    const anchors=(composition?.anchors.events||[]).slice();
    for(let i=anchors.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[anchors[i],anchors[j]]=[anchors[j],anchors[i]];}
    const count = 1 + (random() < 0.6 ? 1 : 0) + (random() < 0.3 ? 1 : 0);
    const sp = map.spawns.default || { x: 0, y: 0 };
    for (let n = 0; n < count; n++) {
      const ev = U.wpick(pool.map(e => [e, e.weight || 1]),random);
      let x = 0, y = 0, ok = false;
      if(composition){const a=anchors[n];if(!a)continue;x=a.x;y=a.y;ok=TerrainNavigation.clear(map,x,y,.4);}
      for (let tries = 0; !composition && tries < 70 && !ok; tries++) {
        x = 3 + Math.random() * (map.w - 6); y = 3 + Math.random() * (map.h - 6);
        if (MapGen.walkable(map, x, y) && U.dist(x, y, sp.x, sp.y) > 9 &&
            (!map.bossArena || !BossEncounters.insideArena(map.bossArena,x,y,-3))) ok = true;
      }
      if (!ok) continue;
      if (ev.kind === "goblin") {
        const ids = enemiesByFamily("beast", lvl,{x,y});
        const m = map.act2?Act2EnemyCombat.eventSpawn(ids,x,y,{},[],random):new Monster(U.pickR(random,ids), x, y, {});
        if(!m)continue;
        m.flee = true; m.eventDrops = ev.drops || 4; m.name = ev.name; m.tint = ev.color;
        m.def.speed = Math.max(m.def.speed, 3.6) + 1; m.scale *= 0.9; m.spriteOpts.scale = m.scale;
        state.monsters.push(m);
      } else {
        map.props.push({ type: ev.visual || "shrine", x, y, seed: (x * 31 + y * 17) | 0, blocks: false, interact: "event", event: true, ev, label: ev.name });
      }
    }
  }
