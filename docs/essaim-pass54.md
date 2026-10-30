# Essaim — passe 54

Revue intégralement traitée : `rev-53-last.md`. Aucun navigateur, Vitest ou commit.

| Point | Correction / verrou |
| --- | --- |
| P2 | `damage(true)` applique la pénalité même sous invulnérabilité ; `E-P2` couvre trois vies et la dernière vie. |
| Bouclier frontal | Cône de 90° relatif à l'orientation (bas par défaut), même géométrie au rendu. `E-SHIELD` croise trois orientations, trois directions et six variantes de projectiles ; aucun privilège de rebond, renvoi ou perçage. |
| Lacune 1 | `E-GEN-01` pilote les niveaux 5/10/15/20/25/30 jusqu'au boss, avec 458 et 28, puis vérifie dernière vague, motif et PV. |
| Lacune 2 | `E-GEN-02` pilote la rencontre avec l'allié généré et les ennemis arrivés, pour les deux graines. |
| Lacune 3 | `E-GEN-03` exige des témoins de mouvements, émissions, collisions et phases dans des tentatives complètes ; E-DIV-01 ne lit plus les formations annoncées ni les boss de la configuration. Les armes ramassées sont rapportées mais exclues du compte des nouveautés. |
| Lacune 4 | `E-GEN-04` mesure l'ellipse rapide sur les deux axes et les vitesses, positions communes puis l'écartement réel des trois tirs de rafale. |
| Lacune 5 | `E-GEN-05` suit un projectile de tourelle générée : déplacement du joueur, correction effective, puis vitesse et trajectoire constantes après y=300. |
| Lacune 6 | `E-GEN-06` ramasse la charge puis constate les tirs normaux pendant un appui court et une charge pleine ; relâchement court sans suppression des tirs normaux. L'ancien test du tap vérifie maintenant des projectiles effectivement présents. |
| Lacune 7 | `E-GEN-07` atteint la phase 2 du commandement au pilote puis observe au moins trois tirs, espacés de 45 images et visant les deux côtés selon le déplacement du joueur. |
| Lacune 8 | `E-GEN-08` laisse quatre impacts générés détruire l'allié, vérifie la vie perdue, puis contrôle des sauvetages réels à 3 et 4 PV : 150 et 200 points hors score des ennemis. |

Les scénarios générés sont dans `tests/essaim-generated.ts`, intégrés à `behaviors`, donc au validateur Node et à la suite existante. Les fixtures géométriques et la reproduction P2 restent des régressions ciblées supplémentaires. Les trente niveaux et les graines 458/28 des campagnes sont conservés. Les mutations restent en mémoire.

## E-WPN-07

`tests/essaim-weapons.ts` compare deux exécutions déterministes de la première vague réellement générée, graine 458, avec le même pilote : tir normal seul ou une arme, durée normale de 14 secondes. Les caisses sont retirées des deux branches pour isoler l'arme ; aucun ennemi, PV, chronomètre ou nombre de vagues n'est modifié. Chaque arme a son assertion littérale `>= 1.3`. La durée mesure le passage à la vague suivante ; les défenses comptent les tirs interceptés/renvoyés pendant au plus 840 images, arrêt à l'issue terminale.

| Arme / formation | Tir normal | Arme | Rapport |
| --- | ---: | ---: | ---: |
| Rayon / scindeurs, niveau 10 | 822 images | 600 images | 1,370 |
| Rebond / escortes, niveau 4 | 1415 images | 740 images | 1,912 |
| Drones / rafales, niveau 2 | 0 interception | 9 interceptions | ∞ ; borne conservatrice 9 |
| Onde / spirales, niveau 13 | 648 images | 315 images | 2,057 |
| Aimant / mines, niveau 7 | 0 interception | 10 renvois | ∞ ; borne conservatrice 10 |
| Charge / blindés alignés, niveau 25 | 753 images | 273 images | 2,758 |

Pour les défenses, le tir normal ne peut intercepter les projectiles : le dénominateur réel est nul. Le JSON conserve les comptes bruts et `ratio: "Infinity"` ; l'assertion utilise aussi la borne prudente `interceptions / max(1, baseInterceptions) >= 1.3`. Aucun zéro n'est présenté comme une mesure positive du tir normal. L'ancien benchmark d'escortes et son seuil 1,5 sont conservés (702/223 = 3,148).

Rapport détaillé : `docs/essaim-validation.json` (contrôles, six mesures, deux campagnes complètes, témoins E-DIV et mutations). E-DIV : 14 niveaux de nouveauté, aucun clone adjacent, score 16,4. Les apparitions sont datées en images et accompagnées de leurs mesures.
