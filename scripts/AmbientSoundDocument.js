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
function _onUpdate(wrapped, changed, options, userId) {
  const configs = Object.values(this.apps).filter(app => {
    return app instanceof foundry.applications.sheets.AmbientSoundConfig;
  });
  configs.forEach(app => {
    if ( app.preview ) options.animate = false;
    app._previewChanges(changed);
  });
  wrapped(changed, options, userId);
  configs.forEach(app => app._previewChanges());
}

PATCHES.BASIC.WRAPS = { _onUpdate };
