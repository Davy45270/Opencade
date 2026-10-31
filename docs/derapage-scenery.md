# Véhicules et bords de piste

Les cinq véhicules restent des dessins procéduraux. Leurs textures de dessus et
arrière sont partagées entre les images d'une course. À la taille normale (46 px),
la carrosserie occupe plus de 36 px dans sa longueur ; les roues et motifs ne
reposent pas sur la seule couleur du pilote.

## Vérification sur téléphone

Regarder les deux vues, à 360 px de large, en ligne droite puis en virage :

- Bolide Bambou : longerons verts à nœuds dorés, masque blanc du panda,
  oreilles et taches noires distinctes du cockpit.
- Chariot Feuille : carrosserie rouge et orange, grandes feuilles d'érable
  lobées dépassant sur les deux flancs.
- Drakart : museau rouge, cornes ivoire, yeux et narines ; membranes rouges
  repliées et bordées d'or, visibles au-delà des roues. À l'arrière, queue
  à crête et doubles échappements à la place du museau.
- Carrosse Tutu : corolle rose autour du cockpit, pétales alternés,
  cœur au capot et motif arrière.
- Étoilade : corps blanc et bleu, plumes latérales claires,
  grande étoile dorée dans un médaillon bleu.

Les ornements doivent rester lisibles sans masquer le bord de route, les bonus
ou les autres véhicules. En 3D, vérifier le recouvrement entre décor et kart
quand un objet passe de l'arrière-plan au premier plan.

| Thème | Décor à regarder hors piste |
| --- | --- |
| Urbain | Immeubles à fenêtres, lampadaires, passages piétons de trottoir |
| Prés rapides | Clôtures à deux traverses, fleurs, meules concentriques |
| Technique | Rochers facettés, panneaux de virage, flèches peintes sur les abords |
| Ovale | Tribunes en gradins, drapeaux, bannières |
| Nature | Sapins étagés, souches avec cernes, étangs bleus |
| Quais et pierre | Bornes, caisses à renfort diagonal, ancres de port |
| Combe | Falaises, buissons, blocs de pierre |
| Slalom et BMX | Fanions, bosses de terre, rubans |

Le grain du sol est discret : petits pavés en ville, touches courtes ailleurs.
Vérifier qu'il suit le déplacement et la rotation de la caméra sans scintiller.
Les arbres déjà présents dans le moteur restent visibles à leur position et
rayon d'origine ; les nouveaux objets sont seulement décoratifs.
Les trois circuits spéciaux conservent leur décor existant.

## Géométrie et coût

Le décor des circuits ordinaires est calculé à partir des normales des 96 points
de route. Les objets sont espacés, contrôlés contre la route la plus proche et
les raccourcis, avec une marge de quatre unités au-delà de leur emprise. Ils ne
sont jamais transmis au moteur. Le choix des objets ne dépend ni du temps ni de
la graine de course.

La vue de dessus incorpore grain du sol et objets dans la texture de route,
remplacée au changement de circuit. La 3D réutilise 25 textures procédurales dans
le pool de sprites existant : projection, visibilité et profondeur sont communes
aux autres objets. Aucun tracé Graphics du décor ordinaire n'est soumis dans une
image courante.

Maximum d'appels Graphics sur les 96 positions centrales, dessus / 3D :

| Circuit | Avant | Après |
| --- | --- | --- |
| 1 | 400 / 542 | 312 / 369 |
| 2 | 350 / 427 | 330 / 379 |
| 10 | 390 / 528 | 312 / 380 |
| K03 | 376 / 445 | 376 / 445 |

Les plafonds absolus restent 520 / 800 ; les trente circuits restent sous ces
plafonds. Le rapport JSON conserve les maxima et leurs positions témoins.

## Tests et mutations

`arcade-art-checks` enregistre les polygones réellement soumis à Graphics :
masque blanc et bambous, feuille lobée orange, membrane et museau rouges avec
cornes, pétales et cœur courbe, plumes blanches et étoile sur bleu. Chaque
véhicule a un test dans les deux vues ; un autre compare leurs signatures.
Les tests de décor couvrent les 27 circuits, les huit palettes, la marge hors
piste, le cache et l'indépendance de la graine.

Les contrôles de cadence ajoutent le circuit 2 au balayage complet des budgets.
Ils vérifient aussi la taille du kart, l'absence de nouvelle rasterisation quand
la caméra bouge, la sélection des seuls sprites visibles, leur taille projetée,
leur profondeur et la capacité du pool. Les contrôles des trente circuits et
les compteurs volontairement gonflés restent actifs.

Trois mutations à essayer :

1. Supprimer les membranes `#b8222a` du dragon : son test de signature doit échouer.
2. Ramener l'écart des objets de bord de route à la demi-largeur de piste :
   le test de marge hors piste doit échouer.
3. Détruire la texture de route à chaque image avant son dessin :
   le contrôle du nombre de générations doit échouer.
