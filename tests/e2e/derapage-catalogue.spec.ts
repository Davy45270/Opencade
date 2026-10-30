import { test, expect } from './fixture';
import { nearest, shortcutAt } from '../../src/engines/derapage/track';
import type {} from '../../src/games/derapage/scene';

for (const [code, level, from, to] of [['K01',17,67,73],['K02',19,19,21],['K03',26,39,41]] as const) {
    test(`${code} catalogue au doigt`, async ({ page }, info) => {
        test.skip(info.project.name !== 'mobile-chromium');
        test.setTimeout(90_000);
        await page.setViewportSize({width:390,height:844});
        await page.addInitScript(() => {
            localStorage.setItem('arcade-lab:derapage:controls:v1',JSON.stringify({camera:'fixed',assist:true}));
        });
        await page.goto('/?test=1#/derapage');
        await expect.poll(()=>page.evaluate(()=>Boolean(window.__DERAPAGE_TEST__))).toBe(true);
        await page.locator('#resume').tap();
        await page.evaluate(level=>{const h=window.__DERAPAGE_TEST__;h?.loadLevel(level,28);h?.advance(0);},level);
        await page.waitForFunction(() => {
            const s=window.__DERAPAGE_TEST__?.read(),canvas=document.querySelector('#game canvas'),hud=document.querySelector<HTMLElement>('[data-derapage-hud]');
            if(!canvas || !hud || s?.status!=='playing' || s.karts.length!==6) return false;
            const box=canvas.getBoundingClientRect(),bounds=hud.getBoundingClientRect(),scale=box.width/360;
            const timer=hud.firstElementChild;if(!timer) return false;
            return bounds.top>=box.top && bounds.bottom<=box.top+96*scale && bounds.right<=box.right && Number.parseFloat(getComputedStyle(timer).fontSize)>=22*scale;
        });
        await page.screenshot({path:`test-results/screenshots/catalogue-${code}-depart.png`});
        const box=await page.locator('#game canvas').boundingBox();
        if(!box) throw new Error('Canevas absent');
        const cdp=await page.context().newCDPSession(page);
        const x=box.x+box.width*.55,y=box.y+box.height*.6;
        let reached=false,elapsed=0;
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
        try {
            for(let sample=0;sample<240;sample++) {
                const state=await page.evaluate(()=>window.__DERAPAGE_TEST__?.read());
                if(!state?.karts[0]) throw new Error('Kart absent');
                const k=state.karts[0],t=state.track,n=nearest(t,k);
                expect(state.status).toBe('playing');
                expect(state.controls.mode).toBe('joystick');
                if(elapsed>=3000 && n.index>=from && n.index<=to) {reached=true;break;}
                let target=t.points[(n.index+5)%96];
                const route=t.circuit.shortcut;
                if(route && n.index>=route.from-1 && n.index<route.to-1) {
                    const branch=shortcutAt(t,k),a=t.points[route.from],b=t.points[route.to];
                    if(branch && a && b) {const u=Math.min(1,branch.u+8/branch.length);target={x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u};}
                }
                if(!target) throw new Error('Cible absente');
                const angle=Math.atan2(target.y-k.y,target.x-k.x);
                await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+Math.cos(angle)*48,y:y+Math.sin(angle)*48,id:1}]});
                await page.evaluate(()=>window.__DERAPAGE_TEST__?.advance(300));
                elapsed+=300;
            }
        } finally {
            await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
        }
        expect(reached,'le doigt atteint la mécanique après plusieurs secondes').toBe(true);
        await page.waitForFunction(([from,to]) => {
            const s=window.__DERAPAGE_TEST__?.read(),k=s?.karts[0];if(!s || !k) return false;
            let best=Infinity,index=-1;
            for(let i=0;i<s.track.points.length;i++) {
                const a=s.track.points[i],b=s.track.points[(i+1)%96];if(!a || !b) return false;const dx=b.x-a.x,dy=b.y-a.y;
                const u=Math.max(0,Math.min(1,((k.x-a.x)*dx+(k.y-a.y)*dy)/(dx*dx+dy*dy)));
                const d=Math.hypot(k.x-a.x-dx*u,k.y-a.y-dy*u);if(d<best) {best=d;index=i;}
            }
            return s.status==='playing' && s.frames>=180 && from!==undefined && to!==undefined && index>=from && index<=to;
        },[from,to]);
        // The volcano overview shows the separated lava fields and collapsed bridge together.
        if(code==='K03') await page.evaluate(()=>window.__DERAPAGE_TEST__?.overview(true));
        await page.screenshot({path:`test-results/screenshots/catalogue-${code}-mecanique.png`});
        // The shared fixture also requires zero page errors and zero console errors.
    });
}
