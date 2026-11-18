import Phaser from 'phaser';
import { COLORS, DEPTH, PLAYER, VIEW } from '../config/GameConfig';
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

const PLATFORMS: readonly PlatformDef[] = [
  { x: 240, surface: 250, width: 480 },
  { x: 560, surface: 250, width: 120 },
  { x: 700, surface: 218, width: 140 },
  { x: 880, surface: 250, width: 180 },
  { x: 1060, surface: 230, width: 160 },
  { x: 1250, surface: 250, width: 120 },
  { x: 1520, surface: 250, width: 360 },
  { x: 660, surface: 186, width: 90 },
  { x: 1000, surface: 190, width: 90 },
  { x: 1400, surface: 200, width: 90 },
];

const ENEMIES: readonly EnemySpawn[] = [
  { kind: 'skeleton', x: 430, y: 250, patrolMin: 330, patrolMax: 468 },
  { kind: 'zombie', x: 900, y: 250, patrolMin: 800, patrolMax: 960 },
  { kind: 'bandit', x: 1440, y: 250, patrolMin: 1350, patrolMax: 1560 },
  { kind: 'skeleton', x: 1650, y: 250, patrolMin: 1570, patrolMax: 1690 },
];

const SPAWN_POINT = { x: 60, y: VIEW.groundY };

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private enemies: Enemy[] = [];
  private platformGroup!: Phaser.Physics.Arcade.StaticGroup;
  private hud!: Hud;
  private deathOverlay!: Phaser.GameObjects.Container;
  private respawnPending = false;
  private boss!: Boss;

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

    this.boss = new Boss(this, 1720, VIEW.groundY);
    this.physics.add.collider(this.boss, this.platformGroup);
    this.physics.add.collider(this.player, this.boss);
  }

  update(_time: number, deltaMs: number): void {
    const delta = Math.min(deltaMs, 50);
    this.player.updatePlayer(this.readInput(), delta);

    for (const enemy of this.enemies) {
      enemy.updateEnemy(this.player, delta);
    }

    this.boss.updateAI(this.player, delta);

    this.resolvePlayerAttack();
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
      this.cameras.main.fadeIn(360, 0, 0, 0);
      this.respawnPending = false;
    });
  }

  private createBackdrop(): void {
    this.add.image(VIEW.width / 2, VIEW.height / 2, 'environment')
      .setScale(0.6)
      .setScrollFactor(0)
      .setDepth(DEPTH.backdrop);

    const shade = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.backdrop + 1);
    shade.fillStyle(0x0b0a10, 0.28);
    shade.fillRect(0, 0, VIEW.width, VIEW.height);
    shade.fillStyle(0x0b0a10, 0.4);
    shade.fillRect(0, VIEW.height - 56, VIEW.width, 56);
  }

  private createPlatforms(): void {
    this.platformGroup = this.physics.add.staticGroup();

    for (const platform of PLATFORMS) {
      const centerY = platform.surface + PLATFORM_HEIGHT / 2;
      const ledge = this.add.rectangle(platform.x, centerY, platform.width, PLATFORM_HEIGHT, 0x38303b);
      ledge.setStrokeStyle(1, 0x231d26);
      ledge.setDepth(DEPTH.platform);
      this.platformGroup.add(ledge);
      const body = ledge.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();

      // Arête supérieure éclairée par la lune, puis ombre sous la dalle.
      this.add.rectangle(platform.x, platform.surface + 1, platform.width - 2, 2, 0x9a7f6b)
        .setAlpha(0.9)
        .setDepth(DEPTH.platform + 1);
      this.add.rectangle(platform.x, platform.surface + PLATFORM_HEIGHT - 1, platform.width - 2, 3, 0x0b0a10)
        .setAlpha(0.85)
        .setDepth(DEPTH.platform + 1);

      // Les dalles surélevées reposent sur un pilier, sinon elles flottent.
      if (platform.surface < VIEW.groundY - 4) {
        const pillarHeight = VIEW.groundY - (platform.surface + PLATFORM_HEIGHT);
        this.add.rectangle(platform.x, platform.surface + PLATFORM_HEIGHT + pillarHeight / 2, Math.min(platform.width, 52), pillarHeight, 0x1c181f)
          .setAlpha(0.95)
          .setDepth(DEPTH.platform - 1);
        this.add.rectangle(platform.x - Math.min(platform.width, 52) / 2, platform.surface + PLATFORM_HEIGHT + pillarHeight / 2, 1, pillarHeight, 0x2e262e)
          .setAlpha(0.9)
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
