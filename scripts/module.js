/* globals
Hooks,
game,
loadTemplates,
Handlebars
*/

"use strict";

import { MODULE_ID, TEMPLATES, SHAPE, FLAGS } from "./const.js";
import { log, getFlag, noFlag, setFlag } from "./util.js";
import { registerLightMask } from "./patching.js";
import { registerPIXIPolygonMethods } from "./shapes/PIXIPolygon.js";
import { registerPIXIRectangleMethods } from "./shapes/PIXIRectangle.js";
import { registerPIXICircleMethods } from "./shapes/PIXICircle.js";

import { controlledWallIDs } from "./customEdges.js";

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
import { TempWall } from "./customEdges.js";

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
async function setDefaultFlags(object) {
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

function preCreateAmbientSourceHook(document, data, options, userId) {
  log("Hooking preCreateAmbientLight");

  const updates = {}
  const gf = document.getFlag;
  if ( noFlag(document, FLAGS.SHAPE) ) updates[`flags.${MODULE_ID}.${FLAGS.SHAPE}`] = SHAPE.TYPES.CIRCLE;
  if ( noFlag(document, FLAGS.SIDES) ) updates[`flags.${MODULE_ID}.${FLAGS.SIDES}`] = 3;
  if ( noFlag(document, FLAGS.POINTS) ) updates[`flags.${MODULE_ID}.${FLAGS.POINTS}`] = 5;
  if ( noFlag(document, FLAGS.ELLIPSE.MINOR) ) updates[`flags.${MODULE_ID}.${ELLIPSE.MINOR}`] = 1;

  if ( !isEmpty(updates) ) document.updateSource(updates);
}

Hooks.once("setup", async function() {
  log("Setup...");
  loadTemplates(Object.values(TEMPLATES));
});

Hooks.once("ready", async function() {
  log("Ready...")
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

  for ( const l of canvas.lighting.placeables ) {
    await Promise.all(setDefaultFlags(l));
    l.updateSource();
  }

  for ( const s of canvas.lighting.sounds ) {
    await Promise.all(setDefaultFlags(s));
    s.updateSource();
  }
});

/**
 * A hook event that fires when a {@link PlaceableObject} is initially drawn.
 * The dispatched event name replaces "Object" with the named PlaceableObject subclass, i.e. "drawToken".
 * @event drawObject
 * @category PlaceableObject
 * @param {PlaceableObject} object    The object instance being drawn
 */
// Hooks.on("drawAmbientLight", setObjectFlagDefaults);
// Hooks.on("drawAmbientSound", setObjectFlagDefaults);

/**
 * Helper to set the default flags for a light or sound object.
 * @param {AmbientLight|AmbientSound} object
 */
// function setObjectFlagDefaults(object) {
//   log(`Drawing ${object.id}`);
//
// //   if ( !object.id ) return;
//
//   // Set default flags if not set already
//   // Cannnot use setFlag b/c the object may not yet have an id.
//   object.document.flags ??= {};
//   object.document.flags[MODULE_ID] ??= {};
//   object.document.flags[MODULE_ID][FLAGS.SHAPE] ??= SHAPE.TYPES.CIRCLE;
//   object.document.flags[MODULE_ID][FLAGS.SIDES] ??= 3
//   object.document.flags[MODULE_ID][FLAGS.POINTS] ??= 5
//   object.document.flags[MODULE_ID][FLAGS.ELLIPSE.MINOR] ??= 1;
//
//   // Set default flags if not set already
//   // Probably don't need to await each of these, as we are not using the flags yet.
// //   if ( !object.document.getFlag(MODULE_ID, FLAGS.SHAPE) ) object.document.setFlag(MODULE_ID, FLAGS.SHAPE, SHAPE.TYPES.CIRCLE);
// //   if ( !object.document.getFlag(MODULE_ID, FLAGS.SIDES) ) object.document.setFlag(MODULE_ID, FLAGS.SIDES, 3);
// //   if ( !object.document.getFlag(MODULE_ID, FLAGS.POINTS) ) object.document.setFlag(MODULE_ID, FLAGS.POINTS, 5);
// //   if ( !object.document.getFlag(MODULE_ID, FLAGS.ELLIPSE.MINOR) ) object.document.setFlag(MODULE_ID, FLAGS.ELLIPSE.MINOR, 1);
// }


/* Render the parameters for a given selected shape */
Hooks.on("renderAmbientLightConfig", injectAmbientLightConfiguration);
Hooks.on("renderAmbientSoundConfig", injectAmbientSoundConfiguration);
Hooks.on("renderTokenConfig", injectTokenLightConfiguration);

/* Update the data for a given source */
Hooks.on("preUpdateToken", lightMaskPreUpdateAmbientLight);
Hooks.on("preUpdateAmbientLight", lightMaskPreUpdateAmbientLight);
Hooks.on("preUpdateAmbientSound", lightMaskPreUpdateAmbientLight);
