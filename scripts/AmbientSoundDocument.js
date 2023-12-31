/* globals
*/
/* eslint no-unused-vars: ["error", { "argsIgnorePattern": "^_" }] */
"use strict";

// Patches for the AmbientSoundDocument class
export const PATCHES = {};
PATCHES.BASIC = {};

/**
 * Add AmbientSoundDocument.prototype._onUpdate to update the preview.
 * See AmbientLightDocument.prototype._onUpdate.
 */
function _onUpdate(data, options, userId) {
  Object.values(this.apps).forEach(app => {
    if ( !app.closing ) app.preview.updateSource(data, options);
  });
  this.parent._onUpdate(data, options, userId);
  Object.values(this.apps).forEach(app => {
    if ( !app.closing ) app._previewChanges(data);
  });
}

PATCHES.BASIC.METHODS = { _onUpdate };
