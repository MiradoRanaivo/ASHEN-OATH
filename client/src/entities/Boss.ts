import Phaser from 'phaser';
import { ANIM } from '../data/Animations';
import { BOSS_AI } from '../config/GameConfig';
import type { Player } from './Player';

type BossState =
  | 'idle'
  | 'detect'
  | 'approach'
  | 'attack-preparation'
  | 'attack'
  | 'beam-preparation'
  | 'beam'
  | 'magic-preparation'
  | 'magic'
  | 'phase-transition'
  | 'recovery'
  | 'hurt'
  | 'dead';

export type BossAttackKind = 'melee' | 'beam' | 'magic';
export interface BossAttackBox {
  readonly kind: BossAttackKind;
  readonly box: Phaser.Geom.Rectangle;
  readonly damage: number;
}

export class Boss extends Phaser.Physics.Arcade.Sprite {
  readonly maxHp = 360;
  hp = 360;
  private lastHitAttackId = -1;
  private aiState: BossState = 'idle';
  private stateElapsed = 0;
  private facing = -1;
  private readonly spawnX: number;
  private readonly spawnY: number;
  private empowered = false;
  private attackPatternIndex = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'boss-movement');
    this.spawnX = x;
    this.spawnY = y;
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setDepth(3);
    this.setScale(1);
    this.setFlipX(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(42, 82);
    this.alignBodyToFrame();
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

  get phase(): 1 | 2 {
    return this.empowered ? 2 : 1;
  }

  getAttackBoxes(): readonly BossAttackBox[] {
    if (this.aiState === 'attack') {
      if (this.stateElapsed < BOSS_AI.attackActiveFromMs || this.stateElapsed > BOSS_AI.attackActiveToMs) {
        return [];
      }
      return [{
        kind: 'melee',
        damage: BOSS_AI.attackDamage,
        box: new Phaser.Geom.Rectangle(
          this.facing > 0 ? this.x + 12 : this.x - 12 - BOSS_AI.attackRange,
          this.y - BOSS_AI.attackHeight,
          BOSS_AI.attackRange,
          BOSS_AI.attackHeight,
        ),
      }];
    }

    if (this.aiState === 'beam') {
      if (this.stateElapsed < BOSS_AI.beamActiveFromMs || this.stateElapsed > BOSS_AI.beamActiveToMs) {
        return [];
      }
      return [{
        kind: 'beam',
        damage: BOSS_AI.beamDamage,
        box: new Phaser.Geom.Rectangle(
          this.facing > 0 ? this.x + 20 : this.x - 20 - BOSS_AI.beamRange,
          this.y - BOSS_AI.beamHeight - 20,
          BOSS_AI.beamRange,
          BOSS_AI.beamHeight,
        ),
      }];
    }

    if (this.aiState === 'magic') {
      if (this.stateElapsed < BOSS_AI.magicActiveFromMs || this.stateElapsed > BOSS_AI.magicActiveToMs) {
        return [];
      }
      return [{
        kind: 'magic',
        damage: BOSS_AI.magicDamage,
        box: new Phaser.Geom.Rectangle(
          this.x - BOSS_AI.magicRange / 2,
          this.y - BOSS_AI.magicHeight,
          BOSS_AI.magicRange,
          BOSS_AI.magicHeight,
        ),
      }];
    }

    return [];
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
        if (distance > BOSS_AI.loseRange) {
          this.enterState('idle');
        } else if (distance <= BOSS_AI.attackDistance) {
          this.enterState('recovery');
        } else {
          this.enterState('approach');
        }
      }
      return;
    }

    if (this.aiState === 'phase-transition') {
      this.setVelocityX(0);
      if (this.stateElapsed >= BOSS_AI.phaseTransitionMs) {
        this.enterState(distance <= BOSS_AI.attackDistance ? 'attack-preparation' : 'approach');
      }
      return;
    }

    if (this.aiState === 'dead') return;

    if (this.aiState === 'idle' || this.aiState === 'detect') {
      this.setVelocityX(0);
      if (distance <= BOSS_AI.detectRange) {
        this.facePlayer(player);
        if (this.aiState !== 'detect') {
          this.enterState('detect');
        }
        if (distance <= BOSS_AI.attackDistance) {
          this.enterState('attack-preparation');
        } else {
          this.enterState('approach');
        }
      } else {
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
        this.enterNextAttack(distance);
        return;
      }
      const direction = player.x >= this.x ? 1 : -1;
      this.setVelocityX(direction * (this.empowered ? BOSS_AI.empowerApproachSpeed : BOSS_AI.approachSpeed));
      if (this.empowered && distance <= BOSS_AI.beamRange) {
        this.enterNextPhaseTwoRangedAttack();
      }
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
      this.facePlayer(player);
      if (this.stateElapsed >= BOSS_AI.attackDurationMs) {
        this.enterState('recovery');
      }
      return;
    }

    if (this.aiState === 'beam-preparation') {
      this.setVelocityX(0);
      this.facePlayer(player);
      if (this.stateElapsed >= BOSS_AI.beamPreparationMs) {
        this.enterState('beam');
      }
      return;
    }

    if (this.aiState === 'beam') {
      this.setVelocityX(0);
      this.facePlayer(player);
      if (this.stateElapsed >= BOSS_AI.beamDurationMs) {
        this.enterState('recovery');
      }
      return;
    }

    if (this.aiState === 'magic-preparation') {
      this.setVelocityX(0);
      if (this.stateElapsed >= BOSS_AI.magicPreparationMs) {
        this.enterState('magic');
      }
      return;
    }

    if (this.aiState === 'magic') {
      this.setVelocityX(0);
      if (this.stateElapsed >= BOSS_AI.magicDurationMs) {
        this.enterState('recovery');
      }
      return;
    }

    if (this.aiState === 'recovery') {
      this.setVelocityX(0);
      if (this.stateElapsed >= BOSS_AI.recoveryMs) {
        if (distance > BOSS_AI.loseRange) {
          this.enterState('idle');
        } else if (distance <= BOSS_AI.attackDistance) {
          this.enterNextAttack(distance);
        } else if (this.empowered) {
          if (distance <= BOSS_AI.beamRange) {
            this.enterNextPhaseTwoRangedAttack();
            return;
          }
          this.enterState('approach');
        } else {
          this.enterState('approach');
        }
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

    const entersPhaseTwo = !this.empowered && this.hp <= this.maxHp * BOSS_AI.phaseTwoHpRatio;

    if (this.isDead) {
      this.enterState('dead');
      this.scene.events.emit('boss-died', this);
      this.setVelocity(0, 0);
      if (this.body) {
        (this.body as Phaser.Physics.Arcade.Body).enable = false;
      }
    } else if (entersPhaseTwo) {
      this.empowered = true;
      this.enterState('phase-transition');
      this.scene.events.emit('boss-phase-two', this);
    } else if (this.aiState === 'phase-transition') {
      return true;
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
    this.enableBody(true, this.spawnX, this.spawnY, true, true);
    this.setPosition(this.spawnX, this.spawnY);
    this.setVelocity(0, 0);
    this.setAlpha(1);
    this.clearTint();
    this.setActive(true).setVisible(true);
    this.facing = -1;
    this.empowered = false;
    this.attackPatternIndex = 0;
    this.setFlipX(true);
    this.enterState('idle');
  }

  private facePlayer(player: Player): void {
    this.facing = player.x >= this.x ? 1 : -1;
    this.setFlipX(this.facing < 0);
  }

  private enterState(next: BossState): void {
    if (this.aiState === next) {
      if (next === 'hurt') {
        this.stateElapsed = 0;
        this.play(ANIM.bossHurt);
      }
      return;
    }
    this.aiState = next;
    this.stateElapsed = 0;

    if (next === 'idle' || next === 'detect') {
      this.setVelocityX(0);
      this.play(ANIM.bossIdle, true);
    } else if (next === 'approach') {
      this.play(this.empowered ? ANIM.bossRun : ANIM.bossWalk, true);
    } else if (next === 'attack-preparation') {
      this.play(ANIM.bossCharge);
    } else if (next === 'attack') {
      this.play(ANIM.bossAttack);
    } else if (next === 'beam-preparation') {
      this.play(ANIM.bossBeamCharge);
    } else if (next === 'beam') {
      this.play(ANIM.bossBeam);
    } else if (next === 'magic-preparation') {
      this.play(ANIM.bossMagicCharge);
    } else if (next === 'magic') {
      this.play(ANIM.bossMagic);
    } else if (next === 'phase-transition') {
      this.setVelocity(0, 0);
      this.play(ANIM.bossCharge);
    } else if (next === 'recovery') {
      this.setVelocityX(0);
      this.play(ANIM.bossIdle, true);
    } else if (next === 'hurt') {
      this.setVelocityX(0);
      this.play(ANIM.bossHurt);
    } else if (next === 'dead') {
      this.setVelocity(0, 0);
      this.play(ANIM.bossDeath);
    }
    this.alignBodyToFrame();
  }

  private enterNextAttack(distance: number): void {
    if (!this.empowered) {
      this.enterState('attack-preparation');
      return;
    }
    if (distance <= BOSS_AI.attackDistance && this.attackPatternIndex % 3 === 0) {
      this.attackPatternIndex += 1;
      this.enterState('attack-preparation');
    } else {
      this.enterNextPhaseTwoRangedAttack();
    }
  }

  private enterNextPhaseTwoRangedAttack(): void {
    if (this.attackPatternIndex % 2 === 0) {
      this.attackPatternIndex += 1;
      this.enterState('beam-preparation');
    } else {
      this.attackPatternIndex += 1;
      this.enterState('magic-preparation');
    }
  }

  private alignBodyToFrame(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) {
      return;
    }
    const centeredOffsetX = (this.frame.width - body.width) / 2;
    const offsetX = this.facing < 0
      ? this.frame.width - centeredOffsetX - body.width
      : centeredOffsetX;
    body.setOffset(offsetX, this.frame.height - body.height);
  }
}
