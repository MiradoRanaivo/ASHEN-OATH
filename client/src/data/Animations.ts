import type Phaser from 'phaser';
import { clipDurationMs, CLIP } from '../config/GameConfig';

export const ANIM = {
  knightIdle: 'knight-idle-loop',
  knightRun: 'knight-run-loop',
  knightJump: 'knight-jump',
  knightFall: 'knight-fall-loop',
  knightDeath: 'knight-death',
  light: 'knight-light',
  heavy: 'knight-heavy',
  dodge: 'knight-dodge',
  parry: 'knight-parry',
  enemyIdle: (kind: string) => `${kind}-idle`,
  enemyAttack: (kind: string) => `${kind}-attack`,
  impact: 'fx-impact',
  damage: 'fx-damage',
  death: 'fx-death',

  bossIdle: 'boss-idle-loop',
  bossBeam: 'boss-beam-loop',
  bossMagic: 'boss-magic-loop',
  bossWalk: 'boss-walk-loop',
  bossRun: 'boss-run-loop',
  bossAttack: 'boss-attack',
  bossCharge: 'boss-charge',
  bossBeamCharge: 'boss-beam-charge',
  bossMagicCharge: 'boss-magic-charge',
  bossHurt: 'boss-hurt',
  bossDeath: 'boss-death',
} as const;

interface AnimSpec {
  readonly key: string;
  readonly sheet: string;
  readonly start: number;
  readonly end: number;
  readonly frameRate: number;
  readonly repeat: number;
}

const SPECS: readonly AnimSpec[] = [
  { key: ANIM.knightIdle, sheet: 'knight-idle', start: 0, end: 9, frameRate: 8, repeat: -1 },
  { key: ANIM.knightRun, sheet: 'knight-run', start: 0, end: 9, frameRate: 12, repeat: -1 },
  { key: ANIM.knightJump, sheet: 'knight-jump', start: 0, end: 2, frameRate: 8, repeat: 0 },
  { key: ANIM.knightFall, sheet: 'knight-fall', start: 0, end: 2, frameRate: 8, repeat: -1 },
  { key: ANIM.knightDeath, sheet: 'knight-death', start: 0, end: 9, frameRate: 10, repeat: 0 },

  { key: ANIM.light, sheet: 'knight-light', start: 0, end: 5, frameRate: CLIP.light.fps, repeat: 0 },
  { key: ANIM.heavy, sheet: 'knight-heavy', start: 0, end: 9, frameRate: 14, repeat: 0 },
  { key: ANIM.dodge, sheet: 'knight-dodge', start: 0, end: 11, frameRate: 18, repeat: 0 },
  { key: ANIM.parry, sheet: 'knight-parry', start: 0, end: 2, frameRate: 12, repeat: 0 },

  { key: ANIM.enemyIdle('skeleton'), sheet: 'skeleton', start: 0, end: 1, frameRate: 4, repeat: -1 },
  { key: ANIM.enemyAttack('skeleton'), sheet: 'skeleton', start: 0, end: 5, frameRate: CLIP.enemyAttack.fps, repeat: 0 },
  { key: ANIM.enemyIdle('zombie'), sheet: 'zombie', start: 0, end: 1, frameRate: 4, repeat: -1 },
  { key: ANIM.enemyAttack('zombie'), sheet: 'zombie', start: 0, end: 5, frameRate: CLIP.enemyAttack.fps, repeat: 0 },
  { key: ANIM.enemyIdle('bandit'), sheet: 'bandit', start: 0, end: 1, frameRate: 4, repeat: -1 },
  { key: ANIM.enemyAttack('bandit'), sheet: 'bandit', start: 0, end: 5, frameRate: CLIP.enemyAttack.fps, repeat: 0 },
  { key: ANIM.enemyIdle('demon'), sheet: 'demon', start: 0, end: 1, frameRate: 4, repeat: -1 },
  { key: ANIM.enemyAttack('demon'), sheet: 'demon', start: 0, end: 5, frameRate: CLIP.enemyAttack.fps, repeat: 0 },

  { key: ANIM.impact, sheet: 'impact', start: 0, end: 4, frameRate: 24, repeat: 0 },
  { key: ANIM.damage, sheet: 'damage', start: 0, end: 5, frameRate: 18, repeat: 0 },
  { key: ANIM.death, sheet: 'death-fx', start: 0, end: 2, frameRate: 12, repeat: 0 },

  { key: ANIM.bossIdle, sheet: 'boss-movement', start: 0, end: 3, frameRate: 6, repeat: -1 },
  { key: ANIM.bossWalk, sheet: 'boss-movement', start: 4, end: 8, frameRate: 8, repeat: -1 },
  { key: ANIM.bossRun, sheet: 'boss-movement', start: 4, end: 8, frameRate: 14, repeat: -1 },
  { key: ANIM.bossAttack, sheet: 'boss-melee', start: 0, end: 5, frameRate: 10, repeat: 0 },
  { key: ANIM.bossCharge, sheet: 'boss-melee', start: 0, end: 1, frameRate: 6, repeat: 0 },
  { key: ANIM.bossBeamCharge, sheet: 'boss-beam-cast', start: 0, end: 5, frameRate: 10, repeat: -1 },
  { key: ANIM.bossBeam, sheet: 'boss-beam-cast', start: 6, end: 8, frameRate: 8, repeat: 0 },
  { key: ANIM.bossMagicCharge, sheet: 'boss-aoe-cast', start: 0, end: 2, frameRate: 8, repeat: -1 },
  { key: ANIM.bossMagic, sheet: 'boss-aoe-cast', start: 0, end: 3, frameRate: 8, repeat: 0 },
  { key: ANIM.bossHurt, sheet: 'boss-hurt', start: 0, end: 2, frameRate: 10, repeat: 0 },
  { key: ANIM.bossDeath, sheet: 'boss-death', start: 0, end: 2, frameRate: 6, repeat: 0 },
];

export const ATTACK_DURATION = {
  light: clipDurationMs(CLIP.light),
  heavy: clipDurationMs(CLIP.heavy),
} as const;

export const DODGE_DURATION = clipDurationMs(CLIP.dodge);
export const PARRY_DURATION = clipDurationMs(CLIP.parry);
export const ENEMY_ATTACK_DURATION = clipDurationMs(CLIP.enemyAttack);

export function registerAnimations(scene: Phaser.Scene): void {
  for (const spec of SPECS) {
    if (scene.anims.exists(spec.key)) {
      continue;
    }
    scene.anims.create({
      key: spec.key,
      frames: scene.anims.generateFrameNumbers(spec.sheet, { start: spec.start, end: spec.end }),
      frameRate: spec.frameRate,
      repeat: spec.repeat,
    });
  }
}
