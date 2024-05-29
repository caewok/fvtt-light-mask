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
  const changes = {
    flags: {
      [MODULE_ID]: {
        [FLAGS.SHAPE]: SHAPE.TYPES.CIRCLE,
        [FLAGS.SIDES]: 3,
        [FLAGS.POINTS]: 5,
        [FLAGS.ELLIPSE.MINOR]: 1,
        [FLAGS.RELATIVE]: false,
        //[FLAGS.ORIGIN]: { x: data.x, y: data.y },
        //[FLAGS.ORIGIN_PREVIEW]: { x: data.x, y: data.y },
        [FLAGS.CUSTOM_WALLS.IDS]: "",
        [FLAGS.CUSTOM_WALLS.EDGES]: []
      }
    }
  };
  document.updateSource(changes);
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
  log(`createAmbientSourceHook|Updating cached edges for source ${object.constructor.name} ${object.id}${object.isPreview ? ".preview" : ""}`);
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

  const relativeC = changes?.flags?.[MODULE_ID]?.[FLAGS.RELATIVE];
  const relativeD = doc.getFlag(MODULE_ID, FLAGS.RELATIVE);
  const relativeChanged = (typeof relativeC !== "undefined") && relativeC !== relativeD;

  const positionChanged = Object.hasOwn(changes, "x") || Object.hasOwn(changes, "y");
  if ( !(idStringChanged || relativeChanged || positionChanged) ) return;

  // Update the edge cache if the edge ids changed.
  // TODO: Does the cached wall data need to be updated with changes.x, changes.y?
  log(`preUpdateAmbientSourceHook|Source ${doc.object?.constructor?.name} ${doc.object?.id}${doc.object.isPreview ? ".preview" : ""}`)
  let edgesCache = doc.flags[MODULE_ID][FLAGS.CUSTOM_WALLS.EDGES];
  if ( idStringChanged ) {
    log(`\tNew wall cache`);
    changes.flags ??= {};
    changes.flags[MODULE_ID] ??= {};
    edgesCache = changes.flags[MODULE_ID][FLAGS.CUSTOM_WALLS.EDGES] = getCachedWallEdgeData(idStringC);
  }
  if ( !positionChanged ) return;

  // Relative flag
  const isRelative = relativeC ?? relativeD ?? false;
  const newPosition = { x: changes.x ?? doc.x, y: changes.y ?? doc.y };
  if ( isRelative ) {
    const delta = {
      x: newPosition.x - doc.x,
      y: newPosition.y - doc.y
    }
    log(`\tShifting cached edge data by ${delta.x},${delta.y}`);
    edgesCache = shiftCustomEdgeCache(edgesCache, delta);
    changes.flags ??= {};
    changes.flags[MODULE_ID] ??= {};
    changes.flags[MODULE_ID][FLAGS.CUSTOM_WALLS.EDGES] = edgesCache
  }

  log(`\tNew position ${newPosition.x},${newPosition.y}`);
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
  log(`updateAmbientSourceHook|Source ${object.constructor.name} ${object.id}${object.isPreview ? ".preview" : ""}`);
  log(`\tUpdating cached edges `);
  updateCachedEdges(object);

  // Refresh the source shape.
  log(`\tRefreshing source`);
  object.initializeLightSource();
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
export function drawAmbientSourceHook(object) {
  log(`drawAmbientSourceHook|Source ${object.constructor.name} ${object.id}${object.isPreview ? ".preview" : ""}`);
  //updateCachedEdges(object);
}

/**
 * Hook for refreshPlaceableObject.
 * Currently unused in favor of wrapping _refreshPosition.
 * @param {PlaceableObject} object    The object instance being refreshed
 */
export function refreshAmbientSourceHook(object, flags) {
  log(`refreshAmbientSourceHook|Source ${object.constructor.name} ${object.id}${object.isPreview ? ".preview" : ""} @${object.document.x},${object.document.y}`);
  if ( !object.isPreview || !flags.refreshPosition ) return;
  const isRelative = object.document.getFlag(MODULE_ID, FLAGS.RELATIVE);
  if ( !isRelative ) return;
  const origEdgesCache = object._original.document.getFlag(MODULE_ID, FLAGS.CUSTOM_WALLS.EDGES);

  // If the preview hasn't moved from the last refresh, we can stop early.
  object[MODULE_ID] ??= {};
  const currPreviewPosition = PIXI.Point.fromObject(object.document);
  const prevPreviewPosition = object[MODULE_ID].prevPosition ?? currPreviewPosition;
  object[MODULE_ID].prevPosition = currPreviewPosition;
  if ( currPreviewPosition.equals(prevPreviewPosition) ) return;

  // Set the preview edges based on the underlying document, with a position offset.
  const originalPosition = PIXI.Point.fromObject(object._original.document);
  const delta = currPreviewPosition.subtract(originalPosition);
  const edgesCache = shiftCustomEdgeCache(origEdgesCache, delta);
  updateCachedEdges(object, edgesCache);
}

/**
 * Hook for destroyPlaceableObject.
 * Remove the edges associated with the object.
 * @param {PlaceableObject} object    The object instance being refreshed
 */
export function destroyAmbientSourceHook(object) {
  log(`destroyAmbientSourceHook|Source ${object.constructor.name} ${object.id}${object.isPreview ? ".preview" : ""}`);
  removeCachedEdges(object);
}
