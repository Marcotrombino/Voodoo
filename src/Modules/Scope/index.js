import { isArray, isObject, isFunction } from "../..//Utils/types.js";
import scheduler from "../../Scheduler";

/** @namespace    Voodoo
  * @class        Scope
  * @description  Describes a local scope injected into a Controller
  */
export default class Scope {

  /** @constructor Scope
    * @param        {Object}      subScope      initial scope state
    * @param        {Controller}  controller    controller's reference
    */
  constructor(parentScope) {
    Object.defineProperties(this, {
      "watchers": {
        value: {},
        writable: false
      },
      "state": {
        value: {},
        writable: false
      }
    });

    this.parentScope = parentScope;
    this.controller = null;
    this.childScopes = [];
  }

  /** @method bindController
    * @param       {Controller} ctrl   the associated controller
    * @description binds the local scope with passed controller
    *              Scope interact with controller sending list of changes to apply, so it needs to know its controller
    */
  bindController(ctrl) {
    this.controller = ctrl;
  }

  getChildScopeIndex() {
    return this.childScopes.length;
  }

  addChildScope(index, scope) {
    this.childScopes[index] = scope;
  }

  /** @method       notifyChildScopes
    * @description  Notifies variable's changes to childs' scope
    * @param        {Scope}   scope      current scope
    * @param        {String}  varName     variable's name to notify
    * @param        {String}  newVal      new variable's value
    */
  notifyChildScopes(scope, varName, newVal) {
    const childScopes = scope.childScopes;
    const childScopesLen = childScopes.length;
    const split = varName.split(".");
    const splitLen = split.length;

    for(let i = 0; i < childScopesLen; i++) {
      let stateRef = childScopes[i].state;

      for(let j = 0; j <= splitLen; j++) {
        if(stateRef[split[j]]) {
          if(j < (splitLen - 1)) {
            stateRef = stateRef[split[j]];
          } else {
            scheduler.schedule(() => { stateRef[split[j]] = newVal; });
          }
        } else {
          if(childScopes[i].childScopes.length > 0) {
            this.notifyChildScopes(childScopes[i], varName, newVal);
          }
          break;
        }
      }

    }

  }

  /** @method       notifyChanges
    * @description  Notifies all VNodes binded to a variable's name
    * @param        {String}  varName      the variable's name
    * @param        {Object}  watchers     list of watchers binded to varName
    * @param        {String}  newVal       new variable's value
    */
  notifyChanges(varName, watchers, newVal) {
//    console.log("notifico->", varName, watchers, newVal);

    this.controller.compile(varName, watchers, newVal);

    this.notifyChildScopes(this, varName, newVal);
  }


  /** @method       checkAndNotifyChanges
    * @description  Allows to assign nested variables through an object.
    *               It needs to check inner property and assign them recursively
    * @param        {Object}  state        state reference from assigner
    * @param        {Object}  newVal       new variable's value
    */
  checkAndNotifyChanges(state, newVal) {
    const stateKeys = Object.keys(state);
    const newValKeys = Object.keys(newVal);

    newValKeys.forEach(function(nv) {
      stateKeys.forEach(function(s) {
        // if property exists into the state, trigger its setter with the new value
        if(s === nv) {
          state[s] = newVal[nv];
        }
      });
    });
  }


  /** @method       destroyChilds
    * @description  It's called when a state is updated.
    *               It updates child views with empty value and removes them from watchers list
    * @param        {Object}  state        state reference from assigner
    * @param        {Object}  newVal       new variable's value
    */
  destroyChilds(rootState, watchersRef) {
    const $ = this;
    const root = rootState.value;
    const rootKeys = Object.keys(root);

    /**
      * Update childrens' tree to empty value because their value is been overwritten by an ancestor
      *
      *   $state.values.val1 = 3;    <-----------┐
      *   $state.values.val2 = 5;    <-----------┐
      *   $state.value = 5; ------- overwrites ---
      *
      * N.B it doesn't need to delete childs (_ and getter&setter)
      *     because the ancestor will overwrite its value removing all childs tree automatically
      */

    // if the root state is an object and has some child to update
    if(isObject(root) && rootKeys.length > 0) {
      // for each child name
      rootKeys.forEach(function(child) {
          // get the child value
          let nextChild = root[child].value;

          // if child's name is a "state object" (has the "_" prefix)
          if(child[0] === "_") {
            // if child value is an object (it means that child has own childs)
            if(isObject(nextChild)) {
              // traverse child
              $.updateChildsTree(nextChild);
            }

          }
          else {  // the child's name is a getter&setter, so it needs to be called updating node value to an empty string
            root[child] = "";
          }
      });
    }

    /**
      * Remove every child's watcher in the watchers' tree
      *
      *   $state.values.val1 = 3;    <-----------------------┐
      *   $state.values.val2 = 5;    <-----------------------┐
      *   $state.value = 5; ------- removes child watchers ---
      *
      */

    Object.keys(watchersRef).forEach(function(child) {
      // remove every child except the parent watchers property
      if(child !== "watchers")
        watchersRef[child] = undefined; // triggering the Garbage collector instead of using use remove[prop]
    });

  }

