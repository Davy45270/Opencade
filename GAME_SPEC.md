# Opencade — spécification des jeux

## Socle

### Characters

Measured minified JavaScript in dist/assets: 1,459,946 bytes before, 1,473,143 bytes after (+13,197 bytes; below the 40 kB target). The Phaser adapter is provided for later game integration and is not imported by the home shell.

Pass 59 establishes five original recurring companions and a home selector; game
rules and scenes do not consume the selection yet. No image assets or new dependencies.
The rounded cast has large expressive eyes, soft dark outlines and individual silhouettes:

| ID | French / English name | Visual signature and special |
| --- | --- | --- |
| `panda` | Panda glouton / Hungry panda | Round black-and-white body, eye patches, bamboo, woven bun/fruit basket; spiral green leaves |
| `pandaroux` | Panda roux joueur et câlin / Playful red panda | Orange fur, white mask/ear borders, dark paws, striped fluffy tail; rolling spin, trail and hearts |
| `dragon` | Dragon assidu / Studious dragon | Red body, cream belly, curled gold horns, mint wings/crest, gold eyes, open book; fire and blue geometric rune circle |
| `singe` | Singe en tutu / Tutu monkey | Brown fur, rosy beige face/ears, pink ruffled tutu, slippers and flower, curled tail; pirouette, pink ring and gold stars |
| `licorne` | Licorne joueuse / Playful unicorn | White coat, six-color mane/tail, twisted gold horn, gold hooves, blue eyes; rainbow and shooting star |

`src/characters/model.ts` is a pure deterministic primitive-list generator on a
240 × 240 stage. `drawList(id, pose, expression, anim, t, motion)` accepts milliseconds;
poses are `face`, `profil`, `dos`; expressions are `joie`, `surprise`, `concentre`,
`triste`, `dodo`; animations are `repos`, `marche`, `saut`, `celebration`, `special`.
The optional final argument is `full` (default) or `reduce`. Reduce fixes the pose,
ignores time and omits all special particles. Non-finite times resolve to zero.
Array order is drawing order. Primitives carry fill, stroke and width and support
ellipses, circles, cubic Bézier paths, polygons and lines.

`canvas.ts` and `phaser.ts` export `renderCharacter(target, list, x, y, height)`;
coordinates describe the top left of the square stage. Both read the same list
without mutating it. Strokes retain a minimum 0.75 destination pixel at small sizes.
The first uses native vector paths; the second tessellates
curves at destination resolution into Graphics geometry and never creates a texture.
The Graphics adapter does not clear its target; callers own clearing and lifecycle.
Pass a 32 px stage for a small icon or larger stages for review; never upscale a bitmap.

The home header's **Personnage** button shows the selected head. Its native modal
dialog provides five idle previews, special animation on pointer/focus interaction,
48 px selection/close targets, visible focus, Escape dismissal, modal keyboard
navigation and focus restoration. Touch scrolling remains available over previews.
The loop runs at most 15 fps, suspends when hidden, stops when closed or leaving
home, and reacts live to `prefers-reduced-motion`.
`selectedCharacter()` and `others(id)` are available from `src/characters/index.ts`.
`others` returns the four other IDs in registry order. Selection writes only
`arcade-lab:character:v1`; missing/unknown values default to `panda` and existing
progress/sound keys are untouched. Names expose `fr` and `en`; the current shell
has no language selector and displays French.

| ID | Evidence |
| --- | --- |
| C01 | Deterministic, finite, nonempty drawings for all 375 combinations, split into five short tests |
| C02 | Five distinct primitive counts, pairwise RGB accent distance > 75, distinct orientations/expressions and stable others |
| C03 | All five animations change between 0 and 300 ms; every reduced pose/expression remains fixed and particle-free |
| C04 | Exact literal storage key, defaults, corrupt values, all five choices, isolated existing saves and storage exceptions |
| C05 | Source contains none of the four forbidden presentation terms; ESLint also applies pure-engine restrictions |
| C06 | Both adapters consume every paint operation at 32, 160 and 480 px without changing the source list |

Run `nice -n 19 ionice -c3 node scripts/validate-characters.js` for the same checks
without Vitest and three in-memory source mutations (ignored time, duplicate accent,
changed storage key). It reports their file/line and rejects each. Each individual
unit check has a literal 2000 ms budget in that validator.
`tests/e2e/characters.spec.ts` is enabled for both desktop and mobile. It checks
real choices/reloads, pixel changes within 600 ms, console errors through the shared
fixture, keyboard dismissal/focus, 48 px targets and reduced motion. With `?test=1`,
the panel also contains read-only review sheets. The E2E exports `characters-panel`
and `character-<id>-poses` / `character-<id>-expressions` at 240 px stage height.
The review must still judge recognizability at 32 px, originality, expressive quality,
profile/back anatomy and consistency between the two rendering backends.

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
La version package et l’instant UTC du build sont injectés par `define`, affichés
localement au pied d’accueil et en tête du menu ☰. Le SW est recherché au
lancement, toutes les 30 minutes et au retour au premier plan. `version.json`
est exclu du précache et lu avec `cache: no-store` ; l’hébergement doit aussi
servir ce fichier et `sw.js` avec `Cache-Control: no-store` (ou revalidation).
Un bandeau `status` fermable propose « Mettre à jour » : SKIP_WAITING,
clients.claim, puis rechargement. Le menu propose « Forcer la mise à jour » :
update, activation du worker en attente, sinon désenregistrement puis suppression
exclusive des caches préfixés `opencade-`. Aucun localStorage n’est modifié.
Une confirmation affiche la version réellement chargée après rechargement.
Sans SW enregistré, aucun bandeau ni bouton de mise à jour n’apparaît.
Les tests Vitest couvrent formatage et secours avec API factices ; les E2E
`pwa-update.spec.ts` remplacent à origine constante les fichiers v1 par v2,
vérifient bandeau, forçage, secours et sauvegarde conservée. Préparation :
`node scripts/build-pwa-fixture.js` (deux builds dans .pwa-fixtures).
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

**Exception Dérapage :** une zone de commandes de **156 px** au plus, sous le canevas : gros bouton Dérapage (≥ 88 px) et bouton Bonus (≥ 56 px) au-dessus, à droite ; joystick absolu 360° au pouce sur toute la zone de jeu, anneau et cap visé visibles. Les commandes ne recouvrent jamais la piste devant le kart (M02).

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

La visée est bornée entre 10° et 170° depuis l’horizontale (±80° depuis le haut). Les flèches
la modifient de 0,08 radian par événement clavier. La souris vise au survol et tire au clic au-dessus de y=555. Au doigt, glisser vise et relâcher tire ; le bouton Tap active « tirer au toucher ». Les boutons fléchés ajustent finement. ⇄ ou X échange la bulle courante et la suivante, sans tirage aléatoire, hors vol. La trajectoire est calculée par intersection rayon /
cercle (distance effective des centres strictement inférieure à 40 × 0,85 = 34 ; une tangence seule ne bloque pas), plafond mobile y=`20 + drops * ROW_STEP` et murs x=20 / x=340. À chaque mur,
la composante horizontale de direction est inversée ; la verticale est conservée.
Les segments analytiques donnent exactement le premier contact, sans sous-pas. Le guide utilise ces mêmes segments jusqu’au premier rebond et son segment sortant inclus, avec arrêt au premier obstacle ou au deuxième mur.

Au contact d'une bulle, on choisit parmi ses voisines libres la cellule dont le
centre est le plus proche du point de contact sur la surface de la bulle touchée. Les cellules au-dessus du contact, derrière la face incidente ou dont le segment de placement traverse une autre bulle sont exclues. Au plafond, on choisit la cellule
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
4. Grille vide : victoire. Sinon, bas d’une bulle atteignant la ligne rose y=455 : défaite (y du centre + 20 ≥ 455). Le plafond descend selon l’intervalle du niveau en translatant seulement y ; les indices et le décalage horizontal pair/impair ne changent jamais.
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

### Oracle B-HEX (passe 47)

Les cas B-HEX-01–09 de `tests/bubble-hex.test.ts` utilisent des grilles,
angles et cellules attendues littéraux ; origine (180,570). Ils prouvent dessous,
biais gauche/droite, rebonds gauche/droite, traversée d’un trou, plafond,
rangées impaire puis paire. B-HEX-10 vérifie la réflexion à 1e-9 et les bornes
10°/170°. B-HEX-11 vérifie trois éclatements, une chute, deux bulles ancrées
conservées et 50 points (10 par éclatement, 20 par chute). B-HEX-12 vérifie
la descente au sixième tir, la parité et la défaite à 455. B-HEX-13 vérifie
le déterminisme et l’échange sans consommation du PRNG.
B-HEX-14/15 dans `tests/e2e/game.spec.ts`, sélectionnés sur desktop et mobile,
exercent le vrai pipeline tactile, contrôlent le guide et la cellule (1,4),
puis l’effet de chute et les 50 points ; captures `bubble-aim` et `bubble-drop`.
Ces E2E doivent être exécutés par l’orchestrateur.

Mutations : remplacer le classement au contact par le centre de la bulle touchée
échoue sur B-HEX-03 ; neutraliser les chutes échoue sur B-HEX-11 ; porter
CONTACT_SCALE à 1 échoue sur B-HEX-06 ; multiplier l’angle réfléchi par 1,05
échoue sur B-HEX-10. Attention : classer depuis le centre du projectile arrêté
peut être mathématiquement équivalent au contact radial pour six voisines à
égale distance ; cette substitution seule ne constitue pas toujours une mutation
observable. Le mutant « centre » prévu utilise le centre de la bulle touchée.

## Niveaux de Bubble Lab

Les trente définitions sont des données pures dans `src/engines/bubble/levels.ts`.
Les dix premières définitions et leurs grilles restent identiques. B-LVL-01 compare
chaque cellule, avec dix masques et palettes littéraux dans `tests/bubble-history.ts`,
et vérifie les anciennes sauvegardes. La mutation du masque du niveau 2 est rejetée.

L’extension remplace les trois petits îlots faciles à détacher par des grilles
étagées de 7 à 11 rangées, avec cinq puis six couleurs. Les paires, les décalages
entre rangées, les pierres et les étoiles proches du plafond demandent des coupes
successives. Les descentes interviennent tous les 16, 15, 14 puis 13 tirs résolus,
par tranches de cinq niveaux. Les introductions gardent moins de rangées que les
défis ultérieurs. Les respirations 13, 16, 19, 22 et 28 exigent au moins autant de
tirs que le niveau 5 sur la graine de contrôle.

La graine permute toute la palette et déplace une encoche dans la dernière rangée ;
elle ne se réduit plus à un choix parmi six phases. B-LVL-01 contrôle le déterminisme
et la différence des grilles 10/11 pour chacun des trente niveaux. Les graines par
défaut, 452 à 481, et les clés de sauvegarde sont conservées.

| Niveau | Nom | Tirs graine 28 | Tirs moyens, 20 graines | Victoires | Interruptions |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Atelier | 6 | 8.70 | 20/20 (100 %) | 0 |
| 2 | Losange | 16 | 18.50 | 20/20 (100 %) | 0 |
| 3 | Damier | 29 | 23.85 | 20/20 (100 %) | 0 |
| 4 | Pyramide | 11 | 9.85 | 20/20 (100 %) | 0 |
| 5 | Colonnes | 12 | 12.15 | 20/20 (100 %) | 0 |
| 6 | Vagues | 13 | 14.25 | 20/20 (100 %) | 0 |
| 7 | Chevrons | 28 | indisponible | 11/20 (55 %) | 9 |
| 8 | Spirale | 21 | 23.00 | 20/20 (100 %) | 0 |
| 9 | Cristal | 70 | 48.65 | 0/20 (0 %) | 20 |
| 10 | Prisme | 56 | 40.95 | 0/20 (0 %) | 20 |
| 11 | Silex suspendu | 13 | indisponible | 17/20 (85 %) | 3 |
| 12 | Arches de craie | 14 | 15.60 | 20/20 (100 %) | 0 |
| 13 | Halte des lucioles | 16 | 16.80 | 20/20 (100 %) | 0 |
| 14 | Mèches jumelles | 13 | 15.30 | 20/20 (100 %) | 0 |
| 15 | Le grand brasier | 12 | 16.15 | 20/20 (100 %) | 0 |
| 16 | Jardin ajouré | 32 | 22.00 | 20/20 (100 %) | 0 |
| 17 | Iris voyageur | 11 | 14.20 | 20/20 (100 %) | 0 |
| 18 | Éventail des marées | 13 | 18.40 | 20/20 (100 %) | 0 |
| 19 | Clairière calme | 18 | 15.20 | 20/20 (100 %) | 0 |
| 20 | Banquise fendue | 15 | 15.65 | 20/20 (100 %) | 0 |
| 21 | Dentelle polaire | 24 | 16.95 | 20/20 (100 %) | 0 |
| 22 | Le dégel doux | 17 | 19.00 | 20/20 (100 %) | 0 |
| 23 | Constellation captive | 13 | 21.70 | 20/20 (100 %) | 0 |
| 24 | Passerelles du soir | 19 | 26.60 | 20/20 (100 %) | 0 |
| 25 | Le coffre du ciel | 21 | 28.85 | 20/20 (100 %) | 0 |
| 26 | Ricochets de cuivre | 37 | 38.15 | 20/20 (100 %) | 0 |
| 27 | Les trois cloches | 34 | indisponible | 15/20 (75 %) | 5 |
| 28 | Souffle paisible | 34 | indisponible | 1/20 (5 %) | 19 |
| 29 | Couronne des échos | 43 | indisponible | 0/20 (0 %) | 20 |
| 30 | La voûte aux six secrets | 39 | indisponible | 5/20 (25 %) | 15 |


