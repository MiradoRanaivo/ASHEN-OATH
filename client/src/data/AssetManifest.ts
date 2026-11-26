/** Inventaire des ressources chargées par PreloadScene. */

export interface SheetDef {
  readonly key: string;
  readonly path: string;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly frames: number;
}

const WEB2D = 'assets/web2d';
const KNIGHT = 'assets/knight/Colour1/Outline/120x80_PNGSheets';
const BOSS = 'assets/boss/fallen_skeleton_king';

export const IMAGE_ASSETS: readonly { key: string; path: string }[] = [
  { key: 'environment', path: `${WEB2D}/environment_dark_ruins_moonlight.png` },
  { key: 'dark-ages-ui', path: 'assets/ui/dark-ages/32x32-Tilesheet.png' },
  { key: 'boss-beam-visual', path: `${BOSS}/beam_visual.png` },
  { key: 'boss-aoe-visual', path: `${BOSS}/aoe_visual.png` },
];

export const SHEET_ASSETS: readonly SheetDef[] = [
  // Déplacements du chevalier (pack FreeKnight)
  { key: 'knight-idle', path: `${KNIGHT}/_Idle.png`, frameWidth: 120, frameHeight: 80, frames: 10 },
  { key: 'knight-run', path: `${KNIGHT}/_Run.png`, frameWidth: 120, frameHeight: 80, frames: 10 },
  { key: 'knight-jump', path: `${KNIGHT}/_Jump.png`, frameWidth: 120, frameHeight: 80, frames: 3 },
  { key: 'knight-fall', path: `${KNIGHT}/_Fall.png`, frameWidth: 120, frameHeight: 80, frames: 3 },
  { key: 'knight-death', path: `${KNIGHT}/_Death.png`, frameWidth: 120, frameHeight: 80, frames: 10 },

  // Actions du chevalier FreeKnight
  { key: 'knight-light', path: `${KNIGHT}/_Attack2NoMovement.png`, frameWidth: 120, frameHeight: 80, frames: 6 },
  { key: 'knight-heavy', path: `${KNIGHT}/_AttackComboNoMovement.png`, frameWidth: 120, frameHeight: 80, frames: 10 },
  { key: 'knight-dodge', path: `${KNIGHT}/_Roll.png`, frameWidth: 120, frameHeight: 80, frames: 12 },
  { key: 'knight-parry', path: `${KNIGHT}/_CrouchFull.png`, frameWidth: 120, frameHeight: 80, frames: 3 },

  // Ennemis
  { key: 'skeleton', path: `${WEB2D}/skeleton_clean_spritesheet.png`, frameWidth: 120, frameHeight: 95, frames: 6 },
  { key: 'zombie', path: `${WEB2D}/zombie_clean_spritesheet.png`, frameWidth: 89, frameHeight: 98, frames: 6 },
  { key: 'bandit', path: `${WEB2D}/bandit_clean_spritesheet.png`, frameWidth: 125, frameHeight: 105, frames: 6 },
  { key: 'demon', path: `${WEB2D}/demon_clean_spritesheet.png`, frameWidth: 122, frameHeight: 75, frames: 6 },

  // Effets
  { key: 'impact', path: `${WEB2D}/impact_effects_clean_spritesheet.png`, frameWidth: 175, frameHeight: 155, frames: 5 },
  { key: 'damage', path: `${WEB2D}/damage_effects_clean_spritesheet.png`, frameWidth: 146, frameHeight: 164, frames: 6 },
  { key: 'death-fx', path: `${WEB2D}/death_animation_clean_spritesheet.png`, frameWidth: 270, frameHeight: 125, frames: 3 },

  // Extracted character silhouettes from the confirmed idle/walk row.
  { key: 'boss-movement', path: `${BOSS}/movement.png`, frameWidth: 128, frameHeight: 160, frames: 12 },
  { key: 'boss-melee', path: `${BOSS}/melee.png`, frameWidth: 128, frameHeight: 160, frames: 6 },
  { key: 'boss-beam-cast', path: `${BOSS}/beam_cast.png`, frameWidth: 128, frameHeight: 160, frames: 9 },
  { key: 'boss-aoe-cast', path: `${BOSS}/aoe_cast.png`, frameWidth: 128, frameHeight: 160, frames: 4 },
  { key: 'boss-hurt', path: `${BOSS}/hurt.png`, frameWidth: 128, frameHeight: 160, frames: 3 },
  { key: 'boss-death', path: `${BOSS}/death.png`, frameWidth: 128, frameHeight: 160, frames: 3 },
  { key: 'boss-static-pose', path: `${BOSS}/single_pose.png`, frameWidth: 128, frameHeight: 160, frames: 1 },

  // Monde 2 — terrain 16x16 vérifié dans tilesets.json
  { key: 'world2-cursed-ground', path: 'assets/world2/tilesets/cursed-land/ground.png', frameWidth: 16, frameHeight: 16, frames: 2240 },
  { key: 'world2-undead-ground', path: 'assets/world2/tilesets/undead-land/ground_rocks.png', frameWidth: 16, frameHeight: 16, frames: 2262 },

  // Monde 2 — bande animée vérifiée dans animations.json (shadow2)
  { key: 'world2-undead-anim1', path: 'assets/world2/animations/undead-anim1-shadow2.png', frameWidth: 112, frameHeight: 128, frames: 6 },
];

/** Dimensions réelles des frames, utilisées pour recaler les corps physiques. */
export const FRAME_SIZE: Readonly<Record<string, { width: number; height: number }>> = Object.fromEntries(
  SHEET_ASSETS.map((sheet) => [sheet.key, { width: sheet.frameWidth, height: sheet.frameHeight }]),
);
