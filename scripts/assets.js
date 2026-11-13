// Asset chain: inventory and budgets of the repository images, lossless (or opt-in lossy) optimisation,
// and SVG rasterisation.
//
//   npm run assets -- check [--json]                     budgets of assets-budget.json; exit 1 when exceeded
//   npm run assets -- optimize [--dry-run] [--lossy] [paths…]
//   npm run assets -- raster <in.svg> --width 64,128 [--format png|webp|avif] [--out dir]
//
// `check` is pure Node (no system tool) and runs in the CI. `optimize` and `raster` call the binaries installed on
// the workstation (oxipng, pngquant, cwebp, svgo, rsvg-convert, avifenc, magick) and are never run by the CI.
// `optimize` keeps a candidate only when it is smaller and, for lossless tools, pixel-identical; lossy candidates
// (--lossy) must reach --min-psnr (40 dB by default). No texture atlas is built: no game loads one today (see
// AGENTS.md, "Assets", for how to add one).
import { spawnSync } from 'node:child_process';
import console from 'node:console';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath, URL } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const IMAGE_EXTENSIONS = new Set(['.png', '.webp', '.avif', '.svg', '.jpg', '.jpeg', '.gif']);

// ---------------------------------------------------------------- dimensions, read from the file header only

const u16be = (b, o) => b.readUInt16BE(o), u32be = (b, o) => b.readUInt32BE(o);

/** Width and height of an image from its bytes, or null when the format is not recognised. */
export function imageSize(bytes, ext) {
    const b = bytes;
    if (ext === '.png' && b.length >= 24 && b.toString('latin1', 12, 16) === 'IHDR') return { width: u32be(b, 16), height: u32be(b, 20) };
    if (ext === '.webp' && b.length >= 30 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') {
        const chunk = b.toString('latin1', 12, 16);
        if (chunk === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
        if (chunk === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
        if (chunk === 'VP8L') {
            const [b0, b1, b2, b3] = [b[21], b[22], b[23], b[24]];
            return { width: 1 + (b0 | ((b1 & 0x3f) << 8)), height: 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10)) };
        }
    }
    if ((ext === '.jpg' || ext === '.jpeg') && u16be(b, 0) === 0xffd8) {
        for (let o = 2; o + 9 < b.length;) {
            if (b[o] !== 0xff) { o++; continue; }
            const marker = b[o + 1];
            if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { width: u16be(b, o + 7), height: u16be(b, o + 5) };
            o += 2 + u16be(b, o + 2);
        }
    }
    if (ext === '.gif' && b.toString('latin1', 0, 3) === 'GIF') return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
    if (ext === '.avif') {
        const at = b.indexOf('ispe', 0, 'latin1');
        if (at > 0 && at + 16 <= b.length) return { width: u32be(b, at + 8), height: u32be(b, at + 12) };
    }
    if (ext === '.svg') {
        const head = b.toString('utf8', 0, Math.min(b.length, 4096));
        const tag = /<svg\b[^>]*>/i.exec(head)?.[0] ?? '';
        const attr = name => /^\s*([\d.]+)(px)?\s*$/.exec(new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? '')?.[1];
        const [w, h] = [attr('width'), attr('height')];
        if (w && h) return { width: Math.round(Number(w)), height: Math.round(Number(h)) };
        const box = /\sviewBox="([^"]*)"/.exec(tag)?.[1].trim().split(/[\s,]+/).map(Number);
        if (box?.length === 4) return { width: Math.round(box[2] ?? 0), height: Math.round(box[3] ?? 0) };
    }
    return null;
}

// ---------------------------------------------------------------- inventory and budgets

/**
 * Rule path: '' matches everything, `dir/` a directory (with `*` standing for one segment, e.g. `src/games/*` followed by a slash),
 * anything else one exact file. Returns the matched prefix (the group name) or null.
 */
function matchPrefix(pattern, path) {
    if (pattern === '') return '';
    if (!pattern.endsWith('/')) return pattern === path ? path : null;
    const parts = pattern.slice(0, -1).split('/'), segments = path.split('/');
    if (segments.length <= parts.length) return null;
    return parts.every((part, i) => part === '*' || part === segments[i]) ? `${segments.slice(0, parts.length).join('/')}/` : null;
}

