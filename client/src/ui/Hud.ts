import Phaser from 'phaser';
import { BOSS_AI, COLORS, DEPTH, PLAYER, VIEW } from '../config/GameConfig';

/**
 * HUD Dark Ages : panneaux et bordures du pack Hypnobius, avec barres
 * dynamiques dessinées par Phaser. Les éléments restent ancrés à l'écran.
 */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly riposteLabel: Phaser.GameObjects.Text;
  private readonly bossBars: Phaser.GameObjects.Graphics;
  private readonly bossName: Phaser.GameObjects.Text;
  private readonly regionLabel: Phaser.GameObjects.Text;
  private readonly panel?: Phaser.GameObjects.Image;
  private readonly bossPanel?: Phaser.GameObjects.Image;
  private readonly controlsPanel?: Phaser.GameObjects.Image;
  private lastHp = -1;
  private lastStamina = -1;
  private currentRegion = '';
  private bossVisible = false;
  private bossRatio = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    if (scene.textures.exists('dark-ages-ui')) {
      const texture = scene.textures.get('dark-ages-ui');
      const frames = [
        ['hud-panel', 0, 0, 96, 96],
        ['dark-button', 208, 16, 64, 64],
        ['dark-button-alt', 304, 16, 64, 64],
        ['ornate-bar', 0, 104, 64, 24],
        ['ornate-bar-alt', 64, 104, 64, 24],
        ['gold-bar', 128, 104, 64, 24],
      ] as const;

      for (const [name, x, y, width, height] of frames) {
        if (!texture.has(name)) texture.add(name, 0, x, y, width, height);
      }

      this.panel = scene.add.image(8, 7, 'dark-ages-ui', 'hud-panel')
        .setOrigin(0).setScale(0.68).setScrollFactor(0).setDepth(DEPTH.hud);
      this.bossPanel = scene.add.image(VIEW.width / 2, 7, 'dark-ages-ui', 'gold-bar')
        .setOrigin(0.5, 0).setScale(1.35, 0.62).setScrollFactor(0).setDepth(DEPTH.hud);
      this.controlsPanel = scene.add.image(VIEW.width - 8, VIEW.height - 7, 'dark-ages-ui', 'dark-button')
        .setOrigin(1, 1).setScale(0.34).setAlpha(0.86).setScrollFactor(0).setDepth(DEPTH.hud);
    }

    scene.add.text(17, 13, 'ASHEN OATH', {
      fontFamily: 'Georgia, serif',
      fontSize: '8px',
      color: '#e5d3a5',
      stroke: '#211b20',
      strokeThickness: 1,
    }).setScrollFactor(0).setDepth(DEPTH.hud + 0.2);

    this.regionLabel = scene.add.text(18, 24, 'CRYPTE OUBLIÉE', {
      fontFamily: 'Georgia, serif',
      fontSize: '4.5px',
      color: '#b6a58b',
    }).setScrollFactor(0).setDepth(DEPTH.hud + 0.2);

    this.bars = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud + 0.3);

    this.riposteLabel = scene.add.text(VIEW.width / 2, VIEW.height - 15, '✦ RIPOSTE DISPONIBLE ✦', {
      fontFamily: 'Georgia, serif',
      fontSize: '6px',
      color: '#f0d78a',
      stroke: '#211b20',
      strokeThickness: 2,
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH.hud + 1).setVisible(false);

    scene.add.text(VIEW.width - 15, VIEW.height - 8, 'Q/D  ·  ESPACE  ·  J/K  ·  L  ·  I', {
      fontFamily: 'Georgia, serif',
      fontSize: '4.5px',
      color: '#d2c4aa',
      stroke: '#17151d',
      strokeThickness: 2,
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(DEPTH.hud + 0.5);

    this.bossBars = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud + 0.5);
    this.bossName = scene.add.text(VIEW.width / 2, 11, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '6px',
      color: '#f0d9a8',
      stroke: '#211b20',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.hud + 1);

    this.draw(PLAYER.maxHp, PLAYER.maxStamina);
  }

  update(hp: number, stamina: number, riposteReady: boolean, bossHp?: number, bossMaxHp?: number, bossDistance?: number): void {
    if (Math.abs(hp - this.lastHp) > 0.5 || Math.abs(stamina - this.lastStamina) > 0.5) {
      this.draw(hp, stamina);
    }
    this.riposteLabel.setVisible(riposteReady);

    if (bossHp !== undefined && bossMaxHp !== undefined && bossDistance !== undefined) {
      this.bossVisible = bossDistance <= BOSS_AI.detectRange && bossHp > 0;
      this.bossRatio = Phaser.Math.Clamp(bossHp / bossMaxHp, 0, 1);
      this.bossName.setText(this.bossVisible ? 'ROI SQUELETTE DÉCHU' : '');
    } else {
      this.bossVisible = false;
      this.bossName.setText('');
    }

    this.bossPanel?.setVisible(this.bossVisible);
    this.bossBars.clear();
    if (this.bossVisible) {
      const width = 76;
      this.bossBars.fillStyle(0x211b20, 0.95);
      this.bossBars.fillRect(VIEW.width / 2 - width / 2, 22, width, 4);
      this.bossBars.fillStyle(COLORS.hpLoss, 1);
      this.bossBars.fillRect(VIEW.width / 2 - width / 2 + 1, 23, width - 2, 2);
      this.bossBars.fillStyle(0xb68b50, 1);
      this.bossBars.fillRect(VIEW.width / 2 - width / 2 + 1, 23, (width - 2) * this.bossRatio, 2);
    }
  }

  setRegion(name: string): void {
    if (this.currentRegion !== name) {
      this.currentRegion = name;
      this.regionLabel.setText(name.toLocaleUpperCase('fr-FR'));
    }
  }

  private draw(hp: number, stamina: number): void {
    this.lastHp = hp;
    this.lastStamina = stamina;

    const x = 18;
    const width = 46;
    const hpRatio = Phaser.Math.Clamp(hp / PLAYER.maxHp, 0, 1);
    const staminaRatio = Phaser.Math.Clamp(stamina / PLAYER.maxStamina, 0, 1);

    this.bars.clear();
    this.bars.fillStyle(0x211b20, 0.96);
    this.bars.fillRect(x - 1, 34, width + 2, 7);
    this.bars.fillRect(x - 1, 44, width + 2, 5);

    this.bars.fillStyle(COLORS.hpLoss, 1);
    this.bars.fillRect(x, 35, width, 4);
    this.bars.fillStyle(0xb43b42, 1);
    this.bars.fillRect(x, 35, width * hpRatio, 4);

    this.bars.fillStyle(COLORS.staminaLoss, 1);
    this.bars.fillRect(x, 45, width, 2);
    this.bars.fillStyle(0xd8b85f, 1);
    this.bars.fillRect(x, 45, width * staminaRatio, 2);
  }
}
