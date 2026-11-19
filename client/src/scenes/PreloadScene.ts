import Phaser from 'phaser';
import { IMAGE_ASSETS, SHEET_ASSETS } from '../data/AssetManifest';
import { registerAnimations } from '../data/Animations';
import { COLORS, VIEW } from '../config/GameConfig';

/**
 * Charge toutes les ressources puis démarre la scène de jeu.
 * Affiche une barre de progression et signale les fichiers manquants.
 */
export class PreloadScene extends Phaser.Scene {
  private readonly missing: string[] = [];
  private status!: Phaser.GameObjects.Text;

  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    const centerX = VIEW.width / 2;
    const centerY = VIEW.height / 2;

    this.add.text(centerX, centerY - 26, 'ASHEN OATH', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#d8c8ad',
    }).setOrigin(0.5);

    const frame = this.add.graphics();
    frame.fillStyle(COLORS.hudFrame, 1);
    frame.fillRect(centerX - 60, centerY, 120, 4);
    frame.lineStyle(1, 0x59434a, 1);
    frame.strokeRect(centerX - 61, centerY - 1, 122, 6);

    const bar = this.add.graphics();
    this.status = this.add.text(centerX, centerY + 14, 'CHARGEMENT', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '5px',
      color: '#8f8178',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0xb87a58, 1);
      bar.fillRect(centerX - 60, centerY, 120 * value, 4);
    });

    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      this.missing.push(file.src.split('/').pop() ?? file.key);
    });

    for (const image of IMAGE_ASSETS) {
      this.load.image(image.key, image.path);
    }
    for (const sheet of SHEET_ASSETS) {
      this.load.spritesheet(sheet.key, sheet.path, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
  }

  create(): void {
    this.textures.get('region-industrial').add('industrial-ground', 0, 0, 0, 70, 70);
    this.textures.get('region-medieval').add('medieval-ground', 0, 280, 980, 70, 70);
    this.textures.get('region-winter').add('winter-ground', 0, 0, 0, 70, 70);
    registerAnimations(this);

    if (this.missing.length > 0) {
      this.status.setText(`RESSOURCES MANQUANTES : ${this.missing.join(', ')}`).setColor('#c96b6b');
      this.time.delayedCall(2800, () => this.scene.start('GameScene'));
      return;
    }

    this.status.setText('PRÊT');
    this.scene.start('GameScene');
  }
}
