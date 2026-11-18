import Phaser from 'phaser';
import { ANIM } from '../data/Animations';
import { BOSS_AI } from '../config/GameConfig';
import type { Player } from './Player';

type BossState = 'idle' | 'detect' | 'approach' | 'attack-preparation' | 'attack' | 'recovery' | 'hurt' | 'dead';

export class Boss extends Phaser.Physics.Arcade.Sprite {
  readonly maxHp = 30000;
  hp = 30000;
  private lastHitAttackId = -1;
  private aiState: BossState = 'idle';
  private stateElapsed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'boss-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(3);
    this.setScale(1);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(58, 112);
    body.setOffset(35, 16);
    body.setCollideWorldBounds(true);

    this.play(ANIM.bossIdle);
  }

  get isDead(): boolean {
    return this.hp <= 0;
  }

  get hpRatio(): number {
    return this.hp / this.maxHp;
  }

  get stateName(): BossState {
    return this.aiState;
  }

  updateAI(player: Player, deltaMs: number): void {
    if (this.isDead) {
      this.enterState('dead');
      return;
    }

    this.stateElapsed += deltaMs;
    const distance = Math.abs(player.x - this.x);

    if (this.aiState === 'hurt') {
      this.setVelocityX(0);
      if (this.stateElapsed >= BOSS_AI.hurtStunMs) {
        this.enterState(distance <= BOSS_AI.attackDistance ? 'attack-preparation' : 'approach');
      }
      return;
    }

    if (this.aiState === 'dead') return;

    if (this.aiState === 'idle' || this.aiState === 'detect') {
      this.setVelocityX(0);
      if (distance <= BOSS_AI.detectRange) {
        this.facePlayer(player);
        this.enterState('detect');
        if (distance <= BOSS_AI.attackDistance) {
          this.enterState('attack-preparation');
        } else {
          this.enterState('approach');
        }
      } else if (this.aiState !== 'idle') {
        this.enterState('idle');
      }
      return;
    }

    if (this.aiState === 'approach') {
      if (distance > BOSS_AI.loseRange) {
        this.enterState('idle');
        return;
      }
      this.facePlayer(player);
      if (distance <= BOSS_AI.attackDistance) {
        this.enterState('attack-preparation');
        return;
      }
      const direction = player.x >= this.x ? 1 : -1;
      this.setVelocityX(direction * BOSS_AI.approachSpeed);
      return;
    }

    if (this.aiState === 'attack-preparation') {
      this.setVelocityX(0);
      this.facePlayer(player);
      if (this.stateElapsed >= BOSS_AI.preparationMs) {
        this.enterState('attack');
      }
      return;
    }

    if (this.aiState === 'attack') {
      this.setVelocityX(0);
      if (this.stateElapsed >= 300) {
        this.enterState('recovery');
      }
      return;
    }

    if (this.aiState === 'recovery') {
      this.setVelocityX(0);
      if (this.stateElapsed >= BOSS_AI.recoveryMs) {
        this.enterState(distance <= BOSS_AI.loseRange ? 'approach' : 'idle');
      }
    }
  }

  receiveHit(attackId: number, damage: number, knockback: number, fromX: number): boolean {
    if (this.isDead || this.lastHitAttackId === attackId) {
      return false;
    }

    this.lastHitAttackId = attackId;
    this.hp = Math.max(0, this.hp - damage);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => this.clearTint());

    const direction = fromX < this.x ? 1 : -1;
    this.setVelocity(direction * knockback * 0.12, -15);

    if (this.isDead) {
      this.enterState('dead');
      this.scene.events.emit('boss-died', this);
      this.setVelocity(0, 0);
      this.setAlpha(0.6);
      this.disableBody(true, true);
    } else {
      this.enterState('hurt');
    }

    return true;
  }

  showBeam(): void {
    if (!this.isDead) this.play(ANIM.bossBeam);
  }

  showMagic(): void {
    if (!this.isDead) this.play(ANIM.bossMagic);
  }

  reset(): void {
    this.hp = this.maxHp;
    this.lastHitAttackId = -1;
    this.enableBody(true, 1720, 250, true, true);
    this.setPosition(1720, 250);
    this.setVelocity(0, 0);
    this.setAlpha(1);
    this.clearTint();
    this.setActive(true).setVisible(true);
    this.enterState('idle');
  }

  private facePlayer(player: Player): void {
    const direction = player.x >= this.x ? 1 : -1;
    this.setFlipX(direction < 0);
  }

  private enterState(next: BossState): void {
    if (this.aiState === next) {
      return;
    }
    this.aiState = next;
    this.stateElapsed = 0;

    if (next === 'idle' || next === 'detect' || next === 'approach') {
      this.setVelocityX(0);
      this.play(ANIM.bossIdle, true);
    } else if (next === 'dead') {
      this.setVelocity(0, 0);
    }
  }
}