export function loadBudget(root = ROOT, file = 'assets-budget.json') {
    return JSON.parse(readFileSync(join(root, file), 'utf8'));
}

/** Every image file under `root`, outside the ignored directories, as repository-relative POSIX paths. */
export function listImages(root, ignore) {
    const out = [];
    const walk = dir => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const full = join(dir, entry.name), rel = relative(root, full).split(sep).join('/');
            if (entry.isDirectory()) {
                if (entry.name === '.git' || ignore.some(i => rel === i || rel.startsWith(`${i}/`))) continue;
                walk(full);
            } else if (IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase())) out.push(rel);
        }
    };
    walk(root);
    return out.sort();
}

/**
 * Inventory against the budget: each image needs a rule giving `maxImage` (bytes, first match wins) and a rule giving
 * `maxTotal` (the group it is summed into, first match wins). `maxSide` (pixels) is optional, from the image rule.
 */
export function checkBudget(root, budget) {
    const images = [], failures = [], groups = new Map();
    for (const path of listImages(root, budget.ignore ?? [])) {
        const bytes = readFileSync(join(root, path)), ext = extname(path).toLowerCase();
        const size = imageSize(bytes, ext);
        const imageRule = budget.rules.find(r => r.maxImage !== undefined && matchPrefix(r.path, path) !== null);
        const groupRule = budget.rules.find(r => r.maxTotal !== undefined && matchPrefix(r.path, path) !== null);
        const item = { path, bytes: bytes.length, width: size?.width ?? null, height: size?.height ?? null };
        images.push(item);
        if (!imageRule || !groupRule) { failures.push(`${path}: no budget rule (add one to assets-budget.json)`); continue; }
        if (!size) failures.push(`${path}: unreadable image header`);
        if (bytes.length > imageRule.maxImage) failures.push(`${path}: ${bytes.length} B > ${imageRule.maxImage} B (rule "${imageRule.path}")`);
        if (imageRule.maxSide && size && Math.max(size.width, size.height) > imageRule.maxSide) {
            failures.push(`${path}: ${size.width}×${size.height} px > ${imageRule.maxSide} px (rule "${imageRule.path}")`);
        }
        const name = matchPrefix(groupRule.path, path) || '(root)';
        const group = groups.get(name) ?? { name, count: 0, bytes: 0, maxTotal: groupRule.maxTotal, served: groupRule.served !== false, largest: '' , largestBytes: 0 };
        group.count++; group.bytes += bytes.length;
        if (bytes.length > group.largestBytes) { group.largestBytes = bytes.length; group.largest = path; }
        groups.set(name, group);
    }
    for (const g of groups.values()) if (g.bytes > g.maxTotal) failures.push(`${g.name}: total ${g.bytes} B > ${g.maxTotal} B`);
    const served = [...groups.values()].filter(g => g.served).reduce((s, g) => s + g.bytes, 0);
    const total = images.reduce((s, i) => s + i.bytes, 0);
    return { images, groups: [...groups.values()].sort((a, b) => a.name.localeCompare(b.name)), failures, total, served };
}

function printCheck(report) {
    const pad = (s, n) => String(s).padEnd(n), num = (n, w = 9) => String(n).padStart(w);
    const width = Math.max(...report.groups.map(g => g.name.length), 5);
    console.log(`${pad('group', width)}  files     bytes    budget   use  largest`);
    for (const g of report.groups) {
        const use = `${Math.round((100 * g.bytes) / g.maxTotal)}%`.padStart(4);
        console.log(`${pad(g.name, width)} ${num(g.count, 6)} ${num(g.bytes)} ${num(g.maxTotal)}  ${use}  ${g.largest.slice(g.name.length)} (${g.largestBytes} B)${g.served ? '' : '  [not served]'}`);
    }
    console.log(`${report.images.length} images, ${report.total} B in all, ${report.served} B served.`);
    if (report.failures.length) {
        console.error(`\nassets check FAILED (${report.failures.length}):`);
        for (const f of report.failures) console.error(`  - ${f}`);
    } else console.log('assets check: every image and group within budget.');
}

