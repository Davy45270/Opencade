import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { GAMES, otherGames, renderOtherGames } from '../src/shell/other-games';

const expected = {
    opencadkid: 'https://davy45270.github.io/opencadkid/',
    tictac: 'https://davy45270.github.io/tictac/',
    'petit-astronome': 'https://davy45270.github.io/petit-astronome/',
};

interface Node { tag: string; children: Node[]; dataset: Record<string, string>; [key: string]: unknown }
const fakeDocument = {
    createElement: (tag: string): Node => {
        const node: Node = { tag, children: [], dataset: {} };
        node.append = (...items: Node[]) => { node.children.push(...items); };
        node.replaceChildren = (...items: Node[]) => { node.children = items; };
        return node;
    },
};
const walk = (node: Node): Node[] => [node, ...node.children.flatMap(walk)];

it('lists the three other games, never Opencade itself', () => {
    expect(GAMES).toHaveLength(4);
    expect(Object.fromEntries(otherGames().map(game => [game.id, game.url]))).toEqual(expected);
});

it('ships a local PNG icon for each listed game', () => {
    for (const game of otherGames()) {
        const file = 'public/' + game.icon.replace('./', '');
        expect(existsSync(file), file).toBe(true);
        expect([...readFileSync(file).subarray(0, 4)]).toEqual([137, 80, 78, 71]);
        expect(game.text.length).toBeGreaterThan(20);
    }
});

it('renders same-tab links with the exact address, a name and an icon', () => {
    const list = fakeDocument.createElement('ul');
    renderOtherGames(list as unknown as Element, fakeDocument as unknown as Document);
    const links = walk(list).filter(node => node.tag === 'a');
    expect(Object.fromEntries(links.map(link => [link.dataset.game, link.href]))).toEqual(expected);
    for (const link of links) {
        expect(link.target).toBeUndefined();
        expect(walk(link).filter(node => node.tag === 'img')).toHaveLength(1);
        expect(walk(link).some(node => node.tag === 'strong' && typeof node.textContent === 'string')).toBe(true);
    }
});

it('the ☰ home menu holds the “Mes autres jeux” entry', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toMatch(/<details id="home-menu">.*<details id="other-games"><summary>Mes autres jeux<\/summary><ul id="other-games-list"[^>]*><\/ul><\/details><\/details>/);
    expect(readFileSync('src/shell/other-games.ts', 'utf8')).not.toMatch(/\bfetch\b|XMLHttpRequest|window\.open|_blank/);
});
