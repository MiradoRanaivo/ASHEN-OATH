import Phaser from 'phaser';
import { ANIM, ENEMY_ATTACK_DURATION } from '../data/Animations';
import { CLIP, ENEMY, frameWindowMs, type EnemyKind, type EnemyProfile } from '../config/GameConfig';
import type { Player } from './Player';

type EnemyState = 'patrol' | 'patrol-wait' | 'chase' | 'attack' | 'stunned' | 'dead';

export interface EnemySpawn {
  readonly kind: EnemyKind;
  readonly x: number;
  readonly y: number;
  readonly patrolMin: number;
  readonly patrolMax: number;
}

const AGGRO_MEMORY_MS = 1800;
const LEASH_PADDING = 84;
const PATROL_PAUSE_MS = 360;
const VERTICAL_ATTACK_TOLERANCE = 48;
const VERTICAL_SIGHT_TOLERANCE = 76;

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly kind: EnemyKind;
  readonly profile: EnemyProfile;

  private hp: number;
  private stateName: EnemyState = 'patrol';
  private stateElapsed = 0;
  private facing = -1;
  private readonly patrolMin: number;
  private readonly patrolMax: number;
  private nextAttackAt = 0;
  private lastSeenPlayerAt = Number.NEGATIVE_INFINITY;
  private lastHitAttackId = -1;
  private patrolWaitUntil = 0;
  private readonly spawn: EnemySpawn;

  constructor(scene: Phaser.Scene, spawn: EnemySpawn) {
    super(scene, spawn.x, spawn.y, spawn.kind);
    this.kind = spawn.kind;
    this.profile = ENEMY[spawn.kind];
    this.hp = this.profile.hp;
    this.patrolMin = spawn.patrolMin;
    this.patrolMax = spawn.patrolMax;
    this.spawn = spawn;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 1);
    this.setDepth(2);
    this.setScale(this.profile.scale);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(this.profile.body.width, this.profile.body.height);
    body.setOffset(this.profile.body.offsetX, this.profile.body.offsetY);
    body.setCollideWorldBounds(true);
    body.setDragX(720);
    body.setMaxVelocity(this.profile.chaseSpeed, 600);

    this.play(ANIM.enemyIdle(this.kind));
  }

  get isDead(): boolean {
    return this.stateName === 'dead';
  }

  get hpRatio(): number {
    return this.hp / this.profile.hp;
  }

  getAttackBox(): Phaser.Geom.Rectangle | null {
    if (this.stateName !== 'attack') return null;

    const window = frameWindowMs(CLIP.enemyAttack, 3, 4);
    if (this.stateElapsed < window.start || this.stateElapsed > window.end) return null;

    const range = this.profile.attackRange;
    return new Phaser.Geom.Rectangle(
      this.facing > 0 ? this.x + 4 : this.x - 4 - range,
      this.y - 46,
      range,
      34,
    );
  }

  updateEnemy(player: Player, deltaMs: number): void {
    this.stateElapsed += deltaMs;
    if (this.stateName === 'dead') return;

    if (this.stateName === 'stunned') {
      // Le recul doit rester actif pendant l'étourdissement.
      // On coupe uniquement l'accélération : la friction horizontale du corps
      // ralentit naturellement l'ennemi sans annuler sa vitesse de knockback.
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setAccelerationX(0);
      if (this.stateElapsed >= this.profile.stunMs) {
        this.stateName = 'patrol';
        this.stateElapsed = 0;
      }
      return;
    }

    if (this.stateName === 'attack') {
      this.stopHorizontalMovement();
      if (this.stateElapsed >= ENEMY_ATTACK_DURATION) {
        this.stateName = 'patrol';
        this.stateElapsed = 0;
        this.nextAttackAt = this.scene.time.now + this.profile.attackCooldownMs;
        this.play(ANIM.enemyIdle(this.kind), true);
      }
      return;
    }

    if (player.isDead) {
      this.lastSeenPlayerAt = Number.NEGATIVE_INFINITY;
      this.patrol(deltaMs);
      return;
    }

    const now = this.scene.time.now;
    const dx = player.x - this.x;
    const dy = Math.abs(player.y - this.y);
    const insideLeash = player.x >= this.patrolMin - LEASH_PADDING
      && player.x <= this.patrolMax + LEASH_PADDING;

    if (Math.abs(dx) <= this.profile.detectRange && dy <= VERTICAL_SIGHT_TOLERANCE && insideLeash) {
      this.lastSeenPlayerAt = now;
    }

    const hasTarget = now - this.lastSeenPlayerAt <= AGGRO_MEMORY_MS && insideLeash;

    if (
      hasTarget
      && Math.abs(dx) <= this.profile.attackRange
      && dy <= VERTICAL_ATTACK_TOLERANCE
      && now >= this.nextAttackAt
    ) {
      this.face(dx);
      this.stateName = 'attack';
      this.stateElapsed = 0;
      this.stopHorizontalMovement();
      this.play(ANIM.enemyAttack(this.kind));
      return;
    }

    if (hasTarget) {
      this.stateName = 'chase';
      this.face(dx);
      this.moveHorizontally(this.facing, this.profile.chaseSpeed);
      // Les packs d'ennemis du monde 1 ne contiennent pas de spritesheets de marche :
      // on conserve leur animation native plutôt que d'inventer des frames.
      this.play(ANIM.enemyIdle(this.kind), true);
      return;
    }

    this.patrol(deltaMs);
  }

  /** Applique une attaque du joueur. Renvoie true si le coup a porté. */
  receiveHit(attackId: number, damage: number, knockback: number, fromX: number): boolean {
    if (this.stateName === 'dead' || this.lastHitAttackId === attackId) return false;

    this.lastHitAttackId = attackId;
    this.hp = Math.max(0, this.hp - damage);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (this.active) this.clearTint();
    });

    if (this.hp <= 0) {
      this.die();
      return true;
    }

    this.stateName = 'stunned';
    this.stateElapsed = 0;
    this.play(ANIM.enemyIdle(this.kind), true);
    this.setVelocity(fromX < this.x ? knockback : -knockback, -70);
    return true;
  }

  reset(): void {
    this.hp = this.profile.hp;
    this.stateName = 'patrol';
    this.stateElapsed = 0;
    this.lastHitAttackId = -1;
    this.nextAttackAt = 0;
    this.lastSeenPlayerAt = Number.NEGATIVE_INFINITY;
    this.patrolWaitUntil = 0;
    this.facing = -1;
    this.enableBody(true, this.spawn.x, this.spawn.y, true, true);
    this.setPosition(this.spawn.x, this.spawn.y);
    this.setVelocity(0, 0);
    this.clearTint();
    this.setAlpha(1);
    this.setFlipX(true);
    this.play(ANIM.enemyIdle(this.kind), true);
  }

  private patrol(_deltaMs: number): void {
    const now = this.scene.time.now;

    if (this.stateName === 'patrol-wait') {
      this.stopHorizontalMovement();
      if (now < this.patrolWaitUntil) return;
      this.stateName = 'patrol';
      this.stateElapsed = 0;
    }

    if (this.x <= this.patrolMin) {
      this.face(1);
      this.beginPatrolPause(now);
      return;
    }
    if (this.x >= this.patrolMax) {
      this.face(-1);
      this.beginPatrolPause(now);
      return;
    }

    this.stateName = 'patrol';
    this.moveHorizontally(this.facing, this.profile.speed);
    this.play(ANIM.enemyIdle(this.kind), true);
  }

  private beginPatrolPause(now: number): void {
    this.stateName = 'patrol-wait';
    this.stateElapsed = 0;
    this.patrolWaitUntil = now + PATROL_PAUSE_MS;
    this.stopHorizontalMovement();
    this.play(ANIM.enemyIdle(this.kind), true);
  }

  private face(dx: number): void {
    if (dx === 0) return;
    this.facing = dx > 0 ? 1 : -1;
    this.setFlipX(this.facing < 0);
  }

  private moveHorizontally(direction: number, speed: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setMaxVelocity(speed, 600);
    body.setAccelerationX(direction * 620);
  }

  private stopHorizontalMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAccelerationX(0);
    body.setVelocityX(0);
  }

  private die(): void {
    this.stateName = 'dead';
    this.stateElapsed = 0;
    this.setVelocity(0, 0);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.scene.events.emit('enemy-died', this);
    this.setAlpha(0.45);
    this.setTint(0x6a6a72);
  }
}