// ---------------------------------------------------------------- optimisation (workstation only)

function run(cmd, args, options = {}) {
    const r = spawnSync(cmd, args, { encoding: 'utf8', ...options });
    if (r.error) throw new Error(`${cmd}: ${r.error.message} (is it installed? see the asset chain runbook)`);
    return r;
}

/** PSNR in dB between two images flattened on grey; ImageMagick reports identical pixels as about 120 dB (or inf). */
function psnr(a, b) {
    const r = run('magick', ['compare', '-metric', 'PSNR', '(', a, '-background', 'gray50', '-alpha', 'remove', ')',
        '(', b, '-background', 'gray50', '-alpha', 'remove', ')', 'null:']);
    const text = `${r.stderr}${r.stdout}`.trim();
    if (/^inf/i.test(text)) return Infinity;
    const value = Number.parseFloat(text);
    if (Number.isNaN(value)) throw new Error(`magick compare: ${text}`);
    return value === 0 && /\(0\)/.test(text) ? Infinity : value;
}

function candidates(file, ext, work, lossy, quality) {
    const out = [];
    if (ext === '.png') {
        const lossless = join(work, 'oxipng.png');
        if (run('oxipng', ['-o', '4', '--strip', 'safe', '--quiet', '--out', lossless, file]).status === 0) out.push({ path: lossless, how: 'oxipng', lossy: false });
        if (lossy) {
            const quant = join(work, 'pngquant.png');
            const q = run('pngquant', ['--quality', '65-90', '--skip-if-larger', '--strip', '--force', '--output', quant, '--', file]);
            // 98/99: larger result or quality unreachable; keep the lossless candidate only.
            if (q.status === 0 && run('oxipng', ['-o', '4', '--strip', 'safe', '--quiet', quant]).status === 0) out.push({ path: quant, how: 'pngquant+oxipng', lossy: true });
        }
    } else if (ext === '.webp' && lossy) {
        const webp = join(work, 'cwebp.webp');
        if (run('cwebp', ['-quiet', '-q', String(quality), '-m', '6', '-alpha_q', '90', '-sharp_yuv', '-metadata', 'none', file, '-o', webp]).status === 0) {
            out.push({ path: webp, how: `cwebp -q ${quality}`, lossy: true });
        }
    } else if (ext === '.svg') {
        const svg = join(work, 'svgo.svg');
        if (run('svgo', ['--multipass', '--quiet', '-i', file, '-o', svg]).status === 0) out.push({ path: svg, how: 'svgo', lossy: false });
    }
    return out;
}

/** Render a file to PNG for comparison (SVG through rsvg-convert, the rest through ImageMagick). */
function pixels(file, work, tag) {
    const png = join(work, `${tag}.png`);
    if (extname(file).toLowerCase() === '.svg') {
        const size = imageSize(readFileSync(file), '.svg') ?? { width: 256, height: 256 };
        run('rsvg-convert', ['-w', String(size.width), '-h', String(size.height), file, '-o', png]);
    } else run('magick', [file, png]);
    return png;
}

