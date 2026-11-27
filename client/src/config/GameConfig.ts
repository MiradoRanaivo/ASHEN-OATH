/**
 * Valeurs centralisées du jeu.
 * Toute la tuning (dégâts, coûts, vitesses, fenêtres) vit ici, jamais dans les entités.
 */

export const VIEW = {
  width: 480,
  height: 270,
  worldWidth: 2080,
  groundY: 250,
} as const;

export const PHYSICS = {
  gravityY: 680,
} as const;

/** Définition d'une animation : nombre de frames et cadence. */
export interface Clip {
  readonly frames: number;
  readonly fps: number;
}

export const CLIP = {
  light: { frames: 6, fps: 18 },
  heavy: { frames: 10, fps: 14 },
  dodge: { frames: 12, fps: 18 },
  parry: { frames: 3, fps: 12 },
  enemyAttack: { frames: 6, fps: 10 },
} as const satisfies Record<string, Clip>;

export const clipDurationMs = (clip: Clip): number => (clip.frames / clip.fps) * 1000;

/** Fenêtre active exprimée en index de frame, convertie en millisecondes. */
export const frameWindowMs = (clip: Clip, from: number, to: number) => ({
  start: (from / clip.fps) * 1000,
  end: ((to + 1) / clip.fps) * 1000,
});

export interface AttackProfile {
  readonly clip: Clip;
  readonly damage: number;
  readonly stamina: number;
  readonly activeFrom: number;
  readonly activeTo: number;
  readonly range: number;
  readonly height: number;
  readonly knockback: number;
}

export const ATTACK = {
  light: {
    clip: { frames: 6, fps: 18 },
    damage: 12,
    stamina: 14,
    activeFrom: 2,
    activeTo: 3,
    range: 30,
    height: 30,
    knockback: 90,
  },
  heavy: {
    clip: { frames: 10, fps: 14 },
    damage: 26,
    stamina: 28,
    activeFrom: 3,
    activeTo: 4,
    range: 38,
    height: 36,
    knockback: 170,
  },
} as const satisfies Record<string, AttackProfile>;

export const PLAYER = {
  speed: 155,
  jumpVelocity: 305,
  maxHp: 100,
  maxStamina: 100,
  staminaRegenPerSecond: 26,
  staminaRegenDelayMs: 550,
  hurtInvulnerabilityMs: 650,
  hurtStunMs: 260,
  dodge: {
    clip: { frames: 12, fps: 18 },
    stamina: 16,
    speed: 250,
    invulnerableMs: 667,
  },
  parry: {
    clip: { frames: 5, fps: 14 },
    stamina: 10,
    windowMs: 190,
  },
  riposteWindowMs: 800,
  respawnDelayMs: 2200,
} as const;

export interface EnemyProfile {
  readonly hp: number;
  readonly speed: number;
  readonly chaseSpeed: number;
  readonly damage: number;
  readonly detectRange: number;
  readonly attackRange: number;
  readonly scale: number;
  readonly body: { readonly width: number; readonly height: number; readonly offsetX: number; readonly offsetY: number };
  readonly attackCooldownMs: number;
  readonly stunMs: number;
}

export const ENEMY = {
  skeleton: {
    hp: 58,
    speed: 42,
    chaseSpeed: 78,
    damage: 11,
    detectRange: 170,
    attackRange: 44,
    scale: 0.62,
    body: { width: 30, height: 60, offsetX: 45, offsetY: 26 },
    attackCooldownMs: 900,
    stunMs: 280,
  },
  zombie: {
    hp: 82,
    speed: 34,
    chaseSpeed: 60,
    damage: 14,
    detectRange: 140,
    attackRange: 40,
    scale: 0.62,
    body: { width: 26, height: 62, offsetX: 31, offsetY: 26 },
    attackCooldownMs: 1100,
    stunMs: 320,
  },
  bandit: {
    hp: 70,
    speed: 56,
    chaseSpeed: 104,
    damage: 12,
    detectRange: 200,
    attackRange: 46,
    scale: 0.6,
    body: { width: 30, height: 64, offsetX: 47, offsetY: 31 },
    attackCooldownMs: 780,
    stunMs: 240,
  },
  demon: {
    hp: 76,
    speed: 48,
    chaseSpeed: 88,
    damage: 15,
    detectRange: 180,
    attackRange: 48,
    scale: 0.62,
    body: { width: 42, height: 45, offsetX: 40, offsetY: 28 },
    attackCooldownMs: 950,
    stunMs: 280,
  },
} as const satisfies Record<string, EnemyProfile>;

export type EnemyKind = keyof typeof ENEMY;

export const COLORS = {
  background: 0x0b0a10,
  hudFrame: 0x1a1620,
  hp: 0xa8323c,
  hpLoss: 0x5c1d24,
  stamina: 0xc9a227,
  staminaLoss: 0x4a3d12,
  text: 0xd8c8ad,
  textDim: 0x8f8178,
} as const;

export const DEPTH = {
  backdrop: -10,
  prop: -5,
  platform: 1,
  player: 3,
  enemy: 2,
  effect: 4,
  hud: 20,
  overlay: 30,
} as const;

export const BOSS_AI = {
  // Le boss ne détecte le joueur qu'une fois celui-ci entré dans l'arène.
  detectRange: 280,
  loseRange: 520,
  approachSpeed: 72,
  attackDistance: 82,
  phaseTwoHpRatio: 0.5,
  preparationMs: 500,
  attackDurationMs: 750,
  attackActiveFromMs: 300,
  attackActiveToMs: 500,
  attackDamage: 22,
  attackRange: 90,
  attackHeight: 86,
  beamPreparationMs: 650,
  beamDurationMs: 900,
  beamActiveFromMs: 350,
  beamActiveToMs: 650,
  beamDamage: 18,
  beamRange: 260,
  beamHeight: 50,
  magicPreparationMs: 700,
  magicDurationMs: 1100,
  magicActiveFromMs: 500,
  magicActiveToMs: 850,
  magicDamage: 20,
  magicRange: 280,
  magicHeight: 70,
  phaseTransitionMs: 900,
  empowerApproachSpeed: 96,
  recoveryMs: 700,
  hurtStunMs: 180,
} as const;
