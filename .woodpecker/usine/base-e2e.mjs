#!/usr/bin/env node
// Base du diff e2e : affiche le commit à partir duquel le jeu choisit les specs à jouer.
// Sur une PR, la base est le merge-base de HEAD avec la branche CIBLE (CI_COMMIT_TARGET_BRANCH). Sans elle, la CI se
// repliait sur un échantillon et ne jouait pas les specs modifiées par la PR : un faux vert. Introuvable = échec (1).
// push : CI_PREV_COMMIT_SHA s'il est un ancêtre strict de HEAD, sinon le parent de HEAD. manual : E2E_BASE tel quel.
// Autre évènement : rien (le jeu décide). Usage dans la CI : E2E_BASE="$(node base-e2e.mjs)" puis export E2E_BASE.
import { execFileSync } from 'node:child_process';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const essai = (...a) => { try { return git(...a); } catch { return ''; } };
const ancetre = (a, b) => { try { git('merge-base', '--is-ancestor', a, b); return true; } catch { return false; } };
const echec = (m) => { console.error(`PR sans base : ${m}`); process.exit(1); };
const env = process.env;
let base = '';

if (env.CI_PIPELINE_EVENT === 'pull_request') {
  const cible = env.CI_COMMIT_TARGET_BRANCH ?? '';
  if (!/^[A-Za-z0-9._/-]+$/.test(cible) || cible.startsWith('-') || cible.includes('..')) {
    echec(`branche cible absente ou invalide (${JSON.stringify(cible)})`);
  }
  // La branche cible peut manquer du clone d'une PR : on la récupère ; un échec se voit au merge-base.
  essai('fetch', '-q', 'origin', `+refs/heads/${cible}:refs/remotes/origin/${cible}`);
  base = essai('merge-base', `refs/remotes/origin/${cible}`, 'HEAD');
  if (!base) echec(`aucun ancêtre commun entre HEAD et origin/${cible} (clone superficiel ?)`);
} else if (env.CI_PIPELINE_EVENT === 'push') {
  const prec = essai('rev-parse', '-q', '--verify', `${env.CI_PREV_COMMIT_SHA || 'aucun'}^{commit}`);
  const tete = git('rev-parse', 'HEAD');
  base = prec && prec !== tete && ancetre(prec, tete) ? prec : essai('rev-parse', '-q', '--verify', 'HEAD~1');
} else if (env.CI_PIPELINE_EVENT === 'manual') {
  base = env.E2E_BASE ?? '';
}
console.log(base);
