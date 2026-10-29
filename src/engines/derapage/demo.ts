import { required } from './access';
import { Engine } from './engine';
import { controller } from './ai';
import { demo } from '../shared/demo';
export function createDemo(seed = 28) { return demo(new Engine(), seed, e => { e.input(controller(required(e.karts[0]), e.track)); }, e => { e.step(1000 / 15); }); }
