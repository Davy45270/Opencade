/* global process, fetch, WebSocket, setTimeout, console, Buffer */
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
assert.ok(process.env.CHROME_BIN, 'Set CHROME_BIN to the browser executable');
const chrome = spawn(process.env.CHROME_BIN, ['--headless', '--no-sandbox', '--disable-dev-shm-usage', '--remote-debugging-port=9227', '--user-data-dir=/tmp/opencade-bubble-capture', 'http://127.0.0.1:4173/?test=1#/bubble'], {stdio:'ignore'});
const pause = ms=>new Promise(r=>setTimeout(r,ms));
let socket;
try {
    let tabs;
    for (let n=0;n<100;n++) {
        try { tabs=await (await fetch('http://127.0.0.1:9227/json/list')).json(); if(tabs.some(t=>t.type==='page')) break; } catch { /* Startup. */ }
        await pause(200);
    }
    const tab=tabs.find(t=>t.type==='page');
    socket=new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
    let id=0;
    const pending=new Map(),errors=[];
    socket.addEventListener('message',({data})=>{
        const message=JSON.parse(data);
        if(message.id) { pending.get(message.id)?.(message);pending.delete(message.id); }
        if(message.method==='Runtime.exceptionThrown') errors.push(message.params);
        if(message.method==='Runtime.consoleAPICalled' && message.params.type==='error') errors.push(message.params);
    });
    const send=(method,params={})=>new Promise((resolve,reject)=>{
        const number=++id;pending.set(number,m=>m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result));
        socket.send(JSON.stringify({id:number,method,params}));
    });
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');
    await send('Network.setBypassServiceWorker', {bypass:true});
    await send('Emulation.setDeviceMetricsOverride',{width:900,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate', {url:'http://127.0.0.1:4173/?test=1#/bubble'});
    await pause(300);
    let ready=false;
    for(let n=0;n<100;n++) {
        ready=(await send('Runtime.evaluate',{expression:'Boolean(window.__BUBBLE_TEST__)',returnByValue:true})).result.value;
        if(ready)break;
        await pause(200);
    }
    assert.ok(ready,'Bubble scene ready');
    mkdirSync('test-results/screenshots',{recursive:true});
    for(const level of [15,30]) {
        await send('Runtime.evaluate',{expression:`window.__BUBBLE_TEST__.loadLevel(${level-1}); window.__BUBBLE_TEST__.advance(0);`});
        await pause(300);
        const state=(await send('Runtime.evaluate',{expression:'window.__BUBBLE_TEST__.read()',returnByValue:true})).result.value;
        assert.equal(state.level,level-1);assert.equal(state.status,'playing');
        const shot=await send('Page.captureScreenshot',{format:'png'});
        writeFileSync(`test-results/screenshots/bubble-level${level}.png`,Buffer.from(shot.data,'base64'));
        console.log(`bubble-level${level}: ${state.grid.length} cells`);
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
        await send('Runtime.evaluate',{expression:'window.__BUBBLE_TEST__.advance(5000)'});
        const played=(await send('Runtime.evaluate',{expression:'window.__BUBBLE_TEST__.read()',returnByValue:true})).result.value;
        assert.equal(played.shots,1);assert.equal(played.inFlight,false);
    }
    assert.deepEqual(errors,[]);
} finally { socket?.close();chrome.kill(); }