Mesure de passe 49 : 600 essais, graines 0 à 19, plafond de 160 tirs.
Le calcul statistique a duré 1104.60 secondes, soit moins de vingt
minutes. Deux workers persistants sont préchargés ; leur création ne consomme pas
le délai d’un essai mais reste incluse dans le temps total. Le délai est de 2 000 ms
par essai, porté à 30 000 ms pour les niveaux historiques 9 et 10, où la recherche
approfondie est nécessaire. Le JSON est réécrit après chaque résultat terminé.
Il conserve les graines, les interruptions et les tirs réellement mesurés : une
interruption compte comme non-victoire. Les tirs d’un échec interrompu sont ceux de
la tentative gloutonne terminée ; si elle n’a pas terminé, la moyenne est indisponible.
Ces taux mesurent un pilote sous budget, et ne prouvent pas l’impossibilité d’un niveau.
Les tirs ne comptent pas le travail interne des branches de recherche.

### Oracles B-LVL-01–05, passe 49

- B-LVL-01 : dix définitions et toutes les cellules historiques ; sauvegardes ;
  déterminisme et influence des graines pour les trente grilles.
- B-LVL-02 : pierre ; bombe/pierre et chaîne de deux bombes de couleurs différentes ;
  glace locale sur deux éclatements, glace éloignée intacte ; arc-en-ciel aux tirs
  1, 4 et 7, tirs ordinaires intermédiaires ; victoire refusée tant qu’une seconde
  étoile reste captive ; position et réflexion des deux butoirs.
- B-LVL-03 : les cellules réelles fournissent pierre, bombe, glace et étoile ; le
  moteur fournit le tir arc-en-ciel et les butoirs actifs. Le contrôle des clones
  passe trente fois le même index au vrai générateur, constate une seule grille et
  100 % de clones, puis rejette cette campagne par le seuil de clones < 0,2.
- B-LVL-04 : le solveur complet joue les trente niveaux sur la graine 28, sans
  modifier les grilles, les couleurs disponibles ou les règles d’accrochage.
- B-LVL-05 : les moyennes par cinq sont 14.8, 37.6, 13.6, 17.8, 18.8, 37.4. De 11–15 à 26–30,
  elles augmentent strictement ; 26–30 vaut au moins 1,5 fois 1–5. Les seuils et
  les bornes sont des littéraux dans `tests/bubble-campaign.ts`.

Le pilote glouton perd 9 et 10, mais la recherche en faisceau les gagne en
70 et 56 tirs. Les grilles historiques ne sont donc pas
modifiées. Le solveur conserve 279 angles, les échanges de réserve, 64 états par
profondeur et le plafond de 160 tirs. Les caches géométriques évitent des calculs
répétés, avec copies des trajectoires et réassociation de la couleur touchée à la
grille courante ; B-HEX-17 contrôle couleur, isolation des retours, rechargement et
butoirs. La largeur et l’intervalle qualifié d’urgent peuvent être explicités pour
reproduire des recherches ; les valeurs par défaut restent 64 et 6.

**Limite non résolue : B-LVL-04 reste en échec sur le temps.** Les trente victoires
ont demandé 203.75 secondes sur cet hôte, au lieu des moins de dix
secondes exigées. Le seuil et le délai du test n’ont pas été relâchés ; le validateur
sort avec un code non nul après sauvegarde des statistiques. Une suite contenant ce
test ne peut donc pas être annoncée verte. Vitest et Playwright n’ont pas été lancés.

Le validateur Node partage les oracles avec les tests et rejette quinze mutations
en mémoire : quatre de géométrie ; bombe sans explosion ; pierre matchable ; glace
ouverte au premier éclatement ; bombe ne propageant pas à une autre bombe ; pierre
détruite par bombe ; glace éloignée endommagée ; arc-en-ciel à chaque tir ; victoire
avec une étoile encore captive ; butoir droit déplacé ; masque historique du niveau
2 modifié ; glace supprimée du vrai générateur. Le contrôle séparé des clones
vérifie son taux exact avant de rejeter les définitions répétées.

### B-HEX-14 : événements tactiles synthétiques

La scène utilise correctement les coordonnées logiques transformées par le moteur
d’entrée. Le test envoyait des dictionnaires avec seulement `clientX/clientY` ; le
moteur d’entrée lit `pageX/pageY`, qui restaient à zéro lors de la création des
contacts synthétiques. La conversion du zéro depuis le décalage du canvas explique
les angles négatifs différents selon le viewport. Ce n’est pas une erreur de
`devicePixelRatio` dans le jeu.

L’E2E construit maintenant de vrais objets `Touch` et `TouchEvent`, avec les
coordonnées de page incluant le défilement. L’angle attendu reste
0,04995839572194276, sa tolérance reste inchangée. `scripts/bubble-input-check.js`
exécute les méthodes d’entrée et d’échelle réellement installées, sous Node, sur
trois configurations de taille/décalage/défilement ; il reproduit également
l’erreur avec des coordonnées de page nulles. Il ne remplace pas une exécution
navigateur : l’E2E corrigé n’a pas été lancé pendant cette passe.

### Mécaniques

Les nouveautés arrivent à 11 (pierre), 14 (bombe), 17 (arc-en-ciel), 20 (glace),
23 (étoiles) et 26 (butoirs).

- Pierre : exclue des groupes de couleur et des explosions ; tombe seulement détachée.
- Bombe : un groupe de trois l’active ; détruit ses voisins colorés, avec chaînes
  entre bombes de couleurs différentes ; pierres, glaces et étoiles résistent.
- Arc-en-ciel : un tir sur trois à partir du premier adopte la couleur touchée.
- Glace : deux résolutions contenant un éclatement adjacent enlèvent la coque ;
  plusieurs voisins éclatés au même tir ne comptent qu’une fois. La bulle libérée reste.
- Étoiles : insensibles aux couleurs et aux bombes ; toutes doivent tomber. Des
  bulles ordinaires peuvent rester au plafond après la victoire.
- Butoirs : x=100 et x=260, y=290–380 ; réflexion exacte de la direction horizontale.

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
niveau commence une nouvelle session à cumul nul. Le menu montre les trente niveaux,
avec boutons désactivés et cadenas pour les verrouillés. Il suspend le vol ;
« Fermer » reprend la partie. Sur mobile il occupe temporairement l'aire de jeu,
avec défilement interne et boutons tactiles d'au moins 44 pixels.

`bubble-lab:v1` contient `{ unlocked, best }` : nombre maximal de niveaux
débloqués (1–30) et meilleur cumul entier sûr positif ou nul. La sauvegarde
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

### Trente silhouettes et progression (passe 61)

`src/engines/briqueterie/levels.ts` contient trente dessins de dix colonnes.
Les points sont des trous intentionnels ; chaque autre symbole est une brique
jouable `(11+34*x,64+27*y,28,18)`. Arches, damiers ajourés, spirale ouverte,
îlots et structures suspendues remplacent le remplissage par densité. La graine
(par défaut 455) fixe la phase commune des rangées mobiles et le PRNG des bonus.
La signature du rapport conserve les coordonnées, le type et le caractère solide
du vrai générateur ; les noms, numéros de motif et couleurs sont exclus.

Les vitesses initiales `4+5*i/29`, plafonds `7+6*i/29`, collisions balayées,
trois vies et commandes sont conservés. Les briques ordinaires ont un PV,
les régénérantes deux. `difficulty` expose les comptes réels du dessin ; ils
ne sont plus monotones. La largeur est `92-i`, sauf les respirations
6/11/17/23/27 à 108 pixels. Chaque multiple de cinq est une composition-défi ;
le 30 combine coffre, portails, attaches, gravité et déviateurs.

| Introduction | Symbole | Effet déterministe observé |
| ---: | --- | --- |
| 4 | m | Rangée coulissante : déplacement horizontal commun de `8*sin(tick/45+phase)` px ; viser le futur passage |
| 5 | # | Chicanes indestructibles ; ouvrir une trajectoire autour des écrans |
| 7 | e | À la destruction, un dégât à chaque voisin avec `abs(dx)<=38`, `abs(dy)<=32` ; chaînes possibles, solides préservés |
| 10 | r | Deux PV ; après un impact survivant, repousse au bout de 180 ticks, annulée si finie avant |
| 13 | p | Au contact, sortie sous l'autre portail, vitesse verticale vers le bas ; délai de 20 ticks par balle ; le portail touché est cassable |
| 16 | a | Réflexion selon une normale inclinée `(0.5, ±sqrt(0.75))`, norme de vitesse conservée |
| 19 | k / L | La destruction d'une clé rend destructibles les verrous ; ils empêchent la victoire tant qu'ils restent fermés |
| 22 | b | Deux balles immédiatement ajoutées à ±0,4 rad, maximum neuf ; aucun bonus à ramasser |
| 25 | g | Zone à ±52 px du centre, entre y de la brique et y+160 : accélération verticale de −0,045 px/tick² tant que la source existe |
| 28 | t / h | Casser une attache libère les briques suspendues ; elles descendent de 1 px/tick et se stabilisent à y=370 |

| Niveau | Forme | Mécaniques | Rythme |
| ---: | --- | --- | --- |
| 1 | Ailes | visée libre | exploration |
| 2 | Arche | visée libre | exploration |
| 3 | Damier | visée libre | exploration |
| 4 | Chevrons mobiles | coulisse | exploration |
| 5 | Chicane | coulisse, chicane | défi |
| 6 | Îlots | coulisse | respiration |
| 7 | Croix creuse | explosion | exploration |
| 8 | Anneaux jumeaux | coulisse, explosion | exploration |
| 9 | Ruban diagonal | explosion | exploration |
| 10 | Couronne | explosion, repousse | défi |
| 11 | Losange ajouré | repousse | respiration |
| 12 | Spirale ouverte | explosion, repousse | exploration |
| 13 | Portes jumelles | coulisse, portails | exploration |
| 14 | Satellites | explosion, portails | exploration |
| 15 | Enceinte ouverte | explosion, repousse, portails, chicane | défi |
| 16 | Éventail incliné | explosion, angles | exploration |
| 17 | Constellation | angles | respiration |
| 18 | Zigzag évidé | portails, angles | exploration |
| 19 | Coffre | angles, clé, verrous | exploration |
| 20 | Citadelle | explosion, portails, clé, verrous, chicane | défi |
| 21 | Serrure en sablier | coulisse, angles, clé, verrous | exploration |
| 22 | Bouquet triple | explosion, multi-balle | exploration |
| 23 | Trois îles | repousse, multi-balle | respiration |
| 24 | Tresse | explosion, portails, angles, multi-balle | exploration |
| 25 | Puits inversés | angles, chicane, multi-balle, gravité inversée | défi |
| 26 | Vague percée | explosion, portails, gravité inversée | exploration |
| 27 | Balance | multi-balle, gravité inversée | respiration |
| 28 | Lustre suspendu | gravité inversée, attache, suspension | exploration |
| 29 | Pont suspendu | portails, angles, multi-balle, attache, suspension | exploration |
| 30 | Forteresse suspendue | coulisse, explosion, repousse, portails, angles, clé, verrous, chicane, multi-balle, gravité inversée, attache, suspension | final |

Le pilote Node n'utilise que `move` et `launch`, sans injection d'état. Il gagne
les 60 parties (graines 455 et 28), budget 36 000 ticks par tentative ; une
variation de visée déterministe peut être recherchée dans le script, jamais dans
Vitest. Les enregistrements versionnés rejouent les positions de raquette et
vérifient victoire, score, vies et premier tick de chaque effet. Les événements
`moving`, `solid`, `explosive`, `regen`, `portal`, `angle`, `key`, `multi`,
`gravity`, `falling` doivent survenir dans ces parties pour compter dans le
rapport. Aucun symbole configuré seul ne vaut nouveauté.

Mesure inchangée (seuil clone 0,08) : **79,3 → 18,1**, **10** introductions
observées aux niveaux **4/5/7/10/13/16/19/22/25/28**, clones **86,2 % → 0 %**.

### Présentation et socle

Route `#/briqueterie`, scène Phaser Graphics, briques avec points de PV et croix,
bonus avec marques, halo de balle et flash sur brique cassée, bonus et perte.
Les types disposent de couleurs et pictogrammes distincts ; les zones inversées
sont translucides avec flèches montantes. Nom du dessin et légende avant lancement.
Les verrous gardent leur croix, la repousse armée son contour clair.
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
| K09 | Trois bonus, durée, dernière balle, plafond vie ; apparition saturée/interdite. Statistique longue (8 000 destructions, 16 graines, 22–26 %) déplacée dans le validateur Node | — |
| K10 | Dixième rebond et 300 rebonds plafonnés | — |
| K11 | Trente signatures géométriques distinctes, comptes exacts, bornes et respirations | Captures 04/12/20/30 |
| K12 | Même graine/actions, deux découpages, graine témoin, snapshot isolé | Prêt/pause figés, crochet absent hors test et nettoyage |

