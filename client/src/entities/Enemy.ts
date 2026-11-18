import Phaser from 'phaser';
import { ANIM, ENEMY_ATTACK_DURATION } from '../data/Animations';
import { CLIP, ENEMY, frameWindowMs, type EnemyKind, type EnemyProfile } from '../config/GameConfig';
import type { Player } from './Player';

type EnemyState = 'patrol' | 'chase' | 'attack' | 'stunned' | 'dead';

export interface EnemySpawn {
  readonly kind: EnemyKind;
  readonly x: number;
  readonly y: number;
  readonly patrolMin: number;
  readonly patrolMax: number;
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  readonly kind: EnemyKind;
  readonly profile: EnemyProfile;

  private hp: number;
  private stateName: EnemyState = 'patrol';
  private stateElapsed = 0;
  private facing = -1;
  private patrolMin: number;
  private patrolMax: number;
  private nextAttackAt = 0;
  private lastHitAttackId = -1;
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

    this.play(ANIM.enemyIdle(this.kind));
  }

  get isDead(): boolean {
    return this.stateName === 'dead';
  }

  get hpRatio(): number {
    return this.hp / this.profile.hp;
  }

  getAttackBox(): Phaser.Geom.Rectangle | null {
    if (this.stateName !== 'attack') {
      return null;
    }
    const window = frameWindowMs(CLIP.enemyAttack, 3, 4);
    if (this.stateElapsed < window.start || this.stateElapsed > window.end) {
      return null;
    }
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

    if (this.stateName === 'dead') {
      return;
    }

    if (this.stateName === 'stunned') {
      this.setVelocityX(0);
      if (this.stateElapsed >= this.profile.stunMs) {
        this.stateName = 'patrol';
        this.stateElapsed = 0;
      }
      return;
    }

    if (this.stateName === 'attack') {
      this.setVelocityX(0);
      if (this.stateElapsed >= ENEMY_ATTACK_DURATION) {
        this.stateName = 'patrol';
        this.stateElapsed = 0;
        this.nextAttackAt = this.scene.time.now + this.profile.attackCooldownMs;
        this.play(ANIM.enemyIdle(this.kind), true);
      }
      return;
    }

    if (player.isDead) {
      this.patrol(deltaMs);
      return;
    }

    const dx = player.x - this.x;
    const dy = Math.abs(player.y - this.y);

    if (Math.abs(dx) <= this.profile.attackRange && dy < 42 && this.scene.time.now >= this.nextAttackAt) {
      this.facing = dx >= 0 ? 1 : -1;
      this.setFlipX(this.facing < 0);
      this.stateName = 'attack';
      this.stateElapsed = 0;
      this.setVelocityX(0);
      this.play(ANIM.enemyAttack(this.kind));
      return;
    }

    if (Math.abs(dx) <= this.profile.detectRange && dy < 60) {
      this.stateName = 'chase';
      this.facing = dx >= 0 ? 1 : -1;
      this.setFlipX(this.facing < 0);
      this.setVelocityX(this.facing * this.profile.chaseSpeed);
      this.play(ANIM.enemyIdle(this.kind), true);
      this.clampToPatrol();
      return;
    }

    this.patrol(deltaMs);
  }

  /** Applique une attaque du joueur. Renvoie true si le coup a porté. */
  receiveHit(attackId: number, damage: number, knockback: number, fromX: number): boolean {
    if (this.stateName === 'dead' || this.lastHitAttackId === attackId) {
      return false;
    }
    this.lastHitAttackId = attackId;
    this.hp = Math.max(0, this.hp - damage);

    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.clearTint());

    if (this.hp <= 0) {
      this.die();
      return true;
    }

    this.stateName = 'stunned';
    this.stateElapsed = 0;
    this.setVelocity(fromX < this.x ? knockback : -knockback, -70);
    return true;
  }

  reset(): void {
    this.hp = this.profile.hp;
    this.stateName = 'patrol';
    this.stateElapsed = 0;
    this.lastHitAttackId = -1;
    this.nextAttackAt = 0;
    this.facing = -1;
    this.setPosition(this.spawn.x, this.spawn.y);
    this.setVelocity(0, 0);
    this.clearTint();
    this.setAlpha(1);
    this.setActive(true).setVisible(true);
    this.play(ANIM.enemyIdle(this.kind), true);
  }

  private patrol(deltaMs: number): void {
    this.stateName = 'patrol';
    if (this.x <= this.patrolMin) {
      this.facing = 1;
    } else if (this.x >= this.patrolMax) {
      this.facing = -1;
    }
    this.setFlipX(this.facing < 0);
    this.setVelocityX(this.facing * this.profile.speed);
    this.play(ANIM.enemyIdle(this.kind), true);
    void deltaMs;
  }

  private clampToPatrol(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.x < this.patrolMin) {
      body.x += this.patrolMin - this.x;
    } else if (this.x > this.patrolMax) {
      body.x -= this.x - this.patrolMax;
    }
  }

  private die(): void {
    this.stateName = 'dead';
    this.stateElapsed = 0;
    this.setVelocity(0, 0);
    this.scene.events.emit('enemy-died', this);
    this.setAlpha(0.45);
    this.setTint(0x6a6a72);
  }
}
