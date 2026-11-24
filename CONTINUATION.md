# ASHEN OATH — point de reprise

**Mise à jour :** 24 novembre 2026
**Branche :** `master`
**Dépôt du jeu :** https://github.com/MiradoRanaivo/ASHEN-OATH.git
**Dépôt source d’assets demandé :** https://github.com/Tiddybub/2d-assets.git

## Où le travail s’est arrêté

L’intégration des ressources et le prototype jouable sont en cours. Les changements présents dans l’arbre de travail doivent être conservés et poussés. Ne pas les remplacer par une nouvelle implémentation sans vérifier les fichiers existants.

## Avancement de la reprise — 20 novembre 2026

- `npm run build` depuis `client/` réussit après les changements de reprise. Vite conserve son avertissement de bundle JavaScript supérieur à 500 kB.
- Le navigateur a chargé le jeu sans erreur console. Le titre intégré au fond a été masqué et les surfaces de plateforme ont été redessinées avec des palettes propres aux secteurs ; leur bord supérieur rejoint maintenant le sol peint du décor.
- Les ennemis existants sont répartis à raison d’un par secteur, avec leurs patrouilles dans leur région.
- Les quatre secteurs ont des traitements de couleur distincts, mais réutilisent toujours le même fond peint. Des arrière-plans réellement différents et une vérification visuelle complète des transitions restent à faire.
- Aucun nouveau boss n’a été ajouté : le Fallen Skeleton King reste le seul boss confirmé. Les attaques, phases et autres candidats de boss restent à examiner selon les assets disponibles.
- `client/package-lock.json` était déjà modifié avant cette reprise et n’a pas été modifié dans ce travail.

## État actuel du boss — 24 novembre 2026

- Les anciens découpages en frames de 64×160/96×160 puis en cellules de 128×128 produisaient des fragments de poses voisines. Les silhouettes actives sont maintenant isolées depuis la planche source par composantes alpha et normalisées en frames 128×160.
- Mouvement : `movement.png` fournit 12 poses; Idle boucle sur les poses 1–4, Walk utilise 5–9 en phase 1 et Run 5–8 en phase 2.
- Attaques : `melee.png` fournit six poses; `beam_cast.png` neuf poses de cast/tir; `aoe_cast.png` quatre poses. `beam_visual.png` et `aoe_visual.png` sont affichés durant les attaques correspondantes. Les frames sont fixes à 128×160 pour éviter que le changement de pose ne décale le corps ou la hitbox.
- Les attaques mêlée, Beam et AOE conservent leurs fenêtres de dégâts et hitboxes dédiées. Les phases, les PV, les états de récupération et le reset au respawn sont implémentés.
- Hurt et Death utilisent encore `single_pose.png`; leurs séquences animées restent à isoler et valider.
- Le démon ennemi, précédemment placé à 80 px du point de spawn du boss, a été déplacé à l’écart de l’arène immédiate.
- Build TypeScript/Vite réussi le 24 novembre. Vérification navigateur : cycles Idle/Walk, animation mêlée, Beam et AOE changent bien de frames; leurs effets visuels s’activent avec les états d’attaque. Les nouveaux assets répondent en PNG. L’avertissement de bundle Vite supérieur à 500 kB persiste.
- Les plateformes au sol séparées par des petits intervalles ont été remplacées par une surface de collision continue sous toute la carte. Les plateformes surélevées restent indépendantes.
- Build et chargement navigateur vérifiés ; la console est sans erreur ni avertissement d’index de frame après rechargement. Poursuivre les essais de combat et vérifier les transitions de secteur dans le navigateur.

### Diagnostic complémentaire du combat — 20 novembre 2026

- Cause du boss qui n’attaquait pas : la résolution de sa hitbox était placée après le retour anticipé de la résolution des attaques du joueur. Elle est maintenant exécutée indépendamment à chaque mise à jour.
- Cause de son apparition tardive : son ancien point de départ (x=1720) et sa détection à 260 px le maintenaient hors écran et inactif pendant l’essentiel du niveau. Le boss apparaît désormais à x=1560, détecte le joueur à 420 px et le HUD utilise cette même portée.
- Vérification navigateur isolée : le boss passe en attaque et inflige 22 dégâts; une attaque lourde du joueur lui retire 26 PV (360 → 334). Le sprite du boss est visible dans l’arène et le sol reste continu sous le joueur.
- Build TypeScript/Vite réussi. La console du navigateur n’a signalé aucune erreur. L’avertissement Vite sur la taille du bundle (plus de 500 kB) persiste.

### Correction du découpage des animations — 20 novembre 2026

- Cette correction historique n’a pas résolu le problème de cadrage; voir la correction du 23 novembre.

### Déjà présent ou modifié localement

