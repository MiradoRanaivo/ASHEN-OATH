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

Les rangées ont été découpées sur une grille de 128 pixels. Les cellules individuelles sont disponibles, mais les limites exactes entre Idle, Walk, attaques, magie, transformation et mort ne sont pas documentées dans l’archive. Les animations du manifest sont donc marquées `confidence: ambiguous` et doivent être validées visuellement avant toute intégration.

Les animations nommées dans le brief mais non confirmées restent listées comme manquantes dans `manifest.json`.

## Prévisualisation

Ouvrir `preview.html` depuis un serveur HTTP local, par exemple :

```bash
python -m http.server 8080
```

Puis ouvrir `http://localhost:8080/` depuis ce dossier.

## Règle d’intégration

Cette archive ne doit pas être branchée directement dans `GameScene.ts` avant validation. Elle ne contient pas encore une segmentation chronologique fiable des attaques et états du boss.
