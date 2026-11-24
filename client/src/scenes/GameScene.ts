import Phaser from 'phaser';
import { BOSS_AI, COLORS, DEPTH, PLAYER, VIEW } from '../config/GameConfig';
import { ANIM } from '../data/Animations';
import { Enemy, type EnemySpawn } from '../entities/Enemy';
import { Player, type PlayerInput } from '../entities/Player';
import { Hud } from '../ui/Hud';
import { Boss } from '../entities/Boss';

interface PlatformDef {
  readonly x: number;
  readonly surface: number;
  readonly width: number;
}

const PLATFORM_HEIGHT = 16;
const REGION_WIDTH = VIEW.worldWidth / 4;
const BOSS_ARENA_LEFT = 1380;
const BOSS_ARENA_RIGHT = 1790;
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
  { x: 1400, surface: 200, width: 90 },
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
  private background!: Phaser.GameObjects.Image;
  private atmosphere!: Phaser.GameObjects.Rectangle;
  private activeRegion = -1;
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

    this.createBackdrop();
    this.createPlatforms();
    this.createBossArena();

    this.player = new Player(this, SPAWN_POINT.x, SPAWN_POINT.y);
    this.physics.add.collider(this.player, this.platformGroup);

    this.createEnemies();

    this.hud = new Hud(this);
    this.createDeathOverlay();
    this.bindInput();

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(50, 30);
    this.cameras.main.setRoundPixels(true);

    this.events.on('enemy-died', (enemy: Enemy) => {
      this.playEffect(ANIM.death, enemy.x, enemy.y - 26, 0.42, DEPTH.effect);
    });

    this.boss = new Boss(this, 1560, VIEW.groundY);
    this.bossBeamVisual = this.add.image(0, 0, 'boss-beam-visual')
      .setDepth(DEPTH.effect)
      .setVisible(false);
    this.bossAoeVisual = this.add.image(0, 0, 'boss-aoe-visual')
      .setDepth(DEPTH.effect - 0.1)
      .setOrigin(0.5, 1)
      .setDisplaySize(240, 110)
      .setVisible(false);
    this.physics.add.collider(this.boss, this.platformGroup);
    this.physics.add.collider(this.player, this.boss);
    this.physics.add.collider(this.player, this.bossArenaGate);
    this.physics.add.collider(this.boss, this.bossArenaGate);
  }

  update(_time: number, deltaMs: number): void {
    const delta = Math.min(deltaMs, 50);
    this.player.updatePlayer(this.readInput(), delta);

    for (const enemy of this.enemies) {
      enemy.updateEnemy(this.player, delta);
    }

    this.boss.updateAI(this.player, delta);
    this.updateBossAttackVisuals(_time);
    this.updateBossArena();

    const region = Math.min(3, Math.floor(this.player.x / REGION_WIDTH));
    if (region !== this.activeRegion) {
      this.activeRegion = region;
      this.background.setTint(REGIONS[region].backgroundTint);
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
    const beamActive = this.boss.stateName === 'beam';
    const facingLeft = this.boss.flipX;
    this.bossBeamVisual
      .setVisible(beamActive)
      .setFlipX(facingLeft)
      .setOrigin(facingLeft ? 1 : 0, 0.5)
      .setPosition(this.boss.x + (facingLeft ? -24 : 24), this.boss.y - 72)
      .setDisplaySize(BOSS_AI.beamRange, BOSS_AI.beamHeight + 14);

    const magicActive = this.boss.stateName === 'magic';
    this.bossAoeVisual
      .setVisible(magicActive)
      .setPosition(this.boss.x, this.boss.y + 2)
      .setAlpha(0.78 + Math.sin(time / 55) * 0.18);
  }

  private createBossArena(): void {
    const arenaCenter = (BOSS_ARENA_LEFT + BOSS_ARENA_RIGHT) / 2;
    this.add.rectangle(arenaCenter, 210, BOSS_ARENA_RIGHT - BOSS_ARENA_LEFT, 80, 0x11101a, 0.28)
      .setDepth(DEPTH.backdrop + 3);

    this.add.rectangle(1428, 226, 18, 48, 0x352641)
      .setDepth(DEPTH.prop);
    this.add.rectangle(1692, 226, 18, 48, 0x352641)
      .setDepth(DEPTH.prop);
    this.add.rectangle(1560, 214, 70, 16, 0x5a443d)
      .setDepth(DEPTH.prop);
    this.add.rectangle(1560, 202, 56, 24, 0x2d2532)
      .setDepth(DEPTH.prop);

    for (const x of [1428, 1692]) {
      const brazierBase = this.add.rectangle(x, 250, 30, 12, 0x30262d)
        .setDepth(DEPTH.prop);
      this.add.circle(x, 240, 7, 0xd4883e)
        .setDepth(DEPTH.effect)
        .setAlpha(0.95);
      brazierBase.setStrokeStyle(1, 0x70543a);
    }

    this.bossArenaGate = this.add.rectangle(BOSS_ARENA_LEFT, 214, 14, 72, 0x35232f)
      .setStrokeStyle(2, 0x7a5264)
      .setDepth(DEPTH.prop)
      .setVisible(false);
    this.physics.add.existing(this.bossArenaGate, true);
    this.bossArenaGateBody = this.bossArenaGate.body as Phaser.Physics.Arcade.StaticBody;
    this.bossArenaGateBody.enable = false;

    this.add.rectangle(BOSS_ARENA_RIGHT, 214, 10, 72, 0x19151f)
      .setDepth(DEPTH.prop);
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

    const right = left + width;
    let segmentLeft = left;
    while (segmentLeft < right) {
      const regionIndex = Math.min(3, Math.floor(segmentLeft / REGION_WIDTH));
      const region = REGIONS[regionIndex];
      const segmentRight = Math.min(right, (regionIndex + 1) * REGION_WIDTH);
      const segmentWidth = segmentRight - segmentLeft;
      const segmentX = segmentLeft + segmentWidth / 2;

      this.add.rectangle(segmentX, surface + PLATFORM_HEIGHT / 2, segmentWidth + 0.5, PLATFORM_HEIGHT, region.side)
        .setDepth(DEPTH.platform + 1);
      this.add.rectangle(segmentX, surface + 2, segmentWidth + 0.5, 4, region.ground)
        .setDepth(DEPTH.platform + 2);
      this.add.rectangle(segmentX, surface + 0.5, segmentWidth + 0.5, 1, region.edge)
        .setDepth(DEPTH.platform + 3);

      segmentLeft = segmentRight;
    }
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
      this.createPlatformSurface(platform.x - platform.width / 2, platform.surface, platform.width);

      if (platform.surface < VIEW.groundY - 4) {
        const pillarHeight = VIEW.groundY - (platform.surface + PLATFORM_HEIGHT);
        this.add.rectangle(platform.x, platform.surface + PLATFORM_HEIGHT + pillarHeight / 2, Math.min(platform.width, 52), pillarHeight, 0x1c181f)
          .setAlpha(0.95)
          .setDepth(DEPTH.platform - 1);
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
