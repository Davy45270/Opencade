import { expect, test } from 'vitest';
import { trajectoryCopies } from './bubble-cases';
import { Engine, center, ORIGIN, type Cell } from '../src/engines/bubble/engine';
// All shots originate at the literal launcher (180, 570); angles are from up.
const cases: [string, Cell[], number, number, number, number][] = [
 ['B-HEX-01 dessous', [{row:0,col:4,color:0}], 0, 1, 3, 1],
 ['B-HEX-02 biais gauche', [{row:0,col:4,color:0}], -0.05, 1, 3, 1],
 ['B-HEX-03 biais droite', [{row:0,col:4,color:0}], 0.05, 1, 4, 1],
 ['B-HEX-04 mur gauche', [{row:0,col:4,color:0}], -0.5, 1, 3, 2],
 ['B-HEX-05 mur droit', [{row:0,col:4,color:0}], 0.5, 1, 4, 2],
 ['B-HEX-06 trou traversé', [{row:1,col:3,color:0},{row:1,col:5,color:0}], 0.04, 0, 5, 1],
 ['B-HEX-07 plafond', [], 0, 0, 4, 1],
 ['B-HEX-08 rangée impaire', [{row:1,col:4,color:0}], 0.04, 2, 4, 1],
 ['B-HEX-09 rangée paire', [{row:2,col:4,color:0}], 0, 3, 3, 1],
];
for (const [name, grid, angle, row, col, segments] of cases) test(name, () => {
 expect(ORIGIN).toEqual({x:180,y:570});
 const e = new Engine(); e.load(grid, 0, 452); e.aim(angle);
 const path = e.trace();
 expect(path.target).toEqual({row,col,color:0}); expect(path.segments).toHaveLength(segments);
 e.shoot(); e.advance(10000); expect(e.last.attached).toEqual({row,col,color:0});
});
test('B-HEX-16 premier contact, sans remonter au travers de la grille', () => {
 const e=new Engine(); e.load([{row:0,col:4,color:0},{row:2,col:4,color:0}]);
 expect(e.trace(0).target).toEqual({row:3,col:3,color:0});
 expect(e.trace(0).segments.at(-1)?.to.y).toBeCloseTo(123.28203230275508, 9);
});
test('B-HEX-10 réflexion exacte et bornes', () => {
 const e = new Engine(); e.load([]);
 for (const angle of [-0.8, 0.8]) {
  const path=e.trace(angle), a=path.segments[0], b=path.segments[1];
  if (!a || !b) throw new Error('Rebond absent');
  expect(Math.abs(Math.atan2(-b.direction.x,-b.direction.y)-angle)).toBeLessThan(1e-9);
  expect(b.from).toEqual(a.to);
 }
 e.aim(-10); expect(e.angle).toBeCloseTo(-1.3962634015954636, 12);
 e.aim(10); expect(e.angle).toBeCloseTo(1.3962634015954636, 12);
});
test('B-HEX-11 chute seule des groupes détachés, bonus', () => {
 const e=new Engine(); e.load([{row:0,col:4,color:0},{row:1,col:4,color:0},{row:1,col:5,color:1},{row:0,col:0,color:2},{row:1,col:0,color:2}]);
 e.shoot();e.advance(10000);
 expect(e.last.popped).toHaveLength(3);
 expect(e.last.fallen).toEqual([{row:1,col:5,color:1}]);
 expect(e.grid).toEqual([{row:0,col:0,color:2},{row:1,col:0,color:2}]); expect(e.score).toBe(50);
});
test('B-HEX-12 descente, parité et ligne de défaite', () => {
 const e=new Engine();e.loadLevel(9); e.load([{row:0,col:0,color:0},{row:1,col:0,color:1},{row:11,col:7,color:1}]);
 e.resolved=5; e.aim(0);e.shoot();e.advance(10000);
 expect(e.drops).toBe(1);expect(e.status).toBe('lost');
 expect(center({row:0,col:0},1).x).toBe(20);expect(center({row:1,col:0},1).x).toBe(40);
 expect(center({row:11,col:7},1).y+20).toBeGreaterThan(455);
});
test('B-HEX-13 déterminisme et échange sans consommer le générateur', () => {
 const play=()=>{const e=new Engine(452);for(const angle of [-0.3,0.2,0.7,-0.8,0]){e.aim(angle);e.shoot();e.advance(10000);}return e.snapshot();};
 expect(play()).toEqual(play());
 const e=new Engine(452), before=e.snapshot(); expect(e.swap()).toBe(true);
 expect(e.next).toBe(before.queued);expect(e.queued).toBe(before.next);expect(e.random.state).toBe(before.random);
 e.shoot();expect(e.swap()).toBe(false);
});

test('B-HEX-17 cache isolé : couleur, copie, chargement et butoirs',()=>{trajectoryCopies();});
