import Phaser from 'phaser';
import { BOSS_AI, COLORS, DEPTH, PLAYER, VIEW } from '../config/GameConfig';
import { ANIM } from '../data/Animations';
import { Enemy, type EnemySpawn } from '../entities/Enemy';
import { Player, type PlayerInput } from '../entities/Player';
import { Hud } from '../ui/Hud';
import { Boss } from '../entities/Boss';
import { PauseMenu } from '../ui/PauseMenu';

interface PlatformDef {
  readonly x: number;
  readonly surface: number;
  readonly width: number;
}

const PLATFORM_HEIGHT = 16;
const BLOCK = 16;
const REGION_WIDTH = VIEW.worldWidth / 4;
const BOSS_ARENA_LEFT = 1360;
const BOSS_ARENA_RIGHT = 2000;
const BACKGROUND_SCALE = 0.84;
const BACKGROUND_SURFACE_Y = 334;
const REGIONS = [
  { name: 'Crypte oubliée', backgroundTint: 0xffffff, atmosphere: 0x17121c, atmosphereAlpha: 0.08, ground: 0x51474a, edge: 0xa18a73, side: 0x282328 },
  { name: 'Forêt des racines', backgroundTint: 0xc1d4a0, atmosphere: 0x19301e, atmosphereAlpha: 0.22, ground: 0x49583c, edge: 0x9cae6e, side: 0x252d23 },
  { name: 'Village déchu', backgroundTint: 0xf0c9a1, atmosphere: 0x3c2119, atmosphereAlpha: 0.2, ground: 0x665044, edge: 0xb89168, side: 0x342925 },
  { name: 'Trône du silence', backgroundTint: 0xaecbf0, atmosphere: 0x14283e, atmosphereAlpha: 0.24, ground: 0x526576, edge: 0xb1cadb, side: 0x283644 },
] as const;

const PLATFORMS: readonly PlatformDef[] = [
  { x: 700, surface: 218, width: 140 },
  { x: 1060, surface: 230, width: 160 },
  { x: 660, surface: 186, width: 90 },
  { x: 1000, surface: 190, width: 90 },
];

const ENEMIES: readonly EnemySpawn[] = [
  { kind: 'skeleton', x: 330, y: 250, patrolMin: 220, patrolMax: 430 },
  { kind: 'zombie', x: 825, y: 250, patrolMin: 790, patrolMax: 870 },
  { kind: 'bandit', x: 1210, y: 250, patrolMin: 1190, patrolMax: 1300 },
  { kind: 'demon', x: 1320, y: 250, patrolMin: 1240, patrolMax: 1360 },
];

