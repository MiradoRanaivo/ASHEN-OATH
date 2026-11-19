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
  { key: 'region-industrial', path: 'assets/regions_external/industrial/platformIndustrial_sheet.png' },
  { key: 'region-medieval', path: 'assets/regions_external/medieval/medieval_spritesheet.png' },
  { key: 'region-winter', path: 'assets/regions_external/winter/snowMid.png' },
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

  // Boss — spritesheets individuelles issues de 01_sprite_sheet_principale.png
  { key: 'boss-idle', path: `${BOSS}/idle.png`, frameWidth: 128, frameHeight: 128, frames: 6 },
  { key: 'boss-walk', path: `${BOSS}/walk.png`, frameWidth: 128, frameHeight: 128, frames: 6 },
  { key: 'boss-run', path: `${BOSS}/run.png`, frameWidth: 128, frameHeight: 128, frames: 6 },
  { key: 'boss-attack', path: `${BOSS}/attack.png`, frameWidth: 128, frameHeight: 128, frames: 6 },
  { key: 'boss-charge', path: `${BOSS}/magic_charge.png`, frameWidth: 128, frameHeight: 128, frames: 6 },
  { key: 'boss-beam', path: `${BOSS}/magic_beam.png`, frameWidth: 128, frameHeight: 128, frames: 6 },
  { key: 'boss-magic', path: `${BOSS}/magic_aoe.png`, frameWidth: 128, frameHeight: 128, frames: 6 },
  { key: 'boss-hurt', path: `${BOSS}/hurt.png`, frameWidth: 128, frameHeight: 128, frames: 6 },
  { key: 'boss-death', path: `${BOSS}/death.png`, frameWidth: 128, frameHeight: 128, frames: 12 },

  // Ground réaliste issu du dépôt 2d-assets
  { key: 'mob-alien-beige', path: 'assets/regions_external/mobs/alienBeige.png', frameWidth: 256, frameHeight: 512, frames: 1 },
  { key: 'mob-alien-blue', path: 'assets/regions_external/mobs/alienBlue.png', frameWidth: 256, frameHeight: 512, frames: 1 },
  { key: 'mob-alien-green', path: 'assets/regions_external/mobs/alienGreen.png', frameWidth: 256, frameHeight: 512, frames: 1 },
  { key: 'mob-alien-pink', path: 'assets/regions_external/mobs/alienPink.png', frameWidth: 256, frameHeight: 512, frames: 1 },
];

/** Dimensions réelles des frames, utilisées pour recaler les corps physiques. */
export const FRAME_SIZE: Readonly<Record<string, { width: number; height: number }>> = Object.fromEntries(
  SHEET_ASSETS.map((sheet) => [sheet.key, { width: sheet.frameWidth, height: sheet.frameHeight }]),
);