La fixture commune échoue sur toute erreur JS ou console.error. Les deux projets
Chromium utilisent un seul worker ; mobile uniquement tap et contacts tactiles
via Chromium (aucun clavier). Assertions de visibilité, absence de scroll,
cibles de 56 px et absence de chevauchement Pause/canevas. Captures écrites dans
`test-results/screenshots/briqueterie-{play,level04,level12,level20,level30,won,lost}-<projet>.png`.

`K-MEC-01…10` : dix dispositions littérales dans `tests/briqueterie-mechanics.ts`.
`K-DIV-01` : nouveautés observées, écarts de cinq niveaux maximum jusqu'au 25,
clones <25 %. `K-PILOT` : deux campagnes enregistrées, sans recherche.
`nice -n 19 ionice -c3 taskset -c 0,1 node scripts/validate-briqueterie.js`
exécute les mêmes assertions via un adaptateur Node, les campagnes fraîches et
six mutations en mémoire. `briqueterie-validation.json` donne leurs lignes exactes,
les premiers témoins et les durées. Régénération : ajouter `--record`.
Aucun navigateur ni Vitest n'est exécuté sur cette machine. Les sauvegardes de
progression v1 restent compatibles et les anciens états sans type de brique
restent acceptés.

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
3× la vitesse initiale ; la scission ne peut pas réduire cette vitesse sous sa base. Atteindre y=488 avec le bas d'une sonde fait perdre,
indépendamment des vies et avant la résolution des projectiles du pas courant.
Détruire la dernière sonde et le gardien éventuel fait gagner, sauf défaite déjà survenue dans ce pas.

Un tir joueur actif, **deux dès le niveau 15 inclus** (index 14) ; délai de
180 ms entre deux tirs. Espace/Tir maintenu répète les tentatives, sans jamais
outrepasser cette limite. Vitesse des tirs joueurs : 480 px/s. Un impact
consomme le projectile ; une sonde blindée réclame deux impacts et ne rapporte
qu'à sa destruction. Le score vaut `(rows - row) × 10 × numéro du niveau`,
avec `row=0` en haut. Les tirs ennemis sont émis par la sonde géométriquement
la plus basse de la colonne choisie uniformément parmi les colonnes occupées.
Le délai de tir est `1000/fireRate × (0.75 + random.next() × 0.5)` ; au plus
12 tirs ennemis actifs pour l'émission ordinaire, aucune émission si toutes les
colonnes sont vides. Les motifs de gardien et la menace dédiée du satellite
s'ajoutent à cette limite.

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
150×numéro du niveau, une seule fois, sans compter pour la victoire. L'audit Node vérifie 400 graines, les deux sens, les positions interdites,
l'expiration et le score ; le test court rejoue huit apparitions enregistrées.

### Campagne de 30 niveaux — passe 64

Les six formes sont écrites dans `src/engines/orbite/campaign.ts` :
rectangle, chevron, ailes séparées, arche, losange à largeur variable selon la
rangée et couloirs alternés. Les types tactiques et leurs combinaisons sont
fixés par niveau ; la graine conserve le blindage et les délais de tir.
Une formation normale a trois rangées de six sondes ; les gardiens quatre
colonnes. Les respirations 6/11/17/21/26 ont deux rangées et une cadence ennemie
multipliée par 0,6. Elles conservent des abris frais et font travailler une
mécanique isolée. Le nombre et les PV ne comptent jamais comme nouveauté.

La vitesse de base reste `18 + 24*i/29`, la cadence hors respiration
`0.7 + 1.3*i/29`, la vitesse ennemie `145 + 65*i/29` ; le blindage apparaît
au niveau 10 avec probabilité 0,15 puis augmente jusqu'à 0,4. Le second tir reste
au niveau 15. `difficulty` expose les dimensions réellement générées ; les
anciens paramètres de décalage aléatoire sont remplacés par les formes écrites.

| Première apparition | Mécanique et conséquence défensive |
| --- | --- |
| 4 | **Rotors** : arc tournant, bloque pendant 45 ticks sur 120, ouvre pendant 75 ; le projectile est absorbé sans perdre de PV. Attendre le passage de l'ouverture. |
| 7 | **Scindées** : à la destruction, deux fragments à x−14/x+14 et y−8 ; identifiants distincts, un PV, toujours objectifs. Recentrer les tirs. |
| 10 | **Astéroïdes** à (116,330)/(244,370) : rayon de rencontre 24, déviation horizontale −110/+110 px/s, une seule par projectile. Choisir une autre ligne de tir. |
| 13 | **Puits de gravité** à (180,350) : dans la bande verticale ±100, accélération horizontale de `(180-x)*0.012` par tick, vitesse limitée à ±90 px/s. Compenser la courbe, dans les deux camps. |
| 16 | **Furtives** : visibles et vulnérables 95 ticks sur 150, déphasage `id*13`. Attendre le retour plutôt que tirer dans le vide. |
| 19 | **Réparateurs** : tous les 150 ticks, rendent un PV au premier voisin blessé à moins de 110 px, sans dépasser son maximum. Les éliminer en priorité. |
| 22 | **Satellite allié** : quatre PV, y=550, x=`180+sin(ticks/100)*55`. Menace dédiée toutes les 360 ticks tant que des sondes restent ; sa perte termine le niveau. Les tirs du joueur interceptent les tirs ennemis. Après dégagement de la flotte, évacuation et bonus `PV*100*niveau`, avant le duel final éventuel. |
| 25 | **Essaim coordonné** : au déplacement en bloc s'ajoutent `sin(ticks/32+row)*0.35` en x et `cos(ticks/32+column)*0.2` en y. Suivre les courbes de rangée/colonne. |

Les champs modifient aussi les tirs ennemis. Un projectile déjà consommé ne
peut plus intercepter un autre projectile. Les symboles et le HUD indiquent
la règle active : arc de rotor, croix de scission, croix de réparation,
halo furtif, rochers, anneaux de gravité et panneaux du satellite.

**Gardiens aux niveaux 5/10/15/20/25/30.** Ils oscillent à y=80, x=
`180+sin(ticks/85)*110`. Les escortes verrouillent le cœur ; ensuite viser
à ±12 px du centre pendant l'ouverture verte (ticks modulo 150 ≥55).
Cinq PV, douze au final ; la coque extérieure absorbe le tir même au vert.
Les motifs respectifs sont double diagonale, visée du canon, éventail triple,
balayage alterné avec tir central, paire tournante, puis éventail de porteuse.
Le boss 30 change à six PV : oscillation de période angulaire 48 au lieu de 85,
émission tous les 72 ticks au lieu de 120, double diagonale et tir visé.
Détruire le gardien rapporte `500*niveau`. L'évacuation alliée ménage une
respiration avant le duel final ; les douze PV, le changement de phase et le
cœur cyclique rendent ce dernier distinct d'une vague ordinaire.

| Niveau | Forme | Mécaniques / rythme |
| ---: | --- | --- |
| 1 | Rectangle | Défense initiale |
| 2 | Chevron | Angles |
| 3 | Ailes | Deux fronts |
| 4 | Arche | Rotors |
| 5 | Losange | Rotors ; gardien double diagonale |
| 6 | Couloirs | Respiration |
| 7 | Chevron | Scindées |
| 8 | Losange | Rotors + scindées |
| 9 | Arche | Scindées |
| 10 | Ailes | Astéroïdes + rotors ; gardien visé |
| 11 | Couloirs | Astéroïdes ; respiration |
| 12 | Rectangle | Astéroïdes + scindées |
| 13 | Arche | Gravité |
| 14 | Ailes | Gravité + rotors |
| 15 | Losange | Gravité + scindées ; gardien éventail |
| 16 | Couloirs | Furtives |
| 17 | Rectangle | Furtives ; respiration |
| 18 | Chevron | Furtives + astéroïdes |
| 19 | Losange | Réparateurs + rotors |
| 20 | Arche | Réparateurs + gravité ; gardien balayage |
| 21 | Couloirs | Réparateurs ; respiration |
| 22 | Ailes | Satellite + scindées |
| 23 | Chevron | Satellite + furtives |
| 24 | Rectangle | Satellite + réparateurs |
| 25 | Couloirs | Essaim + gravité ; gardien tournant |
| 26 | Losange | Essaim ; respiration |
| 27 | Arche | Essaim + rotors |
| 28 | Chevron | Essaim + satellite + astéroïdes |
| 29 | Ailes | Essaim + réparateurs + furtives |
| 30 | Losange | Huit mécaniques ; porteuse en deux phases |

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
| V04 | Collision, première sonde rencontrée, score pour les trois rangées | Tir final et score au panneau |
| V05 | Émetteur bas dans les colonnes occupées, délai à graine, plafond 12 | Projectiles visibles |
| V06 | Quatre boucliers, grille 4 px, première cellule érodée dans les deux sens | Boucliers visibles dans les captures |
| V07 | Vies, invulnérabilité, arrêt à zéro, invasion prioritaire | Guidage vers un tir, défaite, Rejouer |
| V08 | Dernière sonde et arrêt après victoire | Victoire, Niveau suivant, cumul et déblocage/record après reload |
| V09 | Fréquence, sens, saturation, exclusion, traversée, bonus unique | Rendu de comète en jeu normal |
| V10 | Deux impacts, score final, seuil et fréquence du blindage | Capture niveau 30 |
| V11 | Formes écrites légales, six géométries, cadence réduite des respirations | 30 entrées dans le sélecteur |
| V12 | Entrées horodatées, découpages équivalents, témoin de graine, copie sérialisable | Prêt/pause figés, option persistée, crochet absent sans test et nettoyé à la sortie |

Les E2E mobile utilisent exclusivement des taps et gestes tactiles Chromium,
sans clavier. Assertions de géométrie pour Pause, Son, flèches, Tir, option,
Niveaux et Recommencer : aucune intersection avec le canevas, cibles visibles
dans le viewport, pas de scroll. La fixture commune échoue sur toute erreur JS
ou console.error. Captures écrites pour `orbite-level04`, `orbite-level12`,
`orbite-level20`, `orbite-level30` sur les projets desktop/mobile, ainsi que
les captures de victoire et défaite. Aucune exécution de navigateur pour la passe 64.

**O-MEC-01…08** : un oracle littéral par mécanique dans
`tests/orbite-behavior.ts`, exposé individuellement dans
`tests/orbite-mechanics.test.ts`. **O-BOSS** vérifie verrou, coque, cœur et phases.
**O-SAVE** charge une position ancienne sans aucun champ optionnel.
**O-PILOT** : 60 tests indépendants, chacun rejoue un enregistrement de
`tests/orbite-solutions.ts`, sans lancer le pilote ; formation, événements,
premiers témoins, statut terminal et empreinte du snapshot doivent correspondre.
**O-DIV-01** agrège les inventaires ainsi vérifiés : au moins sept nouveautés,
écarts ≤5 jusqu'au 25 et clones <25 %. Les campagnes longues et la distribution
des comètes restent exclusivement dans les scripts Node.

Validation : `nice -n 19 ionice -c3 taskset -c 0,1 node scripts/validate-orbite.js`
(ajouter `--record` pour régénérer les enregistrements).
Le script gagne les 30 niveaux sur 457 et 28 par commandes publiques,
compare les enregistrements aux parties fraîches, exécute les oracles avec un
adaptateur d'assertions Node (sans charger Vitest) et exige moins de 2000 ms
pour chaque test sur deux CPU. `docs/orbite-validation.json` conserve les temps,
les témoins et onze mutations rejetées : huit mécaniques, phase/coeur du boss,
puis tous les niveaux égaux au premier (100 % de clones, oracle rejeté).
Les clés de progression et de tir auto sont inchangées ; les champs moteur
ajoutés sont optionnels pour conserver les anciennes positions.

## Essaim

Passe 53, partie 1, corrigée en passe 54. Aire logique 360×640 ; vaisseau à y=552. Le glissement tactile commence à y=586, sous la ligne visible y=590. Flèches/A/D déplacent ; Espace ou bouton Tir maintenu tire. Les zones gauche/droite de 56 px et Tir de 64 px sont conservées. Tir auto facultatif mémorisé, pause commune sans progression. La sauvegarde de progression et les clés existantes restent compatibles ; les anciens états moteur reçoivent les valeurs par défaut des nouveaux champs.

Le moteur utilise le PRNG partagé (graine par défaut 458), un pas fixe de 1000/60 ms et aucune horloge externe. Entrée de 1500 ms échelonnée de 100 ms par ennemi, courbes déterministes ; oscillation calculée sur l'âge local, donc ralentie par l'onde. Piqués vers la position mémorisée du joueur. Trois vies, invulnérabilité de 1000 ms, 10 points par ennemi (30 en piqué). Un capteur par vague conserve la silhouette de nacelle et libère une arme à ramasser. Le champ historique de double canon reste lisible dans les anciens états, mais les nouvelles parties ne le distribuent plus ; ramasser une nouvelle arme le remplace.

### Direction visuelle — passe 55

