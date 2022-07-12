/* globals
libWrapper,
AmbientLight,
LightSource,
SoundSource,
foundry
*/
"use strict";

/* Light Configuration Flow
1. New Light Created
Hook: initializeLightSourceShaders
Hook: lightingRefresh (repeated until light is placed)
Hook: sightRefresh (repeated until light is placed)

Once placed:
Hook: preCreateAmbientLight
Hook: initializeLightSourceShaders
Hook: createAmbientLight
Hook: lightingRefresh
Hook: sightRefresh
Hook: sightRefresh

Hovering over light icon:
Hook: hoverAmbientLight
AmbientLightConfig.prototype._render
AmbientLightConfig.prototype.getData

Double-click to open config
Retrieved and compiled template templates/scene/ambient-light-config.html
Hook: getAmbientLightConfigHeaderButtons
Hook: getDocumentSheetHeaderButtons
Hook: getFormApplicationHeaderButtons
Hook: getApplicationHeaderButtons
Retrieved and compiled template templates/app-window.html
AmbientLightConfig.prototype.activateListeners
injectAmbientLightConfiguration
Hook: renderAmbientLightConfig
Hook: renderDocumentSheet
Hook: renderFormApplication
Hook: renderApplication
Hook: hoverAmbientLight

Switch color
AmbientLightConfig.prototype._onChangeInput (Event target is  with type color)
AmbientLightConfig.prototype._getSubmitData
AmbientLightConfig.prototype._refresh
ClockwiseSweepPolygon
Hook: initializeLightSourceShaders
Hook: lightingRefresh
Hook: sightRefresh

Hit submit
AmbientLightConfig.prototype._getSubmitData
AmbientLightConfig.prototype._refresh
ClockwiseSweepPolygon
Hook: initializeLightSourceShaders
Hook: lightingRefresh
Hook: sightRefresh
AmbientLightConfig.prototype._getSubmitData
AmbientLightConfig.prototype._updateObject
Hook: preUpdateAmbientLight
AmbientLightConfig.prototype._render
ClockwiseSweepPolygon
Hook: updateAmbientLight
Hook: closeAmbientLightConfig
Hook: closeDocumentSheet
Hook: closeFormApplication
Hook: closeApplication
Hook: lightingRefresh
Hook: sightRefresh


*/

/*
Changing color method flow
AmbientLightConfig.prototype._onChangeInput
  FormApplication.prototype._onChangeInput
    FormApplication.prototype._onChangeColorPicker
      form[input.dataset.edit].value = input.value;
  AmbientLightConfig.prototype._getSubmitData
  foundry.utils.mergeObject
  AmbientLightConfig.prototype._refresh
    AmbientLight.prototype.updateSource
    AmbientLight.prototype.refresh


*/



// Patches

import { lightMaskActivateListeners, updateShapeIndicator, updateRotation } from "./renderAmbientLightConfig.js";
import { MODULE_ID } from "./settings.js";
import { boundaryPolygon } from "./boundaryPolygon.js";
import { customEdges } from "./customEdges.js";
import { log } from "./module.js";

