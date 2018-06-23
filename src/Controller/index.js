import modules from "../Modules";
import Scope from "../Modules/Scope";
import Injector from "./Injector";

/** @namespace    Voodoo
  * @class        Controller
  * @description  Manages modules dependency and apply DOM changes (produced by change detection)
  */
export default class Controller {

  /** @constructor Controller
    * @param       {String} name   controller name
    * @param       {Scope} scope   local scope, produced by Parser
    *                 A controller interacts with the model (Scope) and produce DOM changes
    */
  constructor(name, scope) {
    this.name = name;
    this.scope = scope;

    // define local injector
    this.defineLocalInjector(scope);
  }


  /** @constructor defineLocalInjector
    * @param       {Scope} scope   local scope, produced by Parser
    *                Initializes a new Injector loading all Modules without Scope module.
    *                Next the injector registers a new module with the passed local scope
    */
  defineLocalInjector(scope) {
    /* bind the local scope with this controller
     * Scope interact with controller sending list of changes to apply, so it needs to know its controller
     */
    scope.bindController(this);

    // create a new Injector with all Voodoo modules (Http, LocalStorage, etc)
    const inj = new Injector(modules.modules);

    // register a new module called "$scope" using the passed local scope
    //inj.register("$scope", scope.api);
    inj.register("$scope", scope.state);
    this.injector = inj;
  }


  /** @constructor run
    * @param       {Array} deps      list of modules to inject into controller
    * @param       {Function} func   the controller callback which manage all view
    */
  run(deps, func) {
    // resolve modules dependencies and call the callback with modules injected
    this.injector.resolve(deps, func)();
  }


  /** @constructor compile
    * @param       {Object} changes contains all DOM changes produced by a scope's variable assignment (setter)
    *                         It contains a key for each watcher binded to that variable
    *                         And each watcher is an Array of VNodes to change:
    *                         {
    *                           bind: [ VNode, VNode, VNode, ...],
    *                           for:  [ VNode, VNode, VNode, ...]
    *                         }
    * @param       {Any} newVal   the new variable's value to pass to each VNode render()
    */
  compile(varName, changes, newVal) {

    // for each watcher
    Object.keys(changes).forEach(watcherName => {
      // list of VNodes
      const watcher = changes[watcherName];
      const watcherLen = watcher.length;

      /* for each VNode call its render passing the watcher's name and the new value
       * VNodes contains internally all watcher binded to itself.
       * When render() is called passing the watcher name, the VNode can determines what it has to change
       */
      for(let i = 0; i < watcherLen; i++) {
        watcher[i].render(varName, watcherName, newVal);
      }
    });

  }
}
