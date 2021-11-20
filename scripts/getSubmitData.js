/* globals
canvas,
foundry
*/

'use strict';

import { MODULE_ID, CUSTOM_IDS_KEY, CUSTOM_EDGES_KEY } from "./const.js";
import { log } from "./module.js";

/**
 * Patch AmbientLightConfig _getSubmitData to update the edge cache
 */
export function lightMaskGetSubmitData(wrapped, updateData={}) {
  let data = wrapped(updateData);
  
  log(`getSubmitData data`, data);
  
  if(data) {
    const custom_ids_str = `flags.${MODULE_ID}.${CUSTOM_IDS_KEY}`;
    const custom_cache_str = `flags.${MODULE_ID}.${CUSTOM_EDGES_KEY}`
    const custom_ids = data[custom_ids_str] || "";
    const edges_cache = data[custom_cache_str] || {};  
    const newData = {};
    newData[custom_cache_str] = lightMaskUpdateCustomEdgeCache(custom_ids, edges_cache);    
    
//     log(`_getSubmitData newData`, data, newData);
    data = foundry.utils.flattenObject(foundry.utils.mergeObject(data, newData));
  }
  
//   log(`_getSubmitData data`, data);
  return data;
}

/**
 * Update the cache of wall data information for custom wall keys.
 * The cache should correspond to the ids provided by the user.
 */
function lightMaskUpdateCustomEdgeCache(custom_ids, edges_cache = {}) {  
//   log(`edges_cache contains ${Object.keys(edges_cache).length} keys; custom ids: ${custom_ids}.`, edges_cache);
  
  if(!custom_ids || custom_ids === "") {
    // no custom ids, clear existing mapping
    edges_cache = {};
  } else {
    // ids exist. Update if necessary
    // Don't update unless necessary, b/c once custom ids are added by user, user may
    // remove the underlying wall
    const parsed_ids = custom_ids.split(",");
    
    parsed_ids.forEach(id => {
//       log(`Checking id ${id}...`);
      // if the cache already has this id, we are done
      if(Object.prototype.hasOwnProperty.call(edges_cache, id)) return;
      
      // try to locate the wall on the canvas 
      const wall = canvas.walls.placeables.find(w => w.id === id);
      if(!wall) {
        log(`wall ${id} not found.`);
        return;
      }
      
      log(`Adding wall ${wall.id} to cache.`);
      
      // store limited wall data. This will include c (coordinates) as well as types.
      edges_cache[id] = {
        c: wall.data.c, 
        light: wall.data.light, 
        move: wall.data.move, 
        sight: wall.data.sight,
        sound: wall.data.sound,
        _id: wall.data._id }
    });
    
    // remove any id not listed from the cache
    Object.keys(edges_cache).forEach(id => {
      if(parsed_ids.includes(id)) { return; }
    
      log(`Removing id ${id} from cache.`);
      delete edges_cache[id];
    });
  }
  
  return edges_cache;
}