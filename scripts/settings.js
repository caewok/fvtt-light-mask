/* globals
game
*/

"use strict";

import { MODULE_ID } from "./const.js";
import { log } from "./module.js";
import { registerTokenVisionOverride } from "./patching.js";

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
  });

  game.settings.register(MODULE_ID, "use-token-vision-radius", {
    name: "Use Token Vision Radius",
    hint: "Override default Foundry approach to token vision for the line-of-sight sweep. Pass the greater of bright or dim radius for each token when calculating the sweep. May improve performance at the cost of unanticipated compatibility issues.",
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });

  log("Done registering settings.");
}
