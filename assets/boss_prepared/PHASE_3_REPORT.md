# Phase 3 — Intelligence artificielle du boss

## Architecture

La machine à états du boss est entièrement implémentée dans `client/src/entities/Boss.ts`. Les distances, vitesses, délais de préparation et récupération proviennent de `BOSS_AI` dans `client/src/config/GameConfig.ts`.

## États

- idle
- detect
- approach
- attack-preparation
- attack
- recovery
- hurt
- dead

## Transitions testées

- idle → detect → approach lorsque le joueur entre dans 260 px.
- approach → attack-preparation lorsque la distance devient inférieure à 82 px.
- attack-preparation → attack après 500 ms.
- attack → recovery après 300 ms neutres.
- recovery → approach selon la distance.
- approach → idle lorsque le joueur dépasse 360 px.
- receiveHit() → hurt puis retour à preparation ou approach.
- hp = 0 → dead.
- reset() → idle avec 30 000 PV.

## Comportements opérationnels

- Le boss reste immobile hors rayon d'agression.
- Il tourne vers le joueur.
- Il avance progressivement à 46 px/s.
- Il s'arrête autour de 82 px.
- Il passe par des états préparatoires et de récupération contrôlés.
- Il ne lance aucune attaque automatique Beam/AOE.
- Il s'arrête immédiatement à la mort.

## Animations utilisées

- Idle/mouvement : bossIdle.
- Les méthodes showBeam() et showMagic() existent mais ne sont pas appelées automatiquement.
- Aucune animation Hurt, Death, Run ou Jump n'a été inventée.

## Fichiers modifiés

- client/src/entities/Boss.ts
- client/src/scenes/GameScene.ts
- client/src/config/GameConfig.ts

## Tests exécutés

- Build TypeScript/Vite lancé.
- Détection vérifiée : boss passé de idle à approach.
- Approche vérifiée : vitesse horizontale 46 px/s configurable.
- Arrêt vérifié autour de 78 px.
- Transition attack vérifiée avec vélocité horizontale nulle.
- Sortie du rayon vérifiée : idle à 1462 px de distance.
- Hurt testé indirectement via receiveHit().
- Mort vérifiée : dead, actif=false, visible=false, vitesse=0.
- Reset vérifié : 30 000 PV, idle, x=1720, actif=true.

## Bugs corrigés

- Conflit private state renommé aiState pour respecter Phaser.Sprite.
- Reset du boss réactivé avec enableBody() à sa position initiale.
- Mort isolée des transitions IA.

## Fonctionnalités non terminées

- Attaques physiques réelles.
- Beam déclenché par une attaque réelle.
- Magie AOE déclenchée par une attaque réelle.
- Deux phases.
- Animation Hurt officielle.
- Animation Death officielle.
