// Tests of scripts/assets.js: image headers read without any dependency, and budgets that fail when exceeded.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { checkBudget, imageSize } from './assets.js';

function png(width, height, pad = 0) {
    const b = Buffer.alloc(33 + pad);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
    b.writeUInt32BE(13, 8); b.write('IHDR', 12, 'latin1'); b.writeUInt32BE(width, 16); b.writeUInt32BE(height, 20);
    return b;
}
function riff(chunk, body) {
    const b = Buffer.alloc(30 + body.length);
    b.write('RIFF', 0, 'latin1'); b.write('WEBP', 8, 'latin1'); b.write(chunk, 12, 'latin1'); body.copy(b, 20);
    return b;
}

test('image sizes come from the file header', () => {
    assert.deepEqual(imageSize(png(640, 480), '.png'), { width: 640, height: 480 });
    const vp8x = Buffer.alloc(10); vp8x.writeUIntLE(357 - 1, 4, 3); vp8x.writeUIntLE(213 - 1, 7, 3);
    assert.deepEqual(imageSize(riff('VP8X', vp8x), '.webp'), { width: 357, height: 213 });
    const vp8 = Buffer.alloc(10); vp8.writeUInt16LE(1024, 6); vp8.writeUInt16LE(600, 8);
    assert.deepEqual(imageSize(riff('VP8 ', vp8), '.webp'), { width: 1024, height: 600 });
    // VP8L: 14-bit width-1 then 14-bit height-1, little-endian bit stream after the 0x2f signature.
    const bits = (300 - 1) | ((200 - 1) << 14), vp8l = Buffer.alloc(10);
    vp8l[0] = 0x2f; vp8l.writeUInt32LE(bits, 1);
    assert.deepEqual(imageSize(riff('VP8L', vp8l), '.webp'), { width: 300, height: 200 });
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x2c, 0x02, 0x58, 0x03]);
    assert.deepEqual(imageSize(jpeg, '.jpg'), { width: 600, height: 300 });
    const gif = Buffer.alloc(10); gif.write('GIF89a', 0, 'latin1'); gif.writeUInt16LE(32, 6); gif.writeUInt16LE(16, 8);
    assert.deepEqual(imageSize(gif, '.gif'), { width: 32, height: 16 });
    const avif = Buffer.alloc(40); avif.write('ispe', 20, 'latin1'); avif.writeUInt32BE(128, 28); avif.writeUInt32BE(64, 32);
    assert.deepEqual(imageSize(avif, '.avif'), { width: 128, height: 64 });
    assert.deepEqual(imageSize(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"/>'), '.svg'), { width: 120, height: 80 });
    assert.deepEqual(imageSize(Buffer.from('<svg width="48px" height="24" viewBox="0 0 1 1"/>'), '.svg'), { width: 48, height: 24 });
    assert.equal(imageSize(Buffer.from('not an image'), '.png'), null);
});

test('budgets pass within limits and fail on an image, a side or a group over budget', () => {
    const root = mkdtempSync(join(tmpdir(), 'assets-test-'));
    const put = (path, bytes) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), bytes); };
    try {
        put('src/games/a/x.png', png(64, 64, 100));
        put('src/games/b/y.png', png(64, 64, 100));
        put('node_modules/z/huge.png', png(9999, 9999, 5000));
        const budget = { ignore: ['node_modules'], rules: [
            { path: 'src/games/*/', maxImage: 200, maxSide: 128, maxTotal: 300 },
            { path: '', maxImage: 100, maxTotal: 100 },
        ] };
        const ok = checkBudget(root, budget);
        assert.deepEqual(ok.failures, []);
        assert.deepEqual(ok.groups.map(g => [g.name, g.count]), [['src/games/a/', 1], ['src/games/b/', 1]]);

        put('src/games/a/big.png', png(64, 64, 400));
        put('src/games/b/wide.png', png(512, 32, 10));
        put('other/loose.png', png(8, 8, 200));
        const failures = checkBudget(root, budget).failures.join('\n');
        assert.match(failures, /src\/games\/a\/big\.png: \d+ B > 200 B/);
        assert.match(failures, /src\/games\/a\/: total \d+ B > 300 B/);
        assert.match(failures, /src\/games\/b\/wide\.png: 512×32 px > 128 px/);
        assert.match(failures, /other\/loose\.png: \d+ B > 100 B/);
        assert.doesNotMatch(failures, /node_modules/);

        const strict = checkBudget(root, { rules: [{ path: 'src/games/*/', maxImage: 1e6, maxTotal: 1e6 }], ignore: ['node_modules'] });
        assert.match(strict.failures.join('\n'), /other\/loose\.png: no budget rule/);
    } finally { rmSync(root, { recursive: true, force: true }); }
});
