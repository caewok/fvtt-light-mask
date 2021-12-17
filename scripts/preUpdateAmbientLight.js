/* globals
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
  
  const ids_to_add = new_data?.flags?.[MODULE_ID]?.[CUSTOM_IDS_KEY];
  if(ids_to_add) {
    // retrieve the existing cache, if any
//     let edges_cache = doc.data.document.getFlag(MODULE_ID, CUSTOM_EDGES_KEY) || [];
    let edges_cache = doc.getFlag(MODULE_ID, CUSTOM_EDGES_KEY) || [];
    log(`edges_cache length ${edges_cache.length} before additions`, edges_cache);
    edges_cache = lightMaskUpdateCustomEdgeCache(edges_cache, ids_to_add);
    
    // add the edges cache  
    new_data[`flags.${MODULE_ID}.${CUSTOM_EDGES_KEY}`] = edges_cache;
  }
  
  // if relative is being set to true: store origin
  // if x or y is being updated, update the origin if relative is already true
  const relative_key = new_data?.flags?.[MODULE_ID]?.[RELATIVE_KEY];
 //  const origin_updated = Object.prototype.hasOwnProperty.call(new_data, "x") || 
//                          Object.prototype.hasOwnProperty.call(new_data, "y");
//                          
//   const update_origin = relative_key || 
//     ( doc.getFlag(MODULE_ID, RELATIVE_KEY) && origin_updated );
      
  if(relative_key) {
    // prefer the new origin position, if any  
    const new_origin = { x: new_data?.x || doc.data.x, 
                         y: new_data?.y || doc.data.y };
    log(`preUpdateAmbientLight updating origin to ${new_origin.x}, ${new_origin.y}`);
    
    new_data[`flags.${MODULE_ID}.${ORIGIN_KEY}`] = new_origin;
  } else if(relative_key === false) {
    // set the wall locations based on the last origin because when the user unchecks
    // relative, we want the walls to stay at the last relative position (not their
    // original position)
    // theoretically possible, but unlikely, that edges cache was modified above
    let edges_cache = new_data?.flags?.[MODULE_ID]?.[CUSTOM_EDGES_KEY] || doc.getFlag(MODULE_ID, CUSTOM_EDGES_KEY) || [];    
    const new_origin = { x: new_data?.x || doc.data.x, 
                         y: new_data?.y || doc.data.y };
    
    const stored_origin = doc.getFlag(MODULE_ID, ORIGIN_KEY) || new_origin;
    const delta = { dx: new_origin.x - stored_origin.x, 
                    dy: new_origin.y - stored_origin.y };
    
    edges_cache = lightMaskShiftCustomEdgeCache(edges_cache, delta);
    new_data[`flags.${MODULE_ID}.${CUSTOM_EDGES_KEY}`] = edges_cache;
  }
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

/**
 * Difference (a \ b): create a set that contains those elements of 
 * set a that are not in set b.
 */
Set.prototype.diff = function(b) {
  return new Set([...this].filter(x => !b.has(x)));
}