Cartoon arrondi et lumineux, contours encre, couleurs saturées et volumes à deux tons avec reflets. La coque du joueur reçoit un dégradé par couches, une verrière et deux réacteurs dont la flamme pulse ; son inclinaison suit le déplacement latéral. Les silhouettes distinguent escorte à arc frontal orienté selon `facing`, poseur de mines à nacelles, scindeur à deux lobes, kamikaze à trois pales tournantes, porteur à tourelle articulée, miroir à deux coques et blindé à plaques. Battement, antennes et balancement animent les coques ; un impact blanchit brièvement le vaisseau. Les grands gardiens et le commandement assemblent coques, nacelles, réacteurs et cœur lumineux exposé ; la phase 2 écarte les nacelles, passe au rose et révèle des fissures chaudes. Les silhouettes décoratives n'altèrent aucune hitbox.

Le rayon passe du blanc menthe au rouge avec la chaleur ; les rebonds ont une traînée dorée, les drones une orbite, l'onde des cercles translucides, l'aimant des lignes de champ et la charge un volume lumineux croissant. Les tirs ennemis sont dessinés en dernier avec isolation sombre, enveloppe rose vif et cœur blanc crème, plus contrastés que les effets. Les explosions mêlent éclats, fumée et anneau ; les gros impacts ajoutent un tremblement de 130 ms et d'amplitude 0,003.

Trois plans de 24 étoiles défilent à 4, 10 et 22 px/s ; deux nébuleuses à dégradé radial sont générées par Graphics au démarrage (`generateTexture`, une fois par clé et gestionnaire de textures), puis réutilisées. Une planète change de palette, position et anneau par tranche de cinq niveaux. Aucun fichier image ni dépendance ajoutée. Trois Graphics et deux Images restent actifs, indépendamment du nombre d'entités ; le HUD est un Text supplémentaire. Pas d'objet Phaser par projectile ou particule, pas de filtre ni de texture produite pendant le jeu.

Le pool préalloue **96 particules** (budget littéral) et réutilise leurs identités ; à saturation les nouveaux effets sont abandonnés. `prefers-reduced-motion` est suivi aussi pendant la partie : aucun tremblement, inclinaison ni battement décoratif, parallaxe à 12 % de vitesse et **4 anneaux au maximum**, sans éclats ni fumée. Les mouvements tactiques et les contrôles restent inchangés. Pause et sélection figent le temps visuel ; recommencer vide le pool. Le crochet `art()` expose objets graphiques actifs (5, hors HUD), particules actives, capacité, nombre de générations de textures, images dessinées et préférence de mouvement.

`tests/essaim-art.test.ts` vérifie le pool sur **2000 pas de démo** avec saturation forcée, les identités réutilisées, le budget réduit et la génération unique des deux textures. Les mêmes contrôles purs sont exécutables sans Vitest avec `nice -n 19 ionice -c3 node scripts/check-essaim-art.js`. E2E écrits pour l'orchestrateur : `essaim-art-play` montre les sept silhouettes, les tirs et une explosion ; `essaim-art-boss` le commandement exposé en phase 2 ; `essaim-art-weapons` deux armes simultanées (drones et rebond) ; `essaim-art-reduced` la même scène de silhouettes avec un anneau et mouvement réduit, assertion ≤4 particules. Les captures existantes des six armes restent présentes. Le test mobile bride le CPU par CDP `Emulation.setCPUThrottlingRate` à **4** et mesure successivement Serpentin puis Essaim dans le **même navigateur, la même page et la même session CDP**, sur **5000 ms par scène**, sans `advance()`. Il compte les nouveaux dessins du jeu, pas les seuls rappels rAF. Serpentin utilise un parcours horizontal torique sans obstacle ni croissance ; Essaim utilise la scène `weapons` avec drones et rebond. Le seuil relatif littéral est **cadence Essaim / cadence Serpentin ≥ 0,5**. Chaque moteur doit avancer d’au moins 240 ticks et rester en jeu ; les budgets de particules et de Graphics sont conservés. Les valeurs brutes, le rapport et le seuil sont joints en JSON. Ce rapport compare les charges dans le conteneur sans GPU ; il ne certifie pas une cadence matérielle.

Un second échantillon Essaim `weapons` de **5000 ms**, CPU remis à **1**, exige un **temps JavaScript moyen par image ≤ 8 ms**. Le crochet `__ESSAIM_TEST__.timing(true)` remet les compteurs à zéro ; `timing()` expose les images mesurées, `updateMs`, `drawMs` et `meanMs`. `performance.now()` encadre la mise à jour complète de la scène et son dessin ; le dessin est soustrait du compteur de mise à jour pour éviter de le compter deux fois. La moyenne vaut `(updateMs + drawMs) / frames`, uniquement sur les images réelles en jeu, hors `advance()`. Elle inclut moteur, effets, HUD et construction du dessin, mais pas la rastérisation GPU ni l’attente du navigateur. Les compteurs doivent être non nuls et les résultats sont joints en JSON. Le **30 i/s réel se mesure sur un vrai téléphone**, avec le scénario armes ; aucun seuil absolu de cadence ne représente ce matériel dans le conteneur logiciel. Cette mesure et les captures sont prévues, non exécutées pendant cette passe (aucun navigateur ni Vitest).

La mesure E2E de cadence (`E-ART mobile CPU ×4`) dépend fortement de l'environnement (conteneur sans GPU) : elle est exclue de la suite par défaut et se lance avec `PERF=1 npx playwright test tests/e2e/essaim.spec.ts`. Le seuil réel de 30 i/s se vérifie sur téléphone.

### Six armes ramassables

Chaque arme dure 14000 ms, avec secondes restantes dans le HUD. Une caisse initiale propose l'arme du niveau ; une seconde caisse propose un soutien. Les caisses descendent à 150 px/s et se ramassent à moins de 30 px du vaisseau. Deux armes actives au maximum : même arme = durée renouvelée, troisième arme différente = remplacement de la plus ancienne. Le tir normal continue pendant une charge ; un appui de moins de 300 ms ne produit aucun projectile chargé et conserve le tir ordinaire. Le relâchement du bouton Tir ou d'Espace libère la charge, sans modifier les dimensions tactiles.

| Arme | Mécanique et jauge | Formation visée / façon de jouer |
| --- | --- | --- |
| Rayon continu | Remplace le tir ordinaire ; contact toutes les 6 images. Chaleur +1,4/image, blocage à 100, refroidissement −0,8/image jusqu'à zéro ; chaleur et blocage affichés. | Scindeurs et miroir : rester aligné, interrompre pour refroidir. |
| Rebond | Vitesse (420,−350) px/s ; exactement deux rebonds sur les bords latéraux x=8 et 352. | Les escortes frontales bloquent les tirs directs ; les arrivées latérales ou arrière contournent leur protection, notamment après un rebond. Viser un bord plutôt que l'ennemi. |
| Drones | Deux drones en orbite de rayons (42,32), collision balayée de rayon 17 avec les tirs ennemis ; durée affichée. | Tireurs en rafale : placer une orbite sur la trajectoire menaçante. |
| Onde | Disque de rayon 125, centre 140 px devant le vaisseau ; temps local des ennemis et déplacement/temporisateurs de leurs tirs multipliés par **0,35**. | Essaims rapides et spirales : se placer sous leur trajectoire pour les retenir dans le disque. |
| Aimant | À moins de 145 px, les tirs ennemis deviennent alliés et visent l'ennemi visible le plus proche (sinon le boss) à 600 px/s ; une mine renvoyée ne libère plus de tirs ennemis. | Rafales et mines : approcher les projectiles pour les retourner. |
| Charge | Maintenir jusqu'à 1500 ms puis relâcher ; rayon 4+14×charge, perçage 1+floor(4×charge), charge normalisée à 0…1 ; jauge affichée. Chaque cible ne peut être touchée qu'une fois par projectile. | Blindés alignés : traverser plusieurs coques dans une colonne et contourner le cœur fermé des boss. |

Combinaison explicite rayon + onde : tant que le rayon est allumé, le facteur du disque passe de 0,35 à **0,2**. Drones + aimant donne priorité au renvoi dans la zone magnétique ; les drones restent une défense lorsque l'aimant expire. Un tir renvoyé est allié et n'est plus intercepté. Rebond + drones protège le vaisseau pendant le trajet indirect. Charge + drones protège la tenue de charge. Rayon et rebond ensemble conservent le rayon comme tir principal ; la charge reste libérable. Les autres effets se composent selon leurs zones, sans augmenter le nombre de places d'armes.

### Formations et boss

Les trente plans sont dans `src/engines/essaim/levels.ts`. Cinq géométries réelles : rangées, chevron, colonnes, pinces et anneau. Les mélanges tournent entre les vagues. Les nouveautés de comportement ne sont pas des changements de quantité ou de PV : rafales en éventail, parcours elliptique rapide, protection frontale, mines qui éclatent après 1400 ms, scission en deux fragments sans récursion, spirale d'approche qui quitte la vague après son attaque, tourelles portées lançant des tirs guidés jusqu'à y=300, allié à protéger, copie horizontale du joueur et colonnes traversables par charge. Le bouclier des escortes couvre un cône frontal de 90° orienté vers le bas (ou selon leur orientation explicite), sans privilège lié au type du projectile. Les escortes ouvrent leur bouclier 500 ms toutes les 6000 ms ; le rebond permet d'éviter cette attente. Une collision de kamikaze le détruit. Les tourelles disparaissent avec leur porteur. L'allié absorbe quatre impacts ; sa perte coûte une vie, son sauvetage vaut 50 points par PV restant.

Mini-boss à la dernière vague des niveaux 5/10/15/20/25 ; commandement au 30. Cœur fermé pendant 1800 ms puis exposé 1200 ms dans chaque cycle de 3000 ms. Faiblesse commune : les tirs ordinaires et le rayon blessent le cœur exposé ; rebonds, tirs renvoyés et charges perçantes contournent la fermeture et retirent deux PV. Un boss a 10 PV, le commandement 24. Au seuil de 12 PV, le commandement passe de l'éventail à une visée du joueur avec cadence de 45 images au lieu de 75. Chaque boss détruit rapporte 200 points. Le bonus de précision des défis est plafonné à 200 pour tenir compte du perçage et des renvois.

| Niveau | Motif | Faiblesse / arme conseillée |
| ---: | --- | --- |
| 5 | Pince convergente à deux flancs | Rebond pendant la fermeture, tir direct à l'ouverture |
| 10 | Mines déposées sur l'axe du joueur puis éclatement différé | Rayon pendant l'ouverture ; onde pour ralentir les mines |
| 15 | Tir visant la position du joueur au départ | Aimant pour renvoyer sa propre attaque |
| 20 | Tirs qui inversent leur dérive horizontale à y=300 | Charge à travers le cœur fermé, drones pendant la tenue |
| 25 | Projectiles guidés jusqu'à y=300, puis trajectoire figée | Charge ; esquiver après la fin du guidage |
| 30 | Phase 1 : éventail ; phase 2 : tir visé plus fréquent | Charge contre le cœur fermé dans les deux phases |

Vagues de respiration : 6, 11, 17 et 24 (quatre ennemis, pas de tir ordinaire ; les comportements présents restent actifs). La victoire exige toutes les vagues et le boss éventuel détruits. Le nombre de vagues reste 2+floor(4l/29), celui des ennemis 6+floor(6l/29) hors respiration. Les cadences nominales historiques sont conservées ; les mélanges et les géométries sont désormais décrits explicitement au lieu de probabilités de types.

| Niveau | Vague | Nouveauté / situation | Arme proposée |
| ---: | --- | --- | --- |
| 1 | Patrouille | Prise en main du rayon | Rayon |
| 2 | Rafales | Tireurs en rafale ; drones | Drones |
| 3 | Course | Essaim rapide à trajectoire elliptique ; onde | Onde |
| 4 | Escortes | Boucliers frontaux ; rebonds | Rebond |
| 5 | Gardien des flancs | Mini-boss : pince convergente | Rebond |
| 6 | Escale | Respiration sans tir ordinaire | Rayon |
| 7 | Champs de mines | Mines à explosion différée ; aimant | Aimant |
| 8 | Boucliers et mines | Combinaison des deux menaces | Rebond |
| 9 | Rafales croisées | Rafales + essaim rapide | Drones |
| 10 | Scission | Deux fragments par scindeur ; gardien mineur | Rayon |
| 11 | Halte | Respiration avec scindeurs | Rayon |
| 12 | Éclats rapides | Scission + essaim rapide | Onde |
| 13 | Spirales | Kamikazes en spirale | Onde |
| 14 | Spirales minées | Spirales + mines | Aimant |
| 15 | Gardien des rafales | Mini-boss : visée de la position du joueur | Aimant |
| 16 | Tourelles portées | Lanceurs guidés portés ; charge | Charge |
| 17 | Répit | Respiration avec tourelles | Drones |
| 18 | Convoi protégé | Tourelles + boucliers | Rebond |
| 19 | Sauvetage | Vaisseau allié à protéger | Drones |
| 20 | Gardien du convoi | Mini-boss : tirs qui inversent leur dérive | Charge |
| 21 | Secours sous mines | Sauvetage + mines | Aimant |
| 22 | Miroir | Copie du déplacement horizontal | Rayon |
| 23 | Reflets scindés | Miroir + scission | Rayon |
| 24 | Dernière halte | Respiration avec sauvetage | Drones |
| 25 | Blindés alignés | Colonnes blindées ; gardien à tirs guidés | Charge |
| 26 | Blindage miroir | Colonnes blindées + miroir | Charge |
| 27 | Mines et escorte | Mines + boucliers + tourelles | Rebond |
| 28 | Convoi en spirale | Sauvetage + spirales + essaim rapide | Onde |
| 29 | Reflets de rafale | Miroir + rafales + scission | Aimant |
| 30 | Commandement | Vaisseau final : éventail puis tir visé | Charge |

