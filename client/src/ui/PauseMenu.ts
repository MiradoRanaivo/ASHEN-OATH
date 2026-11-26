import Phaser from 'phaser';
import { DEPTH, VIEW } from '../config/GameConfig';

/**
 * Menu pause sobre et lisible, dans l'esprit des Souls :
 * voile sombre, panneau pierre, filets bronze et typographie serif.
 */
export class PauseMenu {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly escapeHandler: () => void;
  private opened = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const cx = VIEW.width / 2;
    const cy = VIEW.height / 2;

    const shade = scene.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x050509, 0.76)
      .setOrigin(0);
    const panel = scene.add.rectangle(cx, cy, 206, 174, 0x17151a, 0.98)
      .setStrokeStyle(1, 0x806746, 1);
    const inner = scene.add.rectangle(cx, cy, 198, 166, 0x17151a, 1)
      .setStrokeStyle(1, 0x342b29, 1);

    const title = scene.add.text(cx, 58, 'PAUSE', {
      fontFamily: 'Georgia, serif',
      fontSize: '13px',
      color: '#dfcfad',
      letterSpacing: 3,
      stroke: '#09080b',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const subtitle = scene.add.text(cx, 76, 'ASHEN OATH', {
      fontFamily: 'Georgia, serif',
      fontSize: '5px',
      color: '#96866e',
      letterSpacing: 2,
    }).setOrigin(0.5);

    const divider = scene.add.rectangle(cx, 86, 112, 1, 0x806746, 0.9);

    const resumeButton = this.createButton(cx, 108, 'REPRENDRE', true);
    const controlsButton = this.createButton(cx, 132, 'COMMANDES', false);
    const hint = scene.add.text(cx, 179, 'ÉCHAP  ·  REPRENDRE', {
      fontFamily: 'Georgia, serif',
      fontSize: '5px',
      color: '#8e8378',
    }).setOrigin(0.5);

    const controlsPanel = scene.add.rectangle(cx, 139, 184, 78, 0x100f13, 0.98)
      .setStrokeStyle(1, 0x66533d, 1)
      .setVisible(false);
    const controlsText = scene.add.text(cx, 111,
      'Q / D ou ← / →   Déplacement\nZ / Espace       Saut\nJ                  Attaque légère\nK                  Attaque lourde\nL                  Esquive\nI                   Parade',
      {
        fontFamily: 'Georgia, serif',
        fontSize: '6px',
        color: '#c5b99f',
        lineSpacing: 4,
        align: 'left',
      },
    ).setOrigin(0.5, 0).setVisible(false);

    const backButton = this.createButton(cx, 194, 'RETOUR', false);
    backButton.setVisible(false);

    controlsButton.on('pointerdown', () => {
      resumeButton.setVisible(false);
      controlsButton.setVisible(false);
      hint.setVisible(false);
      controlsPanel.setVisible(true);
      controlsText.setVisible(true);
      backButton.setVisible(true);
    });
    backButton.on('pointerdown', () => {
      resumeButton.setVisible(true);
      controlsButton.setVisible(true);
      hint.setVisible(true);
      controlsPanel.setVisible(false);
      controlsText.setVisible(false);
      backButton.setVisible(false);
    });
    resumeButton.on('pointerdown', () => this.close());

    this.root = scene.add.container(0, 0, [
      shade, panel, inner, title, subtitle, divider,
      resumeButton, controlsButton, hint, controlsPanel, controlsText, backButton,
    ]).setScrollFactor(0).setDepth(DEPTH.overlay + 5).setVisible(false);

    this.escapeHandler = () => {
      if (this.opened) this.close();
      else this.open();
    };
    scene.input.keyboard?.on('keydown-ESC', this.escapeHandler);
  }

  get isOpen(): boolean {
    return this.opened;
  }

  open(): void {
    if (this.opened) return;
    this.opened = true;
    this.root.setVisible(true);
    this.scene.physics.world.pause();
  }

  close(): void {
    if (!this.opened) return;
    this.opened = false;
    this.root.setVisible(false);
    this.scene.physics.world.resume();
  }

  destroy(): void {
    this.scene.input.keyboard?.off('keydown-ESC', this.escapeHandler);
    this.root.destroy(true);
  }

  private createButton(x: number, y: number, label: string, primary: boolean): Phaser.GameObjects.Container {
    const bg = this.scene.add.rectangle(0, 0, primary ? 118 : 104, 17,
      primary ? 0x332a27 : 0x211e22, 1)
      .setStrokeStyle(1, primary ? 0xa17b4c : 0x5e4c3b, 1);
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'Georgia, serif',
      fontSize: '6px',
      color: primary ? '#e2d1ad' : '#b8aa91',
      letterSpacing: 1,
    }).setOrigin(0.5);
    const button = this.scene.add.container(x, y, [bg, text]);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      bg.setFillStyle(0x49382d, 1);
      text.setColor('#f0dfbb');
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(primary ? 0x332a27 : 0x211e22, 1);
      text.setColor(primary ? '#e2d1ad' : '#b8aa91');
    });
    return button;
  }
}
