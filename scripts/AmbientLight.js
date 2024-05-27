/* globals
foundry
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { FLAGS, CHANGE_FLAGS } from "./const.js";
import {
  preCreateAmbientSourceHook,
  preUpdateAmbientSourceHook,
  updateAmbientSourceHook } from "./updateSource.js";

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
export function updateAmbientLight(doc, data, options, userId) {
  const changed = new Set(Object.keys(foundry.utils.flattenObject(data)));
  if ( CHANGE_FLAGS.some(k => changed.has(k)) ) doc.object.renderFlags.set({ refresh: true });
  updateAmbientSourceHook(doc, data, options, userId);
}

PATCHES.BASIC.HOOKS = {
  updateAmbientLight,
  preCreateAmbientLight: preCreateAmbientSourceHook,
  preUpdateAmbientLight: preUpdateAmbientSourceHook
};
