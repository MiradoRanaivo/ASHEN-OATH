import Phaser from 'phaser';
import { DEPTH, VIEW } from '../config/GameConfig';

/**
 * Pause menu lisible à la résolution native 480x270.
 * Les tailles de police sont volontairement plus grandes que celles du HUD :
 * le texte doit rester net une fois le canvas agrandi par Phaser.
 */
export class PauseMenu {
  private readonly scene: Phaser.Scene;
  private readonly root: Phaser.GameObjects.Container;
  private readonly escapeHandler: () => void;
  private opened = false;
  private showingControls = false;

  private readonly mainItems: Phaser.GameObjects.GameObject[] = [];
  private readonly controlItems: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const cx = VIEW.width / 2;
    const cy = VIEW.height / 2;

    const shade = scene.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x050509, 0.70)
      .setOrigin(0);

    // Panneau à double filet, inspiré des menus de RPG dark fantasy.
    const panel = scene.add.rectangle(cx, cy, 252, 218, 0x17151a, 0.99)
      .setStrokeStyle(2, 0x8c7049, 1);
    const innerPanel = scene.add.rectangle(cx, cy, 244, 210, 0x17151a, 1)
      .setStrokeStyle(1, 0x40342d, 1);

    const cornerMarks = scene.add.graphics();
    cornerMarks.lineStyle(1, 0xb08a52, 0.9);
    const left = cx - 121;
    const right = cx + 121;
    const top = cy - 104;
    const bottom = cy + 104;
    // Petits ornements angulaires : assez discrets pour ne pas gêner la lecture.
    cornerMarks.lineBetween(left, top + 7, left, top);
    cornerMarks.lineBetween(left, top, left + 7, top);
    cornerMarks.lineBetween(right - 7, top, right, top);
    cornerMarks.lineBetween(right, top, right, top + 7);
    cornerMarks.lineBetween(left, bottom - 7, left, bottom);
    cornerMarks.lineBetween(left, bottom, left + 7, bottom);
    cornerMarks.lineBetween(right - 7, bottom, right, bottom);
    cornerMarks.lineBetween(right, bottom - 7, right, bottom);

    const title = scene.add.text(cx, 39, 'PAUSE', {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '17px',
      fontStyle: 'bold',
      color: '#eadbbd',
      letterSpacing: 4,
      stroke: '#09080b',
      strokeThickness: 3,
      resolution: 2,
    }).setOrigin(0.5);

    const subtitle = scene.add.text(cx, 62, 'ASHEN OATH', {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '8px',
      fontStyle: 'bold',
      color: '#b8a17c',
      letterSpacing: 2,
      resolution: 2,
    }).setOrigin(0.5);

    const divider = scene.add.rectangle(cx, 79, 156, 1, 0x8c7049, 1);
    const dividerHighlight = scene.add.rectangle(cx, 81, 90, 1, 0x46382c, 1);

    const resumeButton = this.createButton(cx, 111, 'REPRENDRE', true, 170);
    const controlsButton = this.createButton(cx, 146, 'COMMANDES', false, 170);
    const footer = scene.add.text(cx, 211, 'ÉCHAP  ·  REPRENDRE', {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '7px',
      color: '#a99a83',
      letterSpacing: 1,
      resolution: 2,
    }).setOrigin(0.5);

    this.mainItems.push(title, subtitle, divider, dividerHighlight, resumeButton, controlsButton, footer);

    // Écran des commandes : touches dans des cartouches séparés du libellé.
    const controlsTitle = scene.add.text(cx, 94, 'COMMANDES', {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#e2d2b2',
      letterSpacing: 2,
      resolution: 2,
    }).setOrigin(0.5).setVisible(false);
    this.controlItems.push(controlsTitle);

    const rows: Array<[string, string]> = [
      ['Q / D', 'Déplacement'],
      ['ESPACE', 'Saut'],
      ['J', 'Attaque légère'],
      ['K', 'Attaque lourde'],
      ['L', 'Esquive'],
      ['I', 'Parade'],
    ];

    rows.forEach(([key, action], index) => {
      const y = 111 + index * 16;
      const keyBg = scene.add.rectangle(cx - 55, y + 4, 49, 12, 0x302720, 1)
        .setStrokeStyle(1, 0x806746, 1);
      const keyText = scene.add.text(cx - 55, y + 4, key, {
        fontFamily: 'Georgia, Times New Roman, serif',
        fontSize: '7px',
        fontStyle: 'bold',
        color: '#e1c995',
        align: 'center',
        resolution: 2,
      }).setOrigin(0.5);
      const actionText = scene.add.text(cx - 20, y, action, {
        fontFamily: 'Georgia, Times New Roman, serif',
        fontSize: '8px',
        color: '#e0d5c1',
        resolution: 2,
      });
      keyBg.setVisible(false);
      keyText.setVisible(false);
      actionText.setVisible(false);
      this.controlItems.push(keyBg, keyText, actionText);
    });

    const backButton = this.createButton(cx, 222, 'RETOUR', false, 130);
    backButton.setVisible(false);
    this.controlItems.push(backButton);

    controlsButton.on('pointerdown', () => this.showControls(true));
    backButton.on('pointerdown', () => this.showControls(false));
    resumeButton.on('pointerdown', () => this.close());

    this.root = scene.add.container(0, 0, [
      shade, panel, innerPanel, cornerMarks,
      ...this.mainItems,
      ...this.controlItems,
    ]).setScrollFactor(0).setDepth(DEPTH.overlay + 5).setVisible(false);

    this.escapeHandler = () => {
      if (this.opened) {
        if (this.showingControls) this.showControls(false);
        else this.close();
      } else {
        this.open();
      }
    };
    scene.input.keyboard?.on('keydown-ESC', this.escapeHandler);
  }

  get isOpen(): boolean {
    return this.opened;
  }

  open(): void {
    if (this.opened) return;
    this.opened = true;
    this.showControls(false);
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

  private showControls(show: boolean): void {
    this.showingControls = show;
    this.mainItems.forEach(item => (item as Phaser.GameObjects.GameObject).setVisible(!show));
    this.controlItems.forEach(item => item.setVisible(show));
  }

  private createButton(
    x: number,
    y: number,
    label: string,
    primary: boolean,
    width: number,
  ): Phaser.GameObjects.Container {
    const bg = this.scene.add.rectangle(0, 0, width, 25,
      primary ? 0x3b3029 : 0x242126, 1)
      .setStrokeStyle(1, primary ? 0xb08a52 : 0x6e5941, 1);

    const topLine = this.scene.add.rectangle(0, -10, width - 8, 1, 0x806746, 0.6);
    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'Georgia, Times New Roman, serif',
      fontSize: '9px',
      fontStyle: 'bold',
      color: primary ? '#eadbbd' : '#c8b99e',
      letterSpacing: 1,
      resolution: 2,
    }).setOrigin(0.5);

    const button = this.scene.add.container(x, y, [bg, topLine, text])
      .setSize(width, 25)
      .setInteractive(new Phaser.Geom.Rectangle(-width / 2, -12.5, width, 25),
        Phaser.Geom.Rectangle.Contains);

    button.on('pointerover', () => {
      bg.setFillStyle(0x51402f, 1);
      bg.setStrokeStyle(1, 0xd0aa6b, 1);
      text.setColor('#fff0cf');
    });
    button.on('pointerout', () => {
      bg.setFillStyle(primary ? 0x3b3029 : 0x242126, 1);
      bg.setStrokeStyle(1, primary ? 0xb08a52 : 0x6e5941, 1);
      text.setColor(primary ? '#eadbbd' : '#c8b99e');
    });
    return button;
  }
}
