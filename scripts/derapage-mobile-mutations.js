// Graphics regressions exercised against the real scene in Node.
export const mobileMutations = [
  [
    "banderole_invisible",
    "src/games/derapage/scene.ts",
    "g.fillStyle((row+cell)%2 ? 0xffffff : 0x080b10); g.fillPoints(points,true);",
    "g.fillStyle((row+cell)%2 ? 0xffffff : 0x080b10,0); g.fillPoints(points,true);"
  ],
  [
    "poteaux_invisibles",
    "src/games/derapage/scene.ts",
    "line(postA,topA,Math.max(3,scale*.7),0xf4e6b1); line(postB,topB,Math.max(3,scale*.7),0xf4e6b1);",
    "line(postA,topA,0,0xf4e6b1); line(postB,topB,0,0xf4e6b1);"
  ],
  [
    "flash_absent",
    "src/games/derapage/scene.ts",
    "this.sceneTime-this.lapCrossedAt<200)",
    "this.sceneTime-this.lapCrossedAt<0)"
  ],
  [
    "point_pouce_invisible",
    "src/games/derapage/scene.ts",
    "g.fillCircle(x + this.thumb.dx / reach * ratio, y + this.thumb.dy / reach * ratio, 7);",
    "g.fillCircle(x + this.thumb.dx / reach * ratio, y + this.thumb.dy / reach * ratio, 0);"
  ],
  [
    "projections_figees",
    "src/games/derapage/scene.ts",
    "const phase=((artTime/450+i/7)%1), side=i%2 ? 1 : -1;",
    "const phase=((i/7)%1), side=i%2 ? 1 : -1;"
  ],
  [
    "projections_devant_le_kart",
    "src/games/derapage/scene.ts",
    "p.x-Math.cos(p.angle)*(2+phase*4)-Math.sin(p.angle)*side*phase*2,p.y-Math.sin(p.angle)*(2+phase*4)+Math.cos(p.angle)*side*phase*2",
    "p.x+Math.cos(p.angle)*(2+phase*4)-Math.sin(p.angle)*side*phase*2,p.y+Math.sin(p.angle)*(2+phase*4)+Math.cos(p.angle)*side*phase*2"
  ],
  [
    "chevrons_retrecis",
    "src/games/derapage/scene.ts",
    "const strip=boostStrip(t,b);",
    "const strip=boostStrip(t,b); strip.half *= .1;"
  ],
  [
    "grand_chrono_fige",
    "src/games/derapage/scene.ts",
    "const lines = [`TOUR ${formatTime(timing.currentLapMs)}`,",
    "const lines = [`TOUR ${formatTime(0)}`,"
  ]
];
