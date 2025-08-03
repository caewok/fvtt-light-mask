/* globals
canvas,
CONFIG,
foundry
*/
"use strict";

import { MODULE_ID, FLAGS } from "./const.js";

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
  placeables.forEach(p => {
    const customEdges = new CustomEdges(p);
    customEdges.updateCachedEdges();
  });
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

export class CustomEdges {
  /** @type {PlaceableObject} */
  placeable;


  /**
   * @param {PlaceableObject} placeable     Placeable that may contain CachedWallEdges.
   */
  constructor(placeable) {
    this.placeable = placeable;
  }

  static edgeTypeForPlaceable(placeable) {
    return `${MODULE_ID}.cachedWall.${placeable.id}${placeable.isPreview ? ".preview" : ""}`;
  }

  /**
   * @param {string} cacheDataId        The id of an object in edgesCache.
   * @returns {string}
   */
  getEdgeId(cacheDataId) { return `${this.edgeKey}.wall.${cacheDataId}`; }

  /** @type {string} */
  get edgeKey() {
    const placeable = this.placeable;
    const clName = placeable.constructor.name;
    return `${MODULE_ID}.${clName}.${placeable.id}${placeable.isPreview ? ".preview" : ""}`;
  }

  /** @type {string} */
  get edgeType() { return this.constructor.edgeTypeForPlaceable(this.placeable); }

  /** @type {CachedWallEdge[]|undefined} */
  get edgesCache() {
    const placeable = this.placeable;
    const cache = placeable.document.getFlag(MODULE_ID, FLAGS.CUSTOM_WALLS.EDGES);
    if ( !cache ) return undefined;
    if ( !cache.length ) return this.removeCachedEdges(); // Clean up
    return cache;
  }

  /**
   * Get all the cached wall edge keys for a given placeable.
   * @param {PlaceableObject} placeable
   * @returns {string[]}
   */
  get cachedEdgeKeys() {
    const keyString = this.edgeKey;
    return [...canvas.edges.keys()].filter(key => key.includes(keyString))
  }

   /**
   * Add canvas edges for a given source wall cache.
   * @param {CachedWallEdge[]} [edgesCache]     Cached data stored in the lightmask customEdges flag
   */
  updateCachedEdges(edgesCache) {
    const placeable = this.placeable;
    edgesCache ??= this.edgesCache;
    if ( !edgesCache ) return;

    // Edge cache
    const Edge = foundry.canvas.geometry.edges.Edge;
    const edgeType = this.edgeType;
    for ( const cacheData of edgesCache ) {
      const edgeConfig = foundry.utils.duplicate(cacheData);
      const id = this.getEdgeId(cacheData.id);

      // log(`updateCachedEdges|updating cached edge ${id}`);

      edgeConfig.type = edgeType;
      edgeConfig.object = placeable;
      const edge = new Edge(
        { x: edgeConfig.c[0], y: edgeConfig.c[1] },
        { x: edgeConfig.c[2], y: edgeConfig.c[3] },
        edgeConfig);

      // Will probably want the elevation at some point.
      edge.topE = edgeConfig.topE;
      edge.bottomE = edgeConfig.bottomE;

      // Debugging.
      if ( CONFIG[MODULE_ID].debug ) {
        const oldEdge = canvas.edges.get(id)
        console.table({
          old: oldEdge ? [oldEdge.a.x, oldEdge.a.y, oldEdge.b.x, oldEdge.b.y] : [null, null, null, null],
          updated: [edge.a.x, edge.a.y, edge.b.x, edge.b.y]
        });
      }

      canvas.edges.set(id, edge);
    }
    // canvas.perception.renderFlags.set({ refreshEdges: true, initializeLighting: true });
    if ( canvas.ready ) canvas.perception.update({ refreshEdges: true, initializeLighting: true })
  }

  /**
   * Remove cached wall data from the scene
   */
  removeCachedEdges() {
    const edgeKeys = this.cachedEdgeKeys;
    if ( !edgeKeys.length ) return;
    edgeKeys.forEach(key => canvas.edges.delete(key));
    // canvas.perception.renderFlags.set({ refreshEdges: true });
    canvas.perception.update({ refreshEdges: true, initializeLighting: true });
  }

  /**
   * Set wall data for cached walls and add the cached edges to the scene.
   * @param {string} idString         String of cached wall ids
   * @returns {CachedWallEdge[]}
   */
  static getCachedWallEdgeData(idString) {
    const walls = this.getWallsForIDString(idString)
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
   * Shift all edges in the cacche by a provided vector, delta.
   * @param {CachedWallEdge[]} edgesCache    Cache of select wall data.
   * @param {Object} delta            Object with x, y properties representing a vector
   * @return {Object[]} edges_cache
   */
  static shiftCustomEdgeCache(edgesCache, delta) {
  //   log(`shiftCustomEdgeCache delta is ${delta.x}, ${delta.y}`, edgesCache);
    edgesCache = foundry.utils.duplicate(edgesCache);
    edgesCache.forEach(e => {
      const old = foundry.utils.duplicate(e.c); // Debugging.
      e.c[0] = e.c[0] + delta.x;
      e.c[1] = e.c[1] + delta.y;
      e.c[2] = e.c[2] + delta.x;
      e.c[3] = e.c[3] + delta.y;
      if ( CONFIG[MODULE_ID].debug ) console.table({ old, updated: e.c });
    });
    return edgesCache;
  }

  /**
   * Retrieve walls in the scene for given ids.
   * It is possible that some walls do not exist; ignore if not found.
   * @param {string} idString    Comma-separated string of ids.
   * @returns {Wall[]}
   */
  static getWallsForIDString(idString) {
    if ( !idString || idString === "" ) return [];
    return idString
      .split(",")
      .map(id => canvas.walls.placeables.find(w => w.id === id))
      .filter(wall => Boolean(wall))
  }
}