### Preuves exécutables

`tests/essaim-behavior.ts` expose les scénarios en littéraux réutilisés par `tests/essaim.test.ts` et par `nice -n 19 ionice -c3 node scripts/validate-essaim.js`. E-WPN-01…06 couvrent les six mécaniques ; E-WPN-07 conserve le test des trois escortes (seuil 1,5) et compare chacune des six armes au tir de base contre une vague de sa formation associée réellement générée, avec un seuil littéral de 1,3 (temps de neutralisation, ou interceptions pour drones/aimant) ; E-WPN-08 couvre la limite de deux et le facteur combiné 0,2. E-BOSS vérifie fermeture, faiblesse, cinq motifs et transition du commandement. E-WAVE couvre mines, scission, missiles portés, miroir, kamikazes et sauvetage. E-PICKUP vérifie les six ramassages, renouvellements et expirations. E-DET vérifie cadence, graines et anciens états. E-GEN-01…08 simulent les apparitions et comportements générés (boss, sauvetage, diversité observée, ellipse/rafales, guidage, charge, phase 2 et conséquences du sauvetage). E-P2 verrouille la pénalité sous invulnérabilité ; E-SHIELD croise géométrie et types de projectiles. E-DIV-01 applique la fonction partagée du rapport à des parties pilotées complètes, avec témoins observés et sans compter les déclarations de configuration : huit nouveautés au minimum, écarts de cinq niveaux maximum jusqu'au 25, clones sous 25 %.

Le pilote utilise uniquement déplacement et maintien/relâchement du tir, en observant chaque pas fixe. Le validateur exige une victoire pour chacun des trente niveaux sur les graines 458 et 28, sous 18000 images par niveau. Il écrit les résultats, les temps simulés, vies et scores ainsi que les vingt et une mutations rejetées avec leurs lignes dans `docs/essaim-validation.json`. La démo et le rapport utilisent le même pilote ; la démo observe six pas par avance de 100 ms, le rapport suit chaque pas jusqu’à la fin de la tentative (plafond 18000).

Le contrôle G01 maintient Espace (bureau) ou le bouton tactile pendant la simulation, vérifie l’état de tir, une augmentation de `fired`, puis le rayon actif et sa chaleur ou un projectile selon l’arme, et vérifie le relâchement. La trajectoire clavier du niveau 1 ramasse le rayon initial, contrairement à la trajectoire tactile : `shots` reste alors vide même pendant un tir valide. Le test pur E-INPUT-01 reproduit cette trajectoire et vérifie l’émission sans projectile, puis son arrêt. Les règles de tir sont inchangées.

`tests/e2e/essaim.spec.ts` conserve les contrôles de progression, pause, disposition et nettoyage ; il écrit les captures `essaim-weapon-1` à `essaim-weapon-6` avec exactement une arme active, vérifie le maintien tactile de la charge et sa libération, et capture `essaim-level30` avec le commandement en phase 2. Ces scénarios sont écrits pour l'orchestrateur sur l'hôte de test ; aucun navigateur ni Vitest lancé pendant cette passe. La passe 55 ajoute les scénarios visuels et la mesure de fluidité décrits ci-dessus.

## Dédale

Une luciole cherche des graines et quatre soleils dans trente labyrinthes
19×23. La progression et les clés de sauvegarde communes restent compatibles.
`loadState` accepte aussi les anciens états sans extension `journey` : ils
conservent les déplacements et collisions historiques. Aucun tirage aléatoire
n'intervient pendant un déplacement ; graines, niveau et entrées fixent la partie.

### Formes et mécaniques (passe 58)

Le PRNG reçoit `seed + 7919*level + placementSalts[level]` modulo 2³².
Les sels de génération ont été sélectionnés par les rejeux complets du solveur,
la séparation des parcours et la courbe de campagne ; ce ne sont pas des positions
préfabriquées. Cinq générateurs alternent : arbre à couloirs étroits, salles
connectées, cycle rectangulaire autour d'un centre fermé, spirale carrée et arbre
réfléchi sur son axe vertical. La spirale a un rayon de Chebyshev non croissant
vers son centre. Position, rotation et réflexion varient à graine.

Aucune galerie commune : un chemin principal est extrait de chaque forme et
porte les clés, portes, flèches, portails, interrupteurs, murs, glace et ombres.
Le départ et les objectifs suivent ce chemin. Quatre soleils et des graines
supplémentaires sur les interactions assurent leur visite ; les spirales sont
parcourues jusqu'à l'intérieur. Les follets commencent sur le sol de la forme,
à une position générée dans les spirales.
La signature de diversité contient les positions ordonnées du rejeu et les
positions typées des mécaniques observées, jamais le sol inutilisé ni l'étiquette
de forme. D-ROUTE compare les 435 paires de solutions : LCS divisée par la longueur
du parcours le plus court, seuil littéral de 30 %.

Les règles suivantes se cumulent, avec des marqueurs et une instruction dans le HUD :

- Niveau 4 : clé et porte de même couleur ; une clé est conservée après une vie perdue.
- Niveau 5 : flèche à sens unique, contraignant l'entrée et la sortie.
- Niveau 9 : portails appariés, téléportation à l'arrivée, sans rebond immédiat.
- Niveau 13 : chaque entrée sur l'interrupteur inverse le mur associé (ouvert/fermé).
- Niveau 16 : mur fermé pendant deux échéances de déplacement, ouvert pendant deux ;
  les tentatives bloquées font aussi avancer le cycle, soit 2/3 s par cycle.
- Niveau 19 : entrer sur la glace lance une glissade jusqu'au prochain obstacle,
  même au-delà des cases gelées ; chaque case intermédiaire évalue collectes et
  contacts avec les follets. Un décès interrompt immédiatement la glisse.
- Niveau 22 : dans les ombres, vision limitée à une distance Manhattan de trois cases.
  La scène utilise la fonction de visibilité du moteur pour masquer réellement le décor.
- Niveau 25 : le rôdeur change de point de patrouille toutes les deux secondes ;
  le timide fuit la lumière du héros à moins de six cases ou sous l'effet d'un soleil.
  Le traqueur poursuit ; le devin anticipe trois cases. Les impasses permettent
  aux follets un demi-tour si aucune autre sortie n'existe.
- Niveau 28 : seconde couleur, exigeant sa propre clé.

Respirations aux niveaux 6/11/17/22/27 : un traqueur, soleils de 12 s.
Défis à 5/10/15/20/25 : combinaison des règles acquises avec 25 s de temps réel
simulé ; le niveau 5 combine déjà portes et sens unique. Final au 30 : toutes
les mécaniques, deux couleurs, quatre rôles de follets et limite de 40 s.
Les autres niveaux ne sont pas chronométrés. Les follets circulent sur le sol ;
les contraintes des cases spéciales concernent la luciole.

### Déplacement et compatibilité

Six échéances de déplacement par seconde, avec simulation fixe à 60 Hz.
La direction demandée reste mémorisée : en cas de refus, la direction courante
continue si elle est autorisée. Un blocage ne consomme ni clé ni interrupteur.
Un portail est évalué après une glissade. Les murs cycliques bloquent l'entrée ;
un héros déjà sur la case peut en sortir pendant sa fermeture.

Graines : 10 points ; soleils : 50 points et vulnérabilité
`8000 - 7000*level/29` ms (12 s pendant les respirations). Trois vies,
1,8 s de grâce au départ et après une collision. Collectes, clés, interrupteurs,
phase cyclique et temps restant sont conservés après une vie perdue.
Les phases dispersion/poursuite, les échanges de cases et la chaîne de follets
200/400/800/1600 restent déterministes. Victoire après toutes les collectes ;
zéro vie ou temps épuisé entraîne la défaite. Les états terminaux sont gelés.

### Preuves et tests

`src/engines/dedale/solver.ts` effectue un BFS par objectif sur
(position, clés, interrupteur, phase cyclique, direction mémorisée).
Chaque arc appelle exactement `walk`, également utilisé par le moteur.
Le parcours complet est ensuite exécuté avec les follets, collisions et minuterie
ordinaires ; il s'agit d'une preuve par rejeu, pas d'un optimum global ni d'une
preuve sur toutes les graines possibles. Le validateur gagne les trente niveaux
sur les graines 28 et 459. Les trente enregistrements de la graine 28 sont dans
`tests/dedale-solutions.ts`. D-SOLVER appelle aussi réellement le BFS sur les niveaux 1/9/19/30 ; les
rejeux complets restent séparés de cet échantillon rapide.

`tests/dedale-mechanics.ts` partage les huit micro-grilles littérales D-MEC-01…08
avec le validateur Node. D-SOLVE rejoue trente victoires avec un délai maximal de
2 s. D-DIV-01 mesure les observations de ces parties sur le vrai générateur,
exige au moins sept mécaniques nouvelles (clé/porte, interrupteur/grille et
attente/passage du mur cyclique sont chacun regroupés), aucun intervalle de plus de cinq niveaux
sans découverte jusqu'au 25 et moins de 25 % de clones. Un contrôle négatif
remplace les trente niveaux par le premier et exige 100 % de clones et zéro
nouveauté. Les anciens tests de déplacement, score, cibles, collisions,
déterminisme et gel terminal restent en place ; les anciennes campagnes longues
et hypothèses de croissance monotone des boucles sont remplacées.

Le script vérifie aussi la connexité de 180 labyrinthes (30 niveaux × 6 graines),
rejette les six mutations demandées en mémoire et inscrit leurs fichiers/lignes
dans `dedale-validation.json`. Commande de régénération :

```sh
node scripts/test-dedale.js
node scripts/validate-dedale.js --record
nice -n 19 ionice -c3 node scripts/diversity-report.js
```

La spirale du niveau 4 occupe désormais 17 × 17 cases, avec un couloir continu du bord vers le centre, sans raccourci. Son rejeu est plus long ; le placement des salles du niveau 2 est réensemencé pour conserver D-ROUTE ≤30 %, sans modifier ce seuil ni les règles. Les preuves BFS sont régénérées. D-GEOMETRY vérifie l’étendue de la spirale et la symétrie verticale sur les **cellules de murs effectivement peintes** (`displayedWalls`, partagé avec la scène), pour toutes les cases de chaque miroir et trois graines. Un axe vertical discret rend la réflexion lisible. Aux niveaux 20 et 30, clés, portes, flèches (direction réfléchie), paires de portails et autres mécaniques sont aussi réfléchies sur les branches latérales disponibles. Une copie est omise si elle recouvrirait le parcours obligatoire ou une autre mécanique : elle ne doit pas ajouter de verrou ou d’inversion sur ce parcours. Les copies sont fonctionnelles, sans collectes supplémentaires imposées.

Le titre combine la forme et une tranche nommée (Éveil, Sentiers, Passages, Reflets, Ombres, Aurore). Clés, portes, portails, interrupteurs et glace utilisent des tracés Canvas occupant presque toute la case ; les flèches passent à 17 px, avec fonds colorés renforcés. Le HUD explique les couleurs et signes au niveau d’introduction ; sa largeur est bornée pour le mobile 390 × 844.

Clavier flèches/ZQSD/WASD, glisser et croix tactile de 56 px ; pause et
progression communes inchangées. Les captures E2E écrites `dedale-level04`,
`dedale-level12`, `dedale-level20` et `dedale-level30` attendent le serveur de test.
Aucun navigateur ni Vitest n'est lancé pendant cette passe.

### Les trente parcours enregistrés

Mécaniques effectivement observées au rejeu, graine 28 : C = clé/porte, U = sens unique, P = portail, I = interrupteur/grille, M = mur cyclique, G = glisse, O = obscurité, R = patrouille, F = fuite. « Base » = déplacement, graines et soleils. Une mécanique présente mais non déclenchée ne figure pas dans ce tableau.