function optimize(paths, { dryRun, lossy, quality, minPsnr }) {
    let before = 0, after = 0, changed = 0;
    const rows = [];
    for (const path of paths) {
        const file = join(ROOT, path), ext = extname(path).toLowerCase(), size = statSync(file).size;
        before += size;
        const work = mkdtempSync(join(tmpdir(), 'assets-'));
        try {
            let best = null;
            for (const c of candidates(file, ext, work, lossy, quality)) {
                const bytes = statSync(c.path).size;
                if (bytes >= size - Math.max(64, size * 0.02)) continue;
                const score = psnr(pixels(file, work, 'a'), pixels(c.path, work, 'b'));
                if (score < (c.lossy ? minPsnr : 60)) continue;
                if (!best || bytes < best.bytes) best = { ...c, bytes, score };
            }
            if (best) {
                changed++; after += best.bytes;
                rows.push(`${path}: ${size} -> ${best.bytes} B (-${(100 * (1 - best.bytes / size)).toFixed(1)}%, ${best.how}, ${best.score >= 100 ? 'pixels identical' : `PSNR ${best.score.toFixed(1)} dB`})`);
                if (!dryRun) { copyFileSync(best.path, `${file}.tmp`); renameSync(`${file}.tmp`, file); }
            } else after += size;
        } finally { rmSync(work, { recursive: true, force: true }); }
    }
    for (const row of rows) console.log(row);
    const saved = before - after;
    console.log(`${dryRun ? '[dry run] ' : ''}${paths.length} images, ${changed} ${dryRun ? 'would change' : 'changed'}: ${before} -> ${after} B (-${saved} B, -${before ? ((100 * saved) / before).toFixed(1) : 0}%)${lossy ? `, lossy kept at PSNR >= ${minPsnr} dB` : ', lossless only'}.`);
}

function raster(input, { widths, format, out }) {
    const svg = resolve(ROOT, input), dir = resolve(ROOT, out);
    const size = imageSize(readFileSync(svg), '.svg');
    if (!size) throw new Error(`${input}: no width/height/viewBox`);
    mkdirSync(dir, { recursive: true });
    for (const width of widths) {
        const height = Math.round((width * size.height) / size.width);
        const stem = join(dir, `${basename(input, '.svg')}-${width}`);
        // Always explicit -w/-h: potrace writes its size in points, so the natural size would be wrong.
        run('rsvg-convert', ['-w', String(width), '-h', String(height), svg, '-o', `${stem}.png`]);
        if (format === 'png') run('oxipng', ['-o', '4', '--strip', 'safe', '--quiet', `${stem}.png`]);
        if (format === 'webp') { run('cwebp', ['-quiet', '-q', '85', '-alpha_q', '90', '-m', '6', `${stem}.png`, '-o', `${stem}.webp`]); rmSync(`${stem}.png`); }
        if (format === 'avif') { run('avifenc', ['-q', '60', '-s', '6', `${stem}.png`, `${stem}.avif`]); rmSync(`${stem}.png`); }
        console.log(`${stem}.${format}: ${width}×${height}, ${statSync(`${stem}.${format}`).size} B`);
    }
}

// ---------------------------------------------------------------- command line

function main(argv) {
    const [command, ...rest] = argv;
    const flag = name => rest.includes(name);
    const option = (name, fallback) => { const i = rest.indexOf(name); return i >= 0 && rest[i + 1] ? rest[i + 1] : fallback; };
    const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && /^--(width|format|out|quality|min-psnr)$/.test(rest[i - 1] ?? '')));
    if (command === 'check') {
        const report = checkBudget(ROOT, loadBudget());
        if (flag('--json')) console.log(JSON.stringify(report, null, 2)); else printCheck(report);
        return report.failures.length ? 1 : 0;
    }
    if (command === 'optimize') {
        const budget = loadBudget();
        const all = listImages(ROOT, budget.ignore ?? []);
        const paths = positional.length ? all.filter(p => positional.some(a => p === a || p.startsWith(a.endsWith('/') ? a : `${a}/`))) : all;
        optimize(paths, { dryRun: flag('--dry-run'), lossy: flag('--lossy'), quality: Number(option('--quality', '82')), minPsnr: Number(option('--min-psnr', '40')) });
        return 0;
    }
    if (command === 'raster') {
        const [input] = positional;
        if (!input || !existsSync(resolve(ROOT, input))) { console.error('usage: assets raster <in.svg> --width 64,128 [--format png|webp|avif] [--out dir]'); return 2; }
        raster(input, { widths: option('--width', '128').split(',').map(Number), format: option('--format', 'png'), out: option('--out', 'assets-out') });
        return 0;
    }
    console.error('usage: npm run assets -- check [--json] | optimize [--dry-run] [--lossy] [paths…] | raster <in.svg> --width 64,128 [--format png|webp|avif] [--out dir]');
    return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.exitCode = main(process.argv.slice(2));