- Le client Phaser 3 / TypeScript / Vite est sous `client/`.
- Les planches source du Fallen Skeleton King sont conservées dans `assets/boss_prepared/`; le client utilise `movement.png`, `melee.png`, `beam_cast.png`, `aoe_cast.png` et les deux effets visuels. `single_pose.png` reste la pose de secours pour Hurt et Death.
- `Boss.ts`, `Animations.ts`, `AssetManifest.ts`, `GameConfig.ts` et `GameScene.ts` ont été ajustés pour les animations et l’IA du boss existant. Ce boss reste l’unique boss intégré.
- Quatre types de mobs sont configurés : Skeleton, Zombie, Bandit et Demon. Le Demon utilise la feuille 6 frames de `client/public/assets/web2d/demon_clean_spritesheet.png`. Les aliens présents sous `regions_external/mobs/` ne sont pas encore des mobs jouables : leurs XML décrivent des sous-images distinctes, pas une spritesheet Phaser simple.
- `GameScene.ts` divise les 1 800 px du monde en quatre secteurs de 450 px, avec un nom de région dans le HUD et des matériaux de sol différents (crypte, forêt, village, trône). Les fonds d’écran restent toutefois celui de la Crypte : les quatre environnements ne sont pas encore visuellement distincts.
- Le sol jouable utilise des surfaces dessinées par secteur au-dessus d’une collision continue. Les anciens essais de tuiles externes n’ont pas été conservés, car leur découpage produisait des images vides ou incorrectes.
- Les ressources sélectionnées du dépôt Tiddybub sont sous `assets/external_selected/repo/` et les copies utilisées par le client sont sous `client/public/assets/regions_external/`.
- `PreloadScene.ts` enregistre des frames nommées à partir des coordonnées des feuilles de tuiles. Toute nouvelle frame doit être vérifiée dans la source/XML, ne pas inventer d’index ni de séquence.
- `Hud.ts` affiche le nom de la zone. `vite.config.ts` comporte aussi des changements en attente.

### Vérification connue

Le build actuel a été vérifié avec `npm --prefix client run build`. Le serveur Vite est disponible sur `http://127.0.0.1:5173/`; après l’ajout de nouveaux fichiers sous `public/assets`, le redémarrer si le serveur courant ne les sert pas encore. Le bundle JavaScript dépasse toujours 500 kB.

## Travail restant — ordre recommandé

1. **Compléter les animations et tester le combat**
   - Chercher et isoler des séquences fiables pour Hurt et Death; garder une pose statique si la source ne permet pas de confirmer les frames.
   - Tester au clavier les attaques mêlée, Beam et AOE, leurs fenêtres actives, la parade, les deux phases et le reset après respawn; ajuster l’équilibrage si nécessaire.
   - Vérifier en jeu le sens/orientation des effets Beam et AOE à gauche comme à droite, ainsi que l’alignement visuel avec les hitboxes.

2. **Terminer les quatre régions**
   - Remplacer le fond fixe de la Crypte par quatre ambiances cohérentes avec les ressources disponibles : Crypte oubliée, Forêt des racines, Village déchu et Trône du silence.
   - Confirmer visuellement chaque frame de sol et corriger toute tuile noire, répétition de vague, espace ou décalage entre collision et sprite.
   - Associer les mobs aux régions en gardant les collisions, patrouilles et points d’apparition valides. Ne pas présenter les aliens comme animés tant que leurs frames et leurs comportements ne sont pas correctement découpés/intégrés.

3. **Évaluer les autres boss sans inventer d’assets**
   - La demande initiale visait quatre régions, quatre boss et quatre mobs. Un seul boss, le Fallen Skeleton King, est actuellement confirmé dans le jeu.
   - Le pack `oga-colorized-boss-sprites` du dépôt source contient des sprites de vaisseaux spatiaux (voir son `SOURCE.md`), pas des boss dark-fantasy adaptés. Ne pas l’utiliser comme boss.
   - Chercher et inspecter quatre candidats adaptés dans les packs du dépôt, leurs fichiers de licence/source, dimensions et séquences réelles. Implémenter uniquement les boss dont les animations sont confirmées. Si les assets adaptés manquent, signaler le blocage plutôt que fabriquer des animations ou des sprites.
   - Pour chaque candidat retenu, confirmer d’abord les animations et la licence, puis seulement ajouter sa logique de combat et ses tests.

4. **État Git**
   - `client/package-lock.json` comporte une modification antérieure non liée à ces corrections; elle est laissée hors du commit boss et doit être examinée séparément.

## Source et licences des assets

- Dépôt demandé : https://github.com/Tiddybub/2d-assets.git
- Le README local de ce dépôt indique CC0 pour les packs curés ; les licences et `SOURCE.md` de chaque pack restent la référence à contrôler avant réutilisation/distribution.
- Les assets Kenney sous `client/public/assets/regions_external/` ont des fichiers `LICENSE.txt` individuels ; ceux inspectés indiquent CC0.
- Fallen Skeleton King : consulter `client/public/assets/boss/fallen_skeleton_king/README.txt` et l’archive source `Fallen_Skeleton_King_Assets.zip` pour les informations d’origine/licence.

## Commandes de reprise

Depuis la racine du dépôt :

```powershell
Set-Location client
npm run build
npm run dev -- --host 127.0.0.1
```

L’aperçu Vite utilise `http://127.0.0.1:5173/`. Le projet est un prototype front-end ; l’API/serveur mentionné dans le document de conception n’est pas encore développé.
