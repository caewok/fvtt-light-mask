/* globals
foundry
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, FLAGS } from "./const.js";
import { preCreateAmbientSourceHook, preUpdateAmbientSourceHook } from "./preUpdate.js";

// Patches for the AmbientSoundConfig class
export const PATCHES = {};
PATCHES.BASIC = {};

/**
 * Hook updateToken to set render flag based on change to the config.
 * @param {Document} document                       The existing Document which was updated
 * @param {object} change                           Differential data that was used to update the document
 * @param {DocumentModificationContext} options     Additional options which modified the update request
 * @param {string} userId                           The ID of the User who triggered the update workflow
 */
const CHANGE_FLAGS = [
  `flags.${MODULE_ID}.${FLAGS.SHAPE}`,
  `flags.${MODULE_ID}.${FLAGS.SIDES}`,
  `flags.${MODULE_ID}.${FLAGS.POINTS}`,
  `flags.${MODULE_ID}.${FLAGS.ROTATION}`,
  `flags.${MODULE_ID}.${FLAGS.RELATIVE}`,
  `flags.${MODULE_ID}.${FLAGS.CUSTOM_WALLS.IDS}`,
  `flags.${MODULE_ID}.${FLAGS.CUSTOM_WALLS.EDGES}`,
  `flags.${MODULE_ID}.${FLAGS.ELLIPSE.MINOR}`
];

export function updateToken(doc, data, _options, _userId) {
  const changed = new Set(Object.keys(foundry.utils.flattenObject(data)));
  if ( CHANGE_FLAGS.some(k => changed.has(k)) ) doc.object.updateLightSource();
}

PATCHES.BASIC.HOOKS = {
  updateToken,
  preCreateToken: preCreateAmbientSourceHook,
  preUpdateToken: preUpdateAmbientSourceHook
};
