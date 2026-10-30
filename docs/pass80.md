# Passe 80 — doigt et rejeux Node

Reproduction : `node scripts/validate-finger.js`. Rapport : `docs/pass80-validation.json`. Les décisions réutilisent les politiques des E2E. Les moteurs avancent par `step(1000 / 60)`, avec livraison des commandes après 150 ms, sans horloge de scène pilotée. Les coordonnées conservent le bruit entier ±12 pixels CSS et les graines 70/72. La géométrie déclarée de 390×844 donne une échelle de 390/360 pour Bubble ; Dérapage réserve sa rangée de 156 px. Les graines des moteurs sont 28 et 454 pour Serpentin.

Le résumé fourni par l’hôte ne contient pas les journaux CDP ni les durées des captures. Il ne permet pas de reconstruire exactement ses horodatages. Les blocages de capture indiqués ci-dessous sont donc des expériences contrôlées, pas des durées prétendument mesurées sur cet hôte. Les E2E restent à relancer sur l’hôte tactile.

| Jeu | Diagnostic et correction | Preuve |
| --- | --- | --- |
| Traverse | Le pilote acceptait une décision avec seulement 220 ms avant le prochain mouvement. Après 150 ms de réaction, il ne restait que 70 ms pour le transport. Fenêtre portée à 300 ms ; les captures ne bloquent plus la conduite. Les règles du jeu offrent déjà 500 ms au niveau 1 et environ 417 ms au niveau 10. La défaite exacte de l’hôte n’a pas été reproduite sans ses horodatages. | Victoire, trois vies aux deux niveaux ; vérification supplémentaire avec 100 ms de transport. |
| Alunir | Le modèle de prédiction oubliait le compteur de stabilisation spéciale ; il prédisait donc une rotation pendant une stabilisation réelle. Les corrections angulaires supposaient aussi une commande de 16,7 ms, tenue en pratique 150 ms. Le pilote recopie les compteurs et utilise une zone neutre compatible avec 170 ms. Une capture initiale de 4 s provoque une collision au sol à environ 4 unités de vitesse verticale, soit environ 2,8 au-dessus de la limite. | Deux atterrissages gagnants ; carburant et marges de vitesse/angle dans le rapport. |
| Serpentin | Deux captures de 1 s, séparées par l’activation spéciale à 150 ms, provoquent un mur au niveau 1 et un obstacle au niveau 10, avant la première décision. Sans capture, anticiper seulement un virage reste insuffisant selon la phase de mouvement. Le pilote projette les 150 ms et choisit une file légale laissant trois cases de sécurité. | Victoire aux deux niveaux, pour 0/10/20/30 ms de transport supplémentaire ; 8/14 fruits. |
| Dérapage | Une capture pendant le spécial laisse le kart rouler sans nouvelle observation ; le cap calculé avant l’activation était ensuite réutilisé. Captures sorties de la conduite, nouvelle observation après le spécial. Aucune modification de physique. La défaite exacte de l’hôte n’a pas été reproduite avec les seules données fournies. | Trois tours et première place aux niveaux 1 et 10, avant le délai de 120 s. |
| Bubble | Le scénario tactique envoyait le début tactile directement par CDP : `Finger.release()` ne savait pas qu’un toucher était actif, donc aucun tir. Le pilote de niveaux exigeait parfois le même point de contact alors que plusieurs contacts éliminent exactement le même groupe. Il corrige maintenant sa visée selon le guide et accepte uniquement un résultat complet équivalent, bulles attachées et prochaines couleurs comprises. Il attend le compteur de tirs avant la fin de vol. | Scénario tactique : un tir dans chaque essai, victoire uniquement avec spécial. Niveaux 1/10 : 6/56 tirs, grille vide, égalité des grilles après chaque tir. |

## Corrections du jeu

Bubble mémorise le dernier guide affiché au relâchement. Un déplacement du doigt dans le paquet de fin de toucher ne change plus le point de rebond après la décision de tirer. Le test de scène exécute les vrais gestionnaires avec un déplacement de 12 px au lever et vérifie le projectile.

Alunir niveau 1 : près de la plateforme (moins de 60 unités, coque centrée avec 12 unités de réserve de chaque côté), relâcher la rotation corrige progressivement un angle entre 10° et environ 20°. Cette aide ne freine pas la chute, n’agit pas au niveau 10, ni hors de la plateforme, ni pendant une rotation commandée. Le test vérifie aussi qu’une descente à vitesse 4 reste fatale.

Serpentin : le bouton spécial retrouve la police commune de 16 px. Les captures d’habillage utilisent le délai Playwright par défaut, avec des assertions ciblées de personnage et de textures.

## Budget Node et catalogue public

L’exécuteur respecte le nombre de CPU disponibles (au plus deux processus), pour éviter que deux rejeux se disputent un seul CPU et dépassent leurs budgets de cas. Le chargeur efface les types par l’API native, avec repli sur le compilateur pour la syntaxe nécessitant une transformation ; le cache est indexé par contenu et par moteur de transformation. Aucun seuil n’est relevé : 2 s par cas, 180 s pour la commande.

Les audits complets restent disponibles sans `--checks-only`. En CI : courses spéciales complètes aux niveaux 1/10/30, deux courses ordinaires extrêmes, activation bornée sur les autres circuits. L’audit historique conserve les quatre bandes tactiles et les courses 1/10/30 complètes ; les 27 autres campagnes rejouent 1 200 pas et vérifient les empreintes cumulatives existantes tous les 600 pas. Les cas des nouveaux pilotes sont découpés sans réinitialiser leur moteur.

Le contenu, les scripts, les tests, les rapports et les noms de captures du catalogue utilisent désormais `level-catalogue`. Le garde de marque contrôle aussi les identifiants internes, sans distinction de casse, et inclut les nouveaux fichiers non encore indexés.

Validation finale : lint, typecheck et build réussis ; `npm run test:node` réussit ses 29 validateurs en **150,29 s**, sans relever les seuils. Aucun navigateur, aucun lancement Vitest, aucun commit.
