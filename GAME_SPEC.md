# Opencade — spécification des jeux

## Socle

### Vignettes

Chaque entrée du registre fournit `demo(seed)` et `thumbnail(seed)`. Les huit
politiques pures `engines/<id>/demo.ts` utilisent le niveau 3, une graine fixe
et les entrées ordinaires ; elles redémarrent après victoire, défaite ou 300 pas
(20 secondes). Aucun changement des règles, aucune ressource externe.
Les rendus `games/<id>/thumbnail.ts` dessinent l’état réel simplifié en Canvas
2D, sans instance Phaser sur l’accueil. Dimensions 160×120 CSS, DPR borné à 2,
au plus 15 images/s et un pas de 1000/15 ms par image, sans rattrapage.
Le contrôleur injectable `shell/thumbnails.ts` attend IntersectionObserver,
suspend hors écran et en arrière-plan, puis libère rappels et observateurs à
la sortie de l’accueil. La préférence reduce produit une seule image fixe.
La grille garde deux colonnes à 390 px, sans défilement horizontal.
Avec `?test=1`, `window.__ARCADE_TEST__.thumbnails()` renvoie une copie des
compteurs d’images par identifiant, conservés à la sortie et cumulés au retour.

| ID | Preuve |
| --- | --- |
| V01 | Huit fabriques, dessin déterministe sur faux contexte 2D |
| V02 | 2000 pas, état évolutif, redémarrage après fin et délai |
| V03 | Horloge/observateur injectés, suspension et nettoyage complet |
| V04–V05 | Huit canvas non vides, pixels animés en 600 ms |
| V06 | Reduce : pixels et compteur fixes après première image |
| V07 | Compteurs figés en jeu et relancés au retour |
| V08 | Mobile 390×844 : deux colonnes, largeur ≥140 px, aucun scroll horizontal |

### Appareil

`src/shell/device.ts` isole les API facultatives derrière des ports injectables.
Le Wake Lock écran est demandé au début du jeu actif, puis relâché en pause,
menu ouvert, sélection de niveaux, panneau de fin, sortie ou page masquée.
Une autorisation tardive après la pause est aussitôt relâchée ; une reprise
visible redemande le verrou. Aucun verrou pendant « Prêt ? ».
Les événements de présentation déclenchent 30 ms à la perte de vie,
[30, 40, 60] ms à la victoire et [60, 40, 60] ms à la défaite, uniquement
si le son global est activé, indépendamment du déverrouillage audio.
Le menu mobile propose « Plein écran » si la méthode existe ; après accord,
il tente le portrait. Absence, exception et rejet de ces API restent silencieux.
Sur l’aire et les contrôles, sélection, menu contextuel, callout et surlignage
tactile sont bloqués. Un toucher dans l’aire à « Prêt ? » démarre au relâchement ;
sa séquence est consommée sans action moteur. Le clavier et la souris gardent
leur comportement. Aucun changement de hauteur logique.


Accueil `#/` (également `#home`), carte accessible par jeu livré, titre de page
Opencade. Le registre `src/games/registry.ts` associe identifiant, nom, nombre
de niveaux, fabrique de scène, effets nommés et contrôles tactiles. Ajouter une
entrée suffit à enregistrer une scène qui respecte les services du socle.
Une URL `#/<id>` ouvre le jeu ; un identifiant inconnu revient à l’accueil.
La navigation conserve l’historique navigateur.

Chaque sortie détruit Phaser avec son canevas. La scène retire ses écouteurs DOM
par AbortController, ses écouteurs tactiles et le crochet Bubble ; le son coupe
les voix actives. Une nouvelle entrée crée une instance propre, sans boucle
conservée en arrière-plan. Le service son global garde son contexte déverrouillé.

Les modules `src/shell/` fournissent entrées, boutons tactiles, sélecteur, panneaux,
progression générique paramétrée par le nombre de niveaux, sauvegarde et son.
Les moteurs purs sont dans `src/engines/<id>/`, le PRNG dans `shared/random.ts`.
La sauvegarde est isolée sous `arcade-lab:<id>:v1`, le son sous
`arcade-lab:sound:v1`. Les anciennes clés Bubble sont copiées au premier accès
si la nouvelle clé est absente, sans effacer les données anciennes.
Chaque accès est protégé ; corruption et indisponibilité permettent de jouer.

Le portrait 390×844 conserve le canevas et des boutons de 44×44 minimum sans
défilement de page. Touch-action désactive les gestes navigateur dans l’aire de
jeu et ses contrôles ; seul touchmove dans cette aire est annulé. Le glisser
vise via Phaser, les trois boutons tactiles visent et tirent par le vrai moteur.

Avec `?test=1` seulement, `window.__ARCADE_TEST__` expose `open(id)`, `current()`
et `games[id]` (crochets de la scène active). Bubble conserve son contrat existant.
Le crochet typé de chacun des huit jeux expose `advance(ms)` : temps fini,
positif ou nul (sinon `RangeError`), avance synchrone par tranches de 1000/60 ms
et dernier reste, via `engine.step()` et ses accumulateurs habituels. Bubble
utilise son API de vol existante `engine.advance()` sans changer ses règles.
Les entrées maintenues sont lues comme dans la boucle ordinaire. Progression,
sauvegarde, affichage et panneaux sont synchronisés avant le retour, sans frame.
La pause et le sélecteur interdisent l'avance. Dès le premier appel valide,
un drapeau réservé au crochet suspend le temps automatique jusqu'au chargement
d'un nouveau niveau ; les frames continuent de synchroniser l'interface avec
un delta nul, sans doubler le temps simulé. Aucun crochet ni drapeau activable
hors `?test=1`.

Dans les E2E, conserver les vraies entrées du joueur, puis appeler `advance(ms)`
pour les issues lointaines (vol, chute, défaite, victoire, descente). Vérifier
ensuite l'état moteur **et** le panneau ou texte correspondant avec les attentes
courtes ordinaires. Les contrôles, glissers, boutons, pauses et mesures de mise
en page restent en temps réel ; ne pas relever les délais pour attendre le rendu.

Aucune règle ne consulte URL ou crochet. HTML dans index.html ou généré en TS,
CSS dans src/style.css, aucun asset importé, Phaser importé depuis phaser.

| ID | Preuve du socle |
| --- | --- |
| A01 | Accueil, registre non vide/ids uniques, carte clavier, sortie, retour navigateur |
| A02 | Ouverture directe du hash Bubble |
| A03 | Stockage absent, exceptions, corruption, migration, isolation et progression générique |
| A04 | Effet nommé sur faux contexte, coupure, déverrouillage ; son global persistant E2E |
| A05–A06 | Sélecteur verrouillé, panneau et scores communs via Bubble |
| A07 | Portrait 390×844 sans scroll, dimensions des boutons et tir tactile |
| A08 | Aucun crochet sans paramètre test |
| A09 | Parcours de tous les fichiers moteurs et interdiction DOM, Phaser et aléatoire natif |
| A10 | Suite Bubble historique intégrale, assertions conservées |
| A11 | Huit horloges manuelles : regroupement, zéro, temps invalides, absence de double avance et pause/sélecteur |

### Installation et hors connexion

Le build précache HTML, JS (Phaser inclus), CSS, manifeste et icônes via
Workbox generateSW. Aucun cache de données externes ni requête tierce.
Manifeste portrait standalone, couleurs #101827, scope et start_url relatifs.
Le service worker en mode prompt attend la fermeture de toutes les fenêtres
pour activer une mise à jour ; un statut discret et accessible l’annonce.
Les PNG originaux représentent une borne lumineuse avec motif dans la zone
sûre maskable. Les clés `arcade-lab:*` et `bubble-lab:*` restent inchangées
afin de conserver la progression. Le stockage local fonctionne hors ligne.
Le crochet `?test=1` reste identique ; le SW y est désactivé sauf si `pwa=1`
est aussi présent pour le parcours E2E hors ligne.

### Contrôles et pause

`GameDefinition.touchControls` contient des `TouchButton` : `id`, `label`,
`ariaLabel`, `size` (44, 56 ou 64), `placement` (left/center/right), `mode`
(tap/hold), `repeatMs` et `repeatDelayMs` optionnels. La scène appelle
`renderTouchControls(inputs, definition.touchControls, action)` ; `action(id,
held)` reçoit true à la pression, false au relâchement d'un hold. Sans
`repeatMs`, le jeu lit cet état maintenu ; avec répétition, il reçoit true après
le délai (300 ms par défaut), puis à chaque intervalle. Pointer capture,
pointercancel et lostpointercapture terminent le maintien ; le clic pointer
est neutralisé. Le clavier peut activer ces boutons accessibles.

`directionalSwipe(inputs, area, emit, threshold=30, repeat=false)` produit up,
down, left ou right après le seuil en pixels écran ; par défaut une seule
émission par geste, ou une émission à chaque nouveau franchissement depuis
le dernier point d'émission. `horizontalDrag(inputs, area, logicalWidth, emit,
offset=0)` convertit x écran vers x logique et borne au terrain ; le décalage
s'exprime en unités logiques. `virtualJoystick(inputs, parent, emit,
diameter=120)` crée un disque de 120 px minimum : null dans la zone morte de
12 px ou au relâchement, secteurs 0–7 dans le sens horaire depuis la droite.
Les helpers utilisent les pointer events et un seul pointeur actif chacun.
`Inputs.dispose()` annule les écouteurs par AbortController, les répétitions
et les éléments générés. Les fonctions pures sont dans `shell/gestures.ts`.

`keyboardHelp` et `touchHelp` sont obligatoires dans le registre ; le socle
choisit l'aide selon le pointeur tactile. `realtime` est obligatoire.
`createScene(session)` reçoit une `PlaySession`, dont `paused` vaut true sur
l'écran prêt et pendant la pause. Les jeux temps réel consultent ce booléen
pour leurs entrées ; le socle bloque aussi leur update Phaser, donc le pas du
moteur. Jouer/Reprendre lance la partie, Pause, P et Échap basculent la pause.
`visibilitychange` met en pause sans reprise automatique au retour. Les jeux
`realtime: false`, dont Bubble, démarrent immédiatement, sans écran prêt ni
pause. La session et ses écouteurs sont remplacés à chaque navigation.

La barre supérieure garde Accueil, titre et son sur une ligne de 48 px.
A07b vérifie une hauteur ≤64 px et un canevas ≥60 % du viewport 390×844.
Les cartes séparent nom et statistiques ; la grille a deux colonnes dès 600 px.

| ID | Preuve ajoutée |
| --- | --- |
| A07b | Barre sur une ligne et hauteur du canevas mobile |
| A11 | Seuil directionnel et quatre directions |
| A12 | Huit secteurs du joystick et zone morte |
| A13 | Conversion écran/logique, décalage et bornes |
| A14 | Répétition hold aux frontières de temps |
| A15 | Machine prêt/jeu/pause, arrière-plan, exemption Bubble |

### Mise en page mobile plein écran

En mode jeu, un pointeur coarse **ou** une largeur <600 px active le socle
mobile : `main` sans padding, hauteur `100dvh` avec repli `100svh`, safe-area
verticales réservées. Le body conserve ses gouttières
`max(16px, env(safe-area-inset-left/right))`. La barre de 44 px contient Accueil,
titre tronqué, Pause (temps réel), Son et ☰ ; chaque cible mesure au moins 44 px.
Le reste accueille l'aire Phaser et une seule rangée tactile de 64 px, boutons
≥56 px répartis entre les deux pouces. Les croix restent horizontales ; les
jeux à glisser conservent leurs gestes principaux. En dessous de 380 px,
Empilo masque la rotation inverse secondaire : trois rotations directes
permettent la même action, sans réduire les cibles ni dépasser les gouttières.

L'apparition de `body.touch` ne change pas cette disposition. Un
`ResizeObserver` sur `#game` rafraîchit l'échelle Phaser à chaque changement
de taille du conteneur ; il est déconnecté à la sortie du jeu.

Le menu rassemble statut, aide, Niveaux et Recommencer. Il suspend l'update,
les entrées de Bubble et les entrées clavier de jeu, sans modifier les moteurs.
Tab/Maj+Tab parcourent le menu et son bouton ; Entrée/Espace activent les
boutons ; Échap ferme et rend le focus à ☰. Fermer restaure l'état prêt,
playing ou paused précédent. Niveaux et Recommencer ferment le menu ; le
sélecteur continue d'utiliser le service commun. Un seul bouton son demeure.
Le score reste dans le HUD des huit canevas.

**Exception Ferraille choisie :** une unique rangée réservée de **120 px**,
joystick 120 px à gauche, Saut et Tir 64 px à droite. Cette alternative à la
superposition conserve les huit directions, les deux actions simultanées et
la visibilité des chutes sous le sol. Aucun contrôle ne recoupe même le
canevas entier, donc ni le héros ni les tuiles jouables. La rangée dépasse
64 px uniquement pour ce jeu ; M01 mesure la hauteur réellement réservée,
M02 vérifie la non-intersection avec toute la zone logique 360×640. Cela
préserve aussi les assertions historiques de Ferraille interdisant tout
chevauchement du canevas.

**Hauteur logique :** FIT 360×640 centré conservé. Les scènes positionnent
terrain, HUD et zones de glisser dans ce repère ; adapter la hauteur demanderait
de reprendre ces conventions propres aux jeux. Aucun moteur n'est modifié.
Essaim et Orbite arrondissent les coordonnées tactiles au pixel logique pour
absorber la perte de précision des événements navigateur avec le FIT fractionnaire
(écart maximal de 0,5 pixel logique). Les coordonnées souris restent continues.
Le bureau conserve ses contrôles et sa mise en page ; seul le socle mobile
masque les informations secondaires derrière le menu.

Les crochets des huit scènes exposent `usefulArea()` en coordonnées logiques
(boîte conservative : tout le canevas), et `hudText()` pour contrôler la
présence du score. Ces informations ne pilotent aucune règle.

| Oracle | Preuve dans `mobile-layout.spec.ts` |
| --- | --- |
| M01 | 8 jeux × 3 fenêtres tactiles, mesures avant puis 1 s après un toucher réel du canevas, stabilité à 1 px près, seuil largeur ≥92 % ou hauteur ≥85 %, JSON et pièce jointe |
| M02 | Conversion de la boîte utile logique en pixels écran, aucune intersection des contrôles, dimensions et gouttières |
| M03 | Hauteur de page ≤viewport+1, deux taps sans zoom, fixture refusant erreur JS/console.error |
| M04 | Menu, aide et statut visibles, snapshot identique après 300 ms, tir Bubble refusé, focus/Échap, Niveaux et Recommencer réels |
| M05 | Assertions historiques conservées ; seul le passage par ☰ est ajouté aux accès mobiles à Niveaux/Recommencer |

Mesures M01 (pixels CSS, puis % largeur / hauteur disponibles ;
Chromium tactile, safe-area nulles) :

| Jeu | 390×844 | 360×640 | 390×600 |
| --- | --- | --- | --- |
| ferraille | 358.00×636.44 (100.0 % / 93.6 %) | 267.75×476.00 (81.6 % / 100.0 %) | 245.25×436.00 (68.5 % / 100.0 %) |
| dedale | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| essaim | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| orbite | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| empilo | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| briqueterie | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| bubble | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |
| serpentin | 358.00×636.44 (100.0 % / 86.5 %) | 299.25×532.00 (91.2 % / 100.0 %) | 276.75×492.00 (77.3 % / 100.0 %) |

