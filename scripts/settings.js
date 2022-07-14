/* globals
game
*/

"use strict";

import { log } from "./module.js";
import { MODULE_ID } from "./const.js";

export const SETTINGS = {
  SWEEP_ALWAYS: "use-lightmask-sweep-always"
};

export function getSetting(settingName) {
  return game.settings.get(MODULE_ID, settingName);
}

export function registerSettings() {
  log("Registering light mask settings");

  game.settings.register(MODULE_ID, SETTINGS.SWEEP_ALWAYS, {
    name: game.i18n.localize("lightmask.settings.sweep-always.Name"),
    hint: game.i18n.localize("lightmask.settings.sweep-always.Hint"),
    config: true,
    default: false,
    type: Boolean
  });

  log("Done registering settings.");
}
