/* globals
game
*/

"use strict";

import { MODULE_ID } from "./const.js";
import { log } from "./module.js";

export function getSetting(settingName) {
  return game.settings.get(MODULE_ID, settingName);
}

export function registerSettings() {
  log("Registering light mask settings");

  game.settings.register(MODULE_ID, "use-lightmask-sweep-always", {
    name: "Always Use Light Mask sweep",
    hint: "Use Light Mask instead of Foundry default algorithm for all vision/light/sound field-of-view. May improve performance in some instances but may also introduce compatibility issues with some modules.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean
  })

  log("Done registering settings.");
}