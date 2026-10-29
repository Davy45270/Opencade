import { createDemo } from '../../engines/caisses/demo';
import { rect, circle, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); rect(c, 0, 0, 160, 120, '#101827');
        const b = demo.engine.board, s = demo.engine.state, unit = Math.min(144 / b.width, 104 / b.height);
        c.translate((160-b.width*unit)/2, (120-b.height*unit)/2);
        for (let p=0; p<b.width*b.height; p++) {
            const x=p%b.width*unit, y=Math.floor(p/b.width)*unit;
            rect(c,x,y,unit-1,unit-1,b.walls.includes(p)?'#52647c':'#20394c');
            if (b.targets.includes(p)) circle(c,x+unit/2,y+unit/2,unit*.3,'#64e4cc');
            if (s.boxes.includes(p)) rect(c,x+2,y+2,unit-4,unit-4,'#ffb867');
            if (s.player===p) circle(c,x+unit/2,y+unit/2,unit*.35,'#e5fff7');
        }
        c.restore();
    } };
}