| Niveau | Forme | Mécaniques jouées | Coups |
| ---: | --- | --- | ---: |
| 1 | Couloirs | Base | 25 |
| 2 | Salles | Base | 25 |
| 3 | Anneau | Base | 33 |
| 4 | Spirale | C | 144 |
| 5 | Miroir | C, U | 41 |
| 6 | Couloirs | C, U | 45 |
| 7 | Salles | C, U | 49 |
| 8 | Anneau | C, U | 47 |
| 9 | Spirale | C, U, P | 40 |
| 10 | Miroir | C, U, P | 44 |
| 11 | Couloirs | C, U, P | 64 |
| 12 | Salles | C, U, P | 67 |
| 13 | Anneau | C, U, P, I | 49 |
| 14 | Spirale | C, U, P, I | 59 |
| 15 | Miroir | C, U, P, I | 53 |
| 16 | Couloirs | C, U, P, I, M | 80 |
| 17 | Salles | C, U, P, I, M | 75 |
| 18 | Anneau | C, U, P, I, M | 62 |
| 19 | Spirale | C, U, P, I, M, G | 80 |
| 20 | Miroir | C, U, P, I, M | 57 |
| 21 | Couloirs | C, U, P, I, M, G | 85 |
| 22 | Salles | C, U, P, I, M, O | 93 |
| 23 | Anneau | C, U, P, I, M, O | 62 |
| 24 | Spirale | C, U, P, I, M, G, O | 107 |
| 25 | Miroir | C, U, P, I, M, G, O, R, F | 51 |
| 26 | Couloirs | C, U, P, I, M, G, O, R, F | 72 |
| 27 | Salles | C, U, P, I, M, G, O | 98 |
| 28 | Anneau | C, U, P, I, M, G, O, R, F | 106 |
| 29 | Spirale | C, U, P, I, M, G, O, R, F | 80 |
| 30 | Miroir | C, U, P, I, M, G, O, R, F | 104 |

D-ROUTE : maximum 30 % (niveaux 4/29). D-CURVE : moyennes par cinq niveaux
53,6 / 45 / 58,4 / 70,8 / 79,6 / 92 coups ; rapport final/initial 1,716.
La croissance strictement exigée porte toujours sur les tranches 6–30.
Les tests Node partagés vérifient aussi les durées exactes des défis et leur
absence ailleurs, la conservation des deux couleurs et de l'interrupteur après
un décès réel, l'obscurité horizontale et verticale, les témoins du final recalculés,
le solveur réel et la géométrie des anneaux, spirales et miroirs.

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

Huit directions au sol, quatre en vol ; contrôles clavier et tactiles inchangés.
L'impulsion simple est illimitée (280 px/s, cadence 240 ms). Les anciens
éventail et rafale restent lisibles dans les états sauvegardés. Les caisses
accordent une réserve affichée dans le HUD : lance-flammes 180 charges,
cadence 50 ms et portée maximale 73 px ; ricochet 36 coups, six réflexions
sur sol/murs ; grenades 12 coups, impulsion (±170, −260), gravité 900,
explosion de rayon 64 px et deux dégâts. Les grenades retournent les blindés
pendant 2200 ms. Le bouclier, découvert au 26, absorbe un impact.
Trois vies ; grâce de 1800 ms après réapparition au dernier point sûr.
Chuter consomme une vie même pendant la grâce. Les clés de progression et
le format du service de sauvegarde restent inchangés ; les anciens états
reçoivent des valeurs par défaut pour les nouveaux champs.

Six comportements : rampant qui patrouille et évite les bords ; tireur qui
marche 600 ms, s'immobilise, verrouille sa visée puis tire à 1200 ms ;
kamikaze qui engage une charge droite de 950 ms puis récupère avant de
réorienter à 1300 ms ; volant en sinusoïde (amplitude 22 px), bombes soumises
à la gravité ; blindé protégé de face, vulnérable de dos ou retourné ;
tourelle fixe, rotation limitée à 0,012 rad/pas et salve de trois tirs à 2000 ms.
Les ennemis s'activent à 360 px ; aucune IA n'utilise de hasard en cours de jeu.

### Générateur des trente niveaux — passe 51

`levels.ts` décrit explicitement thèmes, structures, rencontres, armes et
motifs des gardiens. Le générateur garantit chaque type annoncé, y compris
sur les niveaux peu peuplés. Les blocs gardent leur enveloppe physique et
leurs emplacements sûrs ; des sols en marches et plateformes hautes rendent
les montées/descentes jouables. Le wagonnet avance à 210 px/s (±30 avec le
joystick), avec le même saut ; la caméra suit son déplacement. Trois cages
s'ouvrent après trois tirs ou une explosion et accordent chacune 300 points.
Les sauvetages sont optionnels pour la sortie, et leur compte figure au HUD.

Gardiens aux niveaux 5/10/15/20/25 : éventail, onde au sol, pluie de bombes,
balayage séquentiel, tirs convergents des deux côtés. Chaque cycle attaque à 600 ms, avant toute ouverture. Le cœur reste protégé pendant 1200 ms, s'ouvre pendant
1200 ms après l'attaque puis recommence. À 330 px ou plus, l'horloge et
le déclenchement des attaques restent figés ; revenir ne rejoue pas une attaque.
Le HUD et le cœur exposé signalent cette faiblesse. Le réacteur final au 30 alterne éventail, ondes au sol puis bombes
aux seuils des deux tiers et du tiers de vie. Les trois phases changent donc
la géométrie de l'attaque. Les respirations 6/11/16/21/26 offrent respectivement
montée, ricochet, volant, grenade et bouclier, avec un seul ennemi garanti.

Quatre décors dessinés par code : cheminées d'usine, dunes, arbres et tours
éclairées de base nocturne ; deux couches en parallaxe, sans asset externe.
Couleurs et noms sont exclus du calcul des nouveautés.

| N° | Thème | Structure | Découverte / rythme | Ennemis |
| ---: | --- | --- | --- | --- |
| 1 | Usine | Corridor | Patrouilles | rampant |
| 2 | Usine | Corridor | Tireur : visée verrouillée | tireur, rampant |
| 3 | Usine | Corridor | Combinaison | tireur, rampant |
| 4 | Usine | Corridor | Lance-flammes | tireur, rampant |
| 5 | Usine | Arène | Gardien : éventail | tireur, rampant |
| 6 | Désert | Montée | Respiration · Montée à étages | rampant |
| 7 | Désert | Descente | Descente à étages | tireur, rampant |
| 8 | Désert | Corridor | Kamikaze | kamikaze, tireur |
| 9 | Désert | Montée | Combinaison | kamikaze, tireur |
| 10 | Désert | Arène | Gardien : onde au sol | kamikaze, tireur |
| 11 | Jungle | Corridor | Respiration · Tir rebondissant | rampant |
| 12 | Jungle | Wagonnet | Wagonnet | kamikaze, tireur |
| 13 | Jungle | Montée | Combinaison | kamikaze, tireur |
| 14 | Jungle | Corridor | Tourelle à rotation lente | tourelle, kamikaze |
| 15 | Jungle | Arène | Gardien : pluie de bombes | tourelle, kamikaze |
| 16 | Base de nuit | Corridor | Respiration · Volant bombardier | volant |
| 17 | Base de nuit | Wagonnet | Combinaison | volant, tireur |
| 18 | Base de nuit | Otages | Otages | volant, tireur |
| 19 | Base de nuit | Montée | Combinaison | volant, tireur |
| 20 | Base de nuit | Arène | Gardien : balayage | tourelle, kamikaze |
| 21 | Usine | Corridor | Respiration · Grenades | rampant |
| 22 | Usine | Otages | Combinaison | volant, tireur |
| 23 | Usine | Wagonnet | Combinaison | tourelle, kamikaze |
| 24 | Usine | Corridor | Blindé : dos ou retournement | blindé, volant, kamikaze |
| 25 | Usine | Arène | Gardien : tirs croisés | blindé, volant, kamikaze |
| 26 | Désert | Otages | Respiration · Bouclier de sauvetage | blindé |
| 27 | Jungle | Montée | Combinaison | blindé, volant, kamikaze |
| 28 | Base de nuit | Wagonnet | Combinaison | blindé, volant, kamikaze |
| 29 | Usine | Otages | Combinaison | blindé, volant, kamikaze |
| 30 | Base de nuit | Arène | Réacteur : trois phases | blindé, volant, kamikaze |

`nice -n 19 ionice -c3 node scripts/validate-ferraille.js` exécute les scénarios
F-ENEMY-01…06, F-WEAPON-01…04, F-BOSS-01…06, F-STRUCT/02, F-SAVE,
F-TERRAIN, F-RENDER-01, F-DIV-01 et le pilote normal des trente niveaux
sur les graines 460 (défaut) et 28. Le plafond du pilote est
18000 pas par niveau, sans injection d'état, de vies ou de victoire. Les
résultats par graine et treize mutations réellement rejetées, avec lignes, sont dans
`docs/ferraille-validation.json`. Les signatures proviennent du générateur
et des snapshots via le même adaptateur que le rapport de diversité.

### Correction de relecture — passe 52

Le pilote attend que les blindés retournés entrent dans sa ligne de tir au
lieu de sauter puis d'atterrir dessus. Il continue sa course devant une cage
si un kamikaze le poursuit et rétablit sa visée après une esquive de bombe.
Les niveaux 24 et 29 passent sur la graine 460 sans retoucher leur génération.
Les trente victoires restent exigées séparément sur 460 et 28.

| Niveau | Nom dans le HUD | Silhouette | Palette |
| ---: | --- | --- | --- |
| 5 | ÉVENTREUR | Éventail à cinq lames | Ambre / cuivre |
| 10 | PILON | Marteau à deux pieds | Sable / bronze |
| 15 | SCARABOMBE | Scarabée ailé | Vert / forêt |
| 20 | FAUCHEUSE | Faux sur trépied | Lavande / prune |
| 25 | TENAILLE | Canons opposés | Rose / bordeaux |
| 30 | RÉACTEUR | Tour, coque scindée, coque rompue | Cyan, rose, jaune selon phase |

`appearance.ts` décrit les primitives effectivement dessinées, les couleurs,
le cœur et la santé. Chaque boss a une barre de vie. Le cœur vert exposé
clignote ; `prefers-reduced-motion: reduce` garde sa couleur et son ouverture,
sans clignotement ni éclair de bordure. Les six noms, formes, palettes et
ensembles de primitives sont distincts deux à deux (F-RENDER-01).

Les lacunes de relecture sont verrouillées par F-BOSS-04 (éloignement après
franchissement des seuils puis retour), F-BOSS-05 (grenades et faiblesse),
F-BOSS-06 (bombes du 15), F-TERRAIN (hauteurs du sol et direction),
F-STRUCT-02 (explosion et cages) et F-WEAPON-04 (64 px inclus, 64,01 exclus).
Les E2E F-SCENE-01 vérifient les quatre palettes, le déplacement des deux
couches réellement dessinées pour 100 px de caméra et le texte « GRENADES · 7 »
avec un score différent. F-SCENE-02/03 vérifient noms, cœur, vie, phases,
mouvement réduit et descriptions uniques, avec captures des six boss et des
phases du réacteur.

Aucun navigateur, CDP ou Playwright n'est exécuté sur cette machine.
Les scripts `capture-ferraille.js` et `capture-bubble.js` sont supprimés ;
l'orchestrateur exécute `tests/e2e/` et produit les captures sur l'hôte de test.

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
`scenario('finish'|'danger'|'showcase')`, uniquement avec `?test=1`. Il charge un état
presque terminé, un trou devant le robot, ou un cadrage sur la découverte du niveau ; aucune victoire/défaite forcée.

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
`advance`, `hudText`, `usefulArea` et `scenario('finish'|'danger'|'showcase')`.
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
vue de dessus avec caméra suivant le joueur, fixe avec le nord en haut par défaut ; caméra tournante disponible dans ☰.
Le moteur ne connaît que des coordonnées du monde, des unités et des secondes.
La projection, le cadrage, les traces et les étincelles vivent dans la scène ;
un autre rendu peut consommer le même snapshot sérialisable. Aucune
nouvelle dépendance ni fichier binaire ; seule la persistance partagée ajoute la migration des records Dérapage.

### Règles et commandes

Six karts, trois tours. Accélération automatique 12 unités/s², frottement
longitudinal 0,12/s, vitesse normale plafonnée à 24. Braquage proportionnel
2,4 rad/s, modulé par la vitesse jusqu’à 10 unités/s ; adhérence latérale
exponentielle 10/s. Les cercles de rayon 1,2 se séparent et échangent une
impulsion de coefficient 0,85. Au choc de rail, retour à 1,2 unité à l’intérieur de la piste, cap tangent orienté vers l’intérieur (normale ×0,3), vitesse résiduelle ≥8 et ≤20 (70 % de la vitesse précédente).
L’herbe au-delà de la demi-largeur plafonne la norme de la vitesse à
45 % au niveau 1 et 42,1 % au niveau 30 de la cible sur piste, même avec
un boost (toujours ≤ 50 %). Le plafond s’applique dès le premier pas :
la perte est donc supérieure à 30 % en une seconde à partir de 24 ; les murs
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

