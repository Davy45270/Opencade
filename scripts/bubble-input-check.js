// Exercise the installed input implementation without starting a browser.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require=createRequire(import.meta.url);
const pointerPath=require.resolve('phaser/src/input/Pointer');
const pointerRequire=createRequire(pointerPath);
const source=readFileSync(pointerPath,'utf8');
const module={exports:{}};
// Device detection needs a browser; it has no role in coordinate conversion.
runInNewContext(source,{module,exports:module.exports,require:name=>name === '../device/OS'?{}:pointerRequire(name)});
const Pointer=module.exports;
function method(file,name) {
    const source=readFileSync(require.resolve(file),'utf8');
    const match=new RegExp(`${name}: (function \\([^]*?\\n    }),`).exec(source);
    assert.ok(match,`Missing input method ${name}`);
    return runInNewContext(`(${match[1]})`);
}
const transformPointer=method('phaser/src/input/InputManager','transformPointer');
const transformX=method('phaser/src/scale/ScaleManager','transformX');
const transformY=method('phaser/src/scale/ScaleManager','transformY');
export function inputCoordinates() {
    for(const [left,top,width,height,scrollX,scrollY] of [[400,100,360,640,0,0],[17,93,270,480,0,160],[12,32,540,960,20,40]]) {
        const scaleManager={canvasBounds:{left:left+scrollX,top:top+scrollY},displayScale:{x:360/width,y:640/height},transformX,transformY};
        const pointer=new Pointer({scaleManager,transformPointer},1);
        const touch=(x,y)=>({identifier:7,pageX:left+x*width/360+scrollX,pageY:top+y*height/640+scrollY});
        pointer.touchstart(touch(100,250),{timeStamp:0});
        pointer.touchmove(touch(200,170),{timeStamp:1});
        assert.ok(Math.abs(pointer.x-200)<0.00000001);
        assert.ok(Math.abs(pointer.y-170)<0.00000001);
        assert.ok(Math.abs(Math.atan2(pointer.x-180,570-pointer.y)-0.04995839572194276)<0.00000001);
        // The former synthetic event defaults page coordinates to zero.
        pointer.touchmove({identifier:7,clientX:200,clientY:170,pageX:0,pageY:0},{timeStamp:2});
        assert.ok(Math.abs(Math.atan2(pointer.x-180,570-pointer.y)-0.04995839572194276)>0.1);
    }
}
inputCoordinates();
