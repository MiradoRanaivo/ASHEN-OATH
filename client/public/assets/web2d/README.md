# Assets Web 2D – Dark Fantasy (version nettoyée)

## Nettoyage effectué
- PNG avec transparence conservée et halos faibles réduits.
- Suppression de petits artefacts isolés et de traits d'ombre au sol sur les personnages.
- Recadrage autour des pixels visibles avec petite marge transparente.
- Spritesheets reconstruits avec des cellules uniformes par animation.
- Décor conservé séparément comme image de fond.

## Dossiers
- `sprites/player/` : attaques légères/lourdes, esquives, parades.
- `sprites/enemies/` : squelettes, zombies, bandits, démons.
- `effects/` : dégâts, impacts, mort.
- `*_clean_spritesheet.png` : bandes horizontales avec dimensions de cellule indiquées dans `manifest_clean.json`.
- `environment_dark_ruins_moonlight.png` : décor complet.

## Phaser 3
Les images individuelles peuvent être chargées avec `this.load.image`. Pour les spritesheets, utilise `this.load.spritesheet` avec `frameWidth` et `frameHeight` fournis dans `manifest_clean.json`.

```js
this.load.spritesheet('player_attack_light',
  'assets/player_attack_light_clean_spritesheet.png',
  { frameWidth: 130, frameHeight: 97 } // valeurs indicatives : voir manifest_clean.json
);
```

## Limites
La source est une planche aplatie générée, et non un atlas de production. Le nettoyage alpha améliore les contours mais ne peut pas reconstituer les détails masqués ni garantir une séparation parfaite de chaque pose. Vérifie les animations en jeu avant utilisation finale.
