/* globals
canvas,
isEmpty,
TokenDocument
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

import { log, getFlag, noFlag } from "./util.js";
import { MODULE_ID, FLAGS, SHAPE } from "./const.js";

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
 * @param {AmbientLightDocument} doc
 * @param {Object} data
 * @param {Object} options {diff: true, render: true}
 * @param {string} id
 */
export function preUpdateAmbientSourceHook(doc, new_data, _options, _id) {

  const ids_to_add = new_data?.flags?.[MODULE_ID]?.[FLAGS.CUSTOM_WALLS.IDS];
  if (ids_to_add || ids_to_add === "") {
    // Retrieve the existing cache, if any
    let edges_cache = getFlag(doc, FLAGS.CUSTOM_WALLS.EDGES) || [];
    edges_cache = lightMaskUpdateCustomEdgeCache(edges_cache, ids_to_add);

    // Add the edges cache
    new_data.flags[`${MODULE_ID}`][`${FLAGS.CUSTOM_WALLS.EDGES}`] = edges_cache;
  }

  // If relative is being set to true: store origin
  // If x or y is being updated, update the origin if relative is already true
  const relative_key = new_data?.flags?.[MODULE_ID]?.[FLAGS.RELATIVE];
  if (relative_key) {
    // Prefer the new origin position, if any
    const new_origin = {
      x: new_data?.x || doc.x,
      y: new_data?.y || doc.y };

    // If this is a token, the origin needs to be the center, whereas x,y is top left
    if ( doc instanceof TokenDocument ) {
      const offsetX = doc.object.center.x - doc.object.x;
      const offsetY = doc.object.center.y - doc.object.y;
      new_origin.x += offsetX;
      new_origin.y += offsetY;
    }
    new_data.flags[`${MODULE_ID}`][`${FLAGS.ORIGIN}`] = new_origin;

  } else if (relative_key === false) {
    // Set the wall locations based on the last origin because when the user unchecks
    // relative, we want the walls to stay at the last relative position (not their
    // original position)
    // Theoretically possible, but unlikely, that edges cache was modified above
    let edges_cache = new_data?.flags?.[MODULE_ID]?.[FLAGS.CUSTOM_WALLS.EDGES]
      || getFlag(doc, FLAGS.CUSTOM_WALLS.EDGES) || [];
    const new_origin = {
      x: new_data?.x || doc.x,
      y: new_data?.y || doc.y };

    // If this is a token, the origin needs to be the center, whereas x,y is top left
    if ( doc instanceof TokenDocument ) {
      const offsetX = doc.object.center.x - doc.object.x;
      const offsetY = doc.object.center.y - doc.object.y;
      new_origin.x += offsetX;
      new_origin.y += offsetY;
    }

    const stored_origin = getFlag(doc, FLAGS.ORIGIN) || new_origin;
    const delta = {
      dx: new_origin.x - stored_origin.x,
      dy: new_origin.y - stored_origin.y };

    edges_cache = lightMaskShiftCustomEdgeCache(edges_cache, delta);
    new_data.flags[`${MODULE_ID}`][`${FLAGS.CUSTOM_WALLS.EDGES}`] = edges_cache;
  }
}

/**
 * Cache walls for a given source.
 * @param {Object[]} edges_cache    Cache of select wall data. Coordinates, types, id.
 * @param {String} custom_ids       Wall IDs separated by a comma, no space.
 * @return {Object[]} The updated edges cache.
 */
export function lightMaskUpdateCustomEdgeCache(edges_cache, custom_ids) {
  if (!custom_ids || custom_ids === "") {
    // No custom ids, clear existing mapping
    edges_cache = [];

  } else {
    const parsed_ids = new Set(custom_ids.split(","));
    const cached_ids = new Set(edges_cache.map(e => e.id));

    const new_ids = parsed_ids.diff(cached_ids);
    new_ids.forEach(id => {
      // Try to locate the wall on the canvas
      const wall = canvas.walls.placeables.find(w => w.id === id);
      if (!wall) {
        log(`wall ${id} not found.`);
        return;
      }

      log(`Adding wall ${wall.id} to cache.`);

      // Store limited wall data. This will include c (coordinates) as well as types.
      const wd = wall.document;
      edges_cache.push({
        c: wd.c,
        light: wd.light,
        move: wd.move,
        sight: wd.sight,
        sound: wd.sound,
        id: id
      });
    });

    const removed_ids = cached_ids.diff(parsed_ids);
    edges_cache = edges_cache.filter(e => {
      if (removed_ids.has(e.id)) { log(`Removing ${e.id} from cache.`); }
      return !removed_ids.has(e.id);
    });
  }

  return edges_cache;
}

/**
 * Shift all edges in the cacche by a provided vector, delta.
 * @param {Object[]} edges_cache    Cache of select wall data. Coordinates, types, id.
 * @param {Object} delta            Object with dx, dy properties representing a vector
 * @return {Object[]} edges_cache
 */
export function lightMaskShiftCustomEdgeCache(edges_cache, delta) {
  log(`lightMaskShiftCustomEdgeCache delta is ${delta.dx}, ${delta.dy}`, edges_cache);
  edges_cache.forEach(e => {
    e.c[0] = e.c[0] + delta.dx;
    e.c[1] = e.c[1] + delta.dy;
    e.c[2] = e.c[2] + delta.dx;
    e.c[3] = e.c[3] + delta.dy;
  });

  return edges_cache;
}
