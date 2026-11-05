import { games } from './games/registry';
import { startApp } from './shell/app';
import './games/gourmandises/style.css';
import './games/artificiers/style.css';

startApp({ games });
