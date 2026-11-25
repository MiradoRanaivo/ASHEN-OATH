import Phaser from 'phaser';
import { COLORS, DEPTH, VIEW } from '../config/GameConfig';
import { Player, type PlayerInput } from '../entities/Player';
import { Hud } from '../ui/Hud';

const SPAWN_POINT = { x: 60, y: VIEW.groundY };

export class WorldTwoScene extends Phaser.Scene {
  private player!: Player;
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  private hud!: Hud;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyAltLeft!: Phaser.Input.Keyboard.Key;
  private keyJumpZ!: Phaser.Input.Keyboard.Key;
  private keyLight!: Phaser.Input.Keyboard.Key;
  private keyHeavy!: Phaser.Input.Keyboard.Key;
  private keyDodge!: Phaser.Input.Keyboard.Key;
  private keyParry!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('WorldTwoScene');
  }

  create(): void {
    this.physics.world.setBounds(0, 0, VIEW.worldWidth, VIEW.height);
    this.cameras.main.setBounds(0, 0, VIEW.worldWidth, VIEW.height);
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.createBackdrop();
    this.createPlatforms();

    this.player = new Player(this, SPAWN_POINT.x, SPAWN_POINT.y);
    this.physics.add.collider(this.player, this.platformGroup);

    this.hud = new Hud(this);
    this.hud.setRegion('Terres maudites');
    this.bindInput();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(50, 30);
    this.cameras.main.setRoundPixels(true);
  }

  update(_time: number, deltaMs: number): void {
    const delta = Math.min(deltaMs, 50);
    this.player.updatePlayer(this.readInput(), delta);
    this.hud.update(this.player.hp, this.player.stamina, this.player.riposteReady);
  }

  private createBackdrop(): void {
    const groundRows = 17;
    const groundCols = Math.ceil(VIEW.worldWidth / 16);

    for (let row = 0; row < groundRows; row++) {
      for (let col = 0; col < groundCols; col++) {
        const cursed = row < 8;
        const rowInSheet = cursed ? 7 + ((row + col) % 12) : 62 + ((row + col) % 16);
        const colInSheet = cursed ? 8 + ((col * 3 + row) % 24) : 5 + ((col * 3 + row) % 18);
        const texture = cursed ? 'world2-cursed-ground' : 'world2-undead-ground';
        const frame = cursed
          ? `cursed-tile-${rowInSheet}-${colInSheet}`
          : `undead-tile-${rowInSheet}-${colInSheet}`;

        this.add.image(col * 16 + 8, row * 16 + 8, texture, frame)
          .setDepth(DEPTH.backdrop);
      }
    }

    const shade = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.backdrop + 2);
    shade.fillStyle(0x0a0b12, 0.28);
    shade.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  private createPlatforms(): void {
    this.platformGroup = this.physics.add.staticGroup();

    const platforms = [
      { x: 240, y: 250, width: 480 },
      { x: 660, y: 230, width: 170 },
      { x: 900, y: 250, width: 260 },
      { x: 1180, y: 210, width: 160 },
      { x: 1450, y: 250, width: 300 },
      { x: 1720, y: 220, width: 160 },
    ];

    for (const platform of platforms) {
      const ledge = this.add.rectangle(platform.x, platform.y + 8, platform.width, 16, 0x4a5266, 0);
      ledge.setDepth(DEPTH.platform);
      this.platformGroup.add(ledge);

      const body = ledge.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();

      for (let x = platform.x - platform.width / 2 + 16; x < platform.x + platform.width / 2; x += 32) {
        this.add.image(x, platform.y, 'world2-undead-atlas', 'grave_shadow1_1')
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.platform + 1);
      }
    }

    this.add.image(520, 194, 'world2-cursed-atlas', 'ruins_shadow1_3')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.prop);
    this.add.image(1320, 194, 'world2-undead-atlas', 'broken_tree_shadow1_1')
      .setOrigin(0.5, 1)
      .setFlipX(true)
      .setDepth(DEPTH.prop);

    const animated = this.add.sprite(760, VIEW.groundY, 'world2-undead-anim1')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.prop);
    animated.play('world2-undead-anim1-loop');
  }

  private readInput(): PlayerInput {
    return {
      left: this.cursors.left.isDown || this.keyLeft.isDown || this.keyAltLeft.isDown,
      right: this.cursors.right.isDown || this.keyRight.isDown,
      jumpPressed:
        Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
        Phaser.Input.Keyboard.JustDown(this.cursors.space) ||
        Phaser.Input.Keyboard.JustDown(this.keyJumpZ),
      lightPressed: Phaser.Input.Keyboard.JustDown(this.keyLight),
      heavyPressed: Phaser.Input.Keyboard.JustDown(this.keyHeavy),
      dodgePressed: Phaser.Input.Keyboard.JustDown(this.keyDodge),
      parryPressed: Phaser.Input.Keyboard.JustDown(this.keyParry),
    };
  }

  private bindInput(): void {
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keyLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyRight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyAltLeft = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyJumpZ = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyLight = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J);
    this.keyHeavy = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.keyDodge = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.keyParry = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I);
  }
}
