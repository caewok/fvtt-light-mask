/* globals
isEmpty,
Token
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { log, noFlag } from "./util.js";
import { MODULE_ID, FLAGS, SHAPE } from "./const.js";
import {
  getCachedWallEdgeData,
  shiftCustomEdgeCache,
  updateCachedEdges,
  removeCachedEdges } from "./customEdges.js";

/* Update workflow

On canvas start:
drawAmbientLight hook
drawLightingLayer hook
initializeEdges hook
canvasReady hook
refreshAmbientLight hook
initializeLightSources hook
lightingRefresh hook

On light creation:
drawAmbientLight hook (preview)
...
refreshAmbientLight hook (preview) (repeated)
lightingRefresh hook (repeated, alternated with refresh)
...
preCreateAmbientLight hook (doc)
createAmbientLight hook (doc)
drawAmbientLight hook (preview)
refreshAmbientLight hook (original) (possibly 2x or more)

On light drag:
drawAmbientLight hook (preview)
...
refreshAmbientLight hook (preview) (repeated)
lightingRefresh hook (repeated)
...
preUpdateAmbientLight hook (doc)
updateAmbientLight hook (doc)
destroyAmbientLight hook (preview)
refreshAmbientLight hook (original) (possibly 2x or more)

On light deletion:
preDeleteAmbientLight hook (doc)
destroyAmbientLight hook
deleteAmbientLight hook (doc)

Expected Flow:
preCreateDoc
- Add flags, build edges cache (likely empty array)

createDoc
- Add edges from edges cache

preUpdateDoc
- Update flags, build edges cache

updateDoc
- Locally update edges from edges cache

preDelete doc
- nothing?

delete doc
- remove edges cache

drawObject
- Locally add flags, edges cache

refreshObject
- Locally update edges cache? No, prefer updatePosition wrap.

deleteObject
- Locally delete edges cache

updatePosition wrap
- Locally update edges and cache


*/


// ----- NOTE: Placeable document hooks ----- //

/**
 * Hook for preCreateDocument
 * Set default flag values, build edge cache.
 * @param {Document} document                     The pending document which is requested for creation
 * @param {object} data                           The initial data object provided to the document creation request
 * @param {Partial<DatabaseCreateOperation>} options Additional options which modify the creation request
 * @param {string} userId                         The ID of the requesting user, always game.user.id
 * @returns {boolean|void}                        Explicitly return false to prevent creation of this Document
 */
export function preCreateAmbientSourceHook(document, data, options, userId) { // eslint-disable-line no-unused-vars
  data.flags ??= {};
  data.flags[MODULE_ID] ??= {};
  data.flags[MODULE_ID][FLAGS.SHAPE] ??= SHAPE.TYPES.CIRCLE;
  data.flags[MODULE_ID][FLAGS.SIDES] ??= 3;
  data.flags[MODULE_ID][FLAGS.POINTS] ??= 5;
  data.flags[MODULE_ID][FLAGS.ELLIPSE.MINOR] ??= 1;
  data.flags[MODULE_ID][FLAGS.RELATIVE] ??= false;
  const idString = data.flags[MODULE_ID][FLAGS.CUSTOM_WALLS.IDS] ??= "";
  data.flags[MODULE_ID][FLAGS.CUSTOM_WALLS.EDGES] = getCachedWallEdgeData(idString);
}

/**
 * Hook for createDocument
 * Add the edges
 * @param {Document} document                       The new Document instance which has been created
 * @param {Partial<DatabaseCreateOperation>} options Additional options which modified the creation request
 * @param {string} userId                           The ID of the User who triggered the creation workflow
 */
export function createAmbientSourceHook(document, options, userId) {
  const edgesCache = document?.flags?.[MODULE_ID]?.[FLAGS.CUSTOM_WALLS.EDGES];
  const object = document.object;
  if ( !edgesCache || !object ) return;
  log(`createAmbientSourceHook|Updating cached edges for source ${object.constructor.name} ${object.id}`);
  updateCachedEdges(object);
}

/**
 * Hook for preUpdateObject
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

  // Update the edge cache if the edge ids changed.
  if ( idStringChanged ) changes.flags[MODULE_ID][FLAGS.CUSTOM_WALLS.EDGES] = getCachedWallEdgeData(idStringC);

  // Relative flag
  const relativeC = changes?.flags?.[MODULE_ID]?.[FLAGS.RELATIVE];
  const relativeD = doc.getFlag(MODULE_ID, FLAGS.RELATIVE);
  const relativeChanged = (typeof relativeC !== "undefined") && relativeC !== relativeD;

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
  updateCachedEdges(object);

  // Refresh the source shape.
  log(`updateAmbientSourceHook|Refreshing source ${object.constructor.name} ${object.id}`);
  if ( object instanceof Token ) object.initializeLightSource();
  else object.renderFlags.set({ refreshField: true });
}

/**
 * Hook preDelete the placeable document.
 * Currently not used.
 * @param {Document} document                       The Document instance being deleted
 * @param {Partial<DatabaseDeleteOperation>} options Additional options which modify the deletion request
 * @param {string} userId                           The ID of the requesting user, always game.user.id
 * @returns {boolean|void}                          Explicitly return false to prevent deletion of this Document
 */
// export function preDeleteAmbientSourceHook(doc, options, userId) {}

/**
 * Hook delete the placeable document.
 * @param {Document} document                       The existing Document which was deleted
 * @param {Partial<DatabaseDeleteOperation>} options Additional options which modified the deletion request
 * @param {string} userId                           The ID of the User who triggered the deletion workflow
 */
export function deleteAmbientSourceHook(doc, options, userId) { } // removeCachedEdges(doc.object);


// ----- NOTE: Placeable object hooks ----- //

/**
 * Hook for drawObject
 * Add cached edges to the canvas edges map.
 * @param {PlaceableObject} object
 */
export function drawAmbientSourceHook(object) { updateCachedEdges(object); }

/**
 * Hook for refreshPlaceableObject.
 * Currently unused in favor of wrapping _refreshPosition.
 * @param {PlaceableObject} object    The object instance being refreshed
 */
// export function refreshAmbientSourceHook(object) {}

/**
 * Hook for destroyPlaceableObject.
 * Remove the edges associated with the object.
 * @param {PlaceableObject} object    The object instance being refreshed
 */
export function destroyAmbientSourceHook(object) { removeCachedEdges(object); }
