/* globals
flattenObject
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { MODULE_ID, FLAGS } from "./const.js";
import { preCreateAmbientSourceHook, preUpdateAmbientSourceHook } from "./preUpdate.js";

// Patches for the AmbientSoundConfig class
export const PATCHES = {};
PATCHES.BASIC = {};

/**
 * Hook updateAmbientLight to set render flag based on change to the config.
 * @param {Document} document                       The existing Document which was updated
 * @param {object} change                           Differential data that was used to update the document
 * @param {DocumentModificationContext} options     Additional options which modified the update request
 * @param {string} userId                           The ID of the User who triggered the update workflow
 */
export function updateAmbientLight(doc, data, _options, _userId) {
  const changeFlags = [
    `flags.${MODULE_ID}.${FLAGS.SHAPE}`,
    `flags.${MODULE_ID}.${FLAGS.SIDES}`,
    `flags.${MODULE_ID}.${FLAGS.POINTS}`,
    `flags.${MODULE_ID}.${FLAGS.RELATIVE}`,
    `flags.${MODULE_ID}.${FLAGS.CUSTOM_WALLS.IDS}`,
    `flags.${MODULE_ID}.${FLAGS.CUSTOM_WALLS.EDGES}`,
    `flags.${MODULE_ID}.${FLAGS.ELLIPSE.MINOR}`
  ];

  const changed = new Set(Object.keys(flattenObject(data)));
  if ( changeFlags.some(k => changed.has(k)) ) doc.object.renderFlags.set({
    refresh: true
  });
}

PATCHES.BASIC.HOOKS = {
  updateAmbientLight,
  preCreateAmbientLight: preCreateAmbientSourceHook,
  preUpdateAmbientLight: preUpdateAmbientSourceHook
};
