import Phaser from 'phaser';
import { COLORS, DEPTH, PLAYER, VIEW } from '../config/GameConfig';

/**
 * HUD minimal : titre de zone, barres de vie et d'endurance, rappel des commandes.
 * Tout est ancré à l'écran (scrollFactor 0) et redessiné à chaque frame.
 */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly riposteLabel: Phaser.GameObjects.Text;
  private readonly bossBars: Phaser.GameObjects.Graphics;
  private readonly bossName: Phaser.GameObjects.Text;
  private lastHp = -1;
  private lastStamina = -1;
  private bossVisible = false;
  private bossRatio = -1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    scene.add.text(12, 9, 'ASHEN OATH', {
      fontFamily: 'Georgia, serif',
      fontSize: '9px',
      color: '#d8c8ad',
    }).setScrollFactor(0).setDepth(DEPTH.hud);

    scene.add.text(12, 19, 'CRYPTE OUBLIÉE', {
      fontFamily: 'Georgia, serif',
      fontSize: '5px',
      color: '#8f8178',
    }).setScrollFactor(0).setDepth(DEPTH.hud);

    this.bars = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);

    this.riposteLabel = scene.add.text(VIEW.width / 2, 252, 'RIPOSTE', {
      fontFamily: 'Georgia, serif',
      fontSize: '6px',
      color: '#f0d78a',
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(DEPTH.hud).setVisible(false);

    scene.add.text(VIEW.width - 12, VIEW.height - 8, 'Q/D bouger   ESPACE sauter   J légère   K lourde   L esquive   I parade', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '5px',
      color: '#8f8178',
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(DEPTH.hud);

    this.bossBars = scene.add.graphics().setScrollFactor(0).setDepth(DEPTH.hud);
    this.bossName = scene.add.text(VIEW.width / 2, 9, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '9px',
      color: '#d8c8ad',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(DEPTH.hud);

    this.draw(PLAYER.maxHp, PLAYER.maxStamina);
  }

  update(hp: number, stamina: number, riposteReady: boolean, bossHp?: number, bossMaxHp?: number, bossDistance?: number): void {
    if (Math.abs(hp - this.lastHp) > 0.5 || Math.abs(stamina - this.lastStamina) > 0.5) {
      this.draw(hp, stamina);
    }
    this.riposteLabel.setVisible(riposteReady);

    if (bossHp !== undefined && bossMaxHp !== undefined && bossDistance !== undefined) {
      this.bossVisible = bossDistance <= 260 && bossHp > 0;
      this.bossRatio = Phaser.Math.Clamp(bossHp / bossMaxHp, 0, 1);
      this.bossName.setText(this.bossVisible ? 'ROI SQUELETTE DÉCHU' : '');
    } else {
      this.bossVisible = false;
      this.bossName.setText('');
    }

    this.bossBars.clear();
    if (this.bossVisible) {
      this.bossBars.fillStyle(COLORS.hpLoss, 1);
      this.bossBars.fillRect(12, 20, 88, 4);
      this.bossBars.fillStyle(COLORS.hp, 1);
      this.bossBars.fillRect(12, 20, 88 * this.bossRatio, 4);
    }
  }

  private draw(hp: number, stamina: number): void {
    this.lastHp = hp;
    this.lastStamina = stamina;

    const x = 12;
    const width = 88;
    const hpRatio = Phaser.Math.Clamp(hp / PLAYER.maxHp, 0, 1);
    const staminaRatio = Phaser.Math.Clamp(stamina / PLAYER.maxStamina, 0, 1);

    this.bars.clear();
    this.bars.fillStyle(COLORS.hudFrame, 0.85);
    this.bars.fillRect(x - 1, 29, width + 2, 6);
    this.bars.fillRect(x - 1, 37, width + 2, 4);

    this.bars.fillStyle(COLORS.hpLoss, 1);
    this.bars.fillRect(x, 30, width, 4);
    this.bars.fillStyle(COLORS.hp, 1);
    this.bars.fillRect(x, 30, width * hpRatio, 4);

    this.bars.fillStyle(COLORS.staminaLoss, 1);
    this.bars.fillRect(x, 38, width, 2);
    this.bars.fillStyle(COLORS.stamina, 1);
    this.bars.fillRect(x, 38, width * staminaRatio, 2);
  }
}
