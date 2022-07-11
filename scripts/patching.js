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

import { lightMaskActivateListeners, ambientLightConfigOnChangeInput } from "./renderAmbientLightConfig.js";
import { MODULE_ID } from "./settings.js";
import { boundaryPolygon } from "./boundaryPolygon.js";
import { customEdges } from "./customEdges.js";
import { log } from "./module.js";

export function registerLightMask() {
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");

  libWrapper.register(MODULE_ID, "TokenConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");
  libWrapper.register(MODULE_ID, "DefaultTokenConfig.prototype.activateListeners", lightMaskActivateListeners, "WRAPPER");

  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype._onChangeInput", ambientLightConfigOnChangeInput, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype.getData", ambientSourceGetData, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype._updateObject", updateObject, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype._refresh", refresh, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype._render", render, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientLightConfig.prototype._getSubmitData", getSubmitData, "WRAPPER");
//   libWrapper.register(MODULE_ID, "AmbientLightConfig.defaultOptions", defaultOptions, "WRAPPER");

  libWrapper.register(MODULE_ID, "AmbientSoundConfig.prototype.getData", ambientSourceGetData, "WRAPPER");
  libWrapper.register(MODULE_ID, "AmbientSoundConfig.defaultOptions", defaultOptionsSound, "WRAPPER");

  libWrapper.register(MODULE_ID, "TokenConfig.defaultOptions", switchAmbientTokenLightTemplate, "WRAPPER");
  libWrapper.register(MODULE_ID, "TokenConfig.prototype.getData", tokenSourceGetData, "WRAPPER");

//   Object.defineProperty(AmbientSoundConfig.prototype, "_onChangeInput", {
//     value: onChangeInputSound,
//     writable: true,
//     configurable: true
//   });

}

// async function onChangeInputSound(event) {
//   log("onChangeInputSound", event, this);
// //   await super._onChangeInput(event); // super fails
//   await FormApplication.prototype._onChangeInput.call(this, event);
//   const previewData = this._getSubmitData();
//   foundry.utils.mergeObject(this.document.data, previewData, {inplace: true});
//   this._refresh();
// }

// function defaultOptions(wrapper) {
//   const options = wrapper();
// //   options.scrollY = [".tab"]; // nada
// //   options.scrollY = [".tabs > .tab"]; // nope
// //   options.scrollY = ["#lightmaskshapes"]; // dream-on
// // scrollY: [".tab .lightmask"] // fail
// // scrollY: [".tab.advanced"] // nothing
// //     scrollY: [".ambient-light-config"] // no
//
//   return mergeObject(options, {
//     scrollY: [".window-content"]
//   });
// }

function defaultOptionsSound(wrapper) {
  const options = wrapper();
  return foundry.utils.mergeObject(options, {
    height: "auto"
  })
}

function updateObject(wrapper, event, formData) {
  log("updateObject", event, formData);
  return wrapper(event, formData)
}

function refresh(wrapper) {
  log("refresh");
  wrapper();
}

function render(wrapper, force, options) {
  log("render", force, options);
  return wrapper(force, options);
}

function getSubmitData(wrapper, updateData) {
  log("getSubmitData", updateData);
  return wrapper(updateData);
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


function switchAmbientTokenLightTemplate(wrapper) {
  const cfg = wrapper();
  log("switchAmbientTokenLightTemplate", cfg);
  cfg.template = `modules/${MODULE_ID}/templates/token-config.html`;
  return cfg;
}

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
