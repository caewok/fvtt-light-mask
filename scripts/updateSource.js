/* globals
canvas,
foundry,
isEmpty,
TokenDocument
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { log, noFlag } from "./util.js";
import { MODULE_ID, FLAGS, SHAPE } from "./const.js";
import {
  getCachedWallEdgeData,
  shiftCustomEdgeCache,
  updateEdgesForPlaceable } from "./customEdges.js";

/**
 * Hook for preCreateAmbientLight, etc.
 */
export function preCreateAmbientSourceHook(document, data, options, userId) { // eslint-disable-line no-unused-vars
  const updates = {};
  if ( noFlag(document, FLAGS.SHAPE) ) updates[`flags.${MODULE_ID}.${FLAGS.SHAPE}`] = SHAPE.TYPES.CIRCLE;
  if ( noFlag(document, FLAGS.SIDES) ) updates[`flags.${MODULE_ID}.${FLAGS.SIDES}`] = 3;
  if ( noFlag(document, FLAGS.POINTS) ) updates[`flags.${MODULE_ID}.${FLAGS.POINTS}`] = 5;
  if ( noFlag(document, FLAGS.ELLIPSE.MINOR) ) updates[`flags.${MODULE_ID}.${FLAGS.ELLIPSE.MINOR}`] = 1;
  if ( !isEmpty(updates) ) document.updateSource(updates);
}


/**
 * Hook for preUpdateAmbientLight, etc.
 * @param {Document} document                       The Document instance being updated
 * @param {object} changed                          Differential data that will be used to update the document
 * @param {Partial<DatabaseUpdateOperation>} options Additional options which modify the update request
 * @param {string} userId                           The ID of the requesting user, always game.user.id
 * @returns {boolean|void}                          Explicitly return false to prevent update of this Document
 */
export function preUpdateAmbientSourceHook(doc, changes, _options, _userId) {
  // Changes may have a flag even if it has not changed. Compare to doc to get the actual change.
  // Cached wall ids flag
  const idStringC = changes?.flags?.[MODULE_ID]?.[FLAGS.CUSTOM_WALLS.IDS];
  const idStringD = doc.getFlag(MODULE_ID, FLAGS.CUSTOM_WALLS.IDS);
  const idStringChanged = (typeof idStringC !== "undefined") && (idStringC !== idStringD);

  // Relative flag
  const relativeC = changes?.flags?.[MODULE_ID]?.[FLAGS.RELATIVE];
  const relativeD = doc.getFlag(MODULE_ID, FLAGS.RELATIVE);
  const relativeChanged = (typeof relativeC !== "undefined") && relativeC !== relativeD;

  // Update the edge cache if the edge ids changed.
  if ( idStringChanged ) changes.flags[MODULE_ID][FLAGS.CUSTOM_WALLS.EDGES] = getCachedWallEdgeData(idStringC);
  if ( relativeChanged ) return;

  // If the document uses relative placement and relative is not changing, update the edge positions.
  if ( relativeChanged || !relativeD ) return;

  // Only shift if there are cached edges to change.
  const edgesCache = changes?.flags?.[MODULE_ID]?.[FLAGS.CUSTOM_WALLS.EDGES] || doc.getFlag(MODULE_ID, FLAGS.CUSTOM_WALLS.EDGES);
  if ( !(edgesCache || edgesCache.length) ) return;

  // Confirm actual movement change.
  const delta = {
    x: (changes.x ?? doc.x) - doc.x,
    y: (changes.y ?? doc.y) - doc.y
  }
  if ( !(delta.x || delta.y) ) return;

  // Shift the cached edges but don't yet update the canvas.edges. That will be done in updateHook.
  log(`preUpdateAmbientSourceHook|Shifting edge by ${delta.x},${delta.y} for source ${doc.object?.constructor?.name} ${doc.object?.id}`);
  changes.flags ??= {};
  changes.flags[MODULE_ID] ??= {};
  changes.flags[MODULE_ID][FLAGS.CUSTOM_WALLS.EDGES] = shiftCustomEdgeCache(edgesCache, delta);
}

/**
 * Hook updating the placeable document (light, sound, token light)
 * Add/update/remove cached edges.
 * Update the origin point
 * @param {Document} document                       The existing Document which was updated
 * @param {object} changed                          Differential data that was used to update the document
 * @param {Partial<DatabaseUpdateOperation>} options Additional options which modified the update request
 * @param {string} userId                           The ID of the User who triggered the update workflow
 */
export function updateAmbientSourceHook(doc, changed, _options, _userId) {
  // If the cached edges were changed, update the edges on the map and refresh the source.
  const edgesCache = changed?.flags?.[MODULE_ID]?.[FLAGS.CUSTOM_WALLS.EDGES];
  const object = doc.object;
  if ( !edgesCache || !object ) return;
  log(`updateAmbientSourceHook|Updating cached edges for source ${object.constructor.name} ${object.id}`);
  updateEdgesForPlaceable(object);

  // Refresh the source shape.
  log(`updateAmbientSourceHook|Refreshing source ${object.constructor.name} ${object.id}`);
  if ( object instanceof Token ) object.initializeLightSource();
  else object.renderFlags.set({ refreshField: true });
}
