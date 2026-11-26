import Phaser from 'phaser';
import { BOSS_AI, COLORS, DEPTH, PLAYER, VIEW } from '../config/GameConfig';

/**
 * HUD compact inspiré des Souls : cadre bronze discret, sceau du chevalier,
 * jauges fines et lisibles. Tous les éléments restent fixes à la caméra.
 */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly crest: Phaser.GameObjects.Graphics;
  private readonly riposteLabel: Phaser.GameObjects.Text;
  private readonly bossBars: Phaser.GameObjects.Graphics;
  private readonly bossName: Phaser.GameObjects.Text;
  private readonly regionLabel: Phaser.GameObjects.Text;
  private readonly panel?: Phaser.GameObjects.Image;
  private readonly bossPanel?: Phaser.GameObjects.Image;
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

      // Le cadre est volontairement réduit : il ne masque plus le décor.
      this.panel = scene.add.image(6, 5, 'dark-ages-ui', 'hud-panel')
        .setOrigin(0).setScale(0.49).setScrollFactor(0).setDepth(DEPTH.hud);

      this.bossPanel = scene.add.image(VIEW.width / 2, 7, 'dark-ages-ui', 'gold-bar')
        .setOrigin(0.5, 0).setScale(1.25, 0.58)
        .setScrollFactor(0).setDepth(DEPTH.hud);
    }

    // Petit sceau circulaire à la place d'un portrait fictif.
    this.crest = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud + 0.25);
    this.drawCrest();

    scene.add.text(22, 10, 'ASHEN OATH', {
      fontFamily: 'Georgia, serif',
      fontSize: '6.5px',
      color: '#e2d0a8',
      stroke: '#17151b',
      strokeThickness: 2,
    }).setScrollFactor(0).setDepth(DEPTH.hud + 0.3);

    this.regionLabel = scene.add.text(22, 18, 'CRYPTE OUBLIÉE', {
      fontFamily: 'Georgia, serif',
      fontSize: '4px',
      color: '#a99b82',
      stroke: '#17151b',
      strokeThickness: 1,
    }).setScrollFactor(0).setDepth(DEPTH.hud + 0.3);

    this.bars = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud + 0.35);

    this.riposteLabel = scene.add.text(10, VIEW.height - 10, '✦ RIPOSTE', {
      fontFamily: 'Georgia, serif',
      fontSize: '5px',
      color: '#d7bd78',
      stroke: '#17151b',
      strokeThickness: 2,
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(DEPTH.hud + 1).setVisible(false);

    scene.add.text(VIEW.width - 8, VIEW.height - 7, 'Q/D · ESPACE · J/K · L · I', {
      fontFamily: 'Georgia, serif',
      fontSize: '4px',
      color: '#a99b82',
      stroke: '#17151b',
      strokeThickness: 2,
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(DEPTH.hud + 0.5);

    this.bossBars = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud + 0.5);
    this.bossName = scene.add.text(VIEW.width / 2, 10, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '5.5px',
      color: '#dfc99b',
      stroke: '#17151b',
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
      const x = VIEW.width / 2 - width / 2;
      this.bossBars.fillStyle(0x100e13, 0.96);
      this.bossBars.fillRect(x - 1, 21, width + 2, 4);
      this.bossBars.fillStyle(0x54252a, 1);
      this.bossBars.fillRect(x, 22, width, 2);
      this.bossBars.fillStyle(0x9f3438, 1);
      this.bossBars.fillRect(x, 22, width * this.bossRatio, 2);
    }
  }

  setRegion(name: string): void {
    if (this.currentRegion !== name) {
      this.currentRegion = name;
      this.regionLabel.setText(name.toLocaleUpperCase('fr-FR'));
    }
  }

  private drawCrest(): void {
    this.crest.clear();
    this.crest.fillStyle(0x100f14, 0.96);
    this.crest.fillCircle(13, 27, 5.5);
    this.crest.lineStyle(1, 0xb18a4e, 1);
    this.crest.strokeCircle(13, 27, 5.5);
    this.crest.lineStyle(1, 0xd6c08c, 1);
    this.crest.lineBetween(13, 23, 13, 31);
    this.crest.lineBetween(10, 26, 16, 26);
    this.crest.fillStyle(0xd6c08c, 1);
    this.crest.fillTriangle(13, 22, 11, 25, 15, 25);
  }

  private draw(hp: number, stamina: number): void {
    this.lastHp = hp;
    this.lastStamina = stamina;

    const x = 22;
    const width = 25;
    const hpRatio = Phaser.Math.Clamp(hp / PLAYER.maxHp, 0, 1);
    const staminaRatio = Phaser.Math.Clamp(stamina / PLAYER.maxStamina, 0, 1);

    this.bars.clear();

    // Bord sombre et filet bronze, sans effet néon.
    this.bars.fillStyle(0x100e13, 1);
    this.bars.fillRect(x - 1, 26, width + 2, 5);
    this.bars.lineStyle(0.5, 0x786044, 0.9);
    this.bars.strokeRect(x - 1, 26, width + 2, 5);
    this.bars.fillStyle(0x4b2025, 1);
    this.bars.fillRect(x, 27, width, 3);
    this.bars.fillStyle(0x9e343a, 1);
    this.bars.fillRect(x, 27, width * hpRatio, 3);

    this.bars.fillStyle(0x100e13, 1);
    this.bars.fillRect(x - 1, 34, width + 2, 4);
    this.bars.lineStyle(0.5, 0x786044, 0.8);
    this.bars.strokeRect(x - 1, 34, width + 2, 4);
    this.bars.fillStyle(0x49401e, 1);
    this.bars.fillRect(x, 35, width, 2);
    this.bars.fillStyle(0xb99a4e, 1);
    this.bars.fillRect(x, 35, width * staminaRatio, 2);
  }
}
