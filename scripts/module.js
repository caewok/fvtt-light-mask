/* globals
Hooks,
game,
loadTemplates,
Handlebars
*/

"use strict";

import { MODULE_ID, TEMPLATES, SHAPE, FLAGS } from "./const.js";
import { log, getFlag, setFlag } from "./util.js";
import { registerGeometry } from "./geometry/registration.js";
import { initializePatching, PATCHER } from "./patching.js";

// Hooks
Hooks.once("init", async function() {
  log("Initializing...");
  // CONFIG.debug.hooks = true;

  registerGeometry();
  initializePatching();

  Handlebars.registerHelper("max2", function(a, b) { return Math.max(a, b); });

  game.modules.get(MODULE_ID).api = {
    PATCHER
  };

  CONFIG[MODULE_ID] = {
    /**
     * Turn on debug logging.
     */
    debug: false,
  };
});

Hooks.once("setup", async function() {
  log("Setup...");
  loadTemplates(Object.values(TEMPLATES));
});

/**
 * Tell DevMode that we want a flag for debugging this module.
 * https://github.com/League-of-Foundry-Developers/foundryvtt-devMode
 */
Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(MODULE_ID);
});

/**
 * Redraw lights/sounds once the canvas is loaded
 * Cannot use walls to draw lights/sounds until canvas.walls.quadtree is loaded.
 */
Hooks.on("canvasReady", async canvas => {
  log("Refreshing templates on canvasReady.");

  // ForEach with joined array is fairly quick: https://jsbench.me/v7laoj4bo2/1
  const promises = [];
  const placeables = [
    canvas.lighting.placeables,
    canvas.sounds.placeables,
    canvas.tokens.placeables // For lights in tokens
  ];

  // Set default flags as necessary
  placeables.forEach(ps => ps.forEach(p => promises.push(...setDefaultFlags(p.document))));
  await Promise.all(promises);

  // Update the light or sound source
//   canvas.lighting.placeables.forEach(p => p.initializeLightSource());
//   canvas.sounds.placeables.forEach(p => p.initializeSoundSource());
//   canvas.tokens.placeables.forEach(p => p.initializeSources());
});

/**
 * Set the default flags for a light or sound object.
 * @param {AmbientLight|AmbientSound}
 * @return {Promise[]}
 */
function setDefaultFlags(doc) {
  const promises = [];

  const shapeFlag = getFlag(doc, FLAGS.SHAPE);
  if ( typeof shapeFlag === "undefined"
    || !SHAPE.TYPESET.has(shapeFlag) ) promises.push(setFlag(doc, FLAGS.SHAPE, SHAPE.TYPES.CIRCLE));

  const sidesFlag = getFlag(doc, FLAGS.SIDES);
  if ( !Number.isInteger(sidesFlag)
    || sidesFlag < 3 ) promises.push(setFlag(doc, FLAGS.SIDES, 3));

  const pointsFlag = getFlag(doc, FLAGS.POINTS);
  if ( !Number.isInteger(pointsFlag)
    || pointsFlag < 5 ) promises.push(setFlag(doc, FLAGS.POINTS, 5));

  const minorFlag = getFlag(doc, FLAGS.ELLIPSE.MINOR);
  if ( !Number.isInteger(minorFlag) ) promises.push(setFlag(doc, FLAGS.ELLIPSE.MINOR, 1));

  return promises;
}
