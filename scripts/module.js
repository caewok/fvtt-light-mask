/* globals
Hooks,
game,
loadTemplates,
Handlebars,
isEmpty
*/

"use strict";

import { MODULE_ID, TEMPLATES, SHAPE, FLAGS } from "./const.js";
import { log, getFlag, noFlag, setFlag } from "./util.js";
import { registerLightMask } from "./patching.js";
import { registerGeometry } from "./geometry/registration.js";
import { lightMaskPreUpdateAmbientLight } from "./preUpdate.js";

// ----- ClockwiseSweep ----- //
import { controlledWallIDs, TempWall } from "./customEdges.js";

// Hooks
import {
  renderAmbientLightConfigHook,
  renderAmbientSoundConfigHook,
  renderTokenConfigHook,
  updateAmbientLightHook,
  updateAmbientSoundHook,
  updateTokenHook } from "./render.js";

Hooks.once("init", async function() {
  log("Initializing...");

  registerLightMask();

  registerGeometry();

  Handlebars.registerHelper("max2", function(a, b) { return Math.max(a, b); });

  game.modules.get(MODULE_ID).api = {
    controlledWallIDs,
    TempWall
  };
});

// Hooks.once("canvasInit", async function() {
//   log("Canvas Init...");
//
// });

// Use canvasReady instead b/c we are redrawing the lights and sounds anyway
// Hooks.once("drawSoundsLayer", async function() {
//   log("Drawing sounds layer...");
// });

// Hooks.once("drawLightingLayer", async function() {
//   log("Drawing lighting layer...");
//
//   const promises = [];
//   for ( const l of canvas.lighting.placeables ) {
//     promises.push(...setDefaultFlags(l));
//   }
//   await Promise.all(promises);
// }

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

/**
 * A hook event that fires for every Document type before execution of a creation workflow. Substitute the
 * Document name in the hook event to target a specific Document type, for example "preCreateActor". This hook
 * only fires for the client who is initiating the creation request.
 *
 * The hook provides the pending document instance which will be used for the Document creation. Hooked functions
 * may modify the pending document with updateSource, or prevent the workflow entirely by returning false.
 *
 * @event preCreateDocument
 * @category Document
 * @param {Document} document                     The pending document which is requested for creation
 * @param {object} data                           The initial data object provided to the document creation request
 * @param {DocumentModificationContext} options   Additional options which modify the creation request
 * @param {string} userId                         The ID of the requesting user, always game.user.id
 * @returns {boolean|void}                        Explicitly return false to prevent creation of this Document
 */
Hooks.on("preCreateAmbientLight", preCreateAmbientSourceHook);
Hooks.on("preCreateAmbientSound", preCreateAmbientSourceHook);
Hooks.on("preCreateToken", preCreateAmbientSourceHook);

function preCreateAmbientSourceHook(document, data, options, userId) { // eslint-disable-line no-unused-vars
  log("Hooking preCreateAmbientLight");

  const updates = {};
  if ( noFlag(document, FLAGS.SHAPE) ) updates[`flags.${MODULE_ID}.${FLAGS.SHAPE}`] = SHAPE.TYPES.CIRCLE;
  if ( noFlag(document, FLAGS.SIDES) ) updates[`flags.${MODULE_ID}.${FLAGS.SIDES}`] = 3;
  if ( noFlag(document, FLAGS.POINTS) ) updates[`flags.${MODULE_ID}.${FLAGS.POINTS}`] = 5;
  if ( noFlag(document, FLAGS.ELLIPSE.MINOR) ) updates[`flags.${MODULE_ID}.${FLAGS.ELLIPSE.MINOR}`] = 1;

  if ( !isEmpty(updates) ) document.updateSource(updates);
}

Hooks.once("setup", async function() {
  log("Setup...");
  loadTemplates(Object.values(TEMPLATES));
});

// Hooks.once("ready", async function() {
//   log("Ready...");
// });

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
  placeables.forEach(ps => ps.forEach(p => p.updateSource()));
});

/* Render the parameters for a given selected shape */
Hooks.on("renderAmbientLightConfig", renderAmbientLightConfigHook);
Hooks.on("renderAmbientSoundConfig", renderAmbientSoundConfigHook);
Hooks.on("renderTokenConfig", renderTokenConfigHook);

/* Update the data for a given source */
Hooks.on("preUpdateToken", lightMaskPreUpdateAmbientLight);
Hooks.on("preUpdateAmbientLight", lightMaskPreUpdateAmbientLight);
Hooks.on("preUpdateAmbientSound", lightMaskPreUpdateAmbientLight);

/* Update whenever the flags change */
Hooks.on("updateAmbientLight", updateAmbientLightHook);
Hooks.on("updateAmbientSound", updateAmbientSoundHook);
Hooks.on("updateToken", updateTokenHook);