Clavier : les quatre flèches dirigent en absolu, diagonales incluses ; Espace
ou Maj pour déraper, X ou Ctrl pour le bonus. Au doigt, poser le pouce
n’importe où sur la zone de jeu : ce contact fixe le centre du joystick.
Le déplacement du pouce donne le cap absolu (axes écran = axes monde),
zone morte circulaire de 10 px CSS incluse. Relâcher conserve le cap courant.
La convergence utilise l’erreur angulaire ×5, bornée à 3,2 rad/s, sans
rotation instantanée ni dépendance à la vitesse de départ. Anneau au contact,
point au pouce et flèche du cap demandé autour du kart rendent le geste visible.
Le kart est centré à y=368 en caméra fixe (y=466 en caméra tournante).
Dans ☰, « Caméra : fixe / tournante » conserve l’ancien braquage relatif
(zone morte 6 px, saturation à 60 px) et sa caméra tournante. Les choix caméra
et aide sont mémorisés sous `arcade-lab:derapage:controls:v1`, sans modifier
la sauvegarde de progression. La caméra fixe est le défaut, aussi au clavier.
L’aide activée par défaut n’agit que hors piste ou si la projection du cap
à vitesse courante sur 0,6 s menace un rail : correction vers le centre 12
unités devant, au plus 25 % de l’écart et 0,3 rad. Elle est désactivable dans ☰
et n’agit pas si aucun cap n’est demandé. Les entrées `mode`, `heading`, `assist`
sont conservées dans les rejeux ; le moteur reste en coordonnées monde.
Les boutons Dérapage 88×88 et Bonus 56×56 restent hors du canevas, dans une
bande de 152 px. Souris et Inclinaison restent des options du braquage relatif ;
le refus ou l’absence du capteur reste silencieux. Pause, Prêt, menus,
progression, sauvegarde, écran allumé et vibrations life/won/lost passent
par les services communs. Sons synthétisés engine/drift/boost/impact/grass, traces de terre sur herbe.
La scène utilise des Graphics pour le circuit et les karts, un HUD HTML
et une mini-carte dans la bande réservée y=0…96 ; la zone utile est
(0,96,360,544), le kart vers y=368 par défaut. Aucun contrôle ni HUD dans l’aire
devant le kart. La vignette Canvas utilise une vraie démo au niveau 3,
avec politique de suivi et pas de 1/15 s : elle évolue en moins de 600 ms.

### Tracés de données et difficulté

Les trente listes de points de contrôle de `circuits.ts` sont dessinées
séparément en coordonnées du monde. Chaque triplet contient x, y et la
largeur du tronçon (référence 20, ajustée par la largeur du niveau).
Une spline cubique fermée mélange une B-spline uniforme et Catmull-Rom :
B + (C−B) × 2,75 × (bend−0,015). La tension croît de 0 à 0,119625,
accentuant progressivement les enchaînements à points de contrôle constants.
La spline est évaluée à 40 points par tronçon, puis rééchantillonnée à
96 positions équidistantes. Les graines
ne changent que le décor. Le contrôle géométrique vérifie les intersections
de la ligne centrale et des deux polylignes de bord, entre elles et avec
elles-mêmes ; aucun pont ni croisement n’est permis.

Sept coupes de quatre ont chacune un thème sol/bordure/décor ; les deux
entraînements complètent les trente niveaux. Les familles sont urbain lent,
rapide à longues lignes droites, technique à enchaînements, ovale et nature.
Les inspirations restent génériques : circuit urbain en bord de mer avec
port, tunnel sombre, épingle et chicane ; avenues, esplanade et pavés ;
parcours forestier vallonné avec gauche-droite, ligne droite et épingle.
Le tunnel et le port restent purement visuels ; le tunnel est sombre.
Les profils d’altitude sont interpolés dans le moteur. En forêt, ils modulent
uniquement la teinte du sol, sans effet physique ; le décor dense conserve
sa marge Z21. Les blocs urbains sont décoratifs. Les rails continus bordent
le trottoir : contact du centre à demi-largeur + 1,8 (rayon 1,2), correction
à l’intérieur de la piste et réorientation tangentielle avec une vitesse minimale de 8. Aucune herbe en ville.

Le slalom possède six paires de piquets alternant rouge et bleu, décalées
alternativement de ±1,5 unité, ouverture 6,2 (diamètre du kart 2,4).
Le franchissement avant du tronçon, hors de l’ouverture, ajoute exactement
2000 ms au temps du kart, joueur et IA ; un même passage n’est compté
qu’une fois par tour. Le snapshot expose `missedGates`, `penaltyMs`,
`noticeMs` et les passages. Pendant 2000 ms le HUD affiche
« Porte manquée +2,0 s ». Les temps de course, de tour et d’arrivée incluent
ces pénalités. La ligne IA traverse les portes ; son erreur stable par kart
est proportionnelle au dosage de difficulté, plus forte au niveau facile.
La neige multiplie l’adhérence latérale par 0,6, y compris en glisse ; hors
piste la neige profonde plafonne la vitesse à 28 % de la cible.
La pente accélère selon 9,8 × différence d’altitude / longueur du tronçon,
et relève le plafond de 3 en descente, uniquement en slalom et BMX.
Sol blanc bleuté, sapins superposés enneigés et piquets sont dessinés par code.

Le BMX utilise de la terre battue et des bottes de paille hors piste.
Les berms désignés multiplient l’adhérence par 1,4 et permettent de conserver
une cible plus haute de 3 × (coefficient−1). Leur bord extérieur est clair.
À l’entrée d’une bosse, vitesse ≥16 : envol de 220 + vitesse × 6 ms ;
sous ce seuil la vitesse est multipliée par 0,75. En vol, ni braquage ni
ralentissement hors piste ; hauteur sinusoïdale de 0 à 3 exposée dans le
snapshot, ombre au sol et kart agrandi/surélevé au rendu. Le contrôleur
prépare la direction d’atterrissage avant la bosse. La rampe initiale descend.
Toutes les mécaniques restent dans le moteur en coordonnées du monde ;
la scène dessine le snapshot.

Les portes sont aux sommets 0,8,…88. Bandes et arbres sont des éléments
sérialisables du circuit, en coordonnées du monde, utilisables par une future
vue pseudo-3D. Dès le niveau 3, `1+floor((n−2)/4)` bandes de rayon 2,5
sont réparties parmi les sommets dont le changement de direction est ≤0,09 rad
(au-delà, virage considéré serré). Leur position dépend du tracé à graine fixe.
À l’entrée, la vitesse passe à 32 pendant 900 ms, puis revient à la cible
normale ; rester sur une bande ne recharge pas le boost. Les IA peuvent
les emprunter. Flèche claire, couleur menthe, flamme et son signalent le boost.

Les obstacles ont un rayon de 1,5 à 2,5, une densité variable (un candidat par
sommet en nature, sinon tous les `2+n%3` sommets), un côté et un décalage issus de la même graine.
La distance au centre de piste doit dépasser demi-largeur + deux rayons :
il reste au moins un rayon libre entre bordure et tronc. La trajectoire idéale
reste libre. Le kart de rayon 1,2 balaie son segment contre chaque cercle,
s’arrête au premier contact, est repoussé à l’extérieur et rebondit (réflexion
1,6, vitesse multipliée par 0,55). Il ne traverse donc pas le tronc à 24 ou 32.
Troncs et feuillages sont dessinés par code.

| Paramètre | Formule | Niveau 1 → 30 |
| --- | --- | --- |
| Largeur de base | 20−0,27n | 20 → 12,17 |
| Vitesse cible IA | 15+0,23n | 15 → 21,67 |
| Bruit de braquage | 0,18−0,005n | 0,18 → 0,035 |
| Retard de freinage | 0,45−0,012n | 0,45 → 0,102 s |
| Paramètre de tension des enchaînements | 0,015+0,0015n | 0,015 → 0,0585 |
| Fraction de murs | 0,12+0,02n | 0,12 → 0,70 |
| Facteur de vitesse sur herbe | 0,45−0,001n | 0,45 → 0,421 |

### Validation Node des trente circuits

Commande : `node scripts/validate-derapage.js`.
Le script valide fermeture, largeur minimale 12, portes et intersections
de toutes les arêtes non adjacentes. Il simule ensuite trois tours de chaque
circuit, au pas 1/60 s, avec la physique et les portes ordinaires, sans
repositionnement ; abandon après 300 s. Deux courses complètes aux niveaux
extrêmes vérifient aussi collisions et objets avec les cinq adversaires.
Temps par tour = temps des trois tours / 3, départ arrêté inclus ;
« virages » = nombre de groupes de courbure signée de la signature Z26.
L’écart IA est la distance moyenne à la ligne de course, en unités du monde.
Herbe IA compte les pas hors piste en pourcentage du temps total (≤5 %
sur les trente niveaux dans le script Node). Les collisions d’arbres comptent celles du pilote.
Les temps ne sont pas forcés à être monotones entre tracés différents ;
la vitesse et la précision des paramètres IA le sont. Mesures graine 28 :

| Niveau | Nom | Famille | Longueur | Largeur min. | Virages | Signature voisine | Tour pilote (s) | Tour IA (s) | Écart IA | Herbe IA (%) | Bandes | Décor | Chocs pilote |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | La Flèche des prés | rapide | 474.9 | 28.00 | 2 | 0.3542 | 20.26 | 31.46 | 0.725 | 0.00 | 0 | 48 | 0 |
| 2 | Autour des Invalides | urbain | 440.9 | 19.73 | 6 | 0.5625 | 18.54 | 27.83 | 2.249 | 0.00 | 0 | 32 | 0 |
| 3 | Les Docks clairs | urbain | 564.4 | 19.46 | 6 | 0.5417 | 23.33 | 34.31 | 2.020 | 0.00 | 1 | 23 | 0 |
| 4 | La Cour des arches | urbain | 457.8 | 19.19 | 6 | 0.4167 | 18.94 | 27.24 | 2.155 | 0.00 | 1 | 48 | 0 |
| 5 | Le Rocher | urbain | 464.8 | 18.92 | 6 | 0.5417 | 19.08 | 27.93 | 2.216 | 0.00 | 1 | 31 | 0 |
| 6 | Le Grand détour | rapide | 495.6 | 18.65 | 3 | 0.3542 | 20.82 | 29.98 | 0.685 | 0.00 | 1 | 24 | 0 |
| 7 | Les Deux horizons | rapide | 481.6 | 18.38 | 3 | 0.5208 | 19.93 | 28.14 | 0.684 | 0.00 | 2 | 48 | 0 |
| 8 | Le Vent des plaines | rapide | 492.3 | 18.11 | 3 | 0.3125 | 20.36 | 28.07 | 0.669 | 0.00 | 2 | 32 | 0 |
| 9 | Les Trois replis | technique | 492.5 | 17.84 | 6 | 0.4375 | 20.49 | 28.29 | 0.892 | 0.00 | 2 | 24 | 0 |
| 10 | La Clef des champs | technique | 483.9 | 17.57 | 6 | 0.5208 | 20.08 | 28.21 | 0.809 | 0.00 | 2 | 48 | 0 |
| 11 | Le Ruban plié | technique | 490.6 | 17.30 | 6 | 0.4167 | 20.07 | 26.76 | 0.733 | 0.00 | 3 | 32 | 0 |
| 12 | Les Coudes de cuivre | technique | 478.4 | 17.03 | 6 | 0.4583 | 19.54 | 26.19 | 0.759 | 0.00 | 3 | 24 | 0 |
| 13 | La Grande ellipse | ovale | 473.2 | 16.76 | 2 | 0.3958 | 19.27 | 24.72 | 0.456 | 0.00 | 3 | 48 | 0 |
| 14 | Le Bol incliné | ovale | 466.4 | 16.49 | 2 | 0.3958 | 18.98 | 24.13 | 0.445 | 0.00 | 3 | 32 | 0 |
| 15 | L’Anneau des vents | ovale | 475.5 | 16.22 | 2 | 0.4167 | 19.06 | 24.13 | 0.411 | 0.00 | 4 | 24 | 0 |
| 16 | Le Triangle arrondi | ovale | 451.7 | 15.95 | 3 | 0.3542 | 18.07 | 23.17 | 0.429 | 0.00 | 4 | 48 | 0 |
| 17 | La Côte des Ardennes | nature | 563.2 | 15.68 | 6 | 0.4583 | 22.84 | 28.71 | 0.457 | 0.00 | 4 | 95 | 0 |
| 18 | Le Lac des fougères | nature | 477.8 | 15.41 | 5 | 0.3125 | 19.20 | 24.28 | 0.430 | 0.00 | 4 | 95 | 0 |
| 19 | La Clairière brisée | nature | 502.8 | 15.14 | 4 | 0.5208 | 19.96 | 23.75 | 0.417 | 0.00 | 5 | 96 | 0 |
| 20 | Les Roches rousses | nature | 503.5 | 14.87 | 7 | 0.4792 | 19.97 | 24.71 | 0.452 | 0.00 | 5 | 96 | 0 |
| 21 | Les Pavés du levant | urbain | 490.2 | 14.60 | 8 | 0.4375 | 18.89 | 24.98 | 1.598 | 0.00 | 5 | 24 | 0 |
| 22 | La Terrasse des quais | urbain | 503.6 | 14.33 | 5 | 0.4167 | 19.54 | 24.45 | 1.432 | 0.00 | 5 | 47 | 0 |
| 23 | Le Passage des halles | technique | 505.4 | 14.06 | 6 | 0.4167 | 19.46 | 22.82 | 1.227 | 0.00 | 6 | 31 | 0 |
| 24 | Les Balcons de pierre | urbain | 504.5 | 13.79 | 5 | 0.3542 | 19.31 | 24.18 | 1.239 | 0.00 | 6 | 24 | 0 |
| 25 | La Combe des échos | technique | 519.0 | 13.52 | 8 | 0.4375 | 20.47 | 25.82 | 0.412 | 0.00 | 6 | 48 | 0 |
| 26 | Le Serpent des joncs | nature | 504.6 | 13.25 | 7 | 0.4167 | 19.70 | 23.63 | 0.284 | 0.00 | 6 | 96 | 0 |
| 27 | La Boucle des falaises | rapide | 519.6 | 12.98 | 5 | 0.5208 | 20.04 | 24.86 | 0.313 | 0.00 | 7 | 24 | 0 |
| 28 | Les Sept lacets | technique | 510.4 | 12.71 | 8 | 0.4792 | 19.82 | 25.07 | 0.384 | 0.00 | 7 | 46 | 0 |
| 29 | La Descente en ruban | slalom | 671.5 | 12.44 | 5 | 1.1667 | 25.20 | 30.32 | 0.513 | 0.00 | 7 | 32 | 0 |
| 30 | Le Petit guidon | bmx | 423.8 | 12.17 | 6 | 0.4583 | 16.13 | 20.29 | 0.454 | 0.00 | 7 | 24 | 0 |