## Bubble Lab — règles


## Géométrie et tir

Aire logique 360×640, bulles de rayon 20. La grille comporte 13 rangées indexées
0–12. Les rangées paires ont 9 cellules, les impaires 8, décalées de 20 pixels.
L'espacement vertical est `20 * sqrt(3)`. Deux cellules voisines ont leurs centres
à 40 pixels environ. Au niveau 1, les cinq premières rangées sont remplies au démarrage
(43 bulles) ; les autres motifs sont décrits plus bas. Le lanceur est en (180, 570).

La visée est bornée à ±1,35 radian autour de la verticale ascendante. Les flèches
la modifient de 0,08 radian par événement clavier. Un clic/toucher au-dessus de
y=555 vise ce point et tire. La trajectoire est calculée par intersection rayon /
cercle (rayon de collision 40), plafond mobile y=`20 + drops * ROW_STEP` et murs x=20 / x=340. À chaque mur,
la composante horizontale de direction est inversée ; la verticale est conservée.
La trajectoire affichée et celle du projectile proviennent du même moteur.

Au contact d'une bulle, on choisit parmi ses voisines libres la cellule dont le
centre est le plus proche du point d'impact. Au plafond, on choisit la cellule
libre la plus proche de la rangée 0. Les égalités sont départagées par rangée puis
colonne croissantes. Aucune cellule occupée n'est remplacée. Sans place libre,
la partie est perdue. La vitesse logique du projectile est 0,75 pixel/ms.
Le moteur refuse tout nouveau tir pendant le vol : aucune file d'attente.

## Résolution atomique

1. Accrocher la bulle.
2. Parcourir le groupe connecté de sa couleur. À partir de trois bulles, supprimer
   **tout** ce groupe (10 points par bulle).
3. Après une suppression, parcourir les connexions depuis la rangée 0, toutes
   couleurs confondues. Retirer les bulles non reliées (20 points par bulle).
4. Grille vide : victoire. Sinon, présence sur la rangée 12 : défaite. Le bas de
   cette rangée atteint la ligne rose y≈455,7. Le trait visuel est à y=455.
5. Passer à la bulle en attente et tirer la nouvelle couleur du PRNG.

Aucune suppression avec deux bulles. Les connexions sont hexagonales, jamais des
voisinages carrés. Les bulles encore reliées au plafond restent en place. Le score
n'est jamais négatif. Les tirs ne sont plus autorisés après victoire/défaite.
Les animations suivent la résolution sans retarder ou altérer ses règles.

## Déterminisme et redémarrage

PRNG LCG 32 bits (`1664525 * state + 1013904223`, modulo 2^32).
Au démarrage, `next` puis `queued` sont tirées uniformément dans la liste triée
numériquement des couleurs présentes dans la grille (index `floor(random * longueur)`).
Après chaque résolution avec grille non vide, l'ancienne `queued` devient `next` :
si sa couleur a disparu par éclatement ou chute, on la retire d'abord, puis on tire
la nouvelle `queued` dans cette même liste restante. Chaque tirage consomme une
valeur du PRNG. Une grille vidée par un tir gagne sans aucun tirage supplémentaire.
Pour le chargement artificiel d'une grille vide (T01), la palette du niveau sert
de repli ; le scénario reste jouable afin de tester l'accrochage au plafond.
`load(grid, next)` et `setNext` refusent par exception une couleur absente d'une
grille non vide ; sur grille vide ils acceptent seulement la palette du niveau.
La validation précède toute mutation. Aucun mode test ne désactive ces règles.
Graine initiale : 452, celle du niveau 1.
Une même graine et une même suite de tirs résolus donnent les mêmes états
sérialisés. `Recommencer` restaure la grille initiale de la graine courante, le
score, la visée, le compteur de tirs, le générateur et le statut. Il annule le vol
et les effets. Le niveau 1 n'a ni pression temporelle ni descente ; les suivants descendent selon leur intervalle de tirs résolus.

## Traçabilité

| Oracle | Preuve |
| --- | --- |
| T01 | Tir réel sur grille vide : cellule au plafond |
| T02 | Trajectoire : point d'impact, inversion x, conservation y ; tir résolu |
| T03–T05 | Groupes de deux, trois, quatre ; grille et score résultants |
| T06–T07 | Chutes et branches ancrées ; grille résultante |
| T08–T09 | Statuts victoire et défaite après résolution |
| T10 | Snapshot initial restauré en unité et via le bouton HTML en E2E |
| T11 | Deux parties et tirs identiques ; témoin d'une autre graine |
| T12 | Souris, flèches/Espace, toucher : angle et grille lus depuis le moteur |
| T13 | Dimensions mobiles, toucher sur aire et bouton, capture |
| T14 | TypeScript + build Vite, assets relatifs, E2E sur preview de dist |

Cas limites unitaires dédiés : collision entre cellules, tirs près des bords,
grille presque pleine, tirs rapides. Aucun test n'invoque une règle alternative.

## Niveaux de Bubble Lab

Les dix définitions sont des données pures dans `src/engine/levels.ts`. Les motifs
sont originaux : masque de cellules et formule de couleur, avec une permutation de
palette calculée par le PRNG depuis la graine. La rangée 0 est toujours pleine
pour ancrer les motifs. Le niveau 1 garde cinq rangées et quatre couleurs.

| Niveau | Nom / motif | Couleurs | Rangées | Descente tous les N tirs | Graine par défaut |
| --- | --- | --- | --- | --- | --- |
| 1 | Atelier / rubans | 4 | 5 | aucune | 452 |
| 2 | Losange | 4 | 5 | 12 | 453 |
| 3 | Damier | 4 | 6 | 12 | 454 |
| 4 | Pyramide | 4 | 6 | 10 | 455 |
| 5 | Colonnes | 5 | 6 | 10 | 456 |
| 6 | Vagues | 5 | 7 | 9 | 457 |
| 7 | Chevrons | 5 | 7 | 8 | 458 |
| 8 | Spirale | 6 | 7 | 8 | 459 |
| 9 | Cristal | 6 | 8 | 7 | 460 |
| 10 | Prisme | 6 | 8 | 6 | 461 |

L'ouverture automatique, `loadLevel` et le choix HTML emploient la graine du tableau
quand aucune graine n'est fournie.
Le nombre de couleurs et de rangées ne diminue pas ; l'intervalle ne croît pas
(l'absence de descente équivaut à un intervalle infini). Les six couleurs ont des
marques de un à six traits sombres, en complément de la teinte.

### Plafond mobile

Chaque tir accepté compte immédiatement dans `shots`, mais seul un tir arrivé
compte dans `resolved`. Après suppression et chutes, une grille non vide descend
au Nième tir résolu, puis à chaque multiple de N. Une victoire évite la descente.
Le décalage `drops` ajoute `drops * ROW_STEP` à la coordonnée verticale de
`center(cell, drops)` et au plafond des trajectoires. Les coordonnées logiques,
la parité et les voisinages ne changent pas : translater tout le réseau conserve
exactement les six voisins et les connexions. La rangée 0 reste attachée au
plafond mobile ; aucune bulle nouvelle n'est ajoutée. La trajectoire et le rendu
utilisent le même décalage. Après résolution et descente, une bulle dont le bas
atteint y=455 provoque la défaite. Le compteur avant descente est dans le canevas
(`—` au niveau 1). Aucun délai réel n'influence la difficulté.

### Progression et sauvegarde

Une victoire ajoute le score du niveau au cumul de la session, débloque le niveau
suivant et affiche le panneau avec les deux scores. « Niveau suivant » conserve
ce cumul. Le dernier niveau affiche « Tous les niveaux réussis ! ».
Une défaite et « Recommencer » restaurent le cumul d'avant le niveau ; le niveau
courant et sa graine sont rejoués, score local remis à zéro. Un nouveau choix de
niveau commence une nouvelle session à cumul nul. Le menu montre les dix niveaux,
avec boutons désactivés et cadenas pour les verrouillés. Il suspend le vol ;
« Fermer » reprend la partie. Sur mobile il occupe temporairement l'aire de jeu,
avec défilement interne et boutons tactiles d'au moins 44 pixels.

`bubble-lab:v1` contient `{ unlocked, best }` : nombre maximal de niveaux
débloqués (1–10) et meilleur cumul entier sûr positif ou nul. La sauvegarde
n'enregistre ni partie en cours ni cumul de session. Après rechargement on repart
au niveau 1, mais le menu conserve déblocages et record. Toute donnée invalide
revient à `{ unlocked: 1, best: 0 }`. Chaque lecture/écriture est protégée par
try/catch dans le module pur `progression.ts`, dont le stockage est injecté.
L'accès à `window.localStorage` est lui aussi protégé dans la présentation ;
aucun stockage n'est nécessaire pour jouer et débloquer en mémoire.

### Crochet et traçabilité complémentaire

Le crochet reste activé seulement par `?test=1`. `loadLevel(index, seed?)` prend un
index **à partir de zéro**, et utilise le même démarrage que le menu et le bouton
suivant. `load` reste le chargeur de scénarios validés pour T01–T14. `read()` ajoute
`level` (index zéro), `drops`, `resolved`, `shotsBeforeDrop` (null sans descente),
`cumulativeScore` et `progression` (`playing`, `won`, `lost`, `complete`). Les règles
ne lisent jamais l'URL ou le crochet. Les snapshots moteur incluent niveau et
descentes ; même niveau, graine et tirs donnent les mêmes états sérialisés.

| Oracle | Preuve |
| --- | --- |
| L01 | Validité des dix niveaux et monotonie des trois paramètres |
| L02 | Génération et parties déterministes, sensibilité à la graine |
| L03 | N−1, vol puis Nième résolution ; translation et trajectoire |
| L04 | Défaite par descente et absence de descente après victoire |
| L05 | Connexions et chutes après déplacement du plafond |
| L06 | Couleurs du PRNG bornées par chaque palette |
| L07 | Déblocage, cumul, défaite, reprise et dernier niveau |
| L08–L09 | Stockage absent, exceptions, corruption, bornes, aller-retour |
| L10 | E2E desktop/mobile : victoire, suivant, reload et choix déverrouillé |
| L11 | E2E desktop/mobile : vraie entrée de défaite puis reprise avec cumul |
| L12 | E2E desktop/mobile : stockage interdit, niveau avancé et tir réel |

L13 complète la couverture E2E desktop/mobile : fin au dernier niveau, absence de
bouton suivant, déblocage en mémoire même si l'accès à localStorage lève.

### Traçabilité des propositions de couleur

| ID | Preuve |
| --- | --- |
| C01 | Une/deux couleurs, 200 résolutions pour chacune des quatre graines |
| C02–C03 | Couleurs disparues par éclatement/chute retirées des deux propositions |
| C04 | Même graine et tirs : mêmes snapshots ; autre graine : témoin différent |
| C05 | Propositions présentes au démarrage de chaque niveau, graine initiale harmonisée |
| C06 | Chargement/crochet stricts, repli vide, victoire sans tirage |
| L14 | Desktop/mobile : six tirs réels, défaite par descente, panneau et capture |

Les panneaux de résultat ont une hauteur selon leur contenu et sont centrés dans
l'aire de jeu, avec largeur et hauteur maximales ; le choix des niveaux reste plus large.

## Son

Synthèse WebAudio originale, sans fichier audio et sans dépendance ajoutée.
Un oscillateur sinusoïdal par groupe éclaté : fréquence initiale
`420 + 35 × clamp(taille − 3, 0, 9)` Hz, donc 420–735 Hz ; descente à 55 %
en 90 ms. Une chute produit un seul oscillateur triangulaire à 150 Hz par
résolution, quelle que soit la quantité détachée, pendant 160 ms. Enveloppes
avec attaque de 5 ms, gain maximal 0,12 puis extinction exponentielle.

Le bouton HTML `#sound` annonce « Son activé » ou « Son coupé » et expose
`aria-pressed` (true = actif). Clic, Entrée et Espace fonctionnent ; ces touches
sur un bouton ne tirent pas dans le jeu. La coupure annule aussi les enveloppes
actives. Clé indépendante `bubble-lab:sound:v1` : `on`/`off`, actif par défaut.
Chaque accès au stockage est protégé, stockage indisponible = état en mémoire.

Le service `src/game/sound.ts` reçoit une fabrique de contexte injectée.
Aucun contexte n'est créé/repris avant une interaction pointerdown, keydown ou
clic ; un contexte coupé n'est pas déverrouillé. Une interaction ultérieure
permet de retenter un échec. L'absence de WebAudio (y compris le préfixe webkit),
les erreurs de construction, de resume et de nœuds restent silencieuses ; le jeu
continue. Aucun événement sonore n'est rejoué rétroactivement. La scène appelle
le service une fois pour chaque Resolution, sans modifier le moteur pur.
Tout est en TypeScript, compatible avec Phaser externe et un bundle unique.

| ID | Preuve son |
| --- | --- |
| S01 | Faux contexte : aucun contexte avant unlock, un pop par groupe |
| S02 | Fréquences différentes selon taille et bornes 420–735 Hz |
| S03 | Une chute par résolution, fréquence plus grave |
| S04 | Aucun son coupé, persistance et stockage qui lève |
| S05 | Fabrique absente/qui lève, resume rejeté, nœuds qui lèvent |
| S06 | E2E desktop/mobile : clic, clavier, aria, reload, éclatements actif/coupé |
| S07 | E2E desktop/mobile : WebAudio absent et victoire réelle |

## Serpentin

Grille originale 15×21, départ de trois segments au centre vers la droite.
Une pomme-étincelle ajoute un segment et 10×(index+1) points. Victoire à
l'objectif ; mur, obstacle ou corps : défaite. La queue libérée au même
pas reste traversable, sauf en mangeant. Aucun demi-tour : validation contre
la dernière direction en file. Deux virages maximum sont conservés et
consommés à raison d'un par déplacement (deux déplacements successifs, jamais
un saut diagonal). En tore, les quatre bords sont raccordés.

### Générateur des 30 niveaux

Pour l'index `i` de 0 à 29, `difficulty(i)` expose :

| Paramètre | Formule |
| --- | --- |
| Vitesse | `6 + 10*i/29` pas/s |
| Objectif | `8 + floor(22*i/29)` pommes |
| Obstacles | `floor(40*i/29)` cases |
| Motif | `floor(i/8)` : lisière, rayons, archipel, passages |
| Bords | Tore si `i % 5 === 4`, murs sinon |

Vitesse, objectif, nombre d'obstacles et indice de motif sont non décroissants.
Le tore alterne pour varier les parcours ; ce booléen n'est pas une mesure
ordonnée de difficulté. Les candidats des motifs sont tirés sans remise par
le PRNG partagé. Une zone de départ de 9×5 reste libre. Chaque ajout est
accepté uniquement si un BFS depuis le départ visite les `315-obstacles`
cases libres : aucun compartiment fermé. N08 vérifie aussi le nombre exact
sur 30 niveaux × 12 graines. Le BFS utilise des indices de cases, un tableau
de visite et les voisinages précalculés (murs/tore), dans le même ordre haut,
bas, gauche, droite. Une empreinte FNV-1a `7b2da581`, calculée avant optimisation
sur les 30 snapshots initiaux à graine 454, fige grilles, pommes et PRNG. Les pommes sont tirées parmi les cases libres
accessibles à la tête en tenant compte du corps actuel. Si aucune case n'est
accessible après une pomme avant l'objectif, la partie est perdue (aucune
victoire anticipée ni pomme enfermée).

