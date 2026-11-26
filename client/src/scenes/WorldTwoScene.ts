import Phaser from 'phaser';
import { DEPTH, VIEW } from '../config/GameConfig';
import { Player, type PlayerInput } from '../entities/Player';
import { Hud } from '../ui/Hud';

const TILE = 16;
const GROUND_SEGMENT = 16;
const SPAWN_POINT = { x: 60, y: VIEW.groundY };
const FLOOR_TOP = VIEW.groundY;
const WORLD_PLATFORMS = [
  { x: 190, y: 222, width: 104 },
  { x: 335, y: 207, width: 112 },
  { x: 485, y: 220, width: 104 },
  { x: 635, y: 198, width: 112 },
  { x: 785, y: 216, width: 104 },
  { x: 935, y: 194, width: 112 },
  { x: 1085, y: 212, width: 104 },
  { x: 1235, y: 190, width: 112 },
  { x: 1385, y: 210, width: 104 },
  { x: 1535, y: 188, width: 112 },
  { x: 1685, y: 210, width: 104 },
  { x: 1835, y: 192, width: 112 },
  { x: 1980, y: 214, width: 96 },
] as const;

const GROUND_RELIEF = [0, 0, -2, -4, -2, 0, 2, 0, -2, -4, -2, 0, 2, 0, -2, -4] as const;
const groundYAt = (x: number): number => FLOOR_TOP + GROUND_RELIEF[Math.floor(Math.max(0, x) / 128) % GROUND_RELIEF.length];

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

  /** Terrain irrégulier avec collisions segmentées, relief et détails intégrés. */
  private createPlatforms(): void {
    this.platformGroup = this.physics.add.staticGroup();
    this.createNaturalGround();

    for (const platform of WORLD_PLATFORMS) {
      this.addRockLedge(platform.x, platform.y, platform.width);
    }

    this.addWorldProps();
  }

  private createNaturalGround(): void {
    const ground = this.add.graphics().setDepth(DEPTH.platform - 0.2);
    const topPoints: Phaser.Geom.Point[] = [{ x: 0, y: groundYAt(0) }];

    for (let x = 0; x <= VIEW.worldWidth; x += GROUND_SEGMENT) {
      const top = groundYAt(x);
      const bodyHeight = VIEW.height - top + 18;
      const collider = this.add.rectangle(
        x + GROUND_SEGMENT / 2,
        top + bodyHeight / 2,
        GROUND_SEGMENT + 1,
        bodyHeight,
        0x000000,
        0,
      );
      this.platformGroup.add(collider);
      (collider.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      topPoints.push(new Phaser.Geom.Point(x, top));
    }
    topPoints.push(new Phaser.Geom.Point(VIEW.worldWidth, VIEW.height + 24));
    topPoints.push(new Phaser.Geom.Point(0, VIEW.height + 24));

    ground.fillStyle(0x24232b, 1);
    ground.fillPoints(topPoints, true);
    ground.fillStyle(0x393740, 1);
    ground.fillPoints([
      { x: 0, y: 252 }, { x: 240, y: 251 }, { x: 430, y: 254 },
      { x: 680, y: 250 }, { x: 920, y: 253 }, { x: 1180, y: 250 },
      { x: 1440, y: 254 }, { x: 1700, y: 251 }, { x: 2080, y: 253 },
      { x: 2080, y: 270 }, { x: 0, y: 270 },
    ], true);

    // Strates rocheuses horizontales, interrompues pour éviter l'effet de briques.
    for (let row = 0; row < 3; row += 1) {
      const y = 258 + row * 5;
      ground.lineStyle(1, row === 0 ? 0x4a4549 : 0x302d35, 0.9);
      for (let x = 0; x < VIEW.worldWidth; x += 64) {
        const skip = ((x / 64 + row * 3) % 5) === 0;
        if (!skip) ground.lineBetween(x + 4, y, x + 42 + ((x / 64) % 3) * 5, y + (row % 2));
      }
    }

    // Bord supérieur érodé et petits éclats minéraux.
    for (let x = 8; x < VIEW.worldWidth; x += 24) {
      const y = groundYAt(x);
      const variation = (x * 13) % 9;
      ground.fillStyle(variation % 2 ? 0x777064 : 0x625d58, 0.95);
      ground.fillRect(x, y, 5 + (variation % 4), 1);
      ground.fillStyle(0x171820, 0.9);
      ground.fillTriangle(x + 7, y + 3, x + 12, y + 3, x + 9, y + 7 + (variation % 4));
      if (variation === 2 || variation === 6) {
        ground.lineStyle(1, 0x171820, 0.9);
        ground.lineBetween(x + 3, y + 8, x + 7, y + 12);
        ground.lineBetween(x + 7, y + 12, x + 5, y + 17);
      }
    }

    this.addGroundDetails();
  }

  /** Pierres, fissures et herbes mortes posées sur la surface réelle du terrain. */
  private addGroundDetails(): void {
    const detail = this.add.graphics().setDepth(DEPTH.platform + 0.15);
    for (let x = 34; x < VIEW.worldWidth - 20; x += 47) {
      const y = groundYAt(x);
      const seed = (x * 37) % 17;
      if (seed % 3 === 0) {
        detail.fillStyle(0x625c58, 1);
        detail.fillTriangle(x, y - 1, x + 7, y - 2, x + 4, y - 5);
        detail.fillStyle(0x34323a, 1);
        detail.fillTriangle(x + 8, y, x + 14, y - 1, x + 11, y - 4);
      } else if (seed % 3 === 1) {
        detail.lineStyle(1, 0x171820, 1);
        detail.lineBetween(x, y + 5, x + 4, y + 9);
        detail.lineBetween(x + 4, y + 9, x + 8, y + 7);
      } else {
        detail.lineStyle(1, 0x343c35, 1);
        detail.lineBetween(x, y - 1, x - 2, y - 8);
        detail.lineBetween(x - 2, y - 8, x - 6, y - 11);
        detail.lineBetween(x - 1, y - 5, x + 4, y - 10);
      }
    }
  }

  /** Ledge rocheux : silhouette ébréchée, strates, fissures et racines sous la dalle. */
  private addRockLedge(centerX: number, topY: number, width: number): void {
    const left = Math.round(centerX - width / 2);
    const right = left + width;
    const bottom = topY + 30;
    const collider = this.add.rectangle(centerX, topY + 12, width, 20, 0x000000, 0);
    collider.setDepth(DEPTH.platform);
    this.platformGroup.add(collider);
    (collider.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    const rock = this.add.graphics().setDepth(DEPTH.platform - 0.05);
    const silhouette = [
      { x: left, y: topY + 7 }, { x: left + 7, y: topY + 3 },
      { x: left + 18, y: topY + 2 }, { x: left + 29, y: topY + 4 },
      { x: left + 42, y: topY }, { x: left + 57, y: topY + 2 },
      { x: left + 71, y: topY + 1 }, { x: right - 17, y: topY + 4 },
      { x: right - 6, y: topY + 2 }, { x: right, y: topY + 7 },
      { x: right - 3, y: bottom - 4 }, { x: right - 15, y: bottom },
      { x: left + 20, y: bottom - 2 }, { x: left + 8, y: bottom - 7 },
    ];
    rock.fillStyle(0x292831, 1);
    rock.fillPoints(silhouette, true);
    rock.fillStyle(0x55504e, 1);
    rock.fillPoints([
      { x: left, y: topY + 7 }, { x: left + 7, y: topY + 3 },
      { x: left + 18, y: topY + 2 }, { x: left + 29, y: topY + 4 },
      { x: left + 42, y: topY }, { x: left + 57, y: topY + 2 },
      { x: left + 71, y: topY + 1 }, { x: right - 17, y: topY + 4 },
      { x: right - 6, y: topY + 2 }, { x: right, y: topY + 7 },
      { x: right - 3, y: topY + 13 }, { x: left + 5, y: topY + 13 },
    ], true);
    rock.fillStyle(0x81786a, 1);
    rock.fillPoints([
      { x: left + 7, y: topY + 3 }, { x: left + 18, y: topY + 2 },
      { x: left + 29, y: topY + 4 }, { x: left + 42, y: topY },
      { x: left + 57, y: topY + 2 }, { x: left + 71, y: topY + 1 },
      { x: left + 71, y: topY + 4 }, { x: left + 42, y: topY + 4 },
      { x: left + 18, y: topY + 6 }, { x: left + 7, y: topY + 6 },
    ], true);

    // Couches rocheuses et fractures non répétitives.
    for (let x = left + 8, i = 0; x < right - 10; x += 23, i += 1) {
      const y = topY + 15 + (i % 2) * 5;
      rock.lineStyle(1, i % 2 ? 0x1c1d25 : 0x71685e, 0.9);
      rock.lineBetween(x, y, Math.min(right - 4, x + 12 + (i % 3) * 3), y - 2);
      rock.fillStyle(i % 2 ? 0x3c3940 : 0x48434a, 1);
      rock.fillTriangle(x + 2, y + 4, x + 11, y + 3, x + 7, y + 8);
      if (i % 3 === 0) {
        rock.lineStyle(1, 0x171820, 1);
        rock.lineBetween(x + 4, topY + 7, x + 8, topY + 12);
        rock.lineBetween(x + 8, topY + 12, x + 6, topY + 16);
      }
    }

    // Racines courtes et pointes de roche sous les surplombs.
    for (let x = left + 15, i = 0; x < right - 8; x += 31, i += 1) {
      const length = 5 + (i % 3) * 4;
      rock.fillStyle(0x211f28, 1);
      rock.fillTriangle(x, bottom - 4, x + 5, bottom - 4, x + 2, bottom + length);
      if (i % 2 === 0) {
        rock.lineStyle(1, 0x34352f, 1);
        rock.lineBetween(x + 2, topY + 5, x - 3, topY + 15);
      }
    }

    // Quelques touffes de mousse morte, très discrètes sur le rebord.
    rock.lineStyle(1, 0x59604a, 1);
    rock.lineBetween(left + 20, topY + 2, left + 18, topY - 3);
    rock.lineBetween(left + 20, topY + 2, left + 24, topY - 2);
    rock.lineBetween(right - 27, topY + 3, right - 29, topY - 2);
  }

  /** Props compacts, ancrés sur le sol (les grandes plantes 256px sont écartées des plateformes). */
  private addWorldProps(): void {
    const props: Array<{ x: number; atlas: string; frame: string; scale: number }> = [
      { x: 270, atlas: 'world2-cursed-atlas', frame: 'rock3_shadow2_1', scale: 0.8 },
      { x: 610, atlas: 'world2-undead-atlas', frame: 'bones_shadow1_2', scale: 0.85 },
      { x: 980, atlas: 'world2-cursed-atlas', frame: 'rock3_shadow2_1', scale: 0.9 },
      { x: 1320, atlas: 'world2-undead-atlas', frame: 'bones_shadow1_2', scale: 0.8 },
      { x: 1710, atlas: 'world2-cursed-atlas', frame: 'rock3_shadow2_1', scale: 0.85 },
      { x: 1950, atlas: 'world2-undead-atlas', frame: 'bones_shadow1_2', scale: 0.8 },
    ];

    for (const prop of props) {
      if (!this.textures.exists(prop.atlas) || !this.textures.get(prop.atlas).has(prop.frame)) continue;
      this.add.image(prop.x, groundYAt(prop.x), prop.atlas, prop.frame)
        .setOrigin(0.5, 1)
        .setScale(prop.scale)
        .setDepth(DEPTH.prop);
    }
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
