/* globals
isObjectEmpty,
updateObject,
canvas
*/

'use strict';

import { MODULE_ID, 
         CUSTOM_IDS_KEY, 
         CUSTOM_EDGES_KEY, 
         RELATIVE_KEY,
         ORIGIN_KEY } from "./const.js";
import { log } from "./module.js";

// Hook preUpdateAmbientLight


/**
 * Hook for preUpdateAmbientLight
 * @param {AmbientLightDocument} doc
 * @param {Object} data
 * @param {Object} options {diff: true, render: true}
 * @param {string} id
 */
export function lightMaskPreUpdateAmbientLight(doc, new_data, options, id) {
  log(`Hooking preUpdateAmbientLight ${id}!`, doc, new_data, options);
  
  const updateObj = {};
  let edges_cache = doc.data.document.getFlag(MODULE_ID, CUSTOM_EDGES_KEY) || [];
  if(new_data?.flags?.[MODULE_ID]?.[CUSTOM_IDS_KEY]) {
    // add custom wall ids
    const custom_ids = new_data.flags?.[MODULE_ID]?.[CUSTOM_IDS_KEY] || "";
    //let edges_cache = doc.data.flags?.[MODULE_ID]?.[CUSTOM_EDGES_KEY] || [];
  
    log(`preUpdateAmbientLight ids are ${custom_ids} with cache size ${edges_cache.length}.`);
    edges_cache = lightMaskUpdateCustomEdgeCache(edges_cache, custom_ids)
  
    updateObj[CUSTOM_EDGES_KEY] = edges_cache;
    
    log(`preUpdateAmbientLight updating cache size ${edges_cache.length}`, edges_cache, updateObj);
  }
  
  if(new_data?.flags?.[MODULE_ID]?.[RELATIVE_KEY]) {
    // if relative is being set to true:
    // - store origin
    const new_origin = { x: doc.data.x, y: doc.data.y };
    log(`preUpdateAmbientLight setting origin flag to ${new_origin.x}, ${new_origin.y}.`);
    updateObj[ORIGIN_KEY] = new_origin;
  }
 
  if(doc.data.document.getFlag(MODULE_ID, RELATIVE_KEY) &&  
     Object.prototype.hasOwnProperty.call(new_data, "x")) {
    // if relative is true:
    // - get the x,y delta between new_data.x, new_data.y and the stored origin
    // - change wall coordinates based on delta, if any
    // - update the stored origin
    const new_origin = { x: new_data.x || doc.data.x, y: new_data.y || doc.data.y };
    const old_origin = doc.data.document.getFlag(MODULE_ID, ORIGIN_KEY) || new_origin;
    log(`preUpdateAmbientLight setting origin flag to ${new_origin.x}, ${new_origin.y}, from ${old_origin.x}, ${old_origin.y}.`);
    if(new_origin.x !== old_origin.x || new_origin.y !== old_origin.y) {
      const delta = { dx: new_origin.x - old_origin.x, dy: new_origin.y - old_origin.y };
      log(`preUpdateAmbientLight delta is ${delta.dx}, ${delta.dy}`);
      
      edges_cache = lightMaskShiftCustomEdgeCache(edges_cache, delta);    
      updateObj[ORIGIN_KEY] = new_origin;
      updateObj[CUSTOM_EDGES_KEY] = edges_cache;
    }  
  }
  
  if(isObjectEmpty(updateObj)) return;
  
  log(`preUpdateAmbientLight updating using object`, updateObj);
  doc.data.update({ [`flags.${MODULE_ID}`]: updateObj });
}

export function lightMaskUpdateCustomEdgeCache(edges_cache, custom_ids) {
   if(!custom_ids || custom_ids === "") {
    // no custom ids, clear existing mapping
    edges_cache = [];
    
  } else {
    const parsed_ids = new Set(custom_ids.split(","));
    const cached_ids = new Set(edges_cache.map(e => e.id));
    
    const new_ids = parsed_ids.diff(cached_ids);
    new_ids.forEach(id => {
      // try to locate the wall on the canvas 
      const wall = canvas.walls.placeables.find(w => w.id === id);
      if(!wall) {
        log(`wall ${id} not found.`);
        return;
      }
      
      log(`Adding wall ${wall.id} to cache.`);
      
      // store limited wall data. This will include c (coordinates) as well as types.
      edges_cache.push(
      {
        c: wall.data.c, 
        light: wall.data.light, 
        move: wall.data.move, 
        sight: wall.data.sight,
        sound: wall.data.sound,
        id: id 
      });
    });
    
    const removed_ids = cached_ids.diff(parsed_ids);
    edges_cache = edges_cache.filter(e => {
      if(removed_ids.has(e.id)) { log(`Removing ${e.id} from cache.`); }
      return !removed_ids.has(e.id);
    });
  } 
  
  return edges_cache; 
}

function lightMaskShiftCustomEdgeCache(edges_cache, delta) {
  log(`lightMaskShiftCustomEdgeCache delta is ${delta.dx}, ${delta.dy}`, edges_cache);
  edges_cache.forEach(e => {
    e.c[0] = e.c[0] + delta.dx;
    e.c[1] = e.c[1] + delta.dy;
    e.c[2] = e.c[2] + delta.dx;
    e.c[3] = e.c[3] + delta.dy;
  });

  return edges_cache;
}

/**
 * Difference (a \ b): create a set that contains those elements of 
 * set a that are not in set b.
 */
Set.prototype.diff = function(b) {
  return new Set([...this].filter(x => !b.has(x)));
}