Le cristal apparaît après 10 secondes simulées, puis toutes les 10 à 15
secondes (PRNG). Il expire après 300 ticks, soit 5 secondes, et rapporte
50×(index+1) sans croissance. Il n'apparaît ni sur la pomme, ni sur le serpent,
ni sur les obstacles. Son expiration est traitée avant le déplacement du tick.

`step(dtMs)` conserve le reliquat et exécute des ticks de 1000/60 ms ; un
accumulateur de vitesse déclenche les déplacements. Aucun temps mural dans
le moteur. Le snapshot inclut PRNG, file, compteurs et reliquat normalisé à
10⁻⁸ ms pour éliminer les différences d'arrondi dues au découpage de rendu.
Les entrées sont appliquées aux mêmes instants simulés avant `step`.

### Présentation et services

Route `#/serpentin`, scène Phaser et formes dessinées par code, sons
synthétisés `turn`, `apple`, `crystal`, `won`, `lost`. Un seul bouton son.
Flèches et ZQSD/WASD ; glisser de 20 px sur l'aire avec suivi des virages ;
croix tactile de quatre boutons de 56×56 px sous le canevas. La session
commune affiche Prêt ; toucher Jouer ou Espace/Entrée démarre. Pause par
bouton, P, Échap ou arrière-plan ; moteur et entrées suspendus. Le sélecteur
suspend aussi les déplacements. Progression commune sur 30 niveaux, cumul,
restauration en défaite, meilleur score et clé `arcade-lab:serpentin:v1`.

Le crochet `__ARCADE_TEST__.games.serpentin` est actif uniquement avec
`?test=1` et expose `read`, `loadLevel(index, seed)` et `scenario('finish' |
'wall')`. Les scénarios restaurent une position : sept pommes déjà mangées
et une huitième au-dessus, ou un obstacle au-dessus avec pomme libre ailleurs.
Seule une vraie entrée vers le haut, suivie d'un déplacement ordinaire, peut
produire l'issue. `loadState` ne change aucune règle ni aucun statut final.

### Traçabilité

| Oracle | Preuve moteur `tests/serpentin.test.ts` | E2E `tests/e2e/serpentin.spec.ts` |
| --- | --- | --- |
| N01 | Avance et longueur | Déplacements réels |
| N02 | Demi-tour direct et en file | — |
| N03 | File bornée, deux pas | Clavier / croix tactile |
| N04 | Croissance, score × niveau | Score cumulé 80 |
| N05 | Mur et obstacle | Défaite, capture, rejouer |
| N06 | Corps, queue libérée, queue croissante | — |
| N07 | Quatre bords du tore | — |
| N08 | BFS, graines, génération et renouvellement | — |
| N09 | Avant objectif puis objectif | Victoire, suivant, reprise après reload |
| N10 | Monotonie et extrêmes | Capture niveau 30 |
| N11 | Graine témoin, snapshots, deux cadences | — |
| N12 | Apparition, expiration, score, longueur | — |

Les deux projets Chromium produisent les captures `serpentin-play-<projet>`,
`serpentin-level30-<projet>`, `serpentin-won-<projet>` et
`serpentin-lost-<projet>.png`. La fixture commune échoue sur pageerror ou
console.error. Mobile : uniquement touchscreen et contacts tactiles réels via Chromium.

## Briqueterie

### Règles et choix

Aire logique 360×640, balle de rayon 6, raquette à y=586 (hauteur 12).
Trois vies. La balle attend sur la raquette avant chaque départ et après une
perte ; tap, Espace ou Lancer la propulse verticalement. Une balle dont le centre
dépasse y=646 est retirée ; une vie est perdue seulement quand la dernière balle
tombe. Zéro vie entraîne la défaite. Toutes les briques destructibles retirées
entraînent la victoire, les briques marquées d'une croix étant indestructibles.
Chaque impact destructible rapporte 10 points, sa destruction 20 supplémentaires.

Le moteur pur utilise des ticks de 1000/60 ms avec reliquat. Les vitesses sont en
pixels/tick. Les entrées `move(x)` et `launch()` s'appliquent avant le pas demandé.
`snapshot()` copie les données, le PRNG, les ticks et le reliquat arrondi à 10⁻⁸ ms.
Même niveau, graine et entrées aux mêmes instants simulés donnent le même état,
quel que soit le découpage d'affichage. `loadState` charge une position construite,
sans produire d'issue ni modifier les règles.

Les collisions recherchent le premier temps de contact sur tout le déplacement :
segments des faces et équations quadratiques pour les coins arrondis (somme du
rectangle et du disque). Le reliquat de déplacement est résolu après réflexion.
Les murs latéraux et le plafond réfléchissent la normale. Sur la raquette,
`angle = clamp((impactX-centre)/(largeur/2), -1, 1) * 60°`, mesuré depuis la
verticale vers le haut. Sur les briques, réflexion selon la normale de face ou de
coin. Les contacts simultanés sont résolus dans un ordre stable. Une limite de
64 contacts par balle et par tick arrête le déplacement résiduel en cas d'état
construit pathologique ; elle ne saute aucun obstacle. Tous les dix rebonds,
la vitesse augmente de 0,2 jusqu'au plafond du niveau (toutes les balles actives).

À chaque destruction, tirage à graine : probabilité de bonus 24 %, puis type
équiprobable. Quatre bonus en chute au maximum ; centre dans [10,350]×[10,560],
aucun recouvrement avec une brique restante ou un autre bonus (carrés de 20 px).
Une tentative impossible est abandonnée, sans recherche ni déplacement caché.
Les bonus descendent de 2 px/tick, se ramassent à la raquette et disparaissent
sous l'aire. Une perte de vie retire les bonus en chute.

| Bonus | Marque | Effet |
| --- | --- | --- |
| Élargir | Trait horizontal turquoise | +36 px pendant 600 ticks (10 s), renouvelé à chaque prise |
| Multi-balle | Trois points violets | Deux balles supplémentaires à ±0,4 rad autour de la première, donc ×3 au premier ramassage ; maximum neuf balles |
| Vie | Plus rose | +1 vie, maximum neuf |

Les plafonds des balles, vies et bonus sont des choix de lisibilité et de stabilité.
Les bonus pris pendant l'attente peuvent élargir ou ajouter une vie ; multi-balle
n’a aucun effet pendant l’attente et ne duplique pas les balles immobiles.

### Générateur des 30 niveaux

Index `i=0…29` (numéro affiché i+1), graine par défaut 455. Grille de dix colonnes,
dix rangées candidates ; rectangle `(11+34*x,54+23*y,32,18)`. Les candidats sont
triés par rang du motif puis départagés par le PRNG partagé. Les `densité`
premiers deviennent destructibles ; les `indestructibles` suivants sont marqués
d'une croix. Leur nombre ne réduit donc jamais celui des destructibles. Aucune
brique sous y=279 ; la zone de départ et le trajet du doigt restent dégagés.

| Paramètre `difficulty(i)` | Formule |
| --- | --- |
| Vitesse initiale | `4 + 5*i/29` (4 → 9) |
| Plafond | `7 + 6*i/29` (7 → 13) |
| Densité destructible | `30 + 2*i` (30 → 88 briques) |
| PV par brique | `1 + floor(i/10)` (1 → 3) |
| Indestructibles | 0 avant i=7 ; `1 + floor((i-7)/4)` ensuite |
| Rétrécissement mesuré | `narrowness=i` ; largeur `92-i` px |
| Motif | `floor(i/6)` : cinq familles de six niveaux |

Les paramètres de difficulté (vitesse, plafond, densité, PV, indestructibles,
rétrécissement, indice de motif) sont non décroissants. La largeur diminue comme
souhaité ; elle est exprimée en rétrécissement pour la mesure monotone.

Pour la colonne x et la rangée y, les rangs des cinq motifs originaux sont :

| Niveaux | Famille | Rang prioritaire croissant |
| --- | --- | --- |
| 1–6 | Éventail | `y + abs(x-4.5)` : pyramide |
| 7–12 | Mosaïque | `((x+y)%2)*10+y` : damier |
| 13–18 | Marées | `abs(y-(3+sin(0.8*x)*2))` : vagues |
| 19–24 | Remparts | `min(x,9-x,y,9-y)` : enceinte |
| 25–30 | Étincelles | `min(abs(x-y),abs(9-x-y))` : diagonales croisées |

### Présentation et socle

Route `#/briqueterie`, scène Phaser Graphics, briques avec points de PV et croix,
bonus avec marques, halo de balle et flash sur brique cassée, bonus et perte.
Effets synthétisés `launch`, `bounce`, `paddle`, `brick`, `bonus`, `life`, `won`,
`lost`, via le bouton son global. Aucune ressource ni dépendance ajoutée.

Souris : suivre x ; doigt : glisser sur toute l'aire, de préférence dans la bande
basse sous la raquette pour ne pas cacher l'action. Deux boutons maintenus de
56 px sous le canevas déplacent aussi la raquette ; bouton central Lancer.
Clavier : flèches ou A/D, Espace. Le socle fournit Prêt, Pause, P/Échap,
pause en arrière-plan, sélecteur, panneaux et Progression sur trente niveaux.
La pause et le sélecteur suspendent le moteur. Le bouton Pause reste dans la
barre, hors du canevas. Sauvegarde isolée `arcade-lab:briqueterie:v1` : déblocage,
record ; cumul conservé après victoire, restauré après défaite.

Le seul changement d'intégration commun est l'entrée `GameDefinition` au registre.
Aucun service `src/shell/*` n'est modifié. Avec `?test=1` seulement,
`__ARCADE_TEST__.games.briqueterie` expose `read`, `loadLevel(index, seed)` et
`scenario('finish'|'fall')` (également via `__BRIQUETERIE_TEST__`). Les scénarios
chargent une seule brique à y=530, balle en attente et trois vies ou une vie.
Le scénario finish exige un lancement réel ; fall exige le lancement puis
l'éloignement de la raquette pour manquer la balle. L'issue vient uniquement du
moteur. Le crochet est retiré quand la scène est détruite.

### Traçabilité de l'oracle

| ID | Preuve moteur `tests/briqueterie.test.ts` | E2E `tests/e2e/briqueterie.spec.ts` |
| --- | --- | --- |
| K01 | Mur et plafond, direction et position | — |
| K02 | Centre et deux extrémités de raquette | Souris, A et maintien tactile, glisser réel |
| K03 | Faces supérieure et latérale, coin arrondi et coin évité | — |
| K04 | Collision au plafond du niveau 30 et à 150 px/tick | — |
| K05 | Deux impacts, PV, destruction et score 40 | Score 30 après dernière brique |
| K06 | Indestructible : rebond, PV et exclusion de la victoire | — |
| K07 | Trois pertes, relance et zéro vie | Défaite par vraie entrée, Rejouer |
| K08 | Dernière brique cassée par déplacement | Lancement, panneau suivant, cumul et sauvegarde |
| K09 | Trois bonus, durée, dernière balle, plafond vie ; apparition saturée/interdite ; fréquence 22–26 % sur 8 000 destructions et 16 graines, trois sortes présentes | — |
| K10 | Dixième rebond et 300 rebonds plafonnés | — |
| K11 | Trente niveaux, compte exact, bornes, monotonie dans chaque sens et variation stricte aux extrêmes | Niveau 30 et capture |
| K12 | Même graine/actions, deux découpages, graine témoin, snapshot isolé | Prêt/pause figés, crochet absent hors test et nettoyage |

La fixture commune échoue sur toute erreur JS ou console.error. Les deux projets
Chromium utilisent un seul worker ; mobile uniquement tap et contacts tactiles
via Chromium (aucun clavier). Assertions de visibilité, absence de scroll,
cibles de 56 px et absence de chevauchement Pause/canevas. Huit captures dans
`test-results/screenshots/briqueterie-{play,level30,won,lost}-<projet>.png`.

## Empilo

### Règles et choix originaux

Empilo (`empilo`, route `#/empilo`) est une composition de cristaux dans un puits
**9 × 16**. Les silhouettes, palette pastel minérale, facettes en losanges, sons
synthétisés et strates sont générés par code sous MIT. La mécanique générique
de chute et de lignes est conservée ; les dimensions, la collection de tailles
variées et l'habillage sont propres à ce jeu. Aucun habillage ni appellation
commerciale n'est repris. Pas de nouvelle dépendance.

Huit silhouettes sans appellation de lettre, coordonnées `(x,y)` avant rotation :

| Index interne | Cellules |
| --- | --- |
| 0 | (0,0), (1,0), (2,0) |
| 1 | (0,0), (0,1), (1,1) |
| 2 | (0,0), (1,0), (1,1), (2,1) |
| 3 | (0,0), (0,1), (1,1), (2,1) |
| 4 | (0,0), (2,0), (0,1), (1,1), (2,1) |
| 5 | (1,0), (0,1), (1,1), (2,1), (1,2) |
| 6 | (0,0), (0,1), (0,2), (1,2), (2,2) |
| 7 | (0,0), (1,0), (2,0), (3,0), (4,0) |

Deux triominos, deux pièces de quatre cellules, quatre pentominos : il ne s'agit
jamais d'une collection de sept pièces de quatre cellules. La dernière forme
permet réellement l'effacement simultané de cinq lignes après rotation.

Rotation géométrique `(x,y) → (-y,x)` ou `(y,-x)`, puis translation pour ramener
les minima x/y à zéro. Essais horizontaux dans l'ordre **0, −1, +1, −2, +2**,
sans décalage vertical ; échec sans mutation si aucune position n'est libre.
Apparition à `(3,0)`, jamais dans un mur ou un cristal : apparition bloquée =
défaite, sans chercher une autre position ni tirer une autre forme.

Sac mélangé de toutes les formes disponibles, chacune une fois par sac,
Fisher–Yates avec le PRNG partagé. Trois suivantes toujours visibles ; le sac
est consommé par l'apparition puis les trois aperçus. La graine par défaut est
456. Toute nouvelle partie reconstruit le sac et les gravats à cette graine.

Pas fixes de `1000/60 ms`, accumulation du temps et de la gravité fractionnaire.
Une pièce au sol se verrouille après 500 ms cumulés au sol (le tick qui atteint
le sol compte). Un déplacement ou une rotation **réussis depuis le sol** remet
ce temps à zéro, au plus quinze fois par pièce. Les échecs et la descente douce
ne le réinitialisent pas. Au-delà du plafond, le temps déjà passé au sol reste
acquis même si la pièce quitte un rebord ; le compteur reprend au prochain
contact. La chute instantanée verrouille immédiatement.

Descente douce : +1 par cellule effectivement parcourue ; chute instantanée :
+2 par cellule. Les lignes sans sceau sont retirées simultanément et les rangées
supérieures descendent. Barème pour 1/2/3/4/5 lignes :
**100/300/600/1000/1500 × numéro du niveau** ; au-delà, +600 par ligne
supplémentaire (défense pour les positions construites). Victoire dès que les
lignes effacées atteignent l'objectif ; aucun tirage supplémentaire après victoire.

**Sceaux, choix explicite :** une ligne complète contenant un cristal scellé
n'est pas comptée ni retirée au premier passage. Ses sceaux deviennent des
cristaux ordinaires et ses autres cellules sont vidées ; il faut compléter de
nouveau cette rangée pour l'effacer. Les autres lignes complètes sont traitées
normalement dans le même verrouillage. Un anneau blanc indique un sceau.
Ce choix évite qu'une rangée pleine immuable bloque immédiatement le puits.

