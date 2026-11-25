import Phaser from 'phaser';
import { ANIM, ATTACK_DURATION, DODGE_DURATION, PARRY_DURATION } from '../data/Animations';
import { ATTACK, frameWindowMs, PLAYER } from '../config/GameConfig';

export interface PlayerInput {
  left: boolean;
  right: boolean;
  jumpPressed: boolean;
  lightPressed: boolean;
  heavyPressed: boolean;
  dodgePressed: boolean;
  parryPressed: boolean;
}

export type DamageResult = 'hit' | 'parried' | 'none';

type PlayerStateName = 'idle' | 'run' | 'jump' | 'fall' | 'light' | 'heavy' | 'dodge' | 'parry' | 'hurt' | 'dead';

const ACTION_STATES: readonly PlayerStateName[] = ['light', 'heavy', 'dodge', 'parry'];

interface BodyShape {
  readonly texture: string;
  readonly width: number;
  readonly height: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
}

/**
 * Les deux packs n'ont pas la même densité de pixels : le chevalier FreeKnight
 * occupe ~42 px dans une frame de 120x80, les planches web2d ~60 px dans une
 * frame de 130x94. On compense par l'échelle pour garder une taille constante.
 */
const BODY: Readonly<Record<string, BodyShape>> = {
  knight: { texture: 'knight-idle', width: 20, height: 36, offsetX: 50, offsetY: 42, scale: 1 },
  death: { texture: 'knight-death', width: 24, height: 30, offsetX: 48, offsetY: 50, scale: 1 },
  light: { texture: 'knight-light', width: 20, height: 36, offsetX: 50, offsetY: 42, scale: 1 },
  heavy: { texture: 'knight-heavy', width: 20, height: 36, offsetX: 50, offsetY: 42, scale: 1 },
  dodge: { texture: 'knight-dodge', width: 20, height: 34, offsetX: 50, offsetY: 44, scale: 1 },
  parry: { texture: 'knight-parry', width: 20, height: 36, offsetX: 50, offsetY: 42, scale: 1 },
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  hp: number = PLAYER.maxHp;
  stamina: number = PLAYER.maxStamina;
  facing = 1;

  private stateName: PlayerStateName = 'idle';
  private stateElapsed = 0;
  private invulnerableUntil = 0;
  private staminaLockedUntil = 0;
  private riposteUntil = 0;
  private parryWindowUntil = 0;
  private pendingRiposte = false;
  private parrySucceeded = false;
  private attackCounter = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'knight-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);
    this.setDepth(3);
    this.applyBody(BODY.knight);
    this.play(ANIM.knightIdle);
  }

  get isDead(): boolean {
    return this.stateName === 'dead';
  }

  get isBusy(): boolean {
    return ACTION_STATES.includes(this.stateName);
  }

  get isDodging(): boolean {
    return this.stateName === 'dodge';
  }

  get isInvulnerable(): boolean {
    return this.scene.time.now < this.invulnerableUntil;
  }

  get attackId(): number {
    return this.attackCounter;
  }

  get riposteReady(): boolean {
    return this.pendingRiposte && this.scene.time.now < this.riposteUntil;
  }

  /** Hitbox active uniquement pendant la fenêtre de frappe de l'attaque courante. */
  getAttackBox(): Phaser.Geom.Rectangle | null {
    if (this.stateName !== 'light' && this.stateName !== 'heavy') {
      return null;
    }
    const profile = this.stateName === 'light' ? ATTACK.light : ATTACK.heavy;
    const window = frameWindowMs(profile.clip, profile.activeFrom, profile.activeTo);
    if (this.stateElapsed < window.start || this.stateElapsed > window.end) {
      return null;
    }
    return new Phaser.Geom.Rectangle(
      this.facing > 0 ? this.x + 6 : this.x - 6 - profile.range,
      this.y - profile.height - 8,
      profile.range,
      profile.height,
    );
  }

  /** Dégâts de l'attaque en cours, doublés si une riposte est ouverte. */
  getAttackDamage(): number {
    const profile = this.stateName === 'heavy' ? ATTACK.heavy : ATTACK.light;
    return this.riposteReady ? profile.damage * 2 : profile.damage;
  }

  getAttackKnockback(): number {
    return this.stateName === 'heavy' ? ATTACK.heavy.knockback : ATTACK.light.knockback;
  }

  updatePlayer(input: PlayerInput, deltaMs: number): void {
    this.stateElapsed += deltaMs;
    this.regenerateStamina(deltaMs);

    if (this.stateName === 'dead') {
      return;
    }

    if (this.stateName === 'hurt') {
      if (this.stateElapsed >= PLAYER.hurtStunMs) {
        this.enterIdle();
      }
      return;
    }

    if (ACTION_STATES.includes(this.stateName)) {
      this.setVelocityX(this.stateName === 'dodge' ? this.facing * PLAYER.dodge.speed : 0);
      if (this.stateElapsed >= this.actionDuration()) {
        this.enterIdle();
      }
      return;
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    const grounded = body.blocked.down;

    if (this.tryActions(input)) {
      return;
    }

    if (input.left === input.right) {
      this.setVelocityX(0);
    } else {
      this.facing = input.left ? -1 : 1;
      this.setVelocityX(this.facing * PLAYER.speed);
    }
    this.setFlipX(this.facing < 0);

    if (input.jumpPressed && grounded) {
      this.setVelocityY(-PLAYER.jumpVelocity);
    }

    if (!grounded) {
      this.play(body.velocity.y < 0 ? ANIM.knightJump : ANIM.knightFall, true);
      return;
    }

    if (Math.abs(body.velocity.x) > 1) {
      this.play(ANIM.knightRun, true);
    } else {
      this.play(ANIM.knightIdle, true);
    }
  }

  spendStamina(amount: number): boolean {
    if (this.stamina < amount) {
      return false;
    }
    this.stamina -= amount;
    this.staminaLockedUntil = this.scene.time.now + PLAYER.staminaRegenDelayMs;
    return true;
  }

  takeDamage(amount: number, fromX: number): DamageResult {
    const now = this.scene.time.now;
    if (this.stateName === 'dead' || now < this.invulnerableUntil) {
      return 'none';
    }

    if (this.stateName === 'parry' && now < this.parryWindowUntil && !this.parrySucceeded) {
      this.parrySucceeded = true;
      this.pendingRiposte = true;
      this.riposteUntil = now + PLAYER.riposteWindowMs;
      this.invulnerableUntil = now + 220;
      this.setTint(0xfff2c4);
      this.scene.time.delayedCall(140, () => this.clearTint());
      return 'parried';
    }

    this.hp = Math.max(0, this.hp - amount);
    this.invulnerableUntil = now + PLAYER.hurtInvulnerabilityMs;
    this.stateName = 'hurt';
    this.stateElapsed = 0;
    this.applyBody(BODY.knight);
    this.play(ANIM.knightIdle, true);
    this.setVelocity(fromX < this.x ? 120 : -120, -90);
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(90, () => this.clearTint());

    if (this.hp <= 0) {
      this.die();
    }
    return 'hit';
  }

  consumeRiposte(): void {
    this.pendingRiposte = false;
  }

  respawn(x: number, y: number): void {
    this.hp = PLAYER.maxHp;
    this.stamina = PLAYER.maxStamina;
    this.invulnerableUntil = 0;
    this.pendingRiposte = false;
    this.riposteUntil = 0;
    this.parryWindowUntil = 0;
    this.parrySucceeded = false;
    this.stateName = 'idle';
    this.stateElapsed = 0;
    this.facing = 1;
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.clearTint();
    this.setAlpha(1);
    this.setFlipX(false);
    this.applyBody(BODY.knight);
    this.play(ANIM.knightIdle, true);
  }

  private die(): void {
    this.stateName = 'dead';
    this.stateElapsed = 0;
    this.setVelocity(0, 0);
    this.applyBody(BODY.death);
    this.play(ANIM.knightDeath);
  }

  private actionDuration(): number {
    switch (this.stateName) {
      case 'dodge':
        return DODGE_DURATION;
      case 'parry':
        return PARRY_DURATION;
      case 'heavy':
        return ATTACK_DURATION.heavy;
      default:
        return ATTACK_DURATION.light;
    }
  }

  private tryActions(input: PlayerInput): boolean {
    if (input.dodgePressed && this.spendStamina(PLAYER.dodge.stamina)) {
      this.beginAction('dodge', BODY.dodge, ANIM.dodge);
      this.invulnerableUntil = this.scene.time.now + PLAYER.dodge.invulnerableMs;
      return true;
    }
    if (input.parryPressed && this.spendStamina(PLAYER.parry.stamina)) {
      this.beginAction('parry', BODY.parry, ANIM.parry);
      this.parryWindowUntil = this.scene.time.now + PLAYER.parry.windowMs;
      this.parrySucceeded = false;
      return true;
    }
    if (input.heavyPressed && this.spendStamina(ATTACK.heavy.stamina)) {
      this.beginAction('heavy', BODY.heavy, ANIM.heavy);
      this.attackCounter += 1;
      return true;
    }
    if (input.lightPressed && this.spendStamina(ATTACK.light.stamina)) {
      this.beginAction('light', BODY.light, ANIM.light);
      this.attackCounter += 1;
      return true;
    }
    return false;
  }

  private beginAction(state: PlayerStateName, shape: BodyShape, animation: string): void {
    this.stateName = state;
    this.stateElapsed = 0;
    this.setVelocityX(0);
    this.applyBody(shape);
    this.play(animation);
  }

  private enterIdle(): void {
    this.stateName = 'idle';
    this.stateElapsed = 0;
    this.applyBody(BODY.knight);
    this.play(ANIM.knightIdle, true);
  }

  private regenerateStamina(deltaMs: number): void {
    if (this.scene.time.now < this.staminaLockedUntil || this.stamina >= PLAYER.maxStamina) {
      return;
    }
    this.stamina = Math.min(PLAYER.maxStamina, this.stamina + (PLAYER.staminaRegenPerSecond * deltaMs) / 1000);
  }

  /** Change de texture puis recale le corps physique sur la nouvelle frame. */
  private applyBody(shape: BodyShape): void {
    this.setTexture(shape.texture);
    this.setScale(shape.scale);
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.setSize(shape.width, shape.height);
      body.setOffset(shape.offsetX, shape.offsetY);
    }
  }
}
