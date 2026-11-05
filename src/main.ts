import { games } from './games/registry';
import { card as pompiers } from './games/petits-pompiers/card';
import { startApp } from './shell/app';
// Catalogue only: the ☰ home menu lists the other sites (their icons are files of the catalogue).
import './shell/other-games-menu';
import './games/gourmandises/style.css';
import './games/artificiers/style.css';

// Games with their own site are links; the others are still played here, behind #/<id>.
startApp({ games, links: [pompiers], order: [pompiers.id, ...games.map(entry => entry.id)] });
