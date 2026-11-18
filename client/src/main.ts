import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';
import { PreloadScene } from './scenes/PreloadScene';
import { PHYSICS, VIEW } from './config/GameConfig';
import './styles.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: '#0b0a10',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: PHYSICS.gravityY },
      debug: false,
    },
  },
  scene: [PreloadScene, GameScene],
});

// Exposé uniquement en développement, pour les tests automatisés du navigateur.
if (import.meta.env.DEV) {
  (window as unknown as { __ASHEN__?: Phaser.Game }).__ASHEN__ = game;
}