### Diversité Z26 et arrivée Z27

On rééchantillonne la ligne centrale en N=96 points équidistants. Pour chaque
point, θᵢ est l’angle signé entre les deux segments adjacents, obtenu par
atan2(produit vectoriel, produit scalaire). Avec Δs=L/N, la courbure
adimensionnelle est κᵢL=(θᵢ/Δs)L=Nθᵢ. L’histogramme H est normalisé
par N, avec 32 classes de largeur 2 sur [-32,32], plus deux classes de
saturation. La signature ne dépend ni de l’échelle ni de la rotation.
Les groupes contigus de même signe avec |Nθᵢ|>4 définissent les virages ;
leurs angles intégrés sont triés, et leur nombre et leurs angles sont exposés.
La distance utilisée est D(H,G)=Σ|Hⱼ−Gⱼ|, sur les 435 paires.

Minimum mesuré : **0,312500**, seuil littéral **0,15** : marge de 0,162500,
soit environ 52 % du minimum, pour éviter un seuil ajusté au dernier
échantillon. La comparaison n’utilise ni nom, ni niveau, ni thème.
Z26 vérifie aussi chaque tracé tourné de 90° et agrandi ×1,3 (distance
<1e-6). Remplacer toutes les géométries par la première, ou seulement la
deuxième par cette transformation de la première, ramène la distance
sous le seuil 0,15 et doit faire échouer Z26.

`finishLine` expose deux extrémités, calculées à la porte 0 par la normale
à la tangente centrée, à ±largeur/2. Le comptage teste le franchissement
orienté de ce segment fini, par interpolation du déplacement du kart.
La scène dessine deux rangées de damier noir/blanc sur ce même segment,
sur toute sa largeur, une grille de six places derrière et un portique en ville. La mini-carte
montre aussi l’arrivée. Le HUD affiche Tour 2/3, Dernier tour ! et le
drapeau à damier à l’arrivée. Z27 compare les extrémités à la porte 0,
leur milieu au point 0, et leur distance à la largeur locale, avec
tolérance littérale 1e-6 ; décaler la porte d’un point est détecté.


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
| Z17 | Circuit construit : plafond herbe ≤0,50 du plafond piste |
| Z18 | À 24 sur herbe, perte ≥30 % après 60 pas de 1/60 s |
| Z19 | Bande à 32 pendant 900 ms, retour à 24 |
| Z20 | Bandes dès le niveau 3, nombre non décroissant, virage ≤0,09 rad |
| Z21 | Trois graines : arbres reproductibles, marge et ligne idéale libre |
| Z22 | Collision balayée à 24/32, rebond, perte et absence de traversée |
| Z23 | Fonction pure : zone morte 6 px, saturation 60 px, rejeu continu |
| Z24 | IA ≤5 % hors piste sur les 30 circuits ; Z13 conservé |
| Z25 | E2E mobile : glisser signé, relâcher, dérapage maintenu, tailles 88/56 et captures |
| Z26 | 435 paires, distance >0,15 et invariance rotation/échelle <1e-6 |
| Z27 | Segment de la porte 0, largeur et centre indépendants à 1e-6 |

Le crochet `__ARCADE_TEST__.games.derapage` expose read/loadLevel/advance,
hudText/usefulArea/bounds et trois états de course ordinaires : finish
(dernière porte, kart mal orienté qui doit réellement braquer), danger
(même situation, cinq adversaires déjà arrivés), trees-boost (entrée réelle
sur une bande du niveau 15, avec arbres et boost visibles). Aucun seuil ni règle
n’est modifié. Les E2E utilisent un maintien réel au clavier ou multitouch,
advance pour la simulation, puis vérifient les panneaux Niveau suivant et
Rejouer le niveau, le déblocage après reload et les captures
derapage-play/level30/won/lost sur chaque projet, et
`derapage-mobile-controls` / `derapage-trees-boost` sur mobile. Ils vérifient aussi
la séparation HUD/aire devant le kart et contrôles/canevas. M01–M04,
A11 et les douze vignettes communes incluent Dérapage.

Le crochet dédié `__DERAPAGE_TEST__.overview(true)` fige la simulation et
cadre le circuit entier, arrivée visible. Les captures desktop et mobile
prévues sont `derapage-circuit-01`, `-08`, `-15`, `-22`, `-30`,
`derapage-le-rocher`, `derapage-invalides`, `derapage-ardennes`,
`derapage-slalom`, `derapage-bmx`, suffixées par projet.

Vitest et Playwright ne sont pas exécutés sur cette machine. L’orchestrateur
doit exécuter ces suites, inspecter les captures aux trois tailles mobiles,
vérifier les capteurs optionnels et mesurer la fluidité sur téléphone.


### Chronos et records Dérapage — Z28/Z29

`snapshot().timing` expose `raceMs`, `currentLapMs`, `lapTimesMs`,
`bestLapMs` et `lastLapDeltaMs`. La course commence au pas zéro ; le premier
chrono de tour inclut le départ sur la grille. Chaque tour terminé vaut
exactement le nombre de pas depuis le départ ou le franchissement précédent
multiplié par `1000 / 60`. Le meilleur est le minimum des tours terminés ;
il vaut `null` avant le premier. Aucun temps mural n’intervient. Le temps
se fige à l’arrivée et se réinitialise au chargement/rejeu du niveau.
`advance(ms)` suit le même accumulateur de pas fixes que le moteur.

Le HUD réservé aux 96 premiers pixels affiche course, tour courant et meilleur
au format `mm:ss.cc`. À chaque franchissement, l’écart au meilleur précédent
est vert si strictement négatif, rouge sinon (premier passage : écart « — »).
L’annonce persiste jusqu’au passage suivant. Le résultat affiche temps total,
meilleur tour, record historique du circuit et classement des six karts.

Le champ optionnel `circuitRecords` de la sauvegarde existante
`arcade-lab:derapage:v1` associe le nom stable du circuit à son meilleur
tour en millisecondes. Seule une amélioration stricte écrit le record, dès le
franchissement, avec « Nouveau record ! ». Les clés numériques historiques sont lues selon l’ordre publié en 0.3.1 (0 = Le Rocher, 4 = La Flèche des prés), puis réécrites en noms ; en cas de doublon, le meilleur temps est conservé. Les anciennes sauvegardes sont
compatibles ; lectures, sérialisation et écritures sont protégées par try/catch.

Z28 rejoue les mêmes entrées horodatées avec des pas regroupés différemment,
compare exactement les chronos et construit des tours de 120, 180 et 90 pas
pour vérifier la durée et le minimum. Z29 vérifie égalité/dégradation sans
écriture, isolation des circuits, relecture, migration implicite et exceptions
lecture/écriture. L’E2E mobile utilise un état avant la dernière porte d’un tour,
des gestes tactiles réels puis `advance`, contrôle le HUD hors piste, l’écart,
l’annonce et le record après rechargement. Vitest et Playwright ne sont pas
exécutés dans cette passe.

Mutations à essayer : fausser le minimum du meilleur tour ; remplacer les pas
par une horloge murale ; écraser le record par un tour égal ou plus lent.


### Passe B : oracle Z30–Z35

Les scénarios de `tests/derapage-cases.ts` sont enregistrés comme tests dans
`tests/derapage.test.ts` et exécutés aussi par le validateur Node, sans Vitest.

| ID | Preuve et seuils littéraux |
| --- | --- |
| Z30 | Joueur et IA : passage central sans pénalité, passage décalé de 5 avec exactement 2000 ms et un manqué, sans double comptage ; un tour IA à vitesse 18 donne 6 manqués au dosage facile et 0 au dosage élevé ; ouverture ≥6 et ligne IA à <0,1 du centre |
| Z31 | Même vitesse et braquage : rapport de dérive neige/asphalte entre 1,45 et 1,55 ; en glisse entre 1,04 et 1,08 |
| Z32 | Après 180 pas, gain de vitesse en pente >2 ; plafond 50 pour mesurer la gravité indépendamment du relèvement du plafond |
| Z33 | Après 60 pas de virage identique, gain en berm >0,1 |
| Z34 | Hauteur positive, vol entre 20 et 35 pas à vitesse 22 ; position et angle identiques avec/sans braquage ; pas de saut à 10 et ralentissement sous 9 ; durée >380 ms à 30 |
| Z35 | Cinq tracés urbains : composante normale inversée, vitesse <22 et confinement sous demi-largeur +1,81 pendant 120 pas |

Captures desktop/mobile : les vues `derapage-slalom`, `derapage-bmx`,
`derapage-le-rocher` et `derapage-invalides` utilisent le nouveau rendu.
Deux captures supplémentaires en vue de jeu, `derapage-slalom-porte` et
`derapage-bmx-saut`, utilisent les scénarios de placement puis `advance(100)`
et `advance(150)` ; aucune hauteur ni pénalité n’est injectée.
Les images doivent être générées et inspectées par l’orchestrateur :
Playwright et Vitest ne sont pas exécutés pendant cette passe.


Mutations vérifiées par exécution des scénarios Node : les six sont détectées.
Toutes les lignes ci-dessous sont dans `src/engines/derapage/physics.ts`.

| Oracle | Ligne | Modification |
| --- | --- | --- |
| Z30 | 124 | Pénalité `+ 2000` → `+ 0` |
| Z31 | 78 | Coefficient neige `.6` → `1` |
| Z32 | 67 | Gravité `9.8` → `0` |
| Z33 | 75 | Coefficient berm `1.4` → `1` |
| Z34 | 58 | Seuil `16` → `Infinity` |
| Z35 | 138 | Condition de collision du rail forcée à `false` |

Validation de la passe : lint, typecheck, build et validateur Node réussis.
Z12/Z13/Z24/Z26 passent sur les trente tracés ; hors piste IA mesuré à
0,00 % partout, signatures distantes d’au moins 0,3125. Les courses
complètes aux deux niveaux extrêmes terminent sur le podium. Les snapshots
slalom/BMX restent identiques après chacun des 600 pas rejoués en demi-pas.
Le build conserve son avertissement de taille de bundle.
L’orchestrateur doit exécuter Vitest, les mutations et les E2E desktop/mobile,
puis inspecter les six captures demandées : portes lisibles, ombre et hauteur
du saut, berm extérieur clair, rails continus, tunnel sombre, neige et décor
hors piste, relief forestier et HUD hors de la zone de conduite.


### Passe 67 — jouabilité au doigt, Z36–Z39

Le nouvel ordre échange seulement les niveaux 1 et 5 : La Flèche des prés
ouvre la campagne, avec une largeur de 28 unités, sans bosse ni boost ;
Le Rocher reste en campagne au niveau 5. Les 28 autres positions restent identiques.
`legacyCircuits` garde l’ordre publié pour les migrations, `circuits` l’ordre courant.

La campagne Node `scripts/derapage-human.js` vise le centre six échantillons
devant la section courante, bruit uniforme ±0,35 rad (graine 67), observe toutes
les neuf images (150 ms) et applique la visée de l’observation précédente.
Les courses sont ordinaires, à six karts, graine de course 28, sans bonus
utilisé par le joueur. `--record` régénère les bandes d’entrées Z36 ; chaque
rejeu vérifie trois tours, arrêt (<2 unités/s) strictement <0,5 s, hors piste
strictement <15 %, puis position et cap finaux exacts. Z37 couvre la zone morte,
les axes/diagonales et la convergence bornée ; Z38 le rail même au repos ;
Z39 la migration et sa relecture. Le script final contrôle les quatre rejeux
avec une limite littérale de 2000 ms chacun. Les E2E mobile et clavier sont
écrits seulement : gestes haut/gauche/droite à l’écran, capture
`derapage-joystick`, relâchement et option caméra mémorisée après rechargement.

La mutation « aide désactivée » est rejetée par le rejeu exact du Rocher et
par l’oracle de correction locale. **Les seuls seuils de jouabilité du pilote
humain restent satisfaits sans aide** : ils ne prouvent donc pas sa nécessité.
Les mutations rail collant, direction relative et records par index sont
rejetées respectivement par Z38, Z37 et Z39 ; les emplacements courants sont
imprimés par `scripts/check-derapage-joystick-mutations.js`.

Résultats Z36 (aide activée, six karts) : niveaux 1, 3, 15 et Le Rocher :
3 tours chacun, plus long arrêt 0,167 s (départ compris), 0 % hors piste.
Le détail, l’ordre complet et les mutations sont dans
`docs/derapage-joystick-validation.json` après validation Node.
