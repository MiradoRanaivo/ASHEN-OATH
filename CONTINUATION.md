# ASHEN OATH — point de reprise

**Arrêt au :** 19 novembre 2026
**Branche :** `master`
**Dépôt du jeu :** https://github.com/MiradoRanaivo/ASHEN-OATH.git
**Dépôt source d’assets demandé :** https://github.com/Tiddybub/2d-assets.git

## Où le travail s’est arrêté

L’intégration des ressources et le prototype jouable sont en cours. Les changements présents dans l’arbre de travail doivent être conservés et poussés. Ne pas les remplacer par une nouvelle implémentation sans vérifier les fichiers existants.

### Déjà présent ou modifié localement

- Le client Phaser 3 / TypeScript / Vite est sous `client/`.
- Les assets du Fallen Skeleton King ont été découpés et copiés dans `client/public/assets/boss/fallen_skeleton_king/` : Idle, Walk, Run, Attack, Hurt, Death, charge magique, Beam et AOE. Les spritesheets principales sont conservées avec un README.
- `Boss.ts`, `Animations.ts`, `AssetManifest.ts`, `GameConfig.ts` et `GameScene.ts` ont été ajustés pour les animations et l’IA du boss existant. Ce boss reste l’unique boss intégré.
- Quatre types de mobs sont configurés : Skeleton, Zombie, Bandit et Demon. Le Demon utilise la feuille 6 frames de `client/public/assets/web2d/demon_clean_spritesheet.png`. Les aliens présents sous `regions_external/mobs/` ne sont pas encore des mobs jouables : leurs XML décrivent des sous-images distinctes, pas une spritesheet Phaser simple.
- `GameScene.ts` divise les 1 800 px du monde en quatre secteurs de 450 px, avec un nom de région dans le HUD et des matériaux de sol différents (crypte, forêt, village, trône). Les fonds d’écran restent toutefois celui de la Crypte : les quatre environnements ne sont pas encore visuellement distincts.
- Les sols utilisent des frames découpées depuis les feuilles médiévale et industrielle, et le fichier de neige `snowMid.png`. La sélection/cadrage des tuiles et le rendu des transitions doivent encore être revus dans le navigateur. Un essai avec le premier carré du tileset monochrome de forêt créait des blocs noirs ; il a été retiré.
- Les ressources sélectionnées du dépôt Tiddybub sont sous `assets/external_selected/repo/` et les copies utilisées par le client sont sous `client/public/assets/regions_external/`.
- `PreloadScene.ts` enregistre des frames nommées à partir des coordonnées des feuilles de tuiles. Toute nouvelle frame doit être vérifiée dans la source/XML, ne pas inventer d’index ni de séquence.
- `Hud.ts` affiche le nom de la zone. `vite.config.ts` comporte aussi des changements en attente.

### Vérification connue

`npm run build` depuis `client/` a réussi avant les tout derniers ajustements visuels des régions. TypeScript et Vite compilaient ; Vite affiche l’avertissement de bundle JavaScript supérieur à 500 kB. Le navigateur a montré que le sol précédent était mal choisi (décor de vague industrielle) et qu’un cadrage de forêt était vide. Le serveur local Vite est à arrêter après la reprise.

## Travail restant — ordre recommandé

1. **Vérifier l’état poussé et le build**
   - Exécuter `git status` à la racine puis contrôler les fichiers modifiés et non suivis.
   - Lancer `npm run build` depuis `client/` pour valider l’état actuel (pas seulement le build précédent).
   - Lancer `npm run dev -- --host 127.0.0.1` depuis `client/`, inspecter le canvas et la console. Vérifier les assets réseau, les frames des sols, les quatre noms de zone, la caméra, les ennemis et le boss. Arrêter le serveur après vérification.

2. **Terminer les quatre régions**
   - Remplacer le fond fixe de la Crypte par quatre ambiances cohérentes avec les ressources disponibles : Crypte oubliée, Forêt des racines, Village déchu et Trône du silence.
   - Confirmer visuellement chaque frame de sol et corriger toute tuile noire, répétition de vague, espace ou décalage entre collision et sprite.
   - Associer les mobs aux régions en gardant les collisions, patrouilles et points d’apparition valides. Ne pas présenter les aliens comme animés tant que leurs frames et leurs comportements ne sont pas correctement découpés/intégrés.

3. **Évaluer les boss sans inventer d’assets**
   - La demande initiale visait quatre régions, quatre boss et quatre mobs. Un seul boss, le Fallen Skeleton King, est actuellement confirmé dans le jeu.
   - Le pack `oga-colorized-boss-sprites` du dépôt source contient des sprites de vaisseaux spatiaux (voir son `SOURCE.md`), pas des boss dark-fantasy adaptés. Ne pas l’utiliser comme boss.
   - Chercher et inspecter quatre candidats adaptés dans les packs du dépôt, leurs fichiers de licence/source, dimensions et séquences réelles. Implémenter uniquement les boss dont les animations sont confirmées. Si les assets adaptés manquent, signaler le blocage plutôt que fabriquer des animations ou des sprites.
   - Ajouter ensuite la logique de combat nécessaire (attaques, hitboxes actives, phases et reset) avec des essais clavier au navigateur.

4. **Rafraîchir les notes de phase**
   - Mettre à jour `assets/boss_prepared/PHASE_3_REPORT.md` après vérification, en séparant ce qui est implémenté de ce qui reste à faire.
   - Ajouter une note de progression pour les quatre régions et les mobs si cette intégration avance.

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
