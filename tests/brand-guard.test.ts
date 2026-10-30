import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { test } from 'vitest';

// Split spellings keep this guard subject to its own repository-wide rule.
const forbidden = [
    ['metal', ' slug'], ['gala', 'ga'], ['wor', 'ms'], ['lemm', 'ings'],
    ['puzzle', ' bobble'], ['bust', '-a-move'], ['zu', 'ma'], ['bomber', 'man'],
    ['arka', 'noid'], ['break', 'out'], ['space', ' invaders'], ['pac', '-man'],
    ['tet', 'ris'], ['soko', 'ban'], ['frog', 'ger'],
].map(parts => parts.join(''));
const pattern = new RegExp(`\\b(?:${forbidden.join('|')}|HL-?[0-9]{3})\\b`, 'i');

test('tracked files contain no forbidden commercial game names', () => {
    const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(file => file && file !== 'package-lock.json' && existsSync(file));
    const violations = files.flatMap(file => {
        const text = readFileSync(file, 'utf8');
        return text.split('\n').flatMap((line, i) => pattern.test(line) ? [`${file}:${String(i + 1)}`] : []);
    });
    assert.deepEqual(violations, [], 'Forbidden names at these locations');
});

test('brand boundaries ignore ordinary words and match case insensitively', () => {
    assert.equal(pattern.test('scenario'), false);
    for (const name of forbidden) {
        assert.equal(pattern.test(`(${name.toUpperCase()})`), true);
        assert.equal(pattern.test(`prefix${name}suffix`), false);
    }
});

test('public catalogue excludes internal issue identifiers', () => {
    for (const separator of ['', '-']) assert.equal(pattern.test('(' + 'hl' + separator + '123' + ')'), true);
    assert.equal(pattern.test('shell1234'), false);
});
