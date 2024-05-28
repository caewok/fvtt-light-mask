/* globals
canvas,
getDocumentClass,
foundry,
ui
*/
"use strict";

import { MODULE_ID, FLAGS } from "./const.js";
import { log } from "./util.js";

/*
Store cached edges in canvas.edges corresponding to different cached walls per light.
Each edge has id: "lightmask.source.[sourceid].wall[wallid]"
Each edge has type = "lightmask.cachedWalls"
*/

export const PATCHES = {};
PATCHES.BASIC = {};


/**
 * Hook initializeEdges
 * Initialize all the cached edges from the light/sound sources.
 */
function initializeEdges() {
  const placeables = [
    ...canvas.lighting.placeables,
    ...canvas.sounds.placeables,
    ...canvas.tokens.placeables // For lights in tokens
  ];
  placeables.forEach(p => updateEdgesForPlaceable(p));
}

PATCHES.BASIC.HOOKS = { initializeEdges };

/**
 * @typedef {object} CachedWallEdge
 * Cached data stored in the lightmask customEdges flag for a given wall.
 * @prop {number[4]} c                Wall endpoints: A.x, A.y, B.x, B.y
 * @prop {WALL_SENSE_TYPES} light     Wall light restriction
 * @prop {WALL_SENSE_TYPES} move      Wall move restriction
 * @prop {WALL_SENSE_TYPES} sight     Wall sight restriction
 * @prop {WALL_SENSE_TYPES} sound     Wall sound restriction
 * @prop {object} threshold
 *   - @prop {boolean} attenuation
 *   - @prop {number} light
 *   - @prop {number} move
 *   - @prop {number} sight
 *   - @prop {number} sound
 * @prop {WALL_DIRECTIONS} direction
 * @prop {string} id
 * @prop {number} topE        In grid units
 * @prop {number} bottomE     In grid units
 */

/**
 * Add canvas edges for a given source wall cache.
 * @param {PlaceableObject} placeable     Placeable that may contain CachedWallEdges.
 */
export function updateEdgesForPlaceable(placeable) {
  const edgesCache = placeable.document.getFlag(MODULE_ID, FLAGS.CUSTOM_WALLS.EDGES);
  if ( !edgesCache || !edgesCache.length ) return removeCachedWallEdgeData(placeable);

  // Edge cache
  const Edge = foundry.canvas.edges.Edge;
  const clName = placeable.constructor.name;
  for ( const cacheData of edgesCache ) {
    const edgeConfig = {...cacheData};
    const id = `${MODULE_ID}.${clName}.${placeable.id}${placeable.isPreview ? ".preview" : ""}.wall.${cacheData.id}`;
    edgeConfig.type = `${MODULE_ID}.cachedWall.${placeable.id}${placeable.isPreview ? ".preview" : ""}`;
    edgeConfig.object = placeable;
    const edge = new Edge(
      { x: edgeConfig.c[0], y: edgeConfig.c[1] },
      { x: edgeConfig.c[2], y: edgeConfig.c[3] },
      edgeConfig);

    // Will probably want the elevation at some point.
    edge.topE = edgeConfig.topE;
    edge.bottomE = edgeConfig.bottomE;
    canvas.edges.set(id, edge);
  }
}

/**
 * Set wall data for cached walls and add the cached edges to the scene.
 * @param {string} idString     String of cached wall ids
 * @returns {CachedWallEdge[]}
 */
export function getCachedWallEdgeData(idString) {
  const walls = getWallsForIDString(idString)
  if ( !walls.length ) return [];
  const cacheData = walls.map(wall => {
    const wallD = wall.document;
    return {
      c: foundry.utils.duplicate(wallD.c),
      light: wallD.light,
      move: wallD.move,
      sight: wallD.sight,
      sound: wallD.sound,
      threshold: foundry.utils.duplicate(wallD.threshold),
      direction: wallD.dir,
      id: wall.id,
      topE: wall.topE,
      bottomE: wall.bottomE
    };
  });
  return cacheData;
}

/**
 * Remove cached wall data from the scene
 * @param {PlaceableObject} placeable
 */
export function removeCachedWallEdgeData(placeable) {
  const clName = placeable.constructor.name;
  const keys = [...canvas.edges.keys()].filter(edge => edge.id?.includes(`${MODULE_ID}.${clName}.${placeable.id}${placeable.isPreview ? ".preview" : ""}`))
  keys.forEach(key => canvas.edges.delete(key));
}

/**
 * Shift all edges in the cacche by a provided vector, delta.
 * @param {CachedWallEdge[]} edgesCache    Cache of select wall data.
 * @param {Object} delta            Object with x, y properties representing a vector
 * @return {Object[]} edges_cache
 */
export function shiftCustomEdgeCache(edgesCache, delta) {
  log(`shiftCustomEdgeCache delta is ${delta.x}, ${delta.y}`, edgesCache);
  edgesCache.forEach(e => {
    e.c[0] = e.c[0] + delta.x;
    e.c[1] = e.c[1] + delta.y;
    e.c[2] = e.c[2] + delta.x;
    e.c[3] = e.c[3] + delta.y;
  });
  return edgesCache;
}

/**
 * Retrieve walls in the scene for given ids.
 * It is possible that some walls do not exist; ignore if not found.
 * @param {string} idString    Comma-separated string of ids.
 * @returns {Wall[]}
 */
function getWallsForIDString(idString) {
  if ( !idString || idString === "" ) return [];
  return idString
    .split(",")
    .map(id => canvas.walls.placeables.find(w => w.id === id))
    .filter(wall => Boolean(wall))
}
