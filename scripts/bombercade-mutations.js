/* global console */
import assert from 'node:assert/strict';
import { mutationModule } from './mutation-module.js';
export async function checkBombercadeMutations() {
    const cases = [
        ['bouclier_deux_fois_plus_court', 'B08 cinq', 'a.shield = Math.max(0, a.shield - FIXED);', 'a.shield = Math.max(0, a.shield - FIXED * 2);'],
        ['teleportation_ignore_danger', 'B08 destinations', 'this.walkable(p, actor) && !danger.has(p) && distance(p, actor.at) <= 3', 'this.walkable(p, actor) && distance(p, actor.at) <= 3'],
        ['bombes_glissantes_traversent_personnages', 'B08 destinations', 'this.free(to) && !this.actors.some(a => a.hearts && (a.at === to || a.travel > 0 && a.from === to))', 'this.free(to)'],
        ['bonus_special_insensible_au_feu', 'B07', 'this.pickups = this.pickups.filter(p => p.at !== at);', "this.pickups = this.pickups.filter(p => p.at !== at || p.kind === 'special');"],
        ['score_elimination_nul', 'B11', 'this.score += 200;', 'this.score += 0;'],
        ['bonus_temps_nul', 'B11', 'this.score += Math.max(0, Math.floor((deadline - this.time) / 1000));', 'this.score += 0;'],
        ['explosions_toutes_panda', 'B08 destinations', "this.fires.push({ at, owner: bomb.owner, character: bomb.character, left: 500 });", "this.fires.push({ at, owner: bomb.owner, character: 'panda', left: 500 });"],
        ['anneaux_chaque_seconde', 'B11', 'Math.floor((this.time - deadline) / 4000)', 'Math.floor((this.time - deadline) / 1000)'],
        ["boubou_bombes_portee_un", "B08 cinq", "this.place(actor, at, true);", "this.place(actor, at, true); const placed = this.bombs.find(b => b.at === at); if (placed) placed.range = 1;"],
        ["bombes_glissantes_plus_rapides", "B08 cinq", "this.ticks % 5 === 0", "this.ticks % 4 === 0"],
        ["teleportation_distance_cinq", "B08 distance", "distance(p, actor.at) <= 3", "distance(p, actor.at) <= 5"],
        ["portail_ignore_sortie_occupee", "B16", "to !== undefined && free(to)", "to !== undefined && this.free(to)"],
        ["tapis_ignore_sortie_occupee", "B16", "belt && free(neighbor(at, belt.direction))", "belt && this.free(neighbor(at, belt.direction))"],
        ["ia_ne_recherche_plus_les_bonus", "B10", "const goals = this.pickups.map(p => p.at);", "const goals: number[] = [];"],
        ["destruction_ia_ne_revele_aucun_bonus", "B10", "if (block.drop) this.pickups.push({ at, kind: block.drop });", "if (block.drop && bomb.owner === 0) this.pickups.push({ at, kind: block.drop });"],
        ["blocs_casses_par_ia_rapportent_des_points", "B10", "this.score += bomb.owner === 0 ? 10 : 0;", "this.score += 10;"],
        ["glacon_ignore_les_rivaux", "B16", "block.kind === 'ice' && this.free(pushed) && !this.actors.some(a => a.hearts > 0 && (a.at === pushed || a.travel > 0 && a.from === pushed))", "block.kind === 'ice' && this.free(pushed) && !this.actors.some(a => a.id === 0 && a.hearts > 0 && (a.at === pushed || a.travel > 0 && a.from === pushed))"],
        ['horizon_reduit_a_1500_ms', 'B12 contrat', 'm.time < engine.time + 3000', 'm.time < engine.time + 1500', 'pilot'],
        ['recherche_limitee_a_une_action', 'B12 contrat', 'const cloneBudget = 11;', 'const cloneBudget = 1;', 'pilot'],
        ['decision_toutes_les_500_ms', 'B12 contrat', 'this.nextDecision = engine.ticks + 15;', 'this.nextDecision = engine.ticks + 30;', 'pilot'],
        ['accepte_les_simulations_perdant_un_coeur', 'B12 contrat', "if (harmed || m.player.hearts < actor.hearts || m.status === 'lost') continue;", "if (m.status === 'lost') continue;", 'pilot'],
        ['supprime_le_terme_blocs_du_score', 'B12 contrat', '(engine.board.blocks.length - m.board.blocks.length) * 20', '(engine.board.blocks.length - m.board.blocks.length) * 0', 'pilot'],
        ['supprime_le_terme_eliminations_du_score', 'B12 contrat', 'eliminated * 2000', 'eliminated * 0', 'pilot'],
        ['prevision_glissante_limitee_a_1500_ms', 'B08 déplacement', 'step <= 180', 'step <= 90'],
        ['cache_glissant_ignore_la_resistance_des_blocs', 'B08 déplacement', 'this.board.blocks.map(b => [b.at, b.hp])', 'this.board.blocks.map(b => [b.at])'],
        ['chaine_glissante_sans_echeance_anticipee', 'B08 déplacement', 'triggered.add(target.bomb.id)', 'void target.bomb.id'],
        ['recompenses_calculees_mais_ignorees', 'B12 couverture', 'outcomeRewards(engine, m) + threatened', '0 * outcomeRewards(engine, m) + threatened', 'pilot'],
        ['decision_toutes_les_233_ms', 'B12 contrat', 'this.nextDecision = engine.ticks + 15;', 'this.nextDecision = engine.ticks + 14;', 'pilot'],
        ['recherche_limitee_aux_deux_premiers_candidats', 'B12 couverture', 'const cloneBudget = 11;', 'const cloneBudget = 2;', 'pilot'],
        ['score_moteur_ignore', 'B12 couverture', '(m.score - engine.score) * .5', '(m.score - engine.score) * 0', 'pilot'],
        ['adversaires_menaces_ignores', 'B12 couverture', 'threatened * 30', 'threatened * 0', 'pilot'],
        ['distance_aux_adversaires_ignoree', 'B12 couverture', '- Math.min(30, ...rivals.map(a => distance(a.at, m.player.at))) * 3', '- Math.min(30, ...rivals.map(a => distance(a.at, m.player.at))) * 0', 'pilot'],
    ];
    cases.push(
        ['ia_figee_dans_les_simulations', 'B12 IA active', 'const m = this.model;', 'const m = this.model; for (const a of m.actors) if (a.id > 0) a.think = 1000000;', 'pilot'],
        ['pouvoirs_supprimes_apres_action_initiale', 'B12 continuations', 'if (next.special) m.special();', 'if (false && next.special) m.special();', 'pilot'],
        ['pression_offensive_ignoree', 'B12 couverture', 'pressure * 8', 'pressure * 0', 'pilot'],
        ['continuations_de_fuite_toutes_identiques', 'B12 continuations', 'this.preference(m, intent.variant ?? 0)', 'this.preference(m, 0)', 'pilot'],
        ['bonus_supprimes_des_objectifs_de_chasse', 'B12 bonus', 'valuable && node.cost <= 4', 'false && valuable && node.cost <= 4', 'pilot'],
    );
    const results = [];
    for (const [name, id, before, after, target = 'engine'] of cases) {
        const mutant = await mutationModule(`../src/engines/bombercade/${target}.ts`, before, after);
        const { module } = await mutationModule('../tests/bombercade-oracles.ts', "from '../src/engines/bombercade/engine'", "from '../src/engines/bombercade/engine'", { [`../src/engines/bombercade/${target}`]: mutant.url });
        const oracle = module.oracles.find(([label]) => label.startsWith(id)); assert.ok(oracle, id);
        assert.throws(() => oracle[1](), `Mutation survivante : ${name}`);
        results.push({ name, oracle: oracle[0], killed: true });
        console.log(`Mutation rejetée : ${name} → ${oracle[0]}`);
    }
    const budget = await mutationModule('./bombercade-budget.ts', 'if (report.validationSeconds >= 60)', 'if (report.validationSeconds >= 600)');
    assert.equal(budget.module.durationFailures({ validationSeconds: 59.999 }).length, 0);
    assert.throws(() => assert.equal(budget.module.durationFailures({ validationSeconds: 60 }).length, 1));
    results.push({ name: 'limite_du_validateur_portee_a_dix_minutes', oracle: 'B12 frontière du budget de validation', killed: true });
    return results;
}
