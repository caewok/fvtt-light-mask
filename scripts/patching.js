/* globals
*/
"use strict";

import { Patcher } from "./Patcher.js";

import { PATCHES as PATCHES_LightSource } from "./LightSource.js";
import { PATCHES as PATCHES_SoundSource } from "./SoundSource.js";
import { PATCHES as PATCHES_ClockwiseSweepPolygon } from "./ClockwiseSweepPolygon.js";
import { PATCHES as PATCHES_AmbientLightConfig } from "./AmbientLightConfig.js";
import { PATCHES as PATCHES_AmbientSoundConfig } from "./AmbientSoundConfig.js";
import { PATCHES as PATCHES_AmbientSoundDocument } from "./AmbientSoundDocument.js";
import { PATCHES as PATCHES_AmbientSound } from "./AmbientSound.js";
import { PATCHES as PATCHES_AmbientLight } from "./AmbientLight.js";
import { PATCHES as PATCHES_Token } from "./Token.js";
import { PATCHES as PATCHES_TokenConfig } from "./TokenConfig.js";

const PATCHES = {
  AmbientLight: PATCHES_AmbientLight,
  AmbientSound: PATCHES_AmbientSound,
  "foundry.applications.sheets.AmbientLightConfig": PATCHES_AmbientLightConfig,
  "foundry.applications.sheets.AmbientSoundConfig": PATCHES_AmbientSoundConfig,
//   AmbientSoundDocument: PATCHES_AmbientSoundDocument,
  ClockwiseSweepPolygon: PATCHES_ClockwiseSweepPolygon,
  "foundry.canvas.sources.PointLightSource": PATCHES_LightSource,
  "foundry.canvas.sources.PointSoundSource": PATCHES_SoundSource,
  Token: PATCHES_Token,
  TokenConfig: PATCHES_TokenConfig
};

export const PATCHER = new Patcher();

export function initializePatching() {
  PATCHER.addPatchesFromRegistrationObject(PATCHES);
  PATCHER.registerGroup("BASIC");
}
