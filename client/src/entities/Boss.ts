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
  readonly ellipse?: Phaser.Geom.Ellipse;
  readonly damage: number;
}

const VERTICAL_MELEE_TOLERANCE = 68;
const VERTICAL_RANGED_TOLERANCE = 100;

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
    this.setScale(1.12);
    this.setFlipX(true);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(48, 94);
    body.setDragX(760);
    body.setMaxVelocity(BOSS_AI.empowerApproachSpeed, 600);
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

  get stateElapsedMs(): number {
    return this.stateElapsed;
  }

  get phase(): 1 | 2 {
    return this.empowered ? 2 : 1;
  }

  getAttackBoxes(): readonly BossAttackBox[] {
    if (this.aiState === 'attack') {
      if (this.stateElapsed < BOSS_AI.attackActiveFromMs || this.stateElapsed > BOSS_AI.attackActiveToMs) return [];
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
      if (this.stateElapsed < BOSS_AI.beamActiveFromMs || this.stateElapsed > BOSS_AI.beamActiveToMs) return [];
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
      if (this.stateElapsed < BOSS_AI.magicActiveFromMs || this.stateElapsed > BOSS_AI.magicActiveToMs) return [];
      return [{
        kind: 'magic',
        damage: BOSS_AI.magicDamage,
        // L'ellipse correspond exactement à la zone annoncée par le télégraphe
        // et par le visuel AOE (même centre et mêmes dimensions).
        box: new Phaser.Geom.Rectangle(
          this.x - BOSS_AI.magicRange / 2,
          this.y - BOSS_AI.magicHeight,
          BOSS_AI.magicRange,
          BOSS_AI.magicHeight,
        ),
        ellipse: new Phaser.Geom.Ellipse(
          this.x,
          this.y - BOSS_AI.magicHeight / 2,
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
    if (player.isDead) {
      this.stopMovement();
      if (this.aiState !== 'idle') this.enterState('idle');
      return;
    }

    this.stateElapsed += deltaMs;
    const distance = Math.abs(player.x - this.x);
    const verticalDistance = Math.abs(player.y - this.y);
    const canUseMelee = verticalDistance <= VERTICAL_MELEE_TOLERANCE;
    const canUseRanged = verticalDistance <= VERTICAL_RANGED_TOLERANCE;

    if (this.aiState === 'hurt') {
      this.stopMovement();
      if (this.stateElapsed >= BOSS_AI.hurtStunMs) {
        if (distance > BOSS_AI.loseRange) this.enterState('idle');
        else if (distance <= BOSS_AI.attackDistance && canUseMelee) this.enterState('recovery');
        else this.enterState('approach');
      }
      return;
    }

    if (this.aiState === 'phase-transition') {
      this.stopMovement();
      if (this.stateElapsed >= BOSS_AI.phaseTransitionMs) {
        if (distance <= BOSS_AI.attackDistance && canUseMelee) this.enterState('attack-preparation');
        else this.enterState('approach');
      }
      return;
    }

    if (this.aiState === 'dead') return;

    if (this.aiState === 'idle' || this.aiState === 'detect') {
      this.stopMovement();
      if (distance > BOSS_AI.detectRange) {
        if (this.aiState !== 'idle') this.enterState('idle');
        return;
      }
      this.facePlayer(player);
      if (distance <= BOSS_AI.attackDistance && canUseMelee) {
        this.enterNextAttack(distance);
      } else {
        this.enterState('approach');
      }
      return;
    }

    if (this.aiState === 'approach') {
      if (distance > BOSS_AI.loseRange) {
        this.enterState('idle');
        return;
      }
      this.facePlayer(player);

      if (distance <= BOSS_AI.attackDistance && canUseMelee) {
        this.enterNextAttack(distance);
        return;
      }
      if (this.empowered && distance <= BOSS_AI.beamRange && canUseRanged && distance > BOSS_AI.attackDistance) {
        this.enterNextPhaseTwoRangedAttack();
        return;
      }

      const direction = player.x >= this.x ? 1 : -1;
      const speed = this.empowered ? BOSS_AI.empowerApproachSpeed : BOSS_AI.approachSpeed;
      if (distance < 24) this.stopMovement();
      else this.moveToward(direction, speed);
      return;
    }

    if (this.aiState === 'attack-preparation') {
      this.stopMovement();
      this.facePlayer(player);
      if (this.stateElapsed >= BOSS_AI.preparationMs) this.enterState('attack');
      return;
    }

    if (this.aiState === 'attack') {
      // Ruée courte et lisible au milieu du coup : le boss engage son poids, sans suivre le joueur.
      if (this.stateElapsed >= 180 && this.stateElapsed <= 410) {
        const body = this.body as Phaser.Physics.Arcade.Body;
        body.setVelocityX(this.facing * (this.empowered ? 112 : 82));
      } else {
        this.stopMovement();
      }
      if (this.stateElapsed >= BOSS_AI.attackDurationMs) this.enterState('recovery');
      return;
    }

    if (this.aiState === 'beam-preparation') {
      this.stopMovement();
      this.facePlayer(player);
      if (this.stateElapsed >= BOSS_AI.beamPreparationMs) this.enterState('beam');
      return;
    }

    if (this.aiState === 'beam') {
      // Le rayon garde la direction annoncée pendant sa préparation.
      this.stopMovement();
      if (this.stateElapsed >= BOSS_AI.beamDurationMs) this.enterState('recovery');
      return;
    }

    if (this.aiState === 'magic-preparation') {
      this.stopMovement();
      if (this.stateElapsed >= BOSS_AI.magicPreparationMs) this.enterState('magic');
      return;
    }

    if (this.aiState === 'magic') {
      this.stopMovement();
      if (this.stateElapsed >= BOSS_AI.magicDurationMs) this.enterState('recovery');
      return;
    }

    if (this.aiState === 'recovery') {
      this.stopMovement();
      if (this.stateElapsed < BOSS_AI.recoveryMs) return;

      if (distance > BOSS_AI.loseRange) {
        this.enterState('idle');
      } else if (distance <= BOSS_AI.attackDistance && canUseMelee) {
        this.enterNextAttack(distance);
      } else if (this.empowered && distance <= BOSS_AI.beamRange && canUseRanged) {
        this.enterNextPhaseTwoRangedAttack();
      } else {
        this.enterState('approach');
      }
    }
  }

  receiveHit(attackId: number, damage: number, knockback: number, fromX: number): boolean {
    if (this.isDead || this.lastHitAttackId === attackId) return false;

    this.lastHitAttackId = attackId;
    this.hp = Math.max(0, this.hp - damage);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(70, () => {
      if (this.active) this.clearTint();
    });

    const direction = fromX < this.x ? 1 : -1;
    this.setVelocity(direction * knockback * 0.12, -15);

    const entersPhaseTwo = !this.empowered && this.hp <= this.maxHp * BOSS_AI.phaseTwoHpRatio;

    if (this.isDead) {
      this.enterState('dead');
      this.scene.events.emit('boss-died', this);
      this.setVelocity(0, 0);
      if (this.body) (this.body as Phaser.Physics.Arcade.Body).enable = false;
    } else if (entersPhaseTwo) {
      this.empowered = true;
      this.setScale(1.2);
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.setSize(52, 100);
      this.alignBodyToFrame();
      this.enterState('phase-transition');
      this.scene.events.emit('boss-phase-two', this);
    }
    // Un coup reçu ne doit pas interrompre l'action en cours :
    // les préparations, attaques et récupérations continuent leur chronomètre
    // et leur animation. Seuls la mort et le passage en phase 2 remplacent l'état.

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
    this.setScale(1.12);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(48, 94);
    this.alignBodyToFrame();
    this.attackPatternIndex = 0;
    this.setFlipX(true);
    this.enterState('idle');
  }

  private facePlayer(player: Player): void {
    const nextFacing = player.x >= this.x ? 1 : -1;
    if (nextFacing === this.facing) return;
    this.facing = nextFacing;
    this.setFlipX(this.facing < 0);
    this.alignBodyToFrame();
  }

  private moveToward(direction: number, speed: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setMaxVelocity(speed, 600);
    body.setAccelerationX(direction * (this.empowered ? 680 : 520));
    body.setDragX(760);
  }

  private stopMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Laisse le drag physique freiner le boss progressivement, sans amortissement
    // multiplié à chaque frame (qui rendait le mouvement dépendant du FPS).
    body.setAccelerationX(0);
    body.setDragX(760);
    if (Math.abs(body.velocity.x) < 5) body.setVelocityX(0);
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
      this.stopMovement();
      this.play(ANIM.bossIdle, true);
    } else if (next === 'approach') {
      this.play(this.empowered ? ANIM.bossRun : ANIM.bossWalk, true);
    } else if (next === 'attack-preparation') {
      this.stopMovement();
      this.play(ANIM.bossCharge);
    } else if (next === 'attack') {
      this.stopMovement();
      this.play(ANIM.bossAttack);
    } else if (next === 'beam-preparation') {
      this.stopMovement();
      this.play(ANIM.bossBeamCharge);
    } else if (next === 'beam') {
      this.stopMovement();
      this.play(ANIM.bossBeam);
    } else if (next === 'magic-preparation') {
      this.stopMovement();
      this.play(ANIM.bossMagicCharge);
    } else if (next === 'magic') {
      this.stopMovement();
      this.play(ANIM.bossMagic);
    } else if (next === 'phase-transition') {
      this.setVelocity(0, 0);
      this.play(ANIM.bossCharge);
    } else if (next === 'recovery') {
      this.stopMovement();
      this.play(ANIM.bossIdle, true);
    } else if (next === 'hurt') {
      this.stopMovement();
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
    if (!body) return;

    const centeredOffsetX = (this.frame.width - body.width) / 2;
    const offsetX = this.facing < 0
      ? this.frame.width - centeredOffsetX - body.width
      : centeredOffsetX;
    body.setOffset(offsetX, this.frame.height - body.height);
  }
}
