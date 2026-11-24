# Boss Roi Squelette Déchu — assets préparés

## Contenu

- `source/` : archive originale et copie intacte de la planche source.
- `boss/frames/` : 96 PNG individuels 128 × 128, conservés avec leur alpha.
- `boss/sheets/` : 8 spritesheets candidates de 1536 × 128.
- `previews/` : aperçus noir, blanc, damier et grilles.
- `preview.html` : prévisualisation locale des huit candidats.
- `manifest.json` : métadonnées Phaser prêtes pour validation, sans coordonnées inventées.
- `REPORT.json` et `REPORT.md` : contrôles techniques et limites visuelles.

## Transparence

Tous les frames individuels sont des PNG RGBA. Les pixels transparents et semi-transparents proviennent du canal alpha de la planche source. Aucun filtre de suppression de fond agressif n’a été appliqué.

## Limites connues

La première rangée de la planche source a été validée visuellement : ses 12 silhouettes isolées par composantes alpha sont utilisées pour les animations Idle (poses 1–4) et Walk/Run (poses 5–9) du client. L’asset de mouvement est normalisé en frames 128 × 160 dans `client/public/assets/boss/fallen_skeleton_king/movement.png`.

Les attaques ont aussi été séparées visuellement : `melee.png` contient six poses, `beam_cast.png` neuf frames de charge/tir et `aoe_cast.png` quatre poses. Les effets `beam_visual.png` et `aoe_visual.png` sont ajoutés comme sprites dédiés.

Les limites exactes entre les poses d’attaque, magie, transformation et mort ne sont pas documentées dans l’archive. Ces rangées restent des candidates et ne doivent pas être intégrées comme animations du boss avant validation visuelle.

Les animations nommées dans le brief mais non confirmées restent listées comme manquantes dans `manifest.json`.

## Prévisualisation

Ouvrir `preview.html` depuis un serveur HTTP local, par exemple :

```bash
python -m http.server 8080
```

Puis ouvrir `http://localhost:8080/` depuis ce dossier.

## Règle d’intégration

Ne pas brancher directement les autres rangées dans `GameScene.ts` : l’extraction de déplacement ne valide pas les séquences d’attaque ni les autres états du boss.
