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

/**
 * Parcours de plateformes du Monde 1.
 * Les centres sont volontairement espacés : aucune plateforme ne se chevauche.
 * Les hauteurs alternent entre une marche basse et une terrasse plus élevée
 * pour créer un rythme de saut lisible sans bloquer la progression.
 */
const PLATFORMS: readonly PlatformDef[] = [
  { x: 500, surface: 218, width: 112 },
  { x: 690, surface: 190, width: 112 },
  { x: 940, surface: 218, width: 112 },
  { x: 1120, surface: 190, width: 112 },
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
  private bossTelegraph!: Phaser.GameObjects.Graphics;
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
    this.createGroundDetails();
    this.createCryptProps();
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
    this.bossTelegraph = this.add.graphics().setDepth(DEPTH.effect - 0.25);
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
      const intersectsAttack = attack.ellipse
        ? Phaser.Geom.Intersects.RectangleToEllipse(target, attack.ellipse)
        : Phaser.Geom.Intersects.RectangleToRectangle(attack.box, target);
      if (!intersectsAttack) {
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
    this.bossTelegraph.clear();

    // Télégraphes au sol : la zone dangereuse est annoncée avant chaque attaque.
    const direction = this.boss.flipX ? -1 : 1;
    const bossX = this.boss.x;
    const groundY = this.boss.y - 2;
    const elapsed = this.boss.stateElapsedMs;

    if (this.boss.stateName === 'attack-preparation') {
      const pulse = 0.24 + Math.sin(time / 65) * 0.08;
      this.bossTelegraph.fillStyle(0xe0a34d, pulse);
      this.bossTelegraph.fillRect(
        bossX + direction * 12 - (direction < 0 ? BOSS_AI.attackRange : 0),
        groundY - 5,
        BOSS_AI.attackRange,
        7,
      );
      this.bossTelegraph.lineStyle(1, 0xf0c27b, 0.75);
      this.bossTelegraph.strokeRect(
        bossX + direction * 12 - (direction < 0 ? BOSS_AI.attackRange : 0),
        groundY - 5,
        BOSS_AI.attackRange,
        7,
      );
    } else if (this.boss.stateName === 'beam-preparation') {
      const progress = Phaser.Math.Clamp(elapsed / BOSS_AI.beamPreparationMs, 0, 1);
      const width = BOSS_AI.beamRange * progress;
      const startX = bossX + direction * 20;
      this.bossTelegraph.fillStyle(0x8d6be8, 0.12 + progress * 0.12);
      this.bossTelegraph.fillRect(direction > 0 ? startX : startX - width, groundY - 42, width, 38);
      this.bossTelegraph.lineStyle(2, 0xb59aff, 0.35 + progress * 0.45);
      this.bossTelegraph.lineBetween(startX, groundY - 23, startX + direction * width, groundY - 23);
    } else if (this.boss.stateName === 'magic-preparation') {
      const progress = Phaser.Math.Clamp(elapsed / BOSS_AI.magicPreparationMs, 0, 1);
      const radiusX = (BOSS_AI.magicRange / 2) * progress;
      const radiusY = (BOSS_AI.magicHeight / 2) * progress;
      this.bossTelegraph.fillStyle(0x8b5de0, 0.1 + progress * 0.12);
      this.bossTelegraph.fillEllipse(bossX, groundY - radiusY, radiusX * 2, radiusY * 2);
      this.bossTelegraph.lineStyle(2, 0xc0a1ff, 0.35 + progress * 0.5);
      this.bossTelegraph.strokeEllipse(bossX, groundY - radiusY, radiusX * 2, radiusY * 2);
    } else if (this.boss.stateName === 'phase-transition') {
      const pulse = 0.2 + Math.sin(time / 80) * 0.08;
      this.bossTelegraph.fillStyle(0x8b5de0, pulse);
      this.bossTelegraph.fillEllipse(bossX, groundY - 5, 100, 14);
      this.bossTelegraph.lineStyle(2, 0xc0a1ff, 0.7);
      this.bossTelegraph.strokeEllipse(bossX, groundY - 5, 100, 14);
    }
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

  /**
   * Détails de sol pour la première région : éclats de pierre, fissures et
   * petits débris de tombe. Décor uniquement : aucune hitbox ajoutée.
   */
  private createGroundDetails(): void {
    const cryptEnd = REGION_WIDTH;
    let seed = 7419;
    const random = (min: number, max: number): number => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return min + (seed / 0xffffffff) * (max - min);
    };

    // Éclats de pierre irréguliers répartis sans couvrir le chemin du joueur.
    for (let i = 0; i < 34; i++) {
      const x = random(24, cryptEnd - 18);
      const y = VIEW.groundY - random(3, 13);
      const w = random(3, 9);
      const h = random(2, 5);
      const stone = this.add.graphics().setDepth(DEPTH.prop + 0.8);
      stone.fillStyle(i % 3 === 0 ? 0x74666a : 0x39323a, 0.92);
      stone.fillPoints([
        new Phaser.Geom.Point(x - w, y),
        new Phaser.Geom.Point(x - w / 2, y - h),
        new Phaser.Geom.Point(x + w * 0.65, y - h * 0.7),
        new Phaser.Geom.Point(x + w, y),
        new Phaser.Geom.Point(x + w * 0.2, y + 1),
      ], true);
      stone.lineStyle(1, 0x211d24, 0.9);
      stone.strokePoints([
        new Phaser.Geom.Point(x - w, y),
        new Phaser.Geom.Point(x - w / 2, y - h),
        new Phaser.Geom.Point(x + w * 0.65, y - h * 0.7),
        new Phaser.Geom.Point(x + w, y),
      ], false);
    }

    // Fissures fines au pied des murs, orientées de manière irrégulière.
    for (let i = 0; i < 11; i++) {
      const x = random(32, cryptEnd - 30);
      const y = VIEW.groundY - random(1, 3);
      const crack = this.add.graphics().setDepth(DEPTH.prop + 0.9);
      crack.lineStyle(1, 0x211d24, 0.9);
      crack.beginPath();
      crack.moveTo(x, y);
      crack.lineTo(x + random(3, 8), y - random(2, 4));
      crack.lineTo(x + random(7, 13), y - random(1, 3));
      crack.lineTo(x + random(13, 17), y - random(3, 5));
      crack.strokePath();
    }

    // Fragments de pierre plus gros, placés près des bords pour préserver la lisibilité.
    for (const x of [82, 276, 432]) {
      const rubble = this.add.graphics().setDepth(DEPTH.prop + 1);
      rubble.fillStyle(0x51464b, 1);
      rubble.fillPoints([
        new Phaser.Geom.Point(x - 9, VIEW.groundY),
        new Phaser.Geom.Point(x - 7, VIEW.groundY - 7),
        new Phaser.Geom.Point(x - 1, VIEW.groundY - 11),
        new Phaser.Geom.Point(x + 6, VIEW.groundY - 8),
        new Phaser.Geom.Point(x + 10, VIEW.groundY),
      ], true);
      rubble.lineStyle(1, 0x82716d, 0.8);
      rubble.strokePoints([
        new Phaser.Geom.Point(x - 7, VIEW.groundY - 7),
        new Phaser.Geom.Point(x - 1, VIEW.groundY - 11),
        new Phaser.Geom.Point(x + 6, VIEW.groundY - 8),
      ], false);
    }
  }


  /**
   * Habillage vertical de la Crypte oubliée.
   * Les formes restent derrière le joueur et ne créent aucune collision.
   */
  private createCryptProps(): void {
    const cryptDepth = DEPTH.prop + 0.2;
    const stoneDark = 0x28232b;
    const stoneMid = 0x51464d;
    const stoneLight = 0x88766d;
    const mortar = 0x17141b;

    // Deux colonnes ruinées, volontairement asymétriques.
    const drawBrokenColumn = (x: number, height: number, brokenRight: boolean): void => {
      const y = VIEW.groundY;
      const g = this.add.graphics().setDepth(cryptDepth);
      g.fillStyle(mortar, 0.95);
      g.fillRect(x - 13, y - height, 27, height);
      g.fillStyle(stoneDark, 1);
      g.fillRect(x - 11, y - height + 3, 22, height - 3);
      g.fillStyle(stoneMid, 1);
      g.fillRect(x - 9, y - height + 5, 6, height - 8);
      g.fillStyle(stoneLight, 0.75);
      g.fillRect(x - 9, y - height + 5, 2, height - 10);

      // Joints horizontaux irréguliers.
      for (let row = 1; row < Math.floor(height / 16); row++) {
        const yy = y - height + row * 16;
        g.fillStyle(mortar, 0.9);
        g.fillRect(x - 11, yy, 22, 2);
        g.fillStyle(stoneLight, 0.22);
        g.fillRect(x - 9, yy + 2, 18, 1);
      }

      // Chapiteau ébréché et base massive.
      g.fillStyle(stoneDark, 1);
      g.fillPoints([
        new Phaser.Geom.Point(x - 17, y - height + 4),
        new Phaser.Geom.Point(x - 14, y - height - 5),
        new Phaser.Geom.Point(x + (brokenRight ? 8 : 14), y - height - 5),
        new Phaser.Geom.Point(x + (brokenRight ? 13 : 17), y - height + 3),
      ], true);
      g.fillStyle(stoneLight, 0.65);
      g.fillRect(x - 14, y - height - 4, brokenRight ? 17 : 25, 2);
      g.fillStyle(stoneDark, 1);
      g.fillRect(x - 17, y - 10, 34, 10);
      g.fillStyle(stoneMid, 1);
      g.fillRect(x - 15, y - 9, 30, 3);

      if (brokenRight) {
        g.fillStyle(stoneDark, 1);
        g.fillPoints([
          new Phaser.Geom.Point(x + 5, y - height - 5),
          new Phaser.Geom.Point(x + 13, y - height - 12),
          new Phaser.Geom.Point(x + 17, y - height - 4),
        ], true);
      }
    };

    drawBrokenColumn(112, 78, true);
    drawBrokenColumn(452, 106, false);

    // Sarcophage bas, posé au sol et dessiné derrière la trajectoire du joueur.
    const tomb = this.add.graphics().setDepth(cryptDepth + 0.15);
    tomb.fillStyle(0x17141b, 0.9);
    tomb.fillRect(232, VIEW.groundY - 25, 58, 25);
    tomb.fillStyle(stoneDark, 1);
    tomb.fillPoints([
      new Phaser.Geom.Point(228, VIEW.groundY - 25),
      new Phaser.Geom.Point(236, VIEW.groundY - 34),
      new Phaser.Geom.Point(284, VIEW.groundY - 34),
      new Phaser.Geom.Point(294, VIEW.groundY - 25),
    ], true);
    tomb.fillStyle(stoneMid, 1);
    tomb.fillRect(237, VIEW.groundY - 23, 48, 19);
    tomb.fillStyle(stoneLight, 0.7);
    tomb.fillRect(239, VIEW.groundY - 32, 44, 3);
    tomb.lineStyle(1, 0x211d24, 1);
    tomb.strokeRect(244, VIEW.groundY - 19, 34, 12);
    tomb.lineBetween(261, VIEW.groundY - 18, 261, VIEW.groundY - 8);

    // Chaînes suspendues : maillons carrés espacés pour rester lisibles en pixel art.
    const drawChain = (x: number, top: number, length: number): void => {
      const chain = this.add.graphics().setDepth(cryptDepth + 0.1);
      chain.lineStyle(2, 0x28232b, 1);
      chain.lineBetween(x, top, x, top + length);
      for (let y = top + 3; y < top + length; y += 8) {
        chain.lineStyle(2, 0x88766d, 0.9);
        chain.strokeRect(x - 2, y, 4, 5);
        chain.lineStyle(1, 0x17141b, 0.9);
        chain.lineBetween(x - 1, y + 1, x + 1, y + 1);
      }
      chain.fillStyle(0x17141b, 1);
      chain.fillRect(x - 4, top - 2, 8, 3);
    };
    drawChain(205, 20, 62);
    drawChain(382, 8, 86);

    // Appliques murales et flammes discrètes. Les lueurs sont animées sans lumière coûteuse.
    const createTorch = (x: number, y: number): void => {
      const mount = this.add.graphics().setDepth(cryptDepth + 0.25);
      mount.fillStyle(0x211b22, 1);
      mount.fillRect(x - 5, y + 5, 10, 8);
      mount.fillStyle(0x796044, 1);
      mount.fillRect(x - 3, y, 6, 9);
      mount.fillStyle(0x352832, 1);
      mount.fillRect(x - 2, y - 5, 4, 7);

      const glow = this.add.circle(x, y - 7, 13, 0xc36b32, 0.12)
        .setDepth(DEPTH.effect - 0.5);
      const flame = this.add.ellipse(x, y - 8, 6, 11, 0xf0a34c, 0.9)
        .setDepth(DEPTH.effect - 0.2);
      const core = this.add.ellipse(x, y - 6, 2, 6, 0xffdf91, 0.95)
        .setDepth(DEPTH.effect - 0.1);

      this.tweens.add({
        targets: [glow, flame, core],
        alpha: { from: 0.72, to: 1 },
        scaleX: { from: 0.86, to: 1.12 },
        scaleY: { from: 0.92, to: 1.08 },
        duration: 420,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: x % 170,
      });
    };
    createTorch(176, 126);
    createTorch(414, 104);
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
        // Sous-face pleine : la plateforme devient une avancée de terrain
        // rocheuse plutôt qu'une dalle flottant sur un pilier isolé.
        const undersideTop = platform.surface + PLATFORM_HEIGHT;
        const undersideHeight = VIEW.groundY - undersideTop;
        this.addBlocks(
          'block-wall',
          left,
          undersideTop,
          width,
          undersideHeight,
          DEPTH.platform - 1,
        );

        // Ombre discrète sous le rebord pour détacher la pierre du fond.
        this.add.rectangle(
          left + width / 2,
          undersideTop + 2,
          width - 4,
          2,
          0x17141b,
          0.72,
        ).setDepth(DEPTH.platform);
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