### Générateur des 30 strates

Index `i=0…29`, numéro visible `i+1`. Tous les paramètres ci-dessous sont
non décroissants, avec croissance stricte entre les deux extrêmes.

| `difficulty(i)` | Formule | Extrêmes |
| --- | --- | --- |
| gravity | `1 + 17*i/29` | 1 → 18 cellules/s |
| goal | `5 + floor(35*i/29)` | 5 → 40 lignes |
| rubble | `floor(8*i/29)` | 0 → 8 rangées |
| sealed | `floor(4*i/29)` | 0 → 4 colonnes candidates au sceau |
| shapes | `4 + min(4,floor(i/5))` | 4 → 8 formes |

Les quatre premières formes sont disponibles aux niveaux 1–5 ; les formes 4,
5, 6 et 7 arrivent respectivement aux niveaux 6, 11, 16 et 21. Les gravats
occupent les `rubble` rangées inférieures. Pour chacune, de haut en bas, un tirage
`floor(random.next()*9)` choisit **un trou garanti**. Les huit autres cellules
sont ordinaires, sauf celles de colonne `x < sealed`, qui portent un sceau.
Le tirage des gravats précède celui des sacs. La moitié supérieure et la zone
d'apparition restent libres, même au niveau 30.

### Présentation, contrôles et socle

Puits centré, projection translucide de la chute, trois aperçus sous le puits
(pas de 16 unités, cristaux de 14 unités, plus de 12 px rendus en 390×844),
score, lignes, vitesse et signal d'ancrage. Flash de verrouillage/effacement et
effets nommés `move`, `rotate`, `soft`, `drop`, `lock`, `clear`, `won`, `lost`
via le son global. Les cellules sont des cristaux dessinés avec Graphics.

Clavier : ←/→ déplacer, ↓ descente douce, X/W/↑ rotation horaire,
Z/C antihoraire, Espace chute instantanée. Souris : boutons ou tap du puits pour
tourner, glisser pour déplacer/chuter. Au doigt : six boutons de **56 × 56 px**
← → ↻ ↺ ↓ ⤓ sous le canevas, déplacement/descente maintenus ; glisser horizontal
produit un déplacement par tranche de 30 pixels écran ; tap tourne ; glisser
vers le bas de 60 px en moins de 350 ms fait une chute instantanée.
Le doigt peut donc rester entièrement sous le puits.

Prêt, Jouer, Pause/P/Échap et pause arrière-plan proviennent du socle. La pause
et le sélecteur suspendent le moteur. Progression, panneaux, cumul restauré en
défaite, record et déblocage utilisent les services existants, clé isolée
`arcade-lab:empilo:v1`. Aucune modification de `src/shell/*` ni de `src/main.ts` :
une entrée `GameDefinition`, des styles limités à `body.empilo` et l'inclusion
des E2E Empilo dans le projet Chromium desktop suffisent.

Avec `?test=1` uniquement, `__ARCADE_TEST__.games.empilo` (alias
`__EMPILO_TEST__`) expose `read()`, `loadLevel(index,seed?)` et
`scenario('finish'|'blocked')`. Le premier scénario place quatre lignes déjà
comptées et une rangée avec un trou de trois cellules ; le second bloque
l'apparition suivante avec une pièce déjà en bas. Tous deux attendent une vraie
entrée : déplacement/rotation/chute et statuts passent par les règles ordinaires.
`loadState` charge une position, pas un checkpoint de PRNG ; `snapshot` inclut
état, sac, PRNG et accumulateurs et renvoie une copie sérialisable.
Les écouteurs et le crochet sont libérés à la destruction de la scène.

### Traçabilité de l'oracle

| ID | Vitest `tests/empilo.test.ts` | E2E `tests/e2e/empilo.spec.ts` |
| --- | --- | --- |
| E01 | Murs, blocs, refus sans déplacement | Flèches/boutons, glisser 60 px |
| E02 | Rotation inverse, cinq décalages, échec sans mutation | Tap/souris, rotation inverse dédiée |
| E03 | Gravité fixe, 500 ms, 15 remises puis verrouillage | Prêt et pause figés |
| E04 | 1 à 5 lignes simultanées et barème × niveau | Dernière ligne et score au panneau |
| E05 | Douce +1, chute +2, refus au sol | Douce puis chute par geste/bouton/clavier |
| E06 | Trois sacs successifs par graine, 40 graines par palier ; fréquence exacte et premières formes variées | Trois aperçus visibles dans les captures |
| E07 | Apparition bloquée sur 80 graines, pas de substitution ; départ légal | Défaite après chute réelle, Rejouer |
| E08 | Objectif exact et arrêt des entrées après victoire | Victoire, Niveau suivant, cumul, reprise du déblocage/record |
| E09 | 30 niveaux × 20 graines, un trou par rangée, neuf colonnes atteintes | Capture niveau 30 |
| E10 | Première complétion fragilise sans score, seconde efface | Sceaux visibles au niveau 30 |
| E11 | Chaque paramètre monotone et strict aux extrêmes, bornes | Sélecteur de 30 niveaux |
| E12 | Entrées horodatées, découpages équivalents, graine témoin, huit formes dont deux seulement de quatre cellules | Crochet absent sans test ; géométrie sans scroll ni chevauchement Pause/canevas |

Les E2E mobile utilisent uniquement taps `touchscreen` et gestes tactiles Chromium,
sans clavier. La fixture existante fait échouer toute erreur JS/console.error.
Huit captures : `test-results/screenshots/empilo-{play,level30,won,lost}-<projet>.png`.
Les mutations murs, délai de verrouillage et sceaux ont chacune été détectées
par E01, E03 et E10 respectivement, puis restaurées avant validation.

## Orbite

### Règles et choix de jouabilité

Aire logique 360×640. Le canon (y=588) se déplace à 260 px/s entre x=16 et
344. Trois vies, invulnérabilité de 1200 ms après un impact ; les tirs reçus
pendant cette fenêtre sont absorbés. La flotte avance en bloc entre x=12 et
348 (en tenant compte du rayon de sonde 11). Au bord, elle termine son mouvement
contre la limite, descend de 18 px et inverse son sens une seule fois. Sa
vitesse vaut `speed × (1 + 2 × (1 - restantes/initiales))`, jusqu'à presque
3× la vitesse initiale. Atteindre y=488 avec le bas d'une sonde fait perdre,
indépendamment des vies et avant la résolution des projectiles du pas courant.
Détruire la dernière sonde fait gagner, sauf défaite déjà survenue dans ce pas.

Un tir joueur actif, **deux dès le niveau 15 inclus** (index 14) ; délai de
180 ms entre deux tirs. Espace/Tir maintenu répète les tentatives, sans jamais
outrepasser cette limite. Vitesse des tirs joueurs : 480 px/s. Un impact
consomme le projectile ; une sonde blindée réclame deux impacts et ne rapporte
qu'à sa destruction. Le score vaut `(rows - row) × 10 × numéro du niveau`,
avec `row=0` en haut. Les tirs ennemis sont émis par la sonde géométriquement
la plus basse de la colonne choisie uniformément parmi les colonnes occupées.
Le délai de tir est `1000/fireRate × (0.75 + random.next() × 0.5)` ; au plus
12 tirs ennemis actifs, aucune émission si toutes les colonnes sont vides.

Quatre boucliers sont générés à x=28, 108, 208, 288, chacun dans une matrice
11×7 de cellules **4×4 px** à partir de y=488. Coins hauts arrondis par retrait
des cellules extérieures aux deux premières rangées ; arche libre de trois
cellules centrales dans les trois rangées basses. Chaque projectile, joueur
ou ennemi, détruit exactement la première cellule rencontrée et disparaît.
Les collisions balaient le segment vertical du projectile sur chaque pas et
retiennent la première intersection, ce qui évite de sauter les cellules de
4 px. Les boucliers peuvent aussi gêner les tirs du joueur ; les intervalles
entre eux restent libres.

Toutes les 5 s, une tentative de comète a 22 % de chances de réussir. Une seule
comète à la fois, aucune apparition si une sonde empiète sur la voie réservée
(`probe.y - 11 < 78`). Apparition à x=-16 ou 376, y=56, deux sens équiprobables,
vitesse 95 px/s ; retrait au-delà de x=-28 ou 388. Collision joueur :
150×numéro du niveau, une seule fois, sans compter pour la victoire. V09 teste
400 graines, entre 65 et 110 apparitions (16,25–27,5 %), les deux sens, les
positions interdites, le cas déjà occupé, l'expiration et le score.

### Générateur des 30 niveaux

Indices `i=0..29` ; aucun niveau ne dépend de l'URL ni du crochet. La fonction
`difficulty(i)` expose **tous** les paramètres suivants, chacun testé monotone
non décroissant, strict entre les deux extrêmes :

| Paramètre | Générateur | Niveau 1 → 30 |
| --- | --- | --- |
| speed (px/s) | `18 + 24*i/29` | 18 → 42 |
| fireRate (tirs/s moyens) | `0.7 + 1.3*i/29` | 0,7 → 2 |
| rows | `3 + floor(2*i/29)` | 3 → 5 |
| columns | `6 + floor(3*i/29)` | 6 → 9 |
| startY | `96 + 70*i/29` | 96 → 166 |
| armor (probabilité) | 0 si i<9, sinon `0.15 + 0.25*(i-9)/20` | 0 → 0,4 |
| patternTier | `min(3,floor(i/8))` | 0 → 3 |
| enemySpeed (px/s) | `145 + 65*i/29` | 145 → 210 |
| shotLimit | 1 si i<14, sinon 2 | 1 → 2 |

L'« altitude croissante » est interprétée comme une ordonnée initiale croissante :
la flotte commence progressivement plus près des boucliers, réduisant la marge
avant invasion. Le second tir est une aide au joueur dont le seuil est explicite,
pas une mesure de difficulté isolée.

Le PRNG partagé choisit d'abord un motif parmi `0..patternTier`, puis un tirage
de blindage pour chaque sonde, en ordre rangée/colonne ; ensuite le premier délai
de tir ennemi. Chaque formation conserve `rows × columns` sondes, évitant qu'un
motif creux rende brusquement un niveau moins dense. Les motifs sont des
**décalages de colonnes**, qui conservent la lisibilité des colonnes de tir :
rectangle, chevron, damier décalé, cœur abstrait. Pour `c=(columns-1)/2`,
`d=abs(column-c)`, le centre vaut `x=180+(column-c)*30` et
`y=startY+row*30+offset`, où :

- rectangle : offset=0 ;
- chevron : offset=d*9 ;
- damier : offset=(column%2)*14 ;
- cœur abstrait : offset=(d<1 ? 18 : d>c-1 ? 22 : 0)+row*d*2.

V11 contrôle les quatre motifs et les positions de départ sur 30×12 cas ;
V10 contrôle l'absence de blindage avant le niveau 10 et la fréquence initiale
sur 60 graines (12–18 % autour des 15 % annoncés).

### Contrôles, présentation et intégration

Flèches ou A/D : déplacer ; Espace maintenu : tirer. Souris : guider et clic
dans le canevas, ou boutons dédiés. Au doigt : glisser **dans la moitié basse**
pilote une cible horizontale ; garder le doigt sous le canon laisse l'action
visible. Les flèches 56×56 et **Tir 64×64** restent sous le canevas, Tir à droite.
La case **Tir auto**, dans une cible d'au moins 44 px, mémorise son état via
les services de stockage (`arcade-lab:orbite:options:v1`, valeur on/off).
Les accès restent protégés et le jeu fonctionne sans stockage.

Prêt/Jouer, Pause/P/Échap et pause en arrière-plan sont ceux du socle.
Le sélecteur suspend également la simulation. Panneaux, Progression, cumul,
record, déblocage et sauvegarde `arcade-lab:orbite:v1` restent génériques.
Seule extension de `src/shell/*` : l'union des tailles de TouchButton accepte
64 en plus de 44 et 56, sans changement de comportement des autres jeux.
Registre et styles limités à `body.orbite`, aucune dépendance nouvelle.
Formes Graphics, orbites et particules dessinées par code ; effets nommés
`fire`, `edge`, `shield`, `probe`, `armor`, `life`, `comet`, `bonus`, `won`, `lost`
par le son global unique.

Avec `?test=1` uniquement, `__ARCADE_TEST__.games.orbite` (alias
`__ORBITE_TEST__`) expose `read()`, `loadLevel(index, seed?)` et
`scenario('finish'|'danger')`. Les scénarios chargent une sonde restante ou un
projectile ennemi avec une vie restante, puis attendent un tir ou un déplacement
réel. Ils ne changent aucune règle ni aucun statut final. `loadState` charge
une position, sans restaurer le PRNG ; `snapshot()` copie l'état, les entrées
maintenues, les temporisations, le PRNG et le reliquat. `step(dtMs)` utilise
exclusivement des pas de 1000/60 ms ; mêmes entrées horodatées et même graine
produisent les mêmes snapshots, même avec des découpages d'affichage différents.

### Traçabilité de l'oracle

| ID | Vitest `tests/orbite.test.ts` | E2E `tests/e2e/orbite.spec.ts` |
| --- | --- | --- |
| V01 | Deux bords, mouvement en bloc, descente unique, inversion, canon borné | Flèches/A, souris, glisser bas et exclusion du glisser haut |
| V02 | Vitesse relative et déplacement effectif avec 3, 2 puis 1 sonde | Flotte visible |
| V03 | Un puis deux tirs au niveau 15, délai, sortie écran | Tir réel et tir auto après reprise |
| V04 | Collision, première sonde rencontrée, score pour cinq rangées | Tir final et score au panneau |
| V05 | Émetteur bas dans les colonnes occupées, délai à graine, plafond 12 | Projectiles visibles |
| V06 | Quatre boucliers, grille 4 px, première cellule érodée dans les deux sens | Boucliers visibles dans les captures |
| V07 | Vies, invulnérabilité, arrêt à zéro, invasion prioritaire | Guidage vers un tir, défaite, Rejouer |
| V08 | Dernière sonde et arrêt après victoire | Victoire, Niveau suivant, cumul et déblocage/record après reload |
| V09 | Fréquence, sens, saturation, exclusion, traversée, bonus unique | Rendu de comète en jeu normal |
| V10 | Deux impacts, score final, seuil et fréquence du blindage | Capture niveau 30 |
| V11 | Toutes les clés de difficulty, monotonie et variation stricte, formations légales | 30 entrées dans le sélecteur |
| V12 | Entrées horodatées, découpages équivalents, témoin de graine, copie sérialisable | Prêt/pause figés, option persistée, crochet absent sans test et nettoyé à la sortie |

Les E2E mobile utilisent exclusivement des taps et gestes tactiles Chromium,
sans clavier. Assertions de géométrie pour Pause, Son, flèches, Tir, option,
Niveaux et Recommencer : aucune intersection avec le canevas, cibles visibles
dans le viewport, pas de scroll. La fixture commune échoue sur toute erreur JS
ou console.error. Huit captures `orbite-{play,level30,won,lost}-<projet>.png`.
Mutations V01 (inversion supprimée), V05 (émetteur haut) et V06 (cellule conservée)
appliquées séparément : chacune fait échouer son oracle, puis code restauré.

## Essaim

