import Phaser from 'phaser';
import { BOSS_AI, PLAYER, VIEW, DEPTH } from '../config/GameConfig';

/**
 * Interface minimaliste Souls-like : sceau, jauges horizontales et
 * cartouche sombre discret. Aucun sprite d'atlas n'est étiré ici :
 * le HUD est dessiné en pixels par Phaser pour éviter les chevauchements.
 */
export class Hud {
  private readonly panel: Phaser.GameObjects.Graphics;
  private readonly crest: Phaser.GameObjects.Graphics;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly riposteLabel: Phaser.GameObjects.Text;
  private readonly bossBars: Phaser.GameObjects.Graphics;
  private readonly bossName: Phaser.GameObjects.Text;
  private readonly regionLabel: Phaser.GameObjects.Text;
  private lastHp = -1;
  private lastStamina = -1;
  private currentRegion = '';
  private bossVisible = false;
  private bossRatio = 1;

  constructor(scene: Phaser.Scene) {
    const depth = DEPTH.hud;

    // Cartouche sombre fin, inspiré des interfaces Souls, sans cadre décoratif massif.
    this.panel = scene.add.graphics().setScrollFactor(0).setDepth(depth);
    this.panel.fillStyle(0x09090d, 0.76);
    this.panel.fillRoundedRect(6, 6, 126, 39, 2);
    this.panel.lineStyle(1, 0x67533a, 0.9);
    this.panel.strokeRoundedRect(6, 6, 126, 39, 2);
    this.panel.lineStyle(1, 0x29232a, 1);
    this.panel.lineBetween(29, 10, 29, 41);
    // Petits rivets aux coins : détails discrets, nets à l'échelle pixel art.
    this.panel.fillStyle(0xb08a52, 1);
    this.panel.fillRect(8, 8, 2, 2);
    this.panel.fillRect(128, 8, 2, 2);
    this.panel.fillRect(8, 41, 2, 2);
    this.panel.fillRect(128, 41, 2, 2);

    this.crest = scene.add.graphics().setScrollFactor(0).setDepth(depth + 0.2);
    this.drawCrest();

    scene.add.text(35, 10, 'ASHEN OATH', {
      fontFamily: 'Georgia, serif',
      fontSize: '7px',
      fontStyle: 'bold',
      color: '#dfcfad',
      stroke: '#09090d',
      strokeThickness: 2,
      resolution: 2,
    }).setScrollFactor(0).setDepth(depth + 0.3);

    this.regionLabel = scene.add.text(35, 18, 'CRYPTE OUBLIÉE', {
      fontFamily: 'Georgia, serif',
      fontSize: '4px',
      letterSpacing: 1,
      color: '#a99b82',
      stroke: '#09090d',
      strokeThickness: 1,
    }).setScrollFactor(0).setDepth(depth + 0.3);

    this.bars = scene.add.graphics().setScrollFactor(0).setDepth(depth + 0.4);

    this.riposteLabel = scene.add.text(10, VIEW.height - 10, '✦ RIPOSTE DISPONIBLE', {
      fontFamily: 'Georgia, serif',
      fontSize: '5px',
      color: '#d7bd78',
      stroke: '#09090d',
      strokeThickness: 2,
    }).setOrigin(0, 1).setScrollFactor(0).setDepth(depth + 1).setVisible(false);

    scene.add.text(VIEW.width - 8, VIEW.height - 7, 'Q/D · ESPACE · J/K · L · I', {
      fontFamily: 'Georgia, serif',
      fontSize: '4px',
      color: '#a99b82',
      stroke: '#09090d',
      strokeThickness: 2,
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(depth + 0.5);

    this.bossBars = scene.add.graphics().setScrollFactor(0).setDepth(depth + 0.5);
    this.bossName = scene.add.text(VIEW.width / 2, 7, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '5px',
      color: '#dfc99b',
      stroke: '#09090d',
      strokeThickness: 2,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(depth + 1);

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

    this.bossBars.clear();
    if (this.bossVisible) {
      const width = 112;
      const x = VIEW.width / 2 - width / 2;
      this.bossBars.fillStyle(0x09090d, 0.94);
      this.bossBars.fillRect(x - 1, 17, width + 2, 5);
      this.bossBars.fillStyle(0x4a2025, 1);
      this.bossBars.fillRect(x, 18, width, 3);
      this.bossBars.fillStyle(0x9f3438, 1);
      this.bossBars.fillRect(x, 18, width * this.bossRatio, 3);
      this.bossBars.lineStyle(1, 0x80613f, 0.9);
      this.bossBars.strokeRect(x - 1, 17, width + 2, 5);
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
    // Fond de l'écusson.
    this.crest.fillStyle(0x111016, 1);
    this.crest.fillCircle(18, 25, 10);
    this.crest.lineStyle(1, 0xb08a52, 1);
    this.crest.strokeCircle(18, 25, 10);
    // Épée stylisée au centre.
    this.crest.lineStyle(2, 0xd7c69f, 1);
    this.crest.lineBetween(18, 17, 18, 31);
    this.crest.lineStyle(1, 0xd7c69f, 1);
    this.crest.lineBetween(14, 24, 22, 24);
    this.crest.fillStyle(0xb08a52, 1);
    this.crest.fillTriangle(18, 15, 15, 20, 21, 20);
    this.crest.fillRect(16, 31, 4, 2);
  }

  private draw(hp: number, stamina: number): void {
    this.lastHp = hp;
    this.lastStamina = stamina;
    const x = 35;
    const width = 88;
    const hpRatio = Phaser.Math.Clamp(hp / PLAYER.maxHp, 0, 1);
    const staminaRatio = Phaser.Math.Clamp(stamina / PLAYER.maxStamina, 0, 1);

    this.bars.clear();

    // Santé : rouge profond, avec un fond sombre visible lors des dégâts.
    this.bars.fillStyle(0x09090d, 1);
    this.bars.fillRect(x - 1, 26, width + 2, 6);
    this.bars.lineStyle(1, 0x6b5038, 0.95);
    this.bars.strokeRect(x - 1, 26, width + 2, 6);
    this.bars.fillStyle(0x451b22, 1);
    this.bars.fillRect(x, 27, width, 4);
    this.bars.fillStyle(0x9e343a, 1);
    this.bars.fillRect(x, 27, width * hpRatio, 4);

    // Endurance : vert olive, comme les jauges classiques des Souls.
    this.bars.fillStyle(0x09090d, 1);
    this.bars.fillRect(x - 1, 35, width + 2, 5);
    this.bars.lineStyle(1, 0x6b5038, 0.85);
    this.bars.strokeRect(x - 1, 35, width + 2, 5);
    this.bars.fillStyle(0x263321, 1);
    this.bars.fillRect(x, 36, width, 3);
    this.bars.fillStyle(0x718448, 1);
    this.bars.fillRect(x, 36, width * staminaRatio, 3);
  }
}