const SPAWN_POINT = { x: 60, y: VIEW.groundY };

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  private hud!: Hud;
  private pauseMenu!: PauseMenu;
  private background!: Phaser.GameObjects.Image;
  private atmosphere!: Phaser.GameObjects.Rectangle;
  private activeRegion = -1;
  private blockSprites: Phaser.GameObjects.TileSprite[] = [];
  private deathOverlay!: Phaser.GameObjects.Container;
  private respawnPending = false;
  private boss!: Boss;
  private bossBeamVisual!: Phaser.GameObjects.Image;
  private bossAoeVisual!: Phaser.GameObjects.Image;
  private bossArenaGate!: Phaser.GameObjects.Rectangle;
  private bossArenaGateBody!: Phaser.Physics.Arcade.StaticBody;
  private bossArenaGateVisible = false;

  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyAltLeft!: Phaser.Input.Keyboard.Key;
  private keyJumpZ!: Phaser.Input.Keyboard.Key;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyLight!: Phaser.Input.Keyboard.Key;
  private keyHeavy!: Phaser.Input.Keyboard.Key;
  private keyDodge!: Phaser.Input.Keyboard.Key;
  private keyParry!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.physics.world.setBounds(0, 0, VIEW.worldWidth, VIEW.height);
    this.cameras.main.setBounds(0, 0, VIEW.worldWidth, VIEW.height);
    this.cameras.main.setBackgroundColor(COLORS.background);

    this.createBlockTextures();
    this.createBackdrop();
    this.createPlatforms();
    this.createBossArena();

    this.player = new Player(this, SPAWN_POINT.x, SPAWN_POINT.y);
    this.physics.add.collider(this.player, this.platformGroup);

    this.createEnemies();

    this.hud = new Hud(this);
    this.pauseMenu = new PauseMenu(this);
    this.createDeathOverlay();
    this.bindInput();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(50, 30);
    this.cameras.main.setRoundPixels(true);

    this.events.on('enemy-died', (enemy: Enemy) => {
      this.playEffect(ANIM.death, enemy.x, enemy.y - 26, 0.42, DEPTH.effect);
    });

    this.boss = new Boss(this, (BOSS_ARENA_LEFT + BOSS_ARENA_RIGHT) / 2, VIEW.groundY);
    this.bossBeamVisual = this.add.image(0, 0, 'boss-beam-visual')
      .setDepth(DEPTH.effect)
      .setVisible(false);
    this.bossAoeVisual = this.add.image(0, 0, 'boss-aoe-visual')
      .setDepth(DEPTH.effect - 0.1)
      .setOrigin(0.5, 1)
      .setDisplaySize(240, 110)
      .setVisible(false);
    this.physics.add.collider(this.boss, this.platformGroup);
    this.physics.add.collider(
      this.player,
      this.boss,
      undefined,
      () => !this.player.isDodging,
    );
    this.physics.add.collider(this.player, this.bossArenaGate);
    this.physics.add.collider(this.boss, this.bossArenaGate);
  }

  update(_time: number, deltaMs: number): void {
    if (this.pauseMenu?.isOpen) return;
    const delta = Math.min(deltaMs, 50);
    this.player.updatePlayer(this.readInput(), delta);

    for (const enemy of this.enemies) {
      enemy.updateEnemy(this.player, delta);
    }

    this.boss.updateAI(this.player, delta);
    this.updateBossAttackVisuals(_time);
    this.updateBossArena();

    this.updateBackdropParallax();

    const region = Math.min(3, Math.floor(this.player.x / REGION_WIDTH));
    if (region !== this.activeRegion) {
      this.activeRegion = region;
      this.background.setTint(REGIONS[region].backgroundTint);
      for (const block of this.blockSprites) block.setTint(REGIONS[region].backgroundTint);
      this.atmosphere.setFillStyle(REGIONS[region].atmosphere, REGIONS[region].atmosphereAlpha);
    }
    this.hud.setRegion(REGIONS[region].name);

    this.resolvePlayerAttack();
    this.resolveBossAttack();
    this.resolveEnemyAttacks();
    this.hud.update(this.player.hp, this.player.stamina, this.player.riposteReady, this.boss.hp, this.boss.maxHp, Math.abs(this.player.x - this.boss.x));
    this.handlePlayerDeath();
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

  private resolvePlayerAttack(): void {
    const box = this.player.getAttackBox();
    if (!box) {
      return;
    }
    for (const enemy of this.enemies) {
      if (enemy.isDead || !enemy.active) {
        continue;
      }
      const body = enemy.body as Phaser.Physics.Arcade.Body;
      const target = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      if (!Phaser.Geom.Intersects.RectangleToRectangle(box, target)) {
        continue;
      }
      const hit = enemy.receiveHit(
        this.player.attackId,
        this.player.getAttackDamage(),
        this.player.getAttackKnockback(),
        this.player.x,
      );
      if (hit) {
        this.playEffect(ANIM.impact, enemy.x, enemy.y - 30, 0.5, DEPTH.effect);
        this.player.consumeRiposte();
        this.cameras.main.shake(70, 0.003);
      }
    }

    if (this.boss.active && !this.boss.isDead) {
      const bossBody = this.boss.body as Phaser.Physics.Arcade.Body;
      const bossTarget = new Phaser.Geom.Rectangle(bossBody.x, bossBody.y, bossBody.width, bossBody.height);
      if (Phaser.Geom.Intersects.RectangleToRectangle(box, bossTarget)) {
        const hit = this.boss.receiveHit(
          this.player.attackId,
          this.player.getAttackDamage(),
          this.player.getAttackKnockback(),
          this.player.x,
        );
        if (hit) {
          this.playEffect(ANIM.impact, this.boss.x, this.boss.y - 55, 0.55, DEPTH.effect);
          this.player.consumeRiposte();
        }
      }
    }
  }

  private resolveBossAttack(): void {
    if (this.player.isDead) {
      return;
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const target = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
    for (const attack of this.boss.getAttackBoxes()) {
      if (!Phaser.Geom.Intersects.RectangleToRectangle(attack.box, target)) {
        continue;
      }

      const result = this.player.takeDamage(attack.damage, this.boss.x);
      if (result === 'hit') {
        this.playEffect(
          ANIM.damage,
          this.player.x,
          this.player.y - 30,
          attack.kind === 'magic' ? 0.6 : 0.45,
          DEPTH.effect,
        );
        this.cameras.main.shake(
          attack.kind === 'magic' ? 180 : 140,
          attack.kind === 'magic' ? 0.009 : 0.007,
        );
      } else if (result === 'parried') {
        this.playEffect(ANIM.impact, this.player.x + this.player.facing * 14, this.player.y - 32, 0.5, DEPTH.effect);
        this.cameras.main.flash(100, 240, 226, 170);
      }
    }
  }

  private updateBossAttackVisuals(time: number): void {
    const activeBoxes = this.boss.getAttackBoxes();
    const beamActive = activeBoxes.some((attack) => attack.kind === 'beam');
    const facingLeft = this.boss.flipX;
    this.bossBeamVisual
      .setVisible(beamActive)
      .setFlipX(facingLeft)
      .setOrigin(facingLeft ? 1 : 0, 0)
      .setPosition(this.boss.x + (facingLeft ? -20 : 20), this.boss.y - BOSS_AI.beamHeight - 20)
      .setDisplaySize(BOSS_AI.beamRange, BOSS_AI.beamHeight);

    const magicActive = activeBoxes.some((attack) => attack.kind === 'magic');
    this.bossAoeVisual
      .setVisible(magicActive)
      .setPosition(this.boss.x, this.boss.y)
      .setOrigin(0.5, 1)
      .setDisplaySize(BOSS_AI.magicRange, BOSS_AI.magicHeight)
      .setAlpha(0.78 + Math.sin(time / 55) * 0.18);
  }

  private createBossArena(): void {
    const arenaCenter = (BOSS_ARENA_LEFT + BOSS_ARENA_RIGHT) / 2;
    this.add.rectangle(arenaCenter, 210, BOSS_ARENA_RIGHT - BOSS_ARENA_LEFT, 80, 0x11101a, 0.28)
      .setDepth(DEPTH.backdrop + 3);

    // Piliers posés sur le sol : 2 blocs de large, 4 de haut, chapiteau en dalle.
    const pillarHeight = 4 * BLOCK;
    for (const x of [BOSS_ARENA_LEFT + 64, BOSS_ARENA_RIGHT - 64]) {
      const left = x - BLOCK;
      const top = VIEW.groundY - pillarHeight;
      this.addBlocks('block-wall', left, top + BLOCK, 2 * BLOCK, pillarHeight - BLOCK, DEPTH.prop);
      this.addBlocks('block-top', left, top, 2 * BLOCK, BLOCK, DEPTH.prop + 0.5);
    }

    // Autel en deux marches, posé sur le sol.
    this.addBlocks('block-top', arenaCenter - 3 * BLOCK, VIEW.groundY - BLOCK, 6 * BLOCK, BLOCK, DEPTH.prop);
    this.addBlocks('block-top', arenaCenter - 2 * BLOCK, VIEW.groundY - 2 * BLOCK, 4 * BLOCK, BLOCK, DEPTH.prop);

    // Braziers au pied de chaque pilier, côté intérieur de l'arène.
    for (const [x, dir] of [[BOSS_ARENA_LEFT + 64, 1], [BOSS_ARENA_RIGHT - 64, -1]] as const) {
      const bx = x + dir * 36;
      const brazierBase = this.add.rectangle(bx, VIEW.groundY - 4, 20, 8, 0x30262d)
        .setDepth(DEPTH.prop + 0.5);
      brazierBase.setStrokeStyle(1, 0x70543a);
      this.add.circle(bx, VIEW.groundY - 14, 7, 0xd4883e)
        .setDepth(DEPTH.effect)
        .setAlpha(0.95);
    }

    this.bossArenaGate = this.add.rectangle(BOSS_ARENA_LEFT, 214, 14, 72, 0x35232f)
      .setStrokeStyle(2, 0x7a5264)
      .setDepth(DEPTH.prop)
      .setVisible(false);
    this.physics.add.existing(this.bossArenaGate, true);
    this.bossArenaGateBody = this.bossArenaGate.body as Phaser.Physics.Arcade.StaticBody;
    this.bossArenaGateBody.enable = false;

    // Mur de fond de l'arène.
    const wallHeight = 5 * BLOCK + 8;
    this.addBlocks('block-wall', BOSS_ARENA_RIGHT - BLOCK / 2, VIEW.groundY - wallHeight + BLOCK, BLOCK, wallHeight - BLOCK, DEPTH.prop);
    this.addBlocks('block-top', BOSS_ARENA_RIGHT - BLOCK / 2, VIEW.groundY - wallHeight, BLOCK, BLOCK, DEPTH.prop + 0.5);
  }

  private updateBossArena(): void {
    const engaged = !this.boss.isDead && this.player.x >= BOSS_ARENA_LEFT - 20;
    if (engaged !== this.bossArenaGateVisible) {
      this.bossArenaGateVisible = engaged;
      this.bossArenaGate.setVisible(engaged);
      this.bossArenaGateBody.enable = engaged;
    }
  }

  private createPlatformSurface(left: number, surface: number, width: number): void {
    const centerX = left + width / 2;
    const ledge = this.add.rectangle(centerX, surface + PLATFORM_HEIGHT / 2, width, PLATFORM_HEIGHT, 0x38303b);
    ledge.setAlpha(0);
    this.platformGroup.add(ledge);
    (ledge.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();

    this.addBlocks('block-top', left, surface, width, PLATFORM_HEIGHT, DEPTH.platform + 2);
  }

  /** Pose une zone de blocs 16x16 : le motif reste aligné sur la grille du monde. */
  private addBlocks(
    texture: 'block-top' | 'block-wall',
    left: number,
    top: number,
    width: number,
    height: number,
    depth: number,
  ): Phaser.GameObjects.TileSprite {
    const sprite = this.add.tileSprite(left, top, width, height, texture)
      .setOrigin(0, 0)
      .setDepth(depth);
    sprite.tilePositionX = left % BLOCK;
    sprite.setTint(REGIONS[Math.max(0, this.activeRegion)].backgroundTint);
    this.blockSprites.push(sprite);
    return sprite;
  }

  /** Textures de blocs générées une seule fois : briques de pierre 16x16 (mur) et dalle avec rebord (dessus). */
  private createBlockTextures(): void {
    const draw = (key: string, withLip: boolean): void => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      const mortar = 0x1f1a22;
      const brick = [0x3f3641, 0x453b46, 0x3a313c, 0x483e49];
      let seed = withLip ? 7 : 3;
      const rand = (): number => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
      g.fillStyle(mortar, 1);
      g.fillRect(0, 0, BLOCK, BLOCK);
      const courses = [
        { y: 0, offset: 0 },
        { y: 8, offset: 4 },
      ];
      for (const course of courses) {
        for (let bx = course.offset - 8; bx < BLOCK; bx += 8) {
          const x0 = Math.max(0, bx) ;
          const x1 = Math.min(BLOCK, bx + 8);
          if (x1 - x0 <= 1) continue;
          g.fillStyle(brick[Math.floor(rand() * brick.length)], 1);
          g.fillRect(x0 + (bx < 0 ? 0 : 1), course.y + 1, x1 - x0 - 1, 6);
          g.fillStyle(0x594d58, 1);
          g.fillRect(x0 + (bx < 0 ? 0 : 1), course.y + 1, x1 - x0 - 1, 1);
        }
      }
      if (withLip) {
        g.fillStyle(0x9b8873, 1);
        g.fillRect(0, 0, BLOCK, 1);
        g.fillStyle(0x6f6159, 1);
        g.fillRect(0, 1, BLOCK, 2);
        g.fillStyle(0x4b414a, 1);
        g.fillRect(0, 3, BLOCK, 1);
      }
      g.generateTexture(key, BLOCK, BLOCK);
      g.destroy();
    };
    draw('block-wall', false);
    draw('block-top', true);
  }

  /** Le fond défile sur toute sa largeur pendant que la caméra traverse le monde. */
  private updateBackdropParallax(): void {
    const camera = this.cameras.main;
    const range = VIEW.worldWidth - VIEW.width;
    const progress = Phaser.Math.Clamp(camera.scrollX / range, 0, 1);
    const extra = Math.max(0, this.background.displayWidth - VIEW.width);
    this.background.x = Math.round(this.background.displayWidth / 2 - progress * extra);
  }

  private resolveEnemyAttacks(): void {
    for (const enemy of this.enemies) {
      const box = enemy.getAttackBox();
      if (!box) {
        continue;
      }
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const target = new Phaser.Geom.Rectangle(body.x, body.y, body.width, body.height);
      if (!Phaser.Geom.Intersects.RectangleToRectangle(box, target)) {
        continue;
      }
      const result = this.player.takeDamage(enemy.profile.damage, enemy.x);
      if (result === 'hit') {
        this.playEffect(ANIM.damage, this.player.x, this.player.y - 30, 0.38, DEPTH.effect);
        this.cameras.main.shake(120, 0.006);
      } else if (result === 'parried') {
        this.playEffect(ANIM.impact, this.player.x + this.player.facing * 14, this.player.y - 32, 0.45, DEPTH.effect);
        this.cameras.main.flash(90, 240, 226, 170);
      }
    }
  }

  private handlePlayerDeath(): void {
    if (!this.player.isDead || this.respawnPending) {
      return;
    }
    this.respawnPending = true;
    this.cameras.main.fadeOut(320, 0, 0, 0);
    this.time.delayedCall(360, () => {
      this.deathOverlay.setVisible(true);
      this.deathOverlay.setAlpha(0);
      this.tweens.add({ targets: this.deathOverlay, alpha: 1, duration: 420 });
    });

    this.time.delayedCall(PLAYER.respawnDelayMs, () => {
      this.deathOverlay.setVisible(false);
      this.player.respawn(SPAWN_POINT.x, SPAWN_POINT.y);
      for (const enemy of this.enemies) {
        enemy.reset();
      }
      this.boss.reset();
      this.cameras.main.fadeIn(360, 0, 0, 0);
      this.respawnPending = false;
    });
  }

  private createBackdrop(): void {
    const backgroundY = VIEW.groundY - (BACKGROUND_SURFACE_Y - 243) * BACKGROUND_SCALE;
    this.background = this.add.image(VIEW.width / 2, backgroundY, 'environment')
      .setScale(BACKGROUND_SCALE)
      .setScrollFactor(0)
      .setDepth(DEPTH.backdrop);

    this.atmosphere = this.add.rectangle(0, 0, VIEW.width, VIEW.height, REGIONS[0].atmosphere, REGIONS[0].atmosphereAlpha)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(DEPTH.backdrop + 1);

    const shade = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.backdrop + 2);
    shade.fillStyle(0x0b0a10, 0.28);
    shade.fillRect(0, 0, VIEW.width, VIEW.height);
    shade.fillStyle(0x0b0a10, 0.4);
    shade.fillRect(0, VIEW.height - 56, VIEW.width, 56);
  }

  private createPlatforms(): void {
    this.platformGroup = this.physics.add.staticGroup();
    this.createPlatformSurface(0, VIEW.groundY, VIEW.worldWidth);

    for (const platform of PLATFORMS) {
      const left = Math.round((platform.x - platform.width / 2) / BLOCK) * BLOCK;
      const width = Math.max(BLOCK, Math.round(platform.width / BLOCK) * BLOCK);
      this.createPlatformSurface(left, platform.surface, width);

      if (platform.surface < VIEW.groundY - 4) {
        const top = platform.surface + PLATFORM_HEIGHT;
        const pillarWidth = Math.min(width, 2 * BLOCK);
        const pillarLeft = left + Math.floor((width - pillarWidth) / 2 / BLOCK) * BLOCK;
        this.addBlocks('block-wall', pillarLeft, top, pillarWidth, VIEW.groundY - top, DEPTH.platform - 1);
      }
    }
  }

  private createEnemies(): void {
    this.enemies = ENEMIES.map((spawn) => {
      const enemy = new Enemy(this, spawn);
      this.physics.add.collider(enemy, this.platformGroup);
      return enemy;
    });
  }

  private createDeathOverlay(): void {
    const backdrop = this.add.rectangle(0, 0, VIEW.width, VIEW.height, 0x08070a, 0.82).setOrigin(0);
    const title = this.add.text(VIEW.width / 2, VIEW.height / 2 - 8, 'VOUS ÊTES MORT', {
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      color: '#a83a3a',
    }).setOrigin(0.5);
    const hint = this.add.text(VIEW.width / 2, VIEW.height / 2 + 12, 'Le sanctuaire vous rappelle', {
      fontFamily: 'Georgia, serif',
      fontSize: '6px',
      color: '#8f8178',
    }).setOrigin(0.5);

    this.deathOverlay = this.add.container(0, 0, [backdrop, title, hint])
      .setScrollFactor(0)
      .setDepth(DEPTH.overlay)
      .setVisible(false);
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

  /** Joue un effet one-shot puis le détruit à la fin de son animation. */
  private playEffect(animation: string, x: number, y: number, scale: number, depth: number): void {
    const texture = animation === ANIM.impact ? 'impact' : animation === ANIM.damage ? 'damage' : 'death-fx';
    const effect = this.add.sprite(x, y, texture)
      .setOrigin(0.5)
      .setScale(scale)
      .setDepth(depth)
      .setAlpha(0.9);
    effect.play(animation);
    effect.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => effect.destroy());
  }
}
