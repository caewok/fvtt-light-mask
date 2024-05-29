/* globals
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

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

// Patches for the AmbientLight class
export const PATCHES = {};
PATCHES.BASIC = {};

PATCHES.BASIC.HOOKS = {
  preCreateAmbientLight: preCreateAmbientSourceHook,
  createAmbientLight: createAmbientSourceHook,
  preUpdateAmbientLight: preUpdateAmbientSourceHook,
  updateAmbientLight: updateAmbientSourceHook,
  // preDeleteAmbientLight: preDeleteAmbientSourceHook,
  // deleteAmbientLight: deleteAmbientSourceHook,
  // drawAmbientLight: drawAmbientSourceHook,
  refreshAmbientLight: refreshAmbientSourceHook,
  destroyAmbientLight: destroyAmbientSourceHook
};

PATCHES.BASIC.WRAPS = { initializeLightSource: initializeSource }
