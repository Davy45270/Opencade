// Entry of a single-game site (OPENCADE_SITE=<site>): the shared shell around one game, and nothing else.
import { definition } from '@site-game';
import { startApp } from './shell/app';

startApp({ games: [definition], single: true });
