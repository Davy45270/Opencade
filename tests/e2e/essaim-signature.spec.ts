import { test, expect, point } from './fixture';
import { Engine } from '../../src/engines/essaim/engine';
import { FingerClock } from './finger-clock';
import { Finger } from './finger-stepped';
import { pilot } from '../../src/engines/essaim/pilot';
import type { Page } from '@playwright/test';
const cast = ['panda','pandaroux','dragon','singe','licorne'] as const;
async function open(page: Page, id: typeof cast[number] = 'panda'): Promise<void> {
    await page.addInitScript(id => { localStorage.setItem('arcade-lab:character:v1',id); localStorage.setItem('arcade-lab:essaim:autofire:v1','on'); },id);
    await page.goto('/?test=1#/essaim');
    await expect.poll(()=>page.evaluate(()=>Boolean(window.__ESSAIM_TEST__)), { timeout: 30000 }).toBe(true);
    await page.locator('#resume').tap();
}
for (const id of cast) test(`S-essaim signature ${id} en vol`,async({page},info)=>{
    test.skip(info.project.name !== 'mobile-chromium','390×844');
    await open(page,id);
    await page.evaluate(()=>{ window.__ESSAIM_TEST__?.loadLevel(0,458); window.__ESSAIM_TEST__?.advance(0); });
    // Exercise the ordinary charge control. Simulation is frozen only for this review image.
    await page.keyboard.down('Space');
    await page.evaluate(()=>{ window.__ESSAIM_TEST__?.advance(1500); });
    await page.keyboard.up('Space');
    await page.evaluate(()=>{ window.__ESSAIM_TEST__?.advance(900); });
    const state=await page.evaluate(()=>window.__ESSAIM_TEST__?.read());
    expect(state?.signature?.character).toBe(id); expect(state?.signature?.uses).toBe(1);
    expect(state?.signature?.projectiles.length).toBeGreaterThan(0);
    await page.screenshot({path:`test-results/screenshots/essaim-signature-${id}.png`});
});
for (const [theme,level] of [['G01',6],['G02',8],['G03',14]] as const) test(`S-essaim décor ${theme}`,async({page},info)=>{
    test.skip(info.project.name !== 'mobile-chromium','390×844');
    await open(page);
    await page.evaluate(level=>{ window.__ESSAIM_TEST__?.loadLevel(level,458); window.__ESSAIM_TEST__?.advance(1800); },level);
    await page.screenshot({path:`test-results/screenshots/essaim-theme-${theme}.png`});
});
test('S-essaim doigt bruité ±12 px, 150 ms, victoire réelle avec signature',async({page},info)=>{
    test.skip(info.project.name !== 'mobile-chromium','390×844'); test.setTimeout(1800000);
    await page.addInitScript(() => { localStorage.setItem('arcade-lab:character:v1', 'panda'); localStorage.setItem('arcade-lab:essaim:autofire:v1', 'on'); });
    await Finger.prepare(page);
    await page.goto('/?test=1#/essaim');
    await expect.poll(() => page.evaluate(() => Boolean(window.__ESSAIM_TEST__))).toBe(true);
    const client = await page.context().newCDPSession(page), finger = await Finger.create(page, client);
    await finger.press(['#resume']);
    await page.evaluate(() => { window.__ESSAIM_TEST__?.loadLevel(0, 458); window.__ESSAIM_TEST__?.advance(0); });
    await page.screenshot({path:'test-results/screenshots/essaim-signature-finger-before.png'});
    const controller=new Engine(0,458);
    const fire=await page.locator('#essaim-fire').boundingBox(); if(!fire) throw new Error('Tir absent');
    let sample=0, touching=false, charge=false;
    const clock=new FingerClock();
    try {
        while(clock.elapsed<100000) {
            const state=await page.evaluate(()=>window.__ESSAIM_TEST__?.read()); if(!state) throw new Error('État absent');
            clock.observe(state); if(state.status!=='playing') break;
            controller.loadState(state); controller.step(clock.horizon); pilot(controller,state.ticks);
            const aim=controller.state.target ?? state.cannon;
            const position=await point(page,Math.max(18,Math.min(342,aim)),618);
            const held=(state.signature?.cooldown ?? 0)===0 && sample%60<10;
            if(touching && charge!==held) { await finger.release(); touching=false; }
            charge=held;
            const touchPoints=[{...position,id:1},...(held?[{x:fire.x+fire.width/2,y:fire.y+fire.height/2,id:2}]:[])];
            await finger.touch(touching ? 'touchMove' : 'touchStart', touchPoints, ['#game canvas', ...(held ? ['#essaim-fire'] : [])]); touching=true;
            sample++;
        }
    } finally { await finger.release(); await finger.attach(info, 'essaim-signature-stepped.json'); await client.detach(); }
    const end=await page.evaluate(()=>window.__ESSAIM_TEST__?.read());
    expect(end?.status).toBe('won'); expect(end?.signature?.uses ?? 0).toBeGreaterThanOrEqual(1);
    await page.screenshot({path:'test-results/screenshots/essaim-signature-finger-after.png'});
});
