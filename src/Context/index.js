import Controller from "../Controller";

/** @namespace    Voodoo
  * @class        Context
  * @description  Describes an execution context made of a controller and its local scope
  */
export default class Context {

  /** @constructor Context
    * @param       {Object} controllerSettings     controller configuration
    *                         {
    *                             name {String}:      controllerName
    *                             modules {Array}:    ["module1", "module2", ...]
    *                             caller {Function}:  controller callback
    *                         }
    * @param       {Scope} scope   local scope
    */
  constructor(controllerSettings, scope) {
    // set controller to null to wait document loading
    this.controller = null;
    this.controllerSettings = controllerSettings;
    this.scope = scope;

    this.init();
  }


  /** @method       init
    * @description  Initializes controller with its settings and its local scope
    */
  init() {
    const ctrlSettings = this.controllerSettings;

    // create a new controller
    this.controller = new Controller(ctrlSettings.name, this.scope);

    // run the caller with modules dependency
    this.controller.run(ctrlSettings.modules, ctrlSettings.caller);
  }

}
