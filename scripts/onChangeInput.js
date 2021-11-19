/* globals
canvas,
foundry
*/

'use strict';

import { MODULE_ID, SHAPE_KEY, CUSTOM_IDS_KEY, CUSTOM_EDGES_KEY } from "./const.js";
import { log } from "./module.js";

/**
 * Patch AmbientLightConfig onChangeInput
 * Catch when the user adds / removes custom wall ids and pull the wall information
 * from the canvas.
 */
export async function lightMaskOnChangeInput(wrapped, event) {
  //log(`_onChangeInput: ${this.object.document.getFlag(MODULE_ID, SHAPE_KEY)}, ${this.object.document.getFlag(MODULE_ID, CUSTOM_IDS_KEY)}, ${this.object.document.getFlag(MODULE_ID, CUSTOM_EDGES_KEY)} `, event, this, this._getSubmitData(), this.object.document.getFlag(MODULE_ID, CUSTOM_EDGES_KEY));
  log(`_onChangeInput:`, event, this, this._getSubmitData());
  
  // if the event data includes custom ids, update with canvas wall data as necessary.
  // we want to be able to wrap the method, so modify document data to include the change.
  // previewData uses combined keys, so 'flags.lightmask.shape'
 //  const previewData = this._getSubmitData();
//   
//   log(`previewData`, previewData);
//   
//   if(previewData) {
//     const custom_ids_str = `flags.${MODULE_ID}.${CUSTOM_IDS_KEY}`;
//     const custom_cache_str = `flags.${MODULE_ID}.${CUSTOM_EDGES_KEY}`
//     const custom_ids = previewData[custom_ids_str] || "";
//     const edges_cache = previewData[custom_cache_str] || {};  
//     const newData = {};
//     newData[custom_cache_str] = lightMaskUpdateCustomEdgeCache(custom_ids, edges_cache);
//     
//     log(`Merging custom cache to document.`, newData);
//     foundry.utils.mergeObject(this.document.data, newData, { inplace: true });
//     
//     const test_str = `flags.${MODULE_ID}.test`;
//     const testData = {};
//     testData[test_str] = { A: 1, B: 2 };
//     foundry.utils.mergeObject(this.document.data, testData, { inplace: true });
//         
//     log(`Document data flags:`, this.document.data.flags);
//   }
  
  wrapped(event);
//   log(`Document data flags after change input:`, this);
  
  //log(`Document data flags after change input: ${this.object.document.getFlag(MODULE_ID, SHAPE_KEY)}, ${this.object.document.getFlag(MODULE_ID, CUSTOM_IDS_KEY)}, ${this.object.document.getFlag(MODULE_ID, CUSTOM_EDGES_KEY)}`, this.object.document.data.flags);
}


/**
 * Also patch AmbientLightConfig updateObject to save the keys
 */
export async function lightMaskUpdateObject(wrapped, event, formData) {
  log(`_updateObject:`, event, formData, this);
  return wrapped(event, formData)
}

/**
 * Add AmbientLightConfig _getSubmitData to update maks
 */
export function lightMaskGetSubmitData(wrapped, updateData={}) {
  let data = wrapped(updateData);
  
  if(data) {
    const custom_ids_str = `flags.${MODULE_ID}.${CUSTOM_IDS_KEY}`;
    const custom_cache_str = `flags.${MODULE_ID}.${CUSTOM_EDGES_KEY}`
    const custom_ids = data[custom_ids_str] || "";
    const edges_cache = data[custom_cache_str] || {};  
    const newData = {};
    newData[custom_cache_str] = lightMaskUpdateCustomEdgeCache(custom_ids, edges_cache);
    
//     log(`Merging custom cache to document.`, newData);
    data = foundry.utils.flattenObject(foundry.utils.mergeObject(this.document.data, newData));
    
   //  const test_str = `flags.${MODULE_ID}.test`;
//     const testData = {};
//     testData[test_str] = { A: 1, B: 2 };
//     foundry.utils.mergeObject(this.document.data, testData, { inplace: true });
        
//     log(`Document data flags:`, this.document.data.flags);
  }
  
  log(`_getSubmitData data`, data);
  return data;
}

/**
 * Update the cache of wall data information for custom wall keys.
 * The cache should correspond to the ids provided by the user.
 */
function lightMaskUpdateCustomEdgeCache(custom_ids, edges_cache = {}) {  
  log(`edges_cache contains ${Object.keys(edges_cache).length} keys; custom ids: ${custom_ids}.`, edges_cache);
  
  if(!custom_ids || custom_ids === "") {
    // no custom ids, clear existing mapping
    edges_cache = {};
  } else {
    // ids exist. Update if necessary
    // Don't update unless necessary, b/c once custom ids are added by user, user may
    // remove the underlying wall
    const parsed_ids = custom_ids.split(",");
    
    parsed_ids.forEach(id => {
      log(`Checking id ${id}...`);
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