import Phaser from 'phaser';
import { COLORS, DEPTH, VIEW } from '../config/GameConfig';
import { Player, type PlayerInput } from '../entities/Player';
import { Hud } from '../ui/Hud';

const TILE = 16;
const SPAWN_POINT = { x: 60, y: VIEW.groundY };
const FLOOR_TOP = VIEW.groundY;
const WORLD_PLATFORMS = [
  { x: 280, y: 202, width: 144 },
  { x: 520, y: 174, width: 112 },
  { x: 760, y: 210, width: 160 },
  { x: 1050, y: 184, width: 144 },
  { x: 1320, y: 205, width: 176 },
  { x: 1630, y: 172, width: 128 },
  { x: 1870, y: 208, width: 160 },
] as const;

/**
 * Monde 2 — niveau latéral construit en tuiles de décor dessinées.
 * Les spritesheets top-down du pack Undead/Cursed ne sont volontairement
 * plus utilisés comme une grille de plateformes : leurs frames ne forment
 * pas un tileset side-scroller ordonné.
 */
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

    this.physics.world.setBounds(0, 0, VIEW.worldWidth, VIEW.height);
    this.cameras.main.setBounds(0, 0, VIEW.worldWidth, VIEW.height);
    this.cameras.main.setBackgroundColor(0x10111a);

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

  /** Fond en plans successifs : ciel, lune, montagnes et silhouettes mortes. */
  private createBackdrop(): void {
    const bg = this.add.graphics().setDepth(DEPTH.backdrop - 4);
    bg.fillGradientStyle(0x111522, 0x111522, 0x25202b, 0x25202b, 1);
    bg.fillRect(0, 0, VIEW.worldWidth, VIEW.height);

    // Lueur lunaire et halo.
    bg.fillStyle(0xb8b4a5, 0.035);
    bg.fillCircle(1510, 58, 62);
    bg.fillStyle(0xc9c2aa, 0.8);
    bg.fillCircle(1510, 58, 19);
    bg.fillStyle(0x25202b, 1);
    bg.fillCircle(1518, 51, 18);

    // Crêtes lointaines : silhouettes larges, volontairement peu contrastées.
    bg.fillStyle(0x1a1b27, 1);
    bg.fillPoints([
      { x: 0, y: 174 }, { x: 130, y: 112 }, { x: 245, y: 164 },
      { x: 390, y: 104 }, { x: 540, y: 160 }, { x: 700, y: 118 },
      { x: 865, y: 165 }, { x: 1030, y: 105 }, { x: 1190, y: 164 },
      { x: 1370, y: 112 }, { x: 1530, y: 160 }, { x: 1710, y: 106 },
      { x: 1880, y: 162 }, { x: 2080, y: 118 }, { x: 2080, y: 270 }, { x: 0, y: 270 },
    ], true);

    // Pins et branches mortes au second plan.
    const trees = this.add.graphics().setDepth(DEPTH.backdrop - 2);
    for (let x = 90, i = 0; x < VIEW.worldWidth; x += 185, i += 1) {
      const baseY = 232 + (i % 3) * 5;
      const height = 76 + (i % 4) * 15;
      trees.lineStyle(5, 0x171820, 1);
      trees.lineBetween(x, baseY, x + ((i % 2) ? 5 : -4), baseY - height);
      trees.lineStyle(2, 0x171820, 1);
      for (let branch = 0; branch < 4; branch += 1) {
        const y = baseY - 18 - branch * 14;
        const direction = branch % 2 ? -1 : 1;
        trees.lineBetween(x, y, x + direction * (18 + (branch % 3) * 5), y - 12);
        trees.lineBetween(x + direction * (18 + (branch % 3) * 5), y - 12, x + direction * 27, y - 22);
      }
    }

    // Brume basse, non interactive.
    const mist = this.add.graphics().setDepth(DEPTH.backdrop - 1);
    mist.fillStyle(0x8b8790, 0.045);
    for (let x = 0; x < VIEW.worldWidth; x += 240) {
      mist.fillEllipse(x + 100, 224, 210, 28);
    }

    // Un léger voile sombre conserve la lisibilité du personnage et du HUD.
    this.add.rectangle(0, 0, VIEW.worldWidth, VIEW.height, 0x090912, 0.12)
      .setOrigin(0)
      .setDepth(DEPTH.backdrop + 1);
  }

  /** Sol et plateformes dessinés en blocs pixel-art cohérents, avec collision. */
  private createPlatforms(): void {
    this.platformGroup = this.physics.add.staticGroup();

    this.addSolidSurface(VIEW.worldWidth / 2, FLOOR_TOP, VIEW.worldWidth, 64, 0);

    for (const platform of WORLD_PLATFORMS) {
      this.addSolidSurface(platform.x, platform.y, platform.width, 28, 0);
    }

    this.addWorldProps();
  }

  private addSolidSurface(centerX: number, topY: number, width: number, height: number, _unused: number): void {
    const left = Math.round(centerX - width / 2);
    const top = Math.round(topY);
    const bodyObject = this.add.rectangle(centerX, top + height / 2, width, height, 0x000000, 0);
    bodyObject.setDepth(DEPTH.platform);
    this.platformGroup.add(bodyObject);
    (bodyObject.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    const art = this.add.graphics().setDepth(DEPTH.platform - 0.1);
    const bottom = top + height;
    art.fillStyle(0x34333a, 1);
    art.fillRect(left, top + 4, width, height - 4);
    art.fillStyle(0x55504d, 1);
    art.fillRect(left, top, width, 5);
    art.fillStyle(0x777064, 1);
    art.fillRect(left, top, width, 2);
    art.fillStyle(0x24242c, 1);
    art.fillRect(left, top + 9, width, 3);

    // Joints, éclats et fissures déterministes : aucun index de spritesheet aléatoire.
    for (let x = left, column = 0; x < left + width; x += TILE, column += 1) {
      const variation = (column * 17 + Math.floor(top / TILE) * 11) % 7;
      const blockY = top + 12 + (variation % 3) * 5;
      art.fillStyle(variation % 2 ? 0x49464a : 0x3d3b42, 1);
      art.fillRect(x + 1, blockY, TILE - 2, 5);
      art.fillStyle(0x24242b, 1);
      art.fillRect(x + TILE - 1, top + 8, 1, Math.max(5, height - 10));
      if (variation === 1 || variation === 4) {
        art.fillStyle(0x827968, 1);
        art.fillRect(x + 3, top + 2, 3, 1);
      }
      if (variation === 2 || variation === 5) {
        art.fillStyle(0x1c2023, 1);
        art.fillRect(x + 5, blockY + 5, 5, 1);
      }
    }

    // Racines et petites stalactites sous les plateformes aériennes.
    if (top < FLOOR_TOP) {
      art.fillStyle(0x24232b, 1);
      for (let x = left + 12; x < left + width - 5; x += 37) {
        const length = 4 + ((x + top) % 9);
        art.fillTriangle(x, bottom - 1, x + 5, bottom - 1, x + 2, bottom + length);
      }
    }
  }

  /** Props issus des atlas existants : arbres brisés, tombes, rochers et racines. */
  private addWorldProps(): void {
    const props: Array<{ x: number; y: number; atlas: string; frame: string; scale?: number }> = [
      { x: 170, y: FLOOR_TOP, atlas: 'world2-undead-atlas', frame: 'broken_tree_shadow2_1', scale: 1.1 },
      { x: 430, y: FLOOR_TOP, atlas: 'world2-undead-atlas', frame: 'grave_shadow2_1' },
      { x: 690, y: FLOOR_TOP, atlas: 'world2-cursed-atlas', frame: 'rock3_shadow2_1', scale: 1.2 },
      { x: 930, y: FLOOR_TOP, atlas: 'world2-cursed-atlas', frame: 'spike_plant_shadow2_1' },
      { x: 1190, y: FLOOR_TOP, atlas: 'world2-undead-atlas', frame: 'bones_shadow2_1' },
      { x: 1480, y: FLOOR_TOP, atlas: 'world2-undead-atlas', frame: 'broken_tree_shadow2_1', scale: 1.25 },
      { x: 1770, y: FLOOR_TOP, atlas: 'world2-cursed-atlas', frame: 'rock3_shadow2_1' },
      { x: 1990, y: FLOOR_TOP, atlas: 'world2-undead-atlas', frame: 'grave_shadow2_1' },
    ];

    for (const prop of props) {
      if (!this.textures.exists(prop.atlas) || !this.textures.get(prop.atlas).has(prop.frame)) continue;
      this.add.image(prop.x, prop.y, prop.atlas, prop.frame)
        .setOrigin(0.5, 1)
        .setScale(prop.scale ?? 1)
        .setDepth(DEPTH.prop);
    }

    const animated = this.add.sprite(570, FLOOR_TOP, 'world2-undead-anim1')
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
