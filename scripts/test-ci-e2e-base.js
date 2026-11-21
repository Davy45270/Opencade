// Base of the E2E diff in the Woodpecker CI: the "select" step of .woodpecker/e2e.yml is run for real, in a
// throwaway git repository, with the variables Woodpecker sets. Only the selector is a stub that records its arguments.
// Before this, a pull request had no base: the selector fell back to the N3 sample, the specs the PR changed were not
// played and the pipeline went green (a false green). A PR must now be diffed from its merge-base with the target
// branch, and a PR whose target branch cannot be found must fail instead of running a sample.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import { after, before, test } from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

/** Shell script of the "select" step: its commands as Woodpecker runs them ($$ -> $, matrix ${PART} -> 1). */
export function selectScript(yml) {
    const lines = yml.split('\n');
    const start = lines.findIndex(l => /^ {2}- name: select\s*$/.test(l));
    assert.ok(start >= 0, 'no "select" step in .woodpecker/e2e.yml');
    const end = lines.findIndex((l, i) => i > start && /^ {2}- name: /.test(l));
    const step = lines.slice(start + 1, end < 0 ? undefined : end);
    const c = step.findIndex(l => /^ {4}commands:\s*$/.test(l));
    assert.ok(c >= 0, 'the "select" step has no commands');
    const commands = [];
    for (let i = c + 1; i < step.length; i++) {
        const l = step[i];
        if (/^ {6}- \|\s*$/.test(l)) {
            const block = [];
            while (i + 1 < step.length && (step[i + 1].startsWith('        ') || !step[i + 1].trim())) block.push(step[++i].slice(8));
            commands.push(block.join('\n'));
        } else if (/^ {6}- /.test(l)) commands.push(l.slice(8));
        else if (l.trim() && !/^ {6,}#/.test(l)) break;
    }
    assert.ok(commands.length, 'the "select" step has no commands');
    return commands.join('\n').replaceAll('$$', '$').replaceAll('${PART}', '1');
}

const env = {
    PATH: `${dirname(process.execPath)}:${process.env.PATH ?? '/usr/bin:/bin'}`, HOME: tmpdir(), LC_ALL: 'C',
    GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 'ci', GIT_AUTHOR_EMAIL: 'ci@example.invalid', GIT_COMMITTER_NAME: 'ci', GIT_COMMITTER_EMAIL: 'ci@example.invalid',
};
let dir, origin, sha;
const git = (cwd, ...a) => execFileSync('git', a, { cwd, env, encoding: 'utf8' }).trim();

before(() => {
    dir = mkdtempSync(join(tmpdir(), 'ci-e2e-base-'));
    origin = join(dir, 'origin.git');
    git(dir, 'init', '-q', '--bare', '-b', 'main', origin);
    const work = join(dir, 'work');
    git(dir, 'init', '-q', '-b', 'main', work);
    cpSync(join(root, '.woodpecker'), join(work, '.woodpecker'), { recursive: true });
    mkdirSync(join(work, 'scripts'));
    // The selector stub records the arguments it receives: that is the base the real selector would diff from.
    writeFileSync(join(work, 'scripts/e2e-impact.js'),
        "require('fs').writeFileSync(process.env.ARGS_OUT, JSON.stringify(process.argv.slice(2)));\n");
    writeFileSync(join(work, 'package.json'), '{"type":"commonjs"}\n');
    mkdirSync(join(work, 'tests/e2e'), { recursive: true });
    writeFileSync(join(work, 'tests/e2e/home.spec.ts'), '// v1\n');
    git(work, 'add', '-A');
    git(work, 'commit', '-q', '-m', 'fork point');
    sha = { fork: git(work, 'rev-parse', 'HEAD') };
    git(work, 'checkout', '-q', '-b', 'pr');
    writeFileSync(join(work, 'tests/e2e/home.spec.ts'), '// v2: the PR changes this spec\n');
    git(work, 'commit', '-q', '-am', 'PR: change a spec');
    sha.pr = git(work, 'rev-parse', 'HEAD');
    git(work, 'checkout', '-q', 'main');
    writeFileSync(join(work, 'README.md'), 'main moved on\n');
    git(work, 'add', 'README.md');
    git(work, 'commit', '-q', '-m', 'main moves on after the fork point');
    sha.main = git(work, 'rev-parse', 'HEAD');
    git(work, 'push', '-q', origin, 'main', 'pr');
});

after(() => { if (dir) rmSync(dir, { recursive: true, force: true }); });

/** Clone like the CI does (only the ref under test, full history), then run the "select" step. */
function select(ref, vars) {
    const ci = mkdtempSync(join(dir, 'ci-'));
    git(ci, 'init', '-q');
    git(ci, 'remote', 'add', 'origin', origin);
    git(ci, 'fetch', '-q', 'origin', `+refs/heads/${ref}:refs/heads/${ref}`);
    git(ci, 'checkout', '-q', ref);
    const out = join(ci, '.args.json');
    const r = spawnSync('sh', ['-e', '-c', selectScript(readFileSync(join(root, '.woodpecker/e2e.yml'), 'utf8'))],
        { cwd: ci, env: { ...env, ...vars, ARGS_OUT: out, CI: 'woodpecker' }, encoding: 'utf8' });
    const args = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : null;
    return { status: r.status, log: r.stdout + r.stderr, base: args ? args[args.indexOf('--base') + 1] : null };
}

test('pull request: the base is the merge-base with the target branch, so the changed spec is played', () => {
    const r = select('pr', { CI_PIPELINE_EVENT: 'pull_request', CI_COMMIT_TARGET_BRANCH: 'main', CI_COMMIT_SHA: sha.pr });
    assert.equal(r.status, 0, r.log);
    assert.equal(r.base, sha.fork, `selector called with base ${JSON.stringify(r.base)} instead of the merge-base (false green)\n${r.log}`);
    assert.match(r.log, new RegExp(`base e2e '${sha.fork}' \\(pull_request\\)`));
});

test('pull request whose target branch cannot be found: red, and no sample is run', () => {
    for (const cible of ['absente', '']) {
        const r = select('pr', { CI_PIPELINE_EVENT: 'pull_request', CI_COMMIT_TARGET_BRANCH: cible, CI_COMMIT_SHA: sha.pr });
        assert.notEqual(r.status, 0, `target ${JSON.stringify(cible)}: green without a base\n${r.log}`);
        assert.equal(r.base, null, 'the selector must not run without a base');
    }
});

test('push: the previous pipeline commit when it is an ancestor, the parent when the pipeline is restarted', () => {
    const r = select('main', { CI_PIPELINE_EVENT: 'push', CI_PREV_COMMIT_SHA: sha.fork, CI_COMMIT_SHA: sha.main });
    assert.equal(r.status, 0, r.log);
    assert.equal(r.base, sha.fork);
    const again = select('main', { CI_PIPELINE_EVENT: 'push', CI_PREV_COMMIT_SHA: sha.main, CI_COMMIT_SHA: sha.main });
    assert.equal(again.status, 0, again.log);
    assert.equal(again.base, sha.fork, 'a restarted push pipeline re-tests the last commit (HEAD~1..HEAD)');
});

test('manual: E2E_BASE as given; the head itself is refused (it would select nothing)', () => {
    const r = select('main', { CI_PIPELINE_EVENT: 'manual', E2E_BASE: sha.fork, CI_COMMIT_SHA: sha.main });
    assert.equal(r.status, 0, r.log);
    assert.equal(r.base, sha.fork);
    const head = select('main', { CI_PIPELINE_EVENT: 'manual', E2E_BASE: sha.main, CI_COMMIT_SHA: sha.main });
    assert.notEqual(head.status, 0, head.log);
    assert.equal(head.base, null);
});
