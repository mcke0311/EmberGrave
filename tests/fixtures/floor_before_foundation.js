/* Frozen pre-foundation floor pass. Test fixture only; never loaded by the game. */
    /* ---- floors ---- */
    const theme = m.zone.theme;
    const massifTerrain = m.outdoor && MASSIF_THEMES.has(theme);
    const ev = m.elev;
    if (m.settlement) TownTerrain.draw(ctx,m,cam);
    for (let y = ty0; !m.settlement && y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const i = x + y * m.w;
        const blocked = !!m.walls[i];
        /* Outdoor wall blobs are authored as snow/rock terrain topped by sparse
           boundary massifs. Keep a ground cap beneath every blocked tile so the
           culled interior cannot expose backdrop-colored diamond holes. */
        if (blocked && !massifTerrain) continue;
        const sx = U.isoX(x + 0.5, y + 0.5) - cam.x;
        const eh = (ev ? ev[i] : 0) * EH, sy = U.isoY(x + 0.5, y + 0.5) - cam.y - eh;
        if (!inView(sx, sy)) continue;
        if (eh) {
          const lD = (ev[i] - (y + 1 < m.h ? ev[i + m.w] : 0)) * EH;   // left/SW face
          const rD = (ev[i] - (x + 1 < m.w ? ev[i + 1] : 0)) * EH;     // right/SE face
          const cliffId = SpriteAssets.maps.cliffs[theme] || SpriteAssets.maps.cliffs.fields;
          /* Cliff cells are half-diamond faces rooted at their upper corner,
             while (sx,sy) is the raised tile center.  Seat the y+1/SW face on
             the tile's left vertex and the x+1/SE face on its right vertex;
             drawing both at center creates the detached wavy ribbons that cut
             across Fallen North plateaus. */
          if (lD > 0) SpriteAssets.drawCliff(ctx,
            SpriteAssets.getFrame(cliffId, 4 + U.clamp(Math.ceil(lD / EH), 1, 4) - 1), sx - 32, sy, lD);
          if (rD > 0) {
            SpriteAssets.drawCliff(ctx,
              SpriteAssets.getFrame(cliffId, U.clamp(Math.ceil(rD / EH), 1, 4) - 1), sx + 32, sy, rD);
          }
        }
        LevelTerrain.drawTile(ctx,m,x,y,sx,sy);
      }
    }

    /* ---- ground items: end of fixture ---- */
