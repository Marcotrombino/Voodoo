import * as window from "window";
import * as includes from "../Utils/includesPolyfill.js";
import * as every from "../Utils/everyPolyfill.js";
import { isString, isArray, isFunction } from "../Utils/types.js";
import scheduler from "../Scheduler";
import parser from "../Parser";
import Router from "../Router/Router.js";
import Context from "../Context";
import modules from "../Modules";

/** @namespace    Voodoo
  * @class        Voodoo
  * @description  Voodoo's core
  */
export default class Voodoo {
  constructor() {
    // list of controllers  [ { modules: ["module1", "module2", ...], caller: function} ]
    this.controllers = {};
    this.routes = {};
    this.defaultRoute = {};

    this.parser = null;
    this.router = null;

    // init only when the DOM is fully loaded (<script> execution included)
    window.document.addEventListener("DOMContentLoaded", this.init.bind(this));
  }


  /** @method       init
    * @description  initializes the Parser and Router only when the DOM is fully loaded (<script> execution included)
    */
  init() {
    parser.init(this);
    parser.parseApp();
    this.router = new Router(this, this.routes, this.defaultRoute);
  }

  load(template) {
    parser.loadView(template);
  }


  /** @method       createNewContext
    * @description  Creates a new Context for the given controller name and local scope
    * @param  {String}  ctrlName    controller name
    * @param  {Scope} scope         controller's local scope
    */
  createNewContext(ctrlName, scope) {
    const ctrlList = this.controllers;

    // if the controller's name is been defined in controllers' list
    if(ctrlList.hasOwnProperty(ctrlName)) {
      new Context({
        name: ctrlName, modules: ctrlList[ctrlName].modules,
        caller: ctrlList[ctrlName].caller
      }, scope);
    }
  }


  /** @method       controller
    * @description  Define a new controller
    * @param        {String}           name    controller's name
    * @param        {Function|Array}   caller  the function to call
    *               controllers can be defined by two syntax:
    *               -  controller("name", function() {})
    *               -  controller("name", ["module1", "module2", ... function(m1, m2) {}])
    *
    *               The last syntax allows to inject requested modules into the controller scope
    */
  controller(name, caller) {

    // check if the controller's name is a string and there isn't another controller with the same name
    if(isString(name) && !this.controllers.hasOwnProperty(name)) {

      // check the syntax:
      //  Voodoo.controller(string, function)
      //
      if(isFunction(caller)) {
        //this.controllers[name] = new Controller(name).caller([], caller);
        this.controllers[name] = { modules: [], caller: caller };
      }
      // otherwise check the syntax:
      //  Voodoo.controller(string, [string, string, string..., func])
      //
      else if(isArray(caller)) {
          const lastIndex = caller.length - 1;
          const modules = caller.slice(0, lastIndex);
          const func = caller[lastIndex];

          // check if all modules' names are string and the last element is a function
          if(modules.every(val => isString(val)) && isFunction(func)) {
            //this.controllers[name] = new Controller(name).caller(modules, func);
            this.controllers[name] = { modules: modules, caller: func };
          }
      }
    }
  }

  when(path, templateName) {
    if(path && templateName) {
      this.routes[path] = templateName;
    }
  }

  setDefaultRoute(defaultPath, defaultTemplateName) {
    if(defaultPath && defaultTemplateName) {
      this.defaultRoute.path = defaultPath;
      this.defaultRoute.template = defaultTemplateName;
    }
  }

  service(serviceName, service) {
    if(!modules.modules.hasOwnProperty(serviceName))
      modules.defineModule(serviceName, service);
  }

}
