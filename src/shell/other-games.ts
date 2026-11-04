/**
 * The author's other games, shown from the ☰ home menu. Plain links open them in the same tab:
 * this page makes no request, and the icons are local files cached with the rest of the arcade.
 */
export interface OtherGame { id: string; name: string; url: string; icon: string; text: string }

export const GAMES: readonly OtherGame[] = [
    { id: 'opencade', name: 'Opencade', url: 'https://davy45270.github.io/Opencade/', icon: './autres-jeux/opencade.png', text: 'Des jeux d’arcade originaux, au doigt, à la souris ou au clavier.' },
    { id: 'opencadkid', name: 'Opencadkid', url: 'https://davy45270.github.io/opencadkid/', icon: './autres-jeux/opencadkid.png', text: 'Des petits jeux doux pour les tout-petits, avec Boubou et ses amis.' },
    { id: 'tictac', name: 'TicTac', url: 'https://davy45270.github.io/tictac/', icon: './autres-jeux/tictac.png', text: 'Apprendre à lire l’heure en jouant, à son rythme.' },
    { id: 'petit-astronome', name: 'Petit Astronome', url: 'https://davy45270.github.io/petit-astronome/', icon: './autres-jeux/petit-astronome.png', text: 'Découvrir le Soleil, les planètes, la Lune et les étoiles en jouant.' },
];

export const SELF = 'opencade';
export const otherGames = (self = SELF): OtherGame[] => GAMES.filter(game => game.id !== self);

/** Fills the list once; the markup lives in index.html, inside the home menu. */
export function renderOtherGames(list: Element | null, doc: Document = document): void {
    if (!list) return;
    list.replaceChildren(...otherGames().map(game => {
        const item = doc.createElement('li');
        const link = doc.createElement('a');
        link.className = 'other-game'; link.href = game.url; link.dataset.game = game.id;
        const icon = doc.createElement('img');
        icon.src = game.icon; icon.alt = ''; icon.width = 64; icon.height = 64;
        const content = doc.createElement('span');
        const name = doc.createElement('strong'); name.textContent = game.name;
        const text = doc.createElement('small'); text.textContent = game.text;
        content.append(name, text); link.append(icon, content); item.append(link);
        return item;
    }));
}