  updateChildsTree(root) {
    const $ = this;
    const rootKeys = Object.keys(root);

    // if the root state is an object and has some child to update
    if(isObject(root) && rootKeys.length > 0) {
      // for each child name
      rootKeys.forEach(function(child) {
          // get the child value
          let nextChild = root[child].value;

          // if child's name is a "state object" (has the "_" prefix)
          if(child[0] === "_") {
            // if child value is an object (it means that child has own childs)
            if(isObject(nextChild)) {
              // traverse child
              $.updateChildsTree(nextChild);
            }
          } else {  // the child's name is a getter&setter, so it needs to be called updating node value to an empty string
            root[child] = "";
        }
      });

    }

  }


  /** @method       addWatcher
    * @description  Defines a new entry into Scope
    * @param        {VNode}   vnode      virtual node to bind with the scope variable
    * @param        {String}  watcher   watcher's name (bind, for, if, controller, etc)
    * @param        {String}  varName   scope variable's name to bind
    */
  addWatcher(vnode, watcherName, varName) {
    //console.log(vnode, watcherName, varName);
    const $ = this;
    //const api = $.api;
    const state = $.state;
    const watchers = $.watchers;

    // initializate utility "pointers" to get the next state and watchers in the tree's building process
    let stateRef = state;
    let stateRefLessDeep = stateRef;
    let watchersRef = watchers;

    /******** split the varName  (e.g: "a.b.c.d") getting every inner property *******/
    const varNameSplit = varName.split(".");
    const splitLen = varNameSplit.length;

    // define current variable chaining state
    let currentVarChain = "";

    // for every property
    for(let i = 0; i < splitLen; i++) {
      // detect if it's the last inner property
      const isLast = i == (splitLen - 1);
      // get the inner property name  e.g : "b"
      const currentVar = varNameSplit[i];
      // get "_" notation property name
      const _currentVar = "_" + currentVar;
      // check if the property already exists in the state tree or in the watchers tree
      const exists = stateRef.hasOwnProperty(currentVar)
                     && stateRef.hasOwnProperty(_currentVar)
                     && watchersRef.hasOwnProperty(currentVar);

      // expand the chain with currentVar (e.g: if it was "a" now is "a.b")
      currentVarChain += (i == 0) ? currentVar : ("." + currentVar);

      // if it doesn't exist then build it
      if(!exists) {

         /*
          * Watchers initilization for the current inner property's name
          */
        Object.defineProperty(watchersRef, currentVar, {
          value: {},
          writable: true,
          enumerable: true,
          configurable: true
        });

        // get next watchers' reference
        const newWatchersRef = watchersRef[currentVar];

        // define the "watchers" properties (it will contains a key for each watcher (e.g "bind", "for", ...))
        Object.defineProperty(newWatchersRef, "watchers", {
          value: {},
          writable: false,
          enumerable: true
        });

         /*
          * State initilization for the current inner _property's name (with the "_" notation)
          */
        Object.defineProperty(stateRef, _currentVar, {
          value: {},
          writable: true,
          configurable: true,
          enumerable: true
        });

        // get next state' reference
        let newState = stateRef[_currentVar];

        // define the "value" properties (in the state's tree a variable value can contain other child variables)
        // this mechanism allows to chain variables
        Object.defineProperties(newState, {
          "value": {
            value: {},  //isLast ? undefined : {},
            writable: true,
            configurable: true,
            enumerable: true
          },
        });


        /** @type set
          * @type get
          * Define getter and setter for the current inner property
          */
        Object.defineProperty(stateRef, currentVar, {
          /** @type get
            * define a getter which bind its scope and return its value
            */
          get: function() {
            return this.value;
          }.bind(newState),


          /** @type get
            * define a getter which bind its scope and return its value
            */
          set: function(newVal) {
            const isObj = isObject(newVal);
            const isFunc = isFunction(newVal);

            // if new val is not an object
            if(!isObj || isFunc) {

              // if its watchers still exists (could be removed by an ancestor which overwrites it)
              if(this.watchersRef.watchers) {
                // destroy its childs' tree first and update their value to ""
                $.destroyChilds(this.state, this.watchersRef);
                // set the real variable state
                this.state.value = newVal;
                // notify the variable's changes to the DOM

                $.notifyChanges(this.currentVar, this.watchersRef.watchers, newVal);
              }
            }
            // if new val is an object
            else {
              // if it's an object, it need to check inside to update its childs' value
              $.checkAndNotifyChanges(this.state.value, newVal);
            }
          }.bind({ currentVar: currentVarChain, state: newState, watchersRef: newWatchersRef}),

          enumerable: true,
          configurable: true
        });

      } // end "exist" if

      // here the variable state already exists
      //stateRef[currentVar] = ""; // trigger blank at start (doesn't work because call controller not initializate yet)

      // update "pointers" reference
      stateRef = stateRef[_currentVar].value;
      if(!isLast) {
        stateRefLessDeep = stateRef;
      }
      watchersRef = watchersRef[currentVar];

    } // end for

    /*
     * Defines a new not-writable watcher' list if it doesn't exist yet. (e.g: "bind")
     * Here the watchersRef is the last (e.g: in "a.b.c.d", the reference is for "d" watchers)
     */
    if(!watchersRef.watchers.hasOwnProperty(watcherName)) {
      Object.defineProperty(watchersRef.watchers, watcherName, {
        value: [],
        writable: false,
        enumerable: true
      });
    }

    // push the vnode into his watcher' list (e.g: "bind")
    watchersRef.watchers[watcherName].push(vnode);
  }

}