Aire logique 360×640. Le vaisseau est à y=552 ; la zone de glissement tactile commence à y=586 (ligne visible à y=590) et permet de poser le doigt vers y=618, au moins 34 pixels sous le vaisseau. Le doigt reste ainsi sous la zone d’action. Flèches/A/D déplacent le vaisseau ; Espace maintient le tir. Souris : guider puis cliquer ; toucher : glisser en bas tire tant que le doigt reste posé. Les boutons gauche/droite et Tir complètent ce contrôle. Tir auto facultatif mémorisé. Écran prêt et pause communs ; aucune progression du moteur pendant la pause.

Entrée paramétrique de 1500 ms, échelonnée de 100 ms par ennemi : x=homeX+sin(πt)×courbe, y=-30+(homeY+30)×t. La courbe est tirée dans [-80,80[ par le PRNG partagé. Arrivée exactement sur la place, puis oscillation sin(ticks/90)×amplitude. Un piqué sélectionne uniformément un ennemi en formation, mémorise la position du joueur, descend de 560 pixels avec une courbe latérale sinusoïdale puis revient en entrée. Les tirs ennemis sont verticaux et plafonnés à huit pour préserver la lisibilité.

Trois vies, une seconde d'invulnérabilité. Tir joueur à 600 px/s, cadence 150 ms, trois projectiles simultanés maximum même en double canon. Blindé : deux impacts. Scindeur : un impact libère deux fragments à un point de vie, qui ne se divisent plus. Ennemi détruit : 10 points en entrée/formation, 30 en piqué. Collision avec le vaisseau ou projectile ennemi : une vie.

Choix de règle : un capteur par vague transporte dès l'entrée une nacelle capturée, visible sous son corps. Aucune apparition aléatoire ni position bonus séparée : ce choix garantit une occasion de bonus à chaque vague, sans cumul incontrôlé. Sa destruction libère la nacelle et active deux projectiles espacés de 12 px pendant 8000 ms ; un nouveau bonus réinitialise cette durée. Pas de nouvelle vie ni de capture du joueur.

Générateur des trente niveaux, indice l=0…29 :

| Paramètre | Formule |
| --- | --- |
| Vagues | 2+floor(4l/29) |
| Ennemis/vague | 6+floor(6l/29) |
| Piqués/seconde | 0,3+0,02l |
| Vitesse piqué | 180+3l px/s |
| Tirs ennemis/seconde | 0,4+0,025l |
| Vitesse tir ennemi | 120+2l px/s |
| Probabilité blindé | l/100 |
| Probabilité scindeur | l/140 |
| Amplitude formation | 12+l/2 px |

Places : six colonnes espacées de 50 px, deux rangées au maximum à y=110 et 154. Le premier ennemi est le capteur ; les autres types sont tirés à graine. Chaque cinquième niveau est un défi sans tirs ennemis (exception explicite à la cadence nominale monotone). Bonus de précision à la victoire : round(200×impacts/projectiles émis), zéro sans tir. Les impacts sur le blindage comptent. Toutes les vagues détruites donnent la victoire ; zéro vie donne la défaite. Le socle gère sauvegarde, score cumulé, restauration sur défaite et déblocage.

| Oracle | Preuve moteur (`tests/essaim.test.ts`) |
| --- | --- |
| G01 | Entrée déterministe et arrivée exacte |
| G02 | Oscillation bornée |
| G03 | Sélection, cible mémorisée, trajet et retour |
| G04 | Collisions, blindage, score formation/piqué |
| G05 | Plafond trois, y compris double canon |
| G06 | Tir ennemi, vie, invulnérabilité et expiration |
| G07 | Capteur garanti, nacelle, durée et double canon |
| G08 | Deux fragments sans récursion ; fréquence des types sur 200 graines |
| G09 | Défi sans tir, bonus calculé |
| G10 | Victoire et défaite ; politique simulée |
| G11 | Chaque paramètre nominal monotone et strictement croissant aux extrêmes |
| G12 | Entrées horodatées, cadences différentes, témoin graine et sérialisation |

La politique de jouabilité vise l'ennemi le plus proche, tire continuellement et esquive tirs proches et piqués bas. Sur trois graines (11, 458, 2026), elle doit gagner au moins une partie aux niveaux 1, 15 et 30, dans une limite de 24000 pas par partie. Elle utilise les règles ordinaires, sans état construit.

L'E2E desktop/mobile vérifie victoire et défaite par vraies entrées après chargement d'états presque terminés, reprise, sélection, pause, nettoyage, absence de crochet hors test, et absence de chevauchement des commandes avec le canevas. Les états construits ne modifient aucune règle. Les effets synthétisés utilisent le son global. Aucun asset externe ni dépendance ajoutée.

## Dédale

Création originale : une luciole récolte des graines lumineuses dans les Jardins
de lumière, poursuivie par quatre feux follets. Dessins vectoriels et sons
synthétisés uniquement par code, sous la licence MIT du dépôt.

### Génération des trente niveaux

Indices internes `l=0…29`, affichés 1…30. Grille 19×23 : parcours en profondeur
à graine sur les 9×11 cellules de coordonnées impaires. Chaque arête de l'arbre
couvrant ouvre sa case intermédiaire. Chaque impasse est ensuite raccordée à
une autre cellule de l'arbre par un mur fermé choisi à graine. Enfin, on ouvre
sans remise des murs intermédiaires supplémentaires selon `loopCount`.
Deux ouvertures en (0,11) et (18,11) forment un tunnel bilatéral. Toute case
ouverte est couverte par une graine ou un soleil ; aucun tirage de bonus pendant
la partie, aucune superposition ni apparition dans les murs. Les quatre soleils
occupent (1,1), (17,1), (17,21), (1,21). La luciole part de (9,17), la base des
follets est (9,11). Le PRNG partagé reçoit `seed + 7919*l` modulo 2³².

| Paramètre moteur | Formule | Niveau 1 → 30 |
| --- | --- | --- |
| `wispRatio` | 0,75 + 0,30*l/29 | 75 % → 105 % |
| `vulnerableMs` | 8000 − 7000*l/29 | 8 s → 1 s |
| `chaseMs` | 12000 + 18000*l/29 | 12 s → 30 s |
| `loopCount` | 8 + floor(24*l/29) | 8 → 32 boucles supplémentaires |

La luciole parcourt 6 cases/s. Chaque acteur change de case à son échéance ;
la simulation est découpée en pas de 1000/60 ms. Le temps résiduel est conservé,
indépendamment de la cadence d'affichage. Une demande de direction reste en
mémoire tant que le passage est fermé ; la direction courante continue si elle
est praticable. Le demi-tour est autorisé pour la luciole.

### Follets et calendrier

Priorité fixe **haut, gauche, bas, droite**. À chaque case, un follet choisit
parmi les directions ouvertes, hors demi-tour, celle qui minimise la distance
euclidienne au carré à sa cible. Les égalités conservent la priorité fixe.
La suppression des impasses garantit au moins une sortie sans demi-tour.

En dispersion, chaque follet vise son coin : haut gauche, haut droit, bas droit,
bas gauche dans l'ordre ci-dessous. En poursuite :

| Follet | Cible |
| --- | --- |
| Traqueur | Case actuelle de la luciole |
| Devin | Trois cases devant sa direction courante, même hors grille |
| Rôdeur | Luciole et coin bas droit, alternés toutes les 4 s simulées |
| Timide | Coin bas gauche à moins de 6 cases en distance euclidienne, sinon luciole |

Huit phases initiales alternent dispersion (8000 + un tirage entier de 0 à
999 ms) et poursuite (`chaseMs` + un tirage entier de 0 à 999 ms). Après ces
huit phases, l'alternance continue avec `chaseMs` pour chaque phase. Le
changement de mode inverse la direction de chaque follet ; c'est la seule
exception à l'interdiction de demi-tour. Les départs de base sont échelonnés à
2,5 / 4,3 / 6,1 / 7,9 s. Le rôdeur utilise le temps total simulé de la partie.

### Collecte, collisions et choix de jouabilité

Graine : 10 points ; soleil : 50 points et remise à zéro de la chaîne. Pendant
la vulnérabilité, le follet choisit la sortie qui maximise sa distance à sa cible,
avec la même priorité et sans demi-tour. Chaque follet mangé rapporte 200, 400,
800 puis 1600 points (plafond 1600) et devient inoffensif. Il suit la distance
BFS à la base, toujours sans demi-tour, puis y attend 2 s avant de repartir.
La vulnérabilité expire même pendant un retour et n'est pas prolongée par la
consommation d'un follet.

Trois vies. Une collision est vérifiée après le déplacement de la luciole,
puis après celui des follets : un échange de cases ne traverse pas un ennemi.
Une vie perdue conserve le score et les collectes, réinitialise les positions,
les horloges de déplacement, la vulnérabilité et la chaîne. **Choix précisé pour
la jouabilité :** le calendrier repart en dispersion après chaque vie perdue,
et la luciole reçoit 1,8 s de grâce, également au début du niveau. Ces règles
s'appliquent dans le moteur, sans condition d'URL ni de scénario.
La dernière collecte gagne ; zéro vie perd la partie. Les états terminaux sont
gelés. La progression commune débloque N+1 et restaure le cumul après défaite.

La politique de preuve utilise un BFS vers la lumière la plus proche, évite les
positions courantes et deux positions projetées des follets dangereux, puis
s'éloigne si aucun chemin n'est disponible. Elle joue les niveaux initiaux
complets, sans modifier l'état ni supprimer les ennemis. Sur les graines
11, 16 et 2026, au moins une victoire sur trois est exigée séparément aux niveaux
1, 15 et 30 (5000 déplacements maximum). La graine 16 est un témoin de victoire
au niveau 30. Cela démontre une jouabilité sur ces témoins, pas une garantie
que cette politique simple gagne chaque labyrinthe.

### Présentation, contrôles et intégration

Écran Prêt, démarrage par Jouer ou une direction ; pause P/Échap et bouton
commun, qui suspend le moteur. Flèches, ZQSD et WASD ; souris sur la croix ;
glisser de 16 px sur la zone de jeu. Croix visible de quatre boutons 56×56 px,
sous le canevas pour garder l'action dégagée. Les tests vérifient le non-
chevauchement de Pause, des quatre directions, de Niveaux et de Recommencer.
Halo de collecte, indication de vulnérabilité et de mode, vies et lumières
restantes, effets nommés `turn`, `move`, `seed`, `sun`, `wisp`, `mode`, `life`,
`won`, `lost`, via l'unique son global.

Entrée `GameDefinition` dans le registre ; aucun changement d'API du socle.
Le crochet `__ARCADE_TEST__.games.dedale` expose `read`, `loadLevel` et, à travers
l'objet typé Dédale, `scenario('finish'|'danger')`. Il n'est installé qu'en mode
`?test=1`. Les scénarios chargent des états construits ; les issues passent
ensuite par les vraies entrées, déplacements, collectes et collisions du moteur.

### Traçabilité de l'oracle

| ID | Oracle moteur seul (`tests/dedale.test.ts`) | E2E (`tests/e2e/dedale.spec.ts`) |
| --- | --- | --- |
| D01 | BFS connexité, couverture et unicité, murs, quatre soleils, absence d'impasses, plusieurs graines | Affichage niveaux 1 et 30 |
| D02 | Déplacement, mur et direction mémorisée | Clavier, croix souris/tactile et glisser |
| D03 | Tunnel dans les deux sens, autre rangée interdite | — |
| D04 | 10/50 points, collecte unique et durée | Dernière graine par vraie entrée |
| D05 | Quatre cibles, coin et alternance | — |
| D06 | Distance, égalité, priorité et aucun demi-tour | — |
| D07 | Échéance, changement de mode, inversion et calendrier à graine | — |
| D08 | Chaîne, retour réel, attente à la base et expiration | Indicateurs visuels |
| D09 | Vie, réinitialisation, score conservé et grâce | Collision tactile/clavier, défaite puis rejouer |
| D10 | Victoire, défaite, gel et politiques complètes | Panneaux, cumul, N+1 et reprise après reload |
| D11 | Chaque paramètre dans son sens et strict aux extrêmes ; politique 1/15/30 | Niveau 30 |
| D12 | Entrées horodatées, cadences, graine et sérialisation | Pause figée, crochet inerte et nettoyage |

D01 vérifie les trente niveaux sur six graines chacun.

Mutations contrôlées, restaurées : score d'une graine supprimé (D04), demi-tour
autorisé (D06), perte de vie supprimée (D09). Chaque échec provient d'une
assertion, pas d'une erreur de compilation. L'E2E utilise Chromium seul, un
worker, le build de production et une fixture qui échoue sur toute erreur JS
ou `console.error`. Sur mobile, seules des entrées tactiles sont utilisées.

Le décor est tracé par Canvas 2D dans une texture Phaser, recalculée seulement
au chargement ou après une collecte. Les personnages et le halo restent
séparés. Les panneaux DOM ne sont réécrits que si leurs données changent.
Cette optimisation de présentation conserve les pas fixes et la logique du
moteur ; aucun asset externe ni service commun n'est ajouté.

### Dédale — ajustements de jouabilité

Les déplacements simultanés sont résolus avant le contact : une case finale
commune ou un échange des deux cases compte comme collision. D09 couvre les
deux états (normal/vulnérable). `branching(maze)` mesure arêtes − cases + 1,
tunnel compris. Pour une même graine, l'arbre initial et l'ordre des murs sont
communs aux trente niveaux ; seuls les préfixes de boucles ouvertes changent.
D11 mesure cette croissance réelle sur quatre graines. La politique BFS garde
ses règles ; ses trois graines témoins sont désormais 6, 16 et 2026.

Le labyrinthe occupe 349,6 des 360 pixels logiques disponibles en largeur.
Chaque follet a une silhouette de 90 % de case et une couleur liée à son
comportement : rose, violet, ambre ou turquoise. L'attente conserve la couleur
et ajoute un cercle blanc. La vulnérabilité est bleue avec bouche blanche ;
le retour est représenté par deux yeux blancs dans un anneau, sans corps.

## Ferraille

Robot de récupération original dans trente ateliers à défilement horizontal.
Tout est dessiné par code ; les sons sont synthétisés par le son global. Aucun
asset externe ni dépendance ajoutée. Le moteur pur est dans
`src/engines/ferraille/engine.ts`, la scène dans `src/games/ferraille/scene.ts`.

### Règles et physique

Tuiles 16 px, héros 12×22 px (12×14 accroupi), vitesse 120 px/s, gravité
900 px/s², impulsion de saut 330 px/s. Relâcher le saut limite sa vitesse
ascendante à 120 px/s. Grâce au bord et tampon de saut : 100 ms chacun.
Les AABB sont résolues X puis Y, par sous-déplacements d'au plus 4 px pour
éviter la traversée des tuiles. Les plateformes mobiles portent le robot.
Le pas fixe est 1000/60 ms ; le reliquat est sérialisé dans le snapshot.

Huit directions de tir au sol ; en vol une diagonale devient horizontale,
ce qui donne les quatre directions cardinales. Sans direction : tir selon
l'orientation mémorisée. Plafond global de 48 projectiles, durée 2400 ms,
vitesse amie 280 px/s. Impulsion simple toutes les 240 ms ; éventail de trois
tirs à −0,22/0/+0,22 rad ; rafale toutes les 90 ms. Les caisses se ramassent
au contact. Le bouclier absorbe un coup et donne 1 s d'invulnérabilité.
Un contact ou projectile ennemi coûte une vie, puis réapparition au dernier
point activé avec 1800 ms de grâce et arme simple. Les chutes consomment une
vie même avec bouclier ou grâce. Trois vies ; zéro = défaite.

Rampants : patrouille et demi-tour avant un vide ou mur. Tourelles : tir visant
la position du héros au moment de l'échéance, à portée 360 px. Drones : dérive
horizontale et sinusoïde d'amplitude 22 px. Ennemis à un coup, 100 points ;
caisses 25, points de contrôle 50, boss 20 par coup, victoire 500 points.
La porte termine un atelier ordinaire ; un gardien doit être vaincu tous les
cinq ateliers. Sa phase passe de 1 à 2 puis 3 aux deux tiers et au tiers de
sa vie. Cadence et nombre de tirs en éventail augmentent avec la phase et
le rang du gardien. Sa barre de vie reste visible.

### Générateur des trente niveaux

Index moteur `n = 0…29`, affichage `n+1`. Le PRNG partagé choisit le type des
blocs, la présence des ennemis et la phase des plateformes/drones. Chaque
bloc mesure 16 tuiles ; deux blocs supplémentaires encadrent le parcours.
Les obstacles occupent le milieu du bloc et laissent une zone d'élan et de
réception. Les cinq types sont plat, marches (2 tuiles), trou, plateforme
mobile au-dessus d'un trou, mur à escalader (3 tuiles).

| Paramètre `difficulty(n)` | Formule | Sens |
| --- | --- | --- |
| `blocks` | 6+n | croissant |
| `enemyDensity` | 0,25+0,015n, probabilité par bloc | croissant |
| `gapWidth` | 2+⌊n/10⌋ tuiles | croissant |
| `turretRate` | 0,5+0,025n tirs/s | croissant |
| `enemySpeed` | 19+n px/s | croissant |
| `bossHp` | 8+n | croissant |
| `bossPatterns` | 1+⌊n/5⌋ | croissant |

La longueur vaut `(blocks+2)×16×16` px. Les caisses ont des emplacements
fixes : bloc `i % 3 = 0`, tuile `start+3`, alternance éventail/rafale/bouclier.
Il n'existe aucune apparition aléatoire de caisse ou de pièce en cours de
partie : ce choix assure un approvisionnement lisible et évite les positions
interdites et les boucles de rejet. F10 vérifie quantité, unicité et terrain
libre/sol sous chaque emplacement sur douze graines au niveau 30.
Les points de contrôle se trouvent au début d'un bloc sur trois.

`jumpEnvelope(gap,rise)` utilise la racine descendante de la parabole :
`120 × (330 + sqrt(330² − 2×900×rise))/900 − 12`. Une hauteur dépassant
l'apogée ou une largeur dépassant cette portée est refusée. `generate`
contrôle chaque saut requis avant de retourner le terrain. F12 vérifie les
trente niveaux sur douze graines et fait jouer une politique simple (courir,
sauter devant un obstacle/vide, tirer, s'arrêter à portée du boss) sur les
niveaux 1, 15 et 30, avec au moins une victoire sur trois graines pour chacun.
Cette politique utilise les règles normales, sans modifier les états ni les vies.

### Présentation et services

Caméra horizontale avec anticipation vers la droite ; robot doré et turquoise,
ennemis ambre/rose/violet, tirs amis jaunes et hostiles roses. Retours sonores
nommés `jump`, `shot`, `hit`, `bonus`, `shield`, `checkpoint`, `life`, `won`,
`lost`, et éclair de bordure. Écran Prêt, pause P/Échap et bouton commun.
Clavier : flèches ou A/D, ↑/W viser, ↓/S accroupir, Espace/Z saut, X/J tir.
Joystick huit directions de 120 px à gauche, Saut et Tir maintenus de 64 px
à droite, sous le canevas et utilisables à la souris comme au toucher.

Entrée `GameDefinition`, Progression, sauvegarde, panneaux, niveaux, session,
son global et utilitaires tactiles existants réutilisés sans changement de
leur API. Le CSS est limité à `body.ferraille`. Le crochet
`__ARCADE_TEST__.games.ferraille` expose `read`, `loadLevel` et l'objet typé
`scenario('finish'|'danger')`, uniquement avec `?test=1`. Il charge un état
presque terminé ou un trou devant le robot ; aucune victoire/défaite forcée.

### Traçabilité de l'oracle

| ID | Moteur seul (`tests/ferraille.test.ts`) | E2E (`tests/e2e/ferraille.spec.ts`) |
| --- | --- | --- |
| F01 | Gravité, saut long/court, limites coyote/tampon | Saut maintenu, prêt et pause |
| F02 | Sol, plafond, mur, grande vitesse, accroupissement | Parcours visible |
| F03 | Huit directions, restriction en vol, plafond saturé | Tir maintenu souris/clavier/tactile |
| F04 | Demi-tour avant bord et mur | Présentation |
| F05 | Échéance, visée et cadence réelle | Présentation |
| F06 | Position sinusoïdale et dérive | Présentation |
| F07 | Bouclier, grâce, trois vies, défaite | Défaite et rejouer |
| F08 | Chute malgré bouclier/grâce | Chute par déplacement réel |
| F09 | Activation et réapparition au point | Cumul, N+1, sauvegarde après reload |
| F10 | Trois caisses, cadence, sockets sûrs et uniques | Indication d'arme |
| F11 | Six boss, trois phases, tirs, dégâts et victoire | Barre au niveau 30 |
| F12 | Enveloppe, 360 terrains, politiques 1/15/30 | Victoire par entrée réelle |
| F13 | Chaque paramètre non décroissant et strict aux extrêmes | Niveau 30 |
| F14 | Graine, snapshots sérialisables, regroupement des pas | Pause figée, nettoyage et crochet absent en production |

Les E2E mesurent le non-chevauchement du canevas avec Pause, joystick,
Saut, Tir, Niveaux et Recommencer, les tailles minimales et l'absence de scroll.
Chromium seul, un worker et fixture commune échouant sur toute erreur JS ou
`console.error`. Captures play/level30/won/lost pour bureau et mobile.

## Alunir

Neuvième jeu original : un module doré doit se poser sur une terrasse turquoise.
Aire logique 360×640, aucun asset externe, aucune marque ni dépendance ajoutée.
Le moteur pur utilise le PRNG partagé ; état, commandes et reliquat temporel
sont copiés dans `snapshot()`, sans référence mutable vers le moteur.

### Physique et contacts

Les valeurs de vitesse sont en **px/pas de 1000/60 ms**, les accélérations en
px/pas². `step(dtMs)` conserve le reliquat ; intégration semi-implicite :
rotation de ±0,025 rad/pas, accélérations, puis déplacement selon la nouvelle
vitesse. L'angle est ramené dans [−π,π]. Rotation gauche et droite simultanées
s'annulent. La gravité pointe vers le bas. Poussée : 0,055 selon
(sin(angle), −cos(angle)), consommation 1 unité/pas ; la dernière fraction de
carburant produit une poussée proportionnelle. À zéro, la chute continue et
ne provoque de défaite qu'au contact d'un terrain ou d'un mur.

La rotation est appliquée à la frontière du pas, puis le polygone convexe à
cinq sommets est translaté continûment. Le dessin et la collision utilisent
le même polygone agrandi ×1,5 : largeur 21 px, hauteur 27 px à angle nul
(sommets locaux d’origine multipliés par 1,5, pied à y+12). Un SAT balayé contre chaque segment
calcule les intervalles d'entrée/sortie sur toutes les normales, puis conserve
le premier contact : aucun saut par-dessus le terrain, même à 1000 px/pas.
Les murs latéraux et supérieur sont fatals, sans repli. Les sommets du module
comptent pour les murs et pour la largeur de la plateforme.

Victoire seulement si tout le polygone tient dans la largeur d'une plateforme,
avec contact sur son altitude, **|vx| ≤ 0,6, vy ≤ 1,2 et |angle| ≤ 10°**.
Les seuils incluent leur valeur limite (tolérance numérique 10⁻¹⁰).
Un contact ailleurs ou au-delà d'un seuil donne la défaite. Les états terminaux
sont gelés. Le module ne perd pas de vie intermédiaire ; `won` et `lost`
passent par les effets communs, donc par les vibrations et le service appareil.

Score entier arrondi : `(carburant restant + précision + temps) × multiplicateur`.
Précision = `100 × max(0, 1 − distanceAuCentre/(largeur/2))` ;
temps = `max(0, 300 − pasÉcoulés/6)`. Aucun score en cas d'échec.

### Générateur des trente terrains

Indice `n=0…29`, `t=n/29`. Le PRNG reçoit directement la graine. Il choisit
le centre de la plateforme dans [150,210[ et son altitude dans [510,540[.
Une plateforme par terrain ; départ y=85, décalage horizontal défini ci-dessous,
vitesse et angle nuls.
De part et d'autre, des sommets espacés de 24 px ont une altitude
`plateforme.y − random() × relief`, avec extrémités x=0 et 360.
Les extrémités de la plateforme sont insérées explicitement dans la ligne.

| Paramètre `difficulty(n)` | Formule | Niveau 1 → 30 |
| --- | --- | --- |
| Largeur | 90−62t px | 90 → 28 |
| Relief maximal | 20+70t px | 20 → 90 |
| Vent constant | 0,002t px/pas² | 0 → 0,002 |
| Amplitude des rafales | 0 avant n=14, puis 0,001(n−13)/16 | 0 → 0,001 |
| Gravité | 0,018+0,006t px/pas² | 0,018 → 0,024 |
| Carburant initial | 950−200t | 950 → 750 |

Multiplicateur de plateforme = `1+floor(n/10)` (×1, ×2, ×3).
Une rafale dure 90 pas. Son PRNG reçoit `seed + 7919×floor(pas/90)` modulo
2³² ; sa composante signée est uniforme dans l'amplitude du niveau.
Le vent total maximal vaut 0,003 px/pas². Le relief mesure l'enveloppe de
génération, pas une obligation que chaque tirage réalise son maximum.

La politique `pilot` utilise les erreurs proportionnelles de position/vitesse,
compense le vent, borne l'inclinaison cible à ±0,12 rad et dose la poussée
selon la vitesse de descente et l'altitude. U10 la fait jouer séparément sur
**chacun des trente niveaux**, graine témoin 28, depuis l'état initial ordinaire,
au plus 2500 pas. Le test exige une victoire pour chaque niveau ; cette preuve
sur témoin n'affirme pas que le contrôleur gagne toutes les graines.
La vignette applique cette même politique au niveau 3, quatre pas par image.

### Commandes et intégration

↑/W : poussée ; ← →/A D : rotation à maintenir. Une seule rangée tactile :
↺ et ↻ à gauche (56 px), Poussée à droite (76×64 px). La zone utile exposée
par le crochet est tout le canevas ; aucun bouton ne la recouvre.
Le HUD tient en deux lignes de 13 px. Il est à y=10, ou à y=590 si le
haut du module passe au-dessus de y=65, pour ne jamais masquer celui-ci.
Le crochet Alunir expose aussi `bounds()` (polygone avec contour et HUD).
Le parcours E2E convertit ces boîtes vers le rectangle écran du canevas et
vérifie leur absence d’intersection sur bureau comme sur mobile.
Prêt, pause, menu mobile, niveaux, panneaux, sauvegarde `arcade-lab:alunir:v1`
et son global utilisent les services existants **sans modification de src/shell**.
Effets synthétisés `thrust`, `life`, `won`, `lost` ; pas de vie intermédiaire.

Avec `?test=1`, `__ARCADE_TEST__.games.alunir` expose `read`, `loadLevel`,
`advance`, `hudText`, `usefulArea` et `scenario('finish'|'danger')`.
`advance` fige l'horloge automatique jusqu'au prochain chargement, respecte
pause et sélection, valide le temps puis synchronise les panneaux.
Les scénarios placent un module trois pixels au-dessus du contact : la vitesse
1,21 demande une vraie poussée pour gagner ; la vitesse 4 reste fatale.
Ils ne changent aucun seuil, collision, carburant ni condition de victoire.

### Oracle et vérifications déléguées

| ID | `tests/alunir.test.ts` |
| --- | --- |
| U01 | Gravité, intégration semi-implicite, reliquat du pas fixe |
| U02 | Direction de poussée, consommation, dernière fraction |
| U03 | Vitesse angulaire, deux signes, annulation simultanée |
| U04 | Vent intégré, constant puis rafales bornées à graine |
| U05 | Premier contact à grande vitesse et bord du polygone |
| U06 | Seuils littéraux 0,6 / 1,2 / 10°, égalité gagnante et excès perdant, deux signes |
| U07 | Excès de vitesse/angle, hors plateforme, trois murs |
| U08 | Réservoir vide : aucune poussée, chute puis contact fatal |
| U09 | Termes du score, multiplicateur, score réel et gel terminal |
| U10 | Politique simulée sur les trente niveaux complets |
| U11 | Chaque paramètre monotone et strict entre extrêmes ; 90 terrains structurés |
| U12 | Entrées identiques, cadences regroupées, graine, sérialisation, temps invalides |

`tests/e2e/alunir.spec.ts` couvre bureau et mobile : vraie poussée maintenue,
victoire puis Niveau suivant, progression persistante après reload, défaite
puis Rejouer le niveau, pause et quatre captures play/level30/won/lost.
Sur mobile, seules les entrées tactiles sont utilisées. La fixture commune
refuse toute erreur JS/console. M01–M04 incluent Alunir aux trois dimensions
390×844, 360×640 et 390×600. A11 inclut son horloge manuelle et V01–V08
comptent désormais neuf vignettes.

Vitest et Playwright sont écrits et relus ici, mais leur exécution appartient
à l'orchestrateur. Aucun résultat de ces suites n'est présumé.


## Caisses

Dixième jeu, `caisses`, puzzle au tour par tour (`realtime: false`). Aucun
hasard de règle, aucune défaite, aucun écran Prêt ni pause. Les effets nommés
`move`, `push`, `undo`, `won` utilisent le son commun ; la victoire utilise donc
également la vibration commune. Le verrou écran et les menus restent ceux du
socle. Aucun fichier de `src/shell` modifié.

### Règles et présentation

Un pas cardinal traverse le sol libre ; une seule caisse peut être poussée si
la case suivante est libre. Aucune traction. Toutes les caisses sur des cibles
terminent le niveau. Les entrées directionnelles sont alors gelées ; Annuler
reste possible et restaure le cumul d'avant le niveau. Le panneau de
progression propose de poursuivre ou rejouer. Annulation illimitée des pas
réussis, avec copie exacte des compteurs, caisses et position. Recommencer
restaure le niveau, sans annuler le déblocage déjà acquis.

Score = `max(1, round(1000 × minimumSteps / moves))` à la victoire, zéro avant.
Le record affiché est le minimum de **poussées**, pas de pas. L'impasse est un
simple avertissement : caisse hors cible ayant un mur sur un voisin vertical
et un voisin horizontal. Cette détection ne prétend pas repérer les blocages
entre caisses. Aucun panneau de défaite ni bouton « Rejouer le niveau » pour
une défaite inexistante : le menu propose Recommencer et ↶ reste disponible.

Flèches ou QSD / **Maj+Z** pour monter ; W/A aussi acceptés. **Z** sans Maj
ou Retour arrière annule ; R recommence. Ce choix explicite résout le conflit
entre ZQSD et Z pour annuler. Glisser déclenche un pas ; quatre boutons
fléchés et ↶ sont alignés, chacun 56×56 px, sur une rangée de 64 px maximum.
Recommencer est dans ☰ sur mobile pour tenir à 360 px ; sur bureau il est dans
le menu commun. Aucun contrôle ne recouvre le canevas 360×640, qui est la zone
utile exposée. Les cinq boutons prennent 296 px avec leurs espacements.

### Trente ateliers originaux

`levels.ts` contient les trente grilles textuelles littérales composées pour
ce jeu, sans collection externe : `#` mur, espace sol, `.` cible, `$` caisse,
`@` joueur. L'analyseur accepte aussi `*` caisse sur cible et `+` joueur sur
cible ; il refuse les rectangles irréguliers, symboles inconnus, bords ouverts,
nombres de caisses/cibles différents et joueurs absents ou multiples.

Les grilles sont des petites salles originales (au plus 8×8), avec six
familles de géométrie : pilier central, piliers décalés, double pilier,
étranglement, îlots alternés et cour centrale. Les positions de caisses,
cibles et joueur sont propres à chaque atelier ; aucune collection externe
n'est utilisée. Les grilles finales sont figées en littéraux, sans génération
à l'exécution. Le premier atelier garde l'apprentissage en deux entrées ;
les suivants imposent repositionnements et virages autour des obstacles.

Les six paliers de cinq niveaux ont respectivement 1, 2, 3, 4, 5 et 6 caisses.
Les minimums de poussées ne décroissent pas (1 à 13). Certaines caisses
commencent sur cible : il faut décider si elles doivent rester en place ou
être déplacées. `minimumSteps` est le véritable minimum de déplacements,
calculé indépendamment du minimum de poussées ; les deux solutions optimales
peuvent donc différer. C06 rejoue le témoin optimal en pas et vérifie le score.

C10b suit les identités des caisses pendant la solution optimale en poussées.
Un **virage** est un changement de direction entre deux poussées de la même
caisse (demi-tour inclus, même si une autre caisse est poussée entre-temps).
Un **détour** est une séquence d'au moins deux déplacements sans poussée
entre deux poussées consécutives, approche initiale exclue. Un simple pas
pour rejoindre l'arrière d'une caisse ne compte donc pas. Dès le niveau 4,
chaque solution comporte au moins un virage et un détour. C10c compare la
**moyenne arithmétique de `visited` par palier de cinq**, sans imposer une
hausse à chaque niveau individuel. `visited` compte les états distincts
retenus par la recherche en poussées, avec ordre de départage déterministe.

### Mesure Node, passe 34

Commande reproductible, sans Vitest ni Playwright ni nouvelle dépendance :
`node --import ./scripts/ts-loader.js scripts/validate-caisses.js`.
Le chargeur utilise le compilateur TypeScript déjà installé dans le dépôt.
Le script vérifie C08/C09, les deux minimums, rejoue les deux solutions dans
le moteur, vérifie les dimensions, C10b, C10c et le budget de 1 s par niveau
pour les deux recherches cumulées. Les durées dépendent de la machine.

| Niveau | Caisses | Pas min. | Poussées min. | visited | Durée ms¹ | Virages | Détours |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 | 2 | 1 | 2 | 1.8 | 0 | 0 |
| 2 | 1 | 5 | 2 | 3 | 0.9 | 1 | 1 |
| 3 | 1 | 8 | 2 | 3 | 0.7 | 1 | 1 |
| 4 | 1 | 6 | 2 | 3 | 0.6 | 1 | 1 |
| 5 | 1 | 9 | 2 | 3 | 45.0 | 1 | 1 |
| 6 | 2 | 10 | 4 | 5 | 2.4 | 1 | 2 |
| 7 | 2 | 12 | 4 | 5 | 2.9 | 2 | 2 |
| 8 | 2 | 14 | 4 | 5 | 2.0 | 1 | 2 |
| 9 | 2 | 15 | 4 | 5 | 4.1 | 2 | 3 |
| 10 | 2 | 14 | 4 | 5 | 1.5 | 1 | 2 |
| 11 | 3 | 16 | 6 | 7 | 3.4 | 2 | 3 |
| 12 | 3 | 18 | 6 | 7 | 5.2 | 1 | 3 |
| 13 | 3 | 19 | 6 | 8 | 5.2 | 1 | 3 |
| 14 | 3 | 10 | 7 | 10 | 2.0 | 1 | 3 |
| 15 | 3 | 11 | 7 | 15 | 0.8 | 3 | 4 |
| 16 | 4 | 14 | 8 | 27 | 7.3 | 3 | 4 |
| 17 | 4 | 11 | 8 | 30 | 2.0 | 2 | 3 |
| 18 | 4 | 17 | 10 | 31 | 10.3 | 2 | 4 |
| 19 | 4 | 15 | 10 | 136 | 46.1 | 2 | 8 |
| 20 | 4 | 20 | 10 | 284 | 26.2 | 4 | 7 |
| 21 | 5 | 21 | 11 | 102 | 19.4 | 1 | 4 |
| 22 | 5 | 23 | 11 | 104 | 26.6 | 2 | 7 |
| 23 | 5 | 23 | 11 | 143 | 18.4 | 1 | 3 |
| 24 | 5 | 20 | 11 | 195 | 115.2 | 1 | 3 |
| 25 | 5 | 21 | 11 | 218 | 24.6 | 4 | 7 |
| 26 | 6 | 20 | 12 | 208 | 26.9 | 1 | 4 |
| 27 | 6 | 21 | 12 | 233 | 88.9 | 1 | 4 |
| 28 | 6 | 21 | 13 | 210 | 53.4 | 1 | 5 |
| 29 | 6 | 19 | 13 | 251 | 30.8 | 1 | 4 |
| 30 | 6 | 19 | 13 | 779 | 86.0 | 2 | 4 |

Moyennes visited : 2.8 → 5 → 9.4 → 101.6 → 152.4 → 336.2.
¹ Deux recherches exactes (poussées puis pas), hors chargement TS.

### Solveur et oracle

A* minimise les poussées. Chaque nœud contient les caisses triées et la plus
petite case de la région accessible au joueur sans poussée : ses déplacements
à pied sont reconstruits par BFS. Un parcours inverse depuis les cibles
marque les cases où une caisse peut théoriquement atteindre une cible ; les
autres destinations de poussée sont éliminées. La somme des distances de
Manhattan à la cible la plus proche est une borne admissible, même si plusieurs
caisses partagent la même cible dans cette estimation. Priorité aux nœuds plus
profonds à borne égale, puis au dernier inséré ; un tas binaire évite de trier
toute la frontière. Les meilleures distances par état sont conservées.
En mode pas, la clé conserve la position exacte du joueur et chaque arête
coûte la marche BFS plus la poussée. Une affectation minimale des caisses à
des cibles distinctes, avec distances de poussée inverses ignorant les autres
caisses, fournit une borne admissible plus forte.
Aucune limite arbitraire ne transforme un abandon en preuve d'insolubilité.
C08/C09 exigent une solution réelle, rejouée via `input`, et l'égalité du
minimum calculé au minimum stocké, avec une mesure inférieure à 1 s par niveau.

| Oracle | Preuve Vitest `tests/caisses.test.ts` |
| --- | --- |
| C01 | Pas, murs et absence de changement sur mouvement interdit |
| C02 | Une caisse poussée, deux caisses et mur refusés |
| C03 | Départ en sens inverse sans traction |
| C04 | Toutes les cibles requises, victoire et gel directionnel |
| C05 | Retour exact de chaque annulation, victoire incluse, reprise initiale |
| C06 | Compteurs, détour pénalisé, score optimal sur les 30 témoins |
| C07 | Analyse des 30 grilles et rejets de données malformées |
| C08 | Solveur, solution de chacun des 30 ateliers rejouée dans le moteur |
| C09 | Minimum calculé = minimum stocké pour chacun des 30 ateliers |
| C10 | Caisses et minimum de poussées non décroissants, extrêmes distincts |
| C10b | Virage d’une caisse et détour entre poussées, niveaux 4–30 |
| C10c | Moyenne de visited non décroissante par palier de cinq |
| C11 | Coin hors cible, cible exemptée, annulation et niveau insoluble |
| C12 | Entrées déterministes, graine, cadence fixe, copies sérialisables |

`__ARCADE_TEST__.games.caisses` expose read/loadLevel/hudText/usefulArea.
Pas de `advance` nécessaire pour ce jeu au tour par tour. Les scénarios typés
`finish` (un pas légal du niveau 1) et `corner` (petit plateau validé ordinaire)
ne modifient aucune règle. Les E2E gagnent le **niveau 1 complet** par deux
vraies entrées, vérifient Niveau suivant, sauvegarde après rechargement,
impasse récupérable, annulation exacte, recommencement et niveau 30. Sur mobile
seuls boutons tactiles et glisser CDP sont utilisés. La capture `caisses-lost`
montre l'impasse, puisque la règle interdit une défaite. Une seconde E2E
vérifie le glisser et l'interdiction d'entrée lorsque ☰ est ouvert.
M01–M04 incluent Caisses aux trois dimensions demandées. V01–V08 comptent dix
vignettes. La démo rejoue une politique déterministe de poussées légales au
niveau 3 ; la vignette Canvas dessine le plateau réel, sans asset externe.

Vitest et Playwright ne sont pas exécutés sur cette machine : l'orchestrateur
doit vérifier les preuves, les budgets de temps et les captures sur les deux
projets. Aucun résultat d'exécution de ces suites n'est présumé.


## Traverse

Onzième jeu, `traverse`, temps réel. Grille originale de 9×15 cases, départ
(4,14), abris en rangée 0. Flèches/ZQSD : une entrée = un pas, sans répétition
clavier ; une file conserve les entrées rapides jusqu'au prochain quantum.
Toucher l'aire monte ; un glisser émet une seule direction au relâchement.
Quatre boutons de 56×56 sont sur une rangée de 64 px. P/Échap et les panneaux
communs gèrent Prêt, pause, menu mobile, progression et sauvegarde
`arcade-lab:traverse:v1`. Effets synthétisés `step`, `life`, `won`, `lost`.
Aucune modification de `src/shell`, dépendance ou ressource externe.

### Simulation et générateur

Moteur sans DOM, Phaser ni hasard natif ; PRNG partagé. Graine canonique 28
pour chacun des trente niveaux. Les autres graines sont reproductibles, sans
promesse de faisabilité universelle. `snapshot()` copie état, plateau, file,
phase, compteur de frames et reliquat. `step` accumule des pas de 1000/60 ms.
Le trafic et une commande avancent à chaque quantum de `flowFrames` pas fixes.
La représentation est une grille : les véhicules et supports se décalent d'une
case à chaque quantum, et le héros est animé pendant quatre frames. Un pas
refusé latéralement reste dans la grille. Sans entrée, le héros attend.

Contact d'abord sur la destination au temps t, puis mouvement des voies et
second contact à t+1. Les véhicules occupent deux cases consécutives modulo
l'espacement. Les supports occupent `logLength` cases modulo 9 et transportent
le héros d'une case dans leur sens. Eau sans support, immersion et transport
hors [0,8] coûtent une vie. Huit rangées sont tirées sans remise parmi 2…13 :
les cinq premières sont fluviales et les trois dernières routières. Les berges
intermédiaires et la frontière route/rivière varient donc avec le niveau et la
graine. Chaque voie fluviale reçoit un plongeur avec probabilité 0,4 ; son cycle
est `(phase + offset) modulo 18 < diveDuration`. Les sens et offsets viennent
du PRNG. Aucun délai d'ouverture ni fermeture spéciale d'une rangée : toutes
les attentes proviennent des véhicules, supports, immersions et transports.
Les trente flux PRNG ont été sélectionnés hors ligne parmi des dispositions
naturelles puis vérifiés par BFS. Les sels du générateur choisissent seulement
ces dispositions ; aucune mesure de parcours n'intervient dans les collisions.

Trois vies. Toute mort réinitialise position, file et chronomètre de traversée,
mais garde la phase du trafic et les abris déjà occupés. L'échéance du chrono
coûte aussi une vie. Un nouvel abri rapporte 100×numéro du niveau et remet au
départ ; un abri déjà pris ou une case hors abri en haut est mortel. Tous les
abris occupés donnent victoire ; zéro vie donne défaite ; états terminaux gelés.

Indice n=0…29, tous les paramètres ci-dessous ont des extrêmes stricts.

| Paramètre | Générateur | Niveau 1 → 30 |
| --- | --- | --- |
| Frames par quantum | 30−floor(17n/29) | 30 → 13 (vitesse croissante) |
| Espacement véhicules | 6−floor(2n/29) | 6 → 4 cases |
| Longueur supports | 8−floor(3n/29) | 8 → 5 cases |
| Immersion | 0 si n<9, sinon 1+floor((n−9)/5) | 0 → 5 quanta |
| Chronomètre | 60000−1000n | 60 → 31 secondes |
| Abris | 3+floor(n/10) | 3 → 5 |
| Voies alternées | 1+floor(n/5) | 1 → 6 |

Les 3 abris sont aux colonnes 1,4,7 ; les 4 aux colonnes 0,3,5,8 ; les 5 aux
colonnes 0,2,4,6,8. Les premières voies alternent leurs sens ; les autres
reçoivent un sens et un offset par PRNG. La démo au niveau 3 suit une politique
locale : monter si possible, sinon chercher une fenêtre latérale, et redémarrer
après fin ou 300 décisions. Sa vignette Canvas dessine l'état moteur réel.

### Faisabilité mesurée sans Vitest

`node --import ./scripts/ts-loader.js scripts/validate-traverse.js` effectue
un BFS borné par le chrono dans (colonne, rangée, instant), avec cinq actions
cardinales/attente, les mêmes contacts et transports que le moteur. Chaque
arête dure un quantum. Tous les abris sont recherchés séparément depuis le
départ à phase zéro, puis chaque témoin est rejoué par les entrées ordinaires,
avec trois vies intactes. Le script rejoue aussi une victoire complète pour
chaque niveau, en recherchant les abris successifs à leur phase réelle.
Le budget de recherche est inférieur à une seconde par niveau dans R10.

Le tableau donne le minimum de quanta jusqu'à l'abri médian et les actions
`wait` du témoin optimal en temps. Le BFS départage les chemins de même durée
par l'ordre fixe haut, attente, gauche, droite, bas : le nombre de `wait` est
une mesure de ce témoin, pas le minimum d'attentes parmi tous les chemins.
Les deux mesures sont constantes dans chaque palier de cinq niveaux et
strictement croissantes entre paliers. Elles ne commandent jamais le trafic.
Les attendus R10 sont littéraux, indépendants des paramètres du moteur ;
R11 vérifie séparément leurs valeurs et leur monotonie. Les tests n'importent
aucune constante du moteur pour fabriquer un attendu.
Mesures Node observées, hors chargement TypeScript ; durées variables.

| Niveau | Quanta min. (abri médian) | Pas immobiles du témoin | Max ms / abri |
| --- | --- | --- | --- |
| 1 | 16 | 0 | 15.9 |
| 2 | 16 | 0 | 13.8 |
| 3 | 16 | 0 | 2.2 |
| 4 | 16 | 0 | 2.6 |
| 5 | 16 | 0 | 2.3 |
| 6 | 18 | 1 | 2.3 |
| 7 | 18 | 1 | 2.0 |
| 8 | 18 | 1 | 1.8 |
| 9 | 18 | 1 | 2.2 |
| 10 | 18 | 1 | 3.8 |
| 11 | 20 | 2 | 4.2 |
| 12 | 20 | 2 | 2.5 |
| 13 | 20 | 2 | 2.9 |
| 14 | 20 | 2 | 2.2 |
| 15 | 20 | 2 | 2.6 |
| 16 | 22 | 3 | 2.2 |
| 17 | 22 | 3 | 2.6 |
| 18 | 22 | 3 | 4.4 |
| 19 | 22 | 3 | 2.4 |
| 20 | 22 | 3 | 2.4 |
| 21 | 24 | 4 | 2.4 |
| 22 | 24 | 4 | 3.2 |
| 23 | 24 | 4 | 2.9 |
| 24 | 24 | 4 | 2.5 |
| 25 | 24 | 4 | 47.0 |
| 26 | 26 | 5 | 2.8 |
| 27 | 26 | 5 | 54.5 |
| 28 | 26 | 5 | 3.1 |
| 29 | 26 | 5 | 3.1 |
| 30 | 26 | 5 | 3.3 |

### Oracle et intégration

| ID | Preuve `tests/traverse.test.ts` |
| --- | --- |
| R01 | Un pas par entrée, aucune répétition et bornes latérales 0/8 |
| R02 | Collision avant/après défilement, perte d'une vie |
| R03 | Transport et sortie fatale aux deux bords |
| R04 | Eau nue fatale, attente sur berge sûre |
| R05 | Début au niveau 10, phase et durée littérales, immersion mortelle |
| R06 | Occupation persistante, doublon et haut hors abri mortels |
| R07 | 59999 ms sans perte, 60000 ms perte et remise du chrono |
| R08 | Tous les abris nécessaires, trois vies, victoire/défaite gelées |
| R09 | Réapparition exacte en (4,14) après perte |
| R10 | Chaque abri des trente niveaux, budget, témoins rejoués, minimums et attentes du témoin littéraux, diversité des rangées/plongeurs |
| R11 | Sept paramètres naturels : sens, extrêmes stricts et valeurs littérales |
| R12 | Graine, copie sérialisable, regroupement temporel, temps invalides |

Le crochet `__ARCADE_TEST__.games.traverse` expose read/loadLevel/advance,
hudText/usefulArea/bounds et des scénarios `finish` (dernier abri à un pas)
et `danger` (une vie devant un véhicule réel), sans changer les règles.
Le HUD occupe une bande séparée au-dessus de y=64 ; la zone utile est
(9,64,342,570). Héros de 24 px, obstacles de 34×26 px sur cases de 38 px.
Les boîtes HUD/héros réellement dessinées sont exposées par bounds.

`tests/e2e/traverse.spec.ts` écrit les parcours bureau/mobile avec victoire
par vraie entrée, Niveau suivant, sauvegarde après reload, défaite/rejouer,
niveau 30, tap/glisser et absence de crochet en production. Quatre captures
traverse-play/level30/won/lost par projet. Les entrées mobiles sont tactiles.
Le non-chevauchement HUD/héros/zone utile et contrôles/canevas est vérifié.
M01–M04 incluent Traverse aux trois dimensions ; A11 inclut son horloge et
V01–V08 comptent onze vignettes. La fixture commune refuse les erreurs console.
Vitest et Playwright ne sont pas exécutés ici ; leur exécution et les captures
restent à vérifier par l'orchestrateur.


## Dérapage

Douzième jeu, `derapage`, `realtime: true`. Course de karts originale,
vue de dessus avec caméra suivant le joueur et tournant dans sa direction.
Le moteur ne connaît que des coordonnées du monde, des unités et des secondes.
La projection, le cadrage, les traces et les étincelles vivent dans la scène ;
un autre rendu peut consommer le même snapshot sérialisable. Aucun fichier
`src/shell` modifié, aucune nouvelle dépendance, aucun fichier binaire.

### Règles et commandes

Six karts, trois tours. Accélération automatique 12 unités/s², frottement
longitudinal 0,12/s, vitesse normale plafonnée à 24. Braquage proportionnel
2,4 rad/s, modulé par la vitesse jusqu’à 10 unités/s ; adhérence latérale
exponentielle 10/s. Les cercles de rayon 1,2 se séparent et échangent une
impulsion de coefficient 0,85 ; un mur renvoie la composante normale (1,7).
L’herbe au-delà de la demi-largeur réduit la vitesse maximale ; les murs
commencent trois unités au-delà de la bordure. Les sections sans mur restent
en herbe et permettent une récupération par le pilote.

Braquer à plus de 9 unités/s et maintenir Dérapage diminue l’adhérence à
1,4/s et multiplie le braquage par 1,22. Relâcher ou cesser de braquer libère
un mini-boost : moins de 600 ms ne donne rien ; 600 ms donnent 700 ms,
1400 ms donnent 1400 ms. La vitesse boostée est plafonnée à 32.
Douze portes transversales doivent être franchies dans le sens de la course,
dans l’ordre 1…11,0, à moins d’une demi-largeur + 1,2 du centre.
Une porte sautée, traversée en sens inverse ou coupée trop loin dans l’herbe
ne fait pas progresser le compteur. Seule la porte 0 après les onze autres
valide un tour. Le classement trie les portes cumulées (donc les tours),
puis la distance à la suivante ; les arrivants sont triés par temps puis id.
La course se termine à l’arrivée du joueur : top 3 = victoire du niveau,
autres places = défaite. Les points par place sont 10,8,6,5,4,3.

Les niveaux 1–28 forment sept coupes de quatre courses consécutives ;
29 et 30 sont deux entraînements indépendants. Une coupe cumule les points
des six pilotes et affiche leur ordre dans le HUD. Un rejeu restaure le
cumul d’avant la course, sans compter deux fois son résultat. La coupe
reste en mémoire pendant la série ; seuls progression et records sont
persistés sous `arcade-lab:derapage:v1`, comme les autres jeux.

Quatre caisses aux sommets 16,40,64,88 réapparaissent après 5000 ms. Tirage
par le PRNG partagé, avec poids, pour une place p indexée de 0 à 5 :
Turbo `1+0,7p`, Ressort `1+0,2p`, Flaque `3−0,3p`, Bulle `2`.
Turbo donne 1800 ms de boost ; Ressort ignore l’herbe pendant 1600 ms ;
Flaque reste 6000 ms quatre unités derrière son propriétaire, fait glisser
les autres pendant 1100 ms ; Bulle absorbe le prochain choc ou la flaque.
Les cinq IA suivent une ligne de course précalculée (ligne centrale
contractée de 1 %), regardent devant elles, anticipent les courbures pour
freiner, ajoutent un bruit à graine et utilisent leurs bonus.
Le retard de freinage réduit la distance d’anticipation ; le bruit et ce
retard diminuent aux niveaux élevés, tandis que leur vitesse augmente.

Clavier ← →, Espace ou Maj pour déraper, X ou Ctrl pour le bonus.
Au doigt, deux boutons ◀ ▶ de 64 px, Glisse (Dérapage) et Bonus sont
sur une rangée de 64 px ; maintenir la moitié gauche/droite de l’aire
braque aussi. Les options Souris et Inclinaison sont dans l’aide du menu ;
le refus ou l’absence du capteur reste silencieux. Pause, Prêt, menus,
progression, sauvegarde, écran allumé et vibrations life/won/lost passent
par les services communs. Sons synthétisés engine/drift/boost/impact.
La scène utilise des Graphics pour le circuit et les karts, un HUD HTML
et une mini-carte dans la bande réservée y=0…96 ; la zone utile est
(0,96,360,544), le kart vers y=466. Aucun contrôle ni HUD dans l’aire
devant le kart. La vignette Canvas utilise une vraie démo au niveau 3,
avec politique de suivi et pas de 1/15 s : elle évolue en moins de 600 ms.

### Générateur et difficulté

Indice n=0…29. Les 96 sommets échantillonnent l’angle a=2πi/96.
Le rayon vaut `65 × (1 + bend × cos(3a + phase))`, avec phase et
aplatissement horizontal issus du PRNG partagé (graine canonique 28).
La fermeture est explicite par l’arête du dernier au premier sommet.
Cette courbe radiale bornée fournit des tracés simples, sans croisement.
La largeur par segment est `width + 0,5 × (1+sin(iπ/24))`.
Les portes sont aux sommets 0,8,…88. Aucun obstacle ajouté pour fabriquer
une métrique : la difficulté vient des courbures, bordures, murs et IA.

| Paramètre | Formule | Niveau 1 → 30 |
| --- | --- | --- |
| Largeur de base | 20−0,27n | 20 → 12,17 |
| Vitesse cible IA | 15+0,23n | 15 → 21,67 |
| Bruit de braquage | 0,18−0,005n | 0,18 → 0,035 |
| Retard de freinage | 0,45−0,012n | 0,45 → 0,102 s |
| Amplitude des courbures | 0,015+0,0015n | 0,015 → 0,0585 |
| Fraction de murs | 0,12+0,02n | 0,12 → 0,70 |
| Facteur de vitesse sur herbe | 0,75−0,008n | 0,75 → 0,518 |

### Validation Node des trente circuits

Commande : `node --import ./scripts/ts-loader.js scripts/validate-derapage.js`.
Le script valide fermeture, largeur minimale 12, portes et intersections
de toutes les arêtes non adjacentes. Il simule ensuite trois tours de chaque
circuit, au pas 1/60 s, avec la physique et les portes ordinaires, sans
repositionnement ; abandon après 300 s. Deux courses complètes aux niveaux
extrêmes vérifient aussi collisions et objets avec les cinq adversaires.
Temps par tour = temps des trois tours / 3, départ arrêté inclus ;
« virages » = nombre de sommets avec changement de direction > 0,06 rad.
L’écart IA est la distance moyenne à la ligne de course, en unités du monde.
Les temps ne sont pas forcés à être monotones entre tracés différents ;
la vitesse et la précision des paramètres IA le sont. Mesures graine 28 :

| Niveau | Longueur | Largeur min. | Virages | Tour pilote (s) | Tour IA (s) | Écart IA |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 433.4 | 20.00 | 70 | 18.33 | 28.56 | 0.820 |
| 2 | 441.9 | 19.73 | 67 | 18.68 | 28.69 | 0.783 |
| 3 | 433.5 | 19.46 | 68 | 18.33 | 27.74 | 0.772 |
| 4 | 442.0 | 19.19 | 66 | 18.68 | 27.89 | 0.737 |
| 5 | 437.8 | 18.92 | 63 | 18.51 | 27.24 | 0.717 |
| 6 | 442.1 | 18.65 | 61 | 18.69 | 27.14 | 0.685 |
| 7 | 437.9 | 18.38 | 61 | 18.52 | 26.52 | 0.670 |
| 8 | 433.8 | 18.11 | 60 | 18.34 | 25.92 | 0.646 |
| 9 | 438.1 | 17.84 | 59 | 18.52 | 25.83 | 0.617 |
| 10 | 434.0 | 17.57 | 58 | 18.35 | 25.26 | 0.594 |
| 11 | 438.3 | 17.30 | 58 | 18.53 | 25.19 | 0.560 |
| 12 | 434.1 | 17.03 | 57 | 18.36 | 24.64 | 0.542 |
| 13 | 442.7 | 16.76 | 57 | 18.71 | 24.82 | 0.501 |
| 14 | 434.3 | 16.49 | 56 | 18.37 | 24.06 | 0.484 |
| 15 | 442.9 | 16.22 | 56 | 18.72 | 24.23 | 0.447 |
| 16 | 434.5 | 15.95 | 57 | 18.38 | 23.51 | 0.426 |
| 17 | 443.1 | 15.68 | 56 | 18.73 | 23.68 | 0.394 |
| 18 | 439.0 | 15.41 | 55 | 18.56 | 23.20 | 0.366 |
| 19 | 443.3 | 15.14 | 55 | 18.74 | 23.16 | 0.336 |
| 20 | 439.2 | 14.87 | 55 | 18.57 | 22.70 | 0.312 |
| 21 | 435.1 | 14.60 | 56 | 18.40 | 22.25 | 0.285 |
| 22 | 439.5 | 14.33 | 56 | 18.58 | 22.24 | 0.258 |
| 23 | 435.4 | 14.06 | 56 | 18.41 | 21.81 | 0.231 |
| 24 | 439.8 | 13.79 | 54 | 18.59 | 21.84 | 0.204 |
| 25 | 435.7 | 13.52 | 54 | 18.42 | 21.44 | 0.180 |
| 26 | 444.3 | 13.25 | 54 | 18.78 | 21.68 | 0.151 |
| 27 | 436.0 | 12.98 | 54 | 18.44 | 21.13 | 0.131 |
| 28 | 444.6 | 12.71 | 55 | 18.79 | 21.39 | 0.106 |
| 29 | 436.3 | 12.44 | 54 | 18.45 | 20.80 | 0.088 |
| 30 | 445.0 | 12.17 | 54 | 18.81 | 21.07 | 0.077 |


### Oracle

| ID | Preuve écrite dans `tests/derapage.test.ts` |
| --- | --- |
| Z01 | Accélération littérale, plafond 24, frottements et reliquat fixe |
| Z02 | Braquages 0,02/0,04 rad et adhérence exponentielle |
| Z03 | Seuil 9, charges 599/600/1399/1400, boost 700/1400 |
| Z04 | Herbe, saut et rebond normal sur mur |
| Z05 | Séparation à 2,4, impulsions opposées et protection |
| Z06 | Douze portes ordonnées, trois tours et instant d’arrivée |
| Z07 | Portes sautées et coupure hors piste refusées |
| Z08 | Classement, six scores littéraux, podium et gel terminal |
| Z09 | Quatre courses, cumul, classement et rejeu sans double compte |
| Z10 | Quatre effets, poids selon place, graine et retour à 5000 ms |
| Z11 | Cinq rivaux, mesures d’écart et temps aux deux extrêmes |
| Z12 | Trente tracés × trois graines, largeur ≥12, fermeture et intersections |
| Z13 | Trois tours sur chacun des trente tracés en moins de 90 s |
| Z14 | Sens de chacun des sept paramètres et extrêmes stricts |
| Z15 | Course complète rejouée à chaque pas, cadences, copies et temps invalides |
| Z16 | Clés littérales du snapshot et méthodes publiques sans notion de vue |

Le crochet `__ARCADE_TEST__.games.derapage` expose read/loadLevel/advance,
hudText/usefulArea/bounds et deux états de course ordinaires : finish
(dernière porte, kart mal orienté qui doit réellement braquer), danger
(même situation, cinq adversaires déjà arrivés). Aucun seuil ni règle
n’est modifié. Les E2E utilisent un maintien réel au clavier ou multitouch,
advance pour la simulation, puis vérifient les panneaux Niveau suivant et
Rejouer le niveau, le déblocage après reload et les captures
derapage-play/level30/won/lost sur chaque projet. Ils vérifient aussi
la séparation HUD/aire devant le kart et contrôles/canevas. M01–M04,
A11 et les douze vignettes communes incluent Dérapage.

Vitest et Playwright ne sont pas exécutés sur cette machine. L’orchestrateur
doit exécuter ces suites, inspecter les captures aux trois tailles mobiles,
vérifier les capteurs optionnels et mesurer la fluidité sur téléphone.
