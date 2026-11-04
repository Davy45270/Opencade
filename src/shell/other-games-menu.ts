import { renderOtherGames } from './other-games';

// Side-effect module, like ./pwa: fills the “Mes autres jeux” list of the ☰ home menu once.
renderOtherGames(document.querySelector('#other-games-list'));
