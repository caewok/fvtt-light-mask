/* globals
*/
"use strict";

import { MODULE_ID } from "./const.js";

/**
 * Log message only when debug flag is enabled from DevMode module.
 * @param {Object[]} args  Arguments passed to console.log.
 */
export function log(...args) {
  try {
    const isDebugging = game.modules.get("_dev-mode")?.api?.getPackageDebugValue(MODULE_ID);
    if (isDebugging) {
      console.log(MODULE_ID, "|", ...args);
    }
  } catch(e) {
    // Empty
  }
}

/**
 * Retrieve a flag for a document
 * @param {CanvasDocument} doc  Document that has flags
 * @param {string} name         Name of the flag
 * @returns {object}
 */
export function getFlag(doc, name) {
  return doc.getFlag(MODULE_ID, name);
}

/**
 * Determine if a flag exists for the document.
 * Set up this way to avoid double negative, as we are usually testing for a flag not existing.
 * @param {CanvasDocument} doc    Document that has flags
 * @param {string} name           Name of the flag
 * @returns {boolean}
 */
export function noFlag(doc, name) {
  return (typeof getFlag(doc, name) === "undefined");
}

/**
 * Set the flag for a document
 * @param {CanvasDocument} doc  Document that has flags
 * @param {string} name         Name of the flag
 * @param {object} value        Value for the flag
 */
export async function setFlag(doc, name, value) {
  return doc.setFlag(MODULE_ID, name, value);
}
