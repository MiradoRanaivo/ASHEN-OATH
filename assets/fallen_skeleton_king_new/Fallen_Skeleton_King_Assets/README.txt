# FALLEN SKELETON KING — Pack graphique

## Contenu
- `01_sprite_sheet_principale.png` : planche la plus récente, à utiliser comme référence principale.
- `02_sprite_sheet_alternative.png` : variante graphique.
- `03_sprite_sheet_concept_initial.png` : première proposition de planche.

Les planches représentent les animations et effets suivants, selon les éléments visibles :
- Idle
- Walk
- Run
- Sword Attack
- Magic Charge
- Beam
- Magic AOE
- Hurt
- Death
- Projectiles et effets magiques

## IMPORTANT — état du pack
Ce ZIP contient les planches graphiques générées, pas encore des spritesheets de production découpées.
Les images comportent des titres/étiquettes et les cellules ne suivent pas toutes une grille régulière de 128×128 px.
Le fond visible dans l'image peut également être intégré aux pixels : le mode RGBA du fichier ne garantit pas à lui seul une transparence réelle autour de chaque sprite.

Ne pas déclarer directement ces images comme spritesheets Phaser avec `frameWidth: 128` / `frameHeight: 128`.
Il faut d'abord isoler chaque animation, détourer proprement les sprites, normaliser les frames, vérifier l'alignement et tester les animations dans Phaser.

## Dimensions des planches
1536 × 1024 px — PNG RGBA.

## Intégration prévue
Dossier cible du projet :
`client/public/assets/boss/fallen_skeleton_king/`

Ce pack est fourni comme base graphique et référence de production. Aucun fichier du projet Phaser n'a été modifié.
