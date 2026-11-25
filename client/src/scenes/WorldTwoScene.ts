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
    const animationConfig = this.cache.json.get('world2-animation-config') as {
      'undead-anim1-shadow2': { frameWidth: number; frameHeight: number; frames: number; frameDurationMs: number }
    };
    const animation = animationConfig['undead-anim1-shadow2'];

    if (!this.anims.exists('world2-undead-anim1-loop')) {
      this.anims.create({
        key: 'world2-undead-anim1-loop',
        frames: this.anims.generateFrameNumbers('world2-undead-anim1', { start: 0, end: animation.frames - 1 }),
        frameRate: 1000 / animation.frameDurationMs,
        repeat: -1,
      });
    }

    this.cache.json.get('world2-collision-config');

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
    const groundRows = Math.ceil(VIEW.groundY / 16);
    const groundCols = Math.ceil(VIEW.worldWidth / 16);

    for (let row = 0; row < groundRows; row++) {
      for (let col = 0; col < groundCols; col++) {
        const texture = row < 10 ? 'world2-undead-ground' : 'world2-cursed-ground';
        const frame = row < 10
          ? (row * 26 + col * 3) % 2262
          : (row * 40 + col * 3) % 2240;
        this.add.image(col * 16 + 8, row * 16 + 8, texture, frame)
          .setDepth(DEPTH.backdrop);
      }
    }

    const shade = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.backdrop + 1);
    shade.fillStyle(0x090915, 0.18);
    shade.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  private createPlatforms(): void {
    this.platformGroup = this.physics.add.staticGroup();

    const platforms = [
      { x: 240, y: 250, width: 480 },
      { x: 660, y: 220, width: 224 },
      { x: 980, y: 250, width: 320 },
    ];

    for (const platform of platforms) {
      const ledge = this.add.rectangle(platform.x, platform.y + 8, platform.width, 16, 0x4a5266, 0);
      ledge.setDepth(DEPTH.platform);
      this.platformGroup.add(ledge);

      const body = ledge.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();

      for (let x = platform.x - platform.width / 2 + 8; x < platform.x + platform.width / 2; x += 16) {
        const tileRow = Math.floor(platform.y / 16);
        const tileCol = Math.floor(x / 16);
        const frame = (tileRow * 26 + tileCol) % 2262;
        this.add.image(x, platform.y, 'world2-undead-ground', frame)
          .setOrigin(0.5, 1)
          .setDepth(DEPTH.platform);
      }
    }

    this.add.image(8 * 16 + 8, 250, 'world2-undead-atlas', 'broken_tree_shadow2_1')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.prop);

    this.add.image(12 * 16 + 8, 250, 'world2-undead-atlas', 'grave_shadow2_1')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.prop);

    this.add.image(20 * 16 + 8, 250, 'world2-cursed-atlas', 'rock3_shadow2_1')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.prop);

    this.add.image(26 * 16 + 8, 220, 'world2-cursed-atlas', 'spike_plant_shadow2_1')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.prop);

    this.add.image(31 * 16 + 8, 250, 'world2-cursed-atlas', 'bones_shadow2_1')
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.prop);

    const animated = this.add.sprite(15 * 16 + 8, 250, 'world2-undead-anim1')
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