export function registerLightMask() {

  // ------ Switching Shapes and selecting shape parameters ----- //
  libWrapper.register(MODULE_ID, "FormApplication.prototype._onChangeInput", formApplicationChangeInput, "WRAPPER");

  // ------ AmbientLightConfig ----- //
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.getData", ambientSourceGetData, "WRAPPER");

  // ------ AmbientSoundConfig ----- //
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.getData", ambientSourceGetData, "WRAPPER");

  libWrapper.register(MODULE_ID, "AmbientSoundConfig.defaultOptions", defaultOptionsSound, "WRAPPER");

  Object.defineProperty(AmbientSoundConfig.prototype, "_refresh", {
    value: refreshSound,
    writable: true,
    configurable: true
  });

  // ------ TokenConfig ----- //
  libWrapper.register(MODULE_ID, "TokenConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "TokenConfig.prototype.getData", tokenSourceGetData, "WRAPPER");

  Object.defineProperty(TokenConfig.prototype, "_refresh", {
    value: refreshToken,
    writable: true,
    configurable: true
  });


  // ------ DefaultTokenConfig ----- //
  libWrapper.register(MODULE_ID, "DefaultTokenConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");

}

async function formApplicationChangeInput(wrapper, event) {
  log("formApplicationChangeInput", event, this);

  if ( event.type !== "change" ) return wrapper(event);

  let refresh = false;
  let render = false;

  if ( event.target.name === "flags.lightmask.rotation" ) {
    log("LightMask rotation")
    await updateRotation.call(this, event);
    refresh = true;
  } else {
    // lightmaskshapes, lightmasksides, lightmaskpoints, lightmaskEllipseMinor
    // If changing shapes, we need to update the sub-parameter selections.
    refresh = true;
    render = event.target.id === "lightmaskshapes";
    await updateShapeIndicator.call(this, event);
  }

  // Refresh the sound or token light shape
  // AmbientLight gets refreshed automatically
  // Default Token Config and Prototype Token are not on the map, so cannot be refreshed.
  refresh &&= !this.token || !(this.isPrototype);
  refresh &&= !(this instanceof DefaultTokenConfig);
  refresh &&= (this instanceof AmbientSoundConfig || this instanceof TokenConfig);
  refresh && this._refresh();
  render && this._render(); // Update the rendered config html options for the new shape

  log(`formApplicationChangeInput render ${render}; refresh ${refresh}`);
  return await wrapper(event);
}


function refreshSound() {
  log("refreshSound", this);
  if ( !this.document.object ) return;
  this.document.object.updateSource();
  this.document.object.refresh();
}

function refreshToken() {
  log("refreshToken", this);
  if ( !this.token.object ) return;
  this.token.object.updateSource();
  this.token.object.refresh();
}

function defaultOptionsSound(wrapper) {
  const options = wrapper();
  return foundry.utils.mergeObject(options, {
    height: "auto"
  })
}

Object.defineProperty(LightSource.prototype, "boundaryPolygon", {
  value: boundaryPolygon,
  writable: true,
  configurable: true
});

Object.defineProperty(SoundSource.prototype, "boundaryPolygon", {
  value: boundaryPolygon,
  writable: true,
  configurable: true
});


Object.defineProperty(LightSource.prototype, "customEdges", {
  value: customEdges,
  writable: true,
  configurable: true
});

Object.defineProperty(SoundSource.prototype, "customEdges", {
  value: customEdges,
  writable: true,
  configurable: true
});

function ambientSourceGetData(wrapper, options) {
  log('ambientSourceGetData')
  const data = wrapper(options);

  // When first loaded, a light may not have flags.lightmask.
  if ( data.data?.flags?.lightmask?.shape ) return data;
  return foundry.utils.mergeObject(data, { "data.flags.lightmask.shape": "circle" });
}

async function tokenSourceGetData(wrapper, options) {
  const data = await wrapper(options);

  // When first loaded, a light may not have flags.lightmask.
  // But afterward, set the boolean so that the UI shows sides or points if necessary.
  let isStar = false;
  let isPolygon = false;
  let isEllipse = false;
  if ( data.object?.flags?.lightmask?.shape ) {
    isStar = data.object.flags.lightmask.shape === "star";
    isPolygon = data.object.flags.lightmask.shape === "polygon";
    isEllipse = data.object.flags.lightmask.shape === "ellipse";
  }

  return foundry.utils.mergeObject(data, {
    shapes: {
      circle: "lightmask.Circle",
      ellipse: "lightmask.Ellipse",
      polygon: "lightmask.RegularPolygon",
      star: "lightmask.RegularStar",
      none: "lightmask.None"
    },
    "object.flags.lightmask.isStar": isStar,
    "object.flags.lightmask.isPolygon": isPolygon,
    "object.flags.lightmask.isEllipse": isEllipse
  });
}
