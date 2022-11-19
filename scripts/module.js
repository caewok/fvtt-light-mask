/* globals
Hooks,
game,
loadTemplates,
Handlebars,
isEmpty
*/

"use strict";

import { MODULE_ID, TEMPLATES, SHAPE, FLAGS } from "./const.js";
import { log, noFlag, setFlag } from "./util.js";
import { registerLightMask } from "./patching.js";
import { registerPIXIPolygonMethods } from "./shapes/PIXIPolygon.js";
import { registerPIXIRectangleMethods } from "./shapes/PIXIRectangle.js";
import { registerPIXICircleMethods } from "./shapes/PIXICircle.js";

import {
  injectAmbientLightConfiguration,
  injectAmbientSoundConfiguration,
  injectTokenLightConfiguration } from "./render.js";

import { lightMaskPreUpdateAmbientLight } from "./preUpdate.js";

// ----- WeilerAtherton ----- //
import { WeilerAthertonClipper } from "./WeilerAtherton.js";

// ----- Shapes ----- //
import { RegularPolygon } from "./shapes/RegularPolygon.js";
import { EquilateralTriangle } from "./shapes/EquilateralTriangle.js";
import { Square } from "./shapes/Square.js";
import { Hexagon } from "./shapes/Hexagon.js";
import { RegularStar } from "./shapes/RegularStar.js";
import { Ellipse } from "./shapes/Ellipse.js";

// ----- ClockwiseSweep ----- //
import { controlledWallIDs, TempWall } from "./customEdges.js";

Hooks.once("init", async function() {
  log("Initializing...");

  registerLightMask();
  registerPIXIPolygonMethods();
  registerPIXIRectangleMethods();
  registerPIXICircleMethods();

  Handlebars.registerHelper("max2", function(a, b) { return Math.max(a, b); });

  game.modules.get(MODULE_ID).api = {
    controlledWallIDs,
    WeilerAthertonClipper,
    shapes: { RegularPolygon, EquilateralTriangle, Square, Hexagon, RegularStar, Ellipse },
    TempWall
  };
});

Hooks.once("canvasInit", async function() {
  log("Canvas Init...");

});

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
function setDefaultFlags(object) {
  const promises = [];
  const doc = object.document;

  if ( noFlag(doc, FLAGS.SHAPE) ) promises.push(setFlag(doc, FLAGS.SHAPE, SHAPE.TYPES.CIRCLE));
  if ( noFlag(doc, FLAGS.SIDES) ) promises.push(setFlag(doc, FLAGS.SIDES, 3));
  if ( noFlag(doc, FLAGS.POINTS) ) promises.push(setFlag(doc, FLAGS.POINTS, 5));
  if ( noFlag(doc, FLAGS.ELLIPSE.MINOR) ) promises.push(setFlag(doc, FLAGS.ELLIPSE.MINOR, 1));

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

Hooks.once("ready", async function() {
  log("Ready...");
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

  // forEach with joined array is fairly quick: https://jsbench.me/v7laoj4bo2/1
  const promises = [];
  const placeables = [
    canvas.lighting.placeables,
    canvas.sounds.placeables,
    canvas.tokens.placeables // For lights in tokens
  ];

  // Set default flags as necessary
  placeables.forEach(ps => ps.forEach(p => promises.push(...setDefaultFlags(p))));
  await Promise.all(promises);

  // Update the light or sound source
  placeables.forEach(ps => ps.forEach(p => p.updateSource()));
});

/* Render the parameters for a given selected shape */
Hooks.on("renderAmbientLightConfig", injectAmbientLightConfiguration);
Hooks.on("renderAmbientSoundConfig", injectAmbientSoundConfiguration);
Hooks.on("renderTokenConfig", injectTokenLightConfiguration);

/* Update the data for a given source */
Hooks.on("preUpdateToken", lightMaskPreUpdateAmbientLight);
Hooks.on("preUpdateAmbientLight", lightMaskPreUpdateAmbientLight);
Hooks.on("preUpdateAmbientSound", lightMaskPreUpdateAmbientLight);
