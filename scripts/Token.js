/* globals
foundry
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { CHANGE_FLAGS } from "./const.js";
import {
  preCreateAmbientSourceHook,
  createAmbientSourceHook,
  preUpdateAmbientSourceHook,
  updateAmbientSourceHook,
  // preDeleteAmbientSourceHook,
  // deleteAmbientSourceHook,
  // drawAmbientSourceHook,
  refreshAmbientSourceHook,
  destroyAmbientSourceHook,
  initializeSource } from "./updateSource.js";

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
export function updateToken(doc, data, options, userId) {
  const changed = new Set(Object.keys(foundry.utils.flattenObject(data)));
  if ( CHANGE_FLAGS.some(k => changed.has(k)) ) doc.object.initializeLightSource();
  updateAmbientSourceHook(doc, data, options, userId);
}

PATCHES.BASIC.HOOKS = {
  preCreateToken: preCreateAmbientSourceHook,
  createToken: createAmbientSourceHook,
  preUpdateToken: preUpdateAmbientSourceHook,
  updateToken,
  // preDeleteToken: preDeleteAmbientSourceHook,
  // deleteToken: deleteAmbientSourceHook,
  // drawToken: drawAmbientSourceHook,
  refreshToken: refreshAmbientSourceHook,
  destroyToken: destroyAmbientSourceHook
};

PATCHES.BASIC.WRAPS = { initializeLightSource: initializeSource }
