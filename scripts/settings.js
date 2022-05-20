/* globals
game
*/

"use strict";

import { log } from "./module.js";

export const MODULE_ID = "lightmask";

export const SETTINGS = {
  SWEEP_ALWAYS = "use-lightmask-sweep-always"
}

export function getSetting(settingName) {
  return game.settings.get(MODULE_ID, settingName);
}

export function registerSettings() {
  log("Registering light mask settings");

  game.settings.register(MODULE_ID, SETTINGS.SWEEP_ALWAYS, {
    name: "Always Use Light Mask sweep",
    hint: "Use Light Mask instead of Foundry default algorithm for all vision/light/sound field-of-view. May improve performance in some instances but may also introduce compatibility issues with some modules.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  })

  log("Done registering settings.");
}
