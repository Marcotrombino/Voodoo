/** An experimental SPA framework inspired by AngularJS, VueJS and React
 * @version: 0.1.0
 * @date: 2018-23-06
 * UPDATE AND DOCS AT: https://github.com/Marcotrombino/Voodoo
 * @copyright (C) 2018 Marco Trombino
 * @author: Marco Trombino
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see http://www.gnu.org/licenses.
 */

var Voodoo = (function (exports,window) {
  'use strict';

  /**
    * Array.includes polyfill
    * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes#Polyfill
    */
  if (![].includes) {
    Array.prototype.includes = function (searchElement /*, fromIndex*/) {

      var O = Object(this);
      var len = parseInt(O.length) || 0;
      if (len === 0) {
        return false;
      }
      var n = parseInt(arguments[1]) || 0;
      var k;
      if (n >= 0) {
        k = n;
      } else {
        k = len + n;
        if (k < 0) {
          k = 0;
        }
      }
      var currentElement;
      while (k < len) {
        currentElement = O[k];
        if (searchElement === currentElement || searchElement !== searchElement && currentElement !== currentElement) {
          return true;
        }
        k++;
      }
      return false;
    };
  }

  /**
    * Array.every polyfill
    * @see https://developer.mozilla.org/it/docs/Web/JavaScript/Reference/Global_Objects/Array/every
    */
  if (!Array.prototype.every) {
    Array.prototype.every = function (callbackfn, thisArg) {

      var T, k;

      if (this == null) {
        throw new TypeError("this is null or not defined");
      }

      // 1. Let O be the result of calling ToObject passing the this
      //    value as the argument.
      var O = Object(this);

      // 2. Let lenValue be the result of calling the Get internal method
      //    of O with the argument "length".
      // 3. Let len be ToUint32(lenValue).
      var len = O.length >>> 0;

      // 4. If IsCallable(callbackfn) is false, throw a TypeError exception.
      if (typeof callbackfn !== "function") {
        throw new TypeError();
      }

      // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
      if (arguments.length > 1) {
        T = thisArg;
      }

      // 6. Let k be 0.
      k = 0;

      // 7. Repeat, while k < len
      while (k < len) {

        var kValue;

        // a. Let Pk be ToString(k).
        //   This is implicit for LHS operands of the in operator
        // b. Let kPresent be the result of calling the HasProperty internal
        //    method of O with argument Pk.
        //   This step can be combined with c
        // c. If kPresent is true, then
        if (k in O) {

          // i. Let kValue be the result of calling the Get internal method
          //    of O with argument Pk.
          kValue = O[k];

          // ii. Let testResult be the result of calling the Call internal method
          //     of callbackfn with T as the this value and argument list
          //     containing kValue, k, and O.
          var testResult = callbackfn.call(T, kValue, k, O);

          // iii. If ToBoolean(testResult) is false, return false.
          if (!testResult) {
            return false;
          }
        }
        k++;
      }
      return true;
    };
  }

  var isString = function isString(arg) {
      return typeof arg === "string";
  };
  var isArray = function isArray(arg) {
      return Array.isArray(arg);
  };
  var isFunction = function isFunction(arg) {
      return typeof arg === "function";
  };
  //export const isObject = arg => arg === Object(arg);
  /*export const isObject = arg => {
      if (arg === null) { return false;}
      return ( (typeof arg === "function") || (typeof arg === "object") );
  };*/
  var isObject = function isObject(arg) {
      return arg === Object(arg) && Object.prototype.toString.call(arg) !== "[object Array]";
  };

  /**
    * @description  requestIdleCallback & cancelIdleCallback shim
    * @see          https://developers.google.com/web/updates/2015/08/using-requestidlecallback
    */

  var rIC = window.requestIdleCallback || function (cb) {
    var start = Date.now();
    return setTimeout(function () {
      cb({
        didTimeout: false,
        timeRemaining: function timeRemaining() {
          return Math.max(0, 50 - (Date.now() - start));
        }
      });
    }, 1);
  };

  /**
    * @description        requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
    * @see                http://paulirish.com/2011/requestanimationframe-for-smart-animating/
    * @see                http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
    */

  var rAF = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
    window.setTimeout(callback, 1000 / 60);
  };

  var classCallCheck = function (instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  };

  var createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  /** @namespace    Voodoo
    * @class        Scheduler
    * @description  A scheduler which batches DOM updates and executes them when the browser
    *               has free time at the end of the frame or when the user is inactive.
    *               This approach uses requestIdleCallback and requestAnimationFrame API
    *               to prevent "layout jank" caused by forced browser's reflow
    *
    *               Jobs can't be runned inside the idle callback because the free time
    *               could occures at the end of the frame (where style changes have already been applied)
                    causing layout calculations to be invalidated.
    *               For these reasons, when a job requests to be scheduled, the Scheduler put it on a queue
    *               and schedules it for the next idle time. When it happens the Scheduler
    *               request the next frame to run the job.
    *
    *               Usage:
    *                  <button id="trigger" onClick="add()">Add new text node</button>
    *                  <div id="container"></div>
    *
    *                  <script type="text/javascript">
    *                    var counter = 0;
    *                    const s = new Voodoo.Scheduler();
    *
    *                    var el = document.getElementById("trigger");
    *                    var job = function() {
    *                      el.appendChild(document.createTextNode("div " + (counter++)));
    *                    }
    *
    *                    var add = function() {
    *                      s.schedule(job.bind(this));
    *                    }
    *                  </script>
    *
    * @see            https://developers.google.com/web/updates/2015/08/using-requestidlecallback
    */

  var Scheduler = function () {
    function Scheduler() {
      classCallCheck(this, Scheduler);

      this.queue = [];
      this.scheduled = false;
    }

    /** @method       flush
      * @description  execute all jobs in the queue
      * @param        {function} job      the callback to execute
      */


    createClass(Scheduler, [{
      key: "flush",
      value: function flush() {
        var q = this.queue;

        // execute jobs with FIFO
        var job = void 0;while (job = q.shift()) {
          job();
        }this.scheduled = false;
      }
    }, {
      key: "scheduleFrameUpdate",
      value: function scheduleFrameUpdate() {
        rAF(this.flush.bind(this));
      }

      /** @method       schedule
        * @description  schedule a new job
        * @param        {function} job      the callback to execute
        */

    }, {
      key: "schedule",
      value: function schedule(job) {
        // push the job in the waiting queue
        this.queue.push(job);

        // if there isn't already a job scheduled
        if (!this.scheduled) {
          // schedule a frame update
          rIC(this.scheduleFrameUpdate.bind(this));
          this.scheduled = true;
        }
      }
    }]);
    return Scheduler;
  }();

  var scheduler = new Scheduler();

  var PREFIX = "voo-";

  // A directive is an indication to follow some roles
  var DIRECTIVES = {
    "app": PREFIX + "app",
    "view": PREFIX + "view",
    "ctrl": PREFIX + "controller",
    "cloak": PREFIX + "cloak"
  };

  // A watcher need to track data changes
  var WATCHERS = {
    "bind": PREFIX + "bind",
    "for": PREFIX + "for",
    "if": PREFIX + "if"
  };

  var EVENTS = {
    "click": PREFIX + "click",
    "mouseOver": PREFIX + "mouseover",
    "keyUp": PREFIX + "keyup"
  };

  /** @namespace    Voodoo
    * @class        Scope
    * @description  Describes a local scope injected into a Controller
    */

  var Scope = function () {

    /** @constructor Scope
      * @param        {Object}      subScope      initial scope state
      * @param        {Controller}  controller    controller's reference
      */
    function Scope(parentScope) {
      classCallCheck(this, Scope);

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


    createClass(Scope, [{
      key: "bindController",
      value: function bindController(ctrl) {
        this.controller = ctrl;
      }
    }, {
      key: "getChildScopeIndex",
      value: function getChildScopeIndex() {
        return this.childScopes.length;
      }
    }, {
      key: "addChildScope",
      value: function addChildScope(index, scope) {
        this.childScopes[index] = scope;
      }

      /** @method       notifyChildScopes
        * @description  Notifies variable's changes to childs' scope
        * @param        {Scope}   scope      current scope
        * @param        {String}  varName     variable's name to notify
        * @param        {String}  newVal      new variable's value
        */

    }, {
      key: "notifyChildScopes",
      value: function notifyChildScopes(scope, varName, newVal) {
        var _this = this;

        var childScopes = scope.childScopes;
        var childScopesLen = childScopes.length;
        var split = varName.split(".");
        var splitLen = split.length;

        var _loop = function _loop(i) {
          var stateRef = childScopes[i].state;

          var _loop2 = function _loop2(j) {
            if (stateRef[split[j]]) {
              if (j < splitLen - 1) {
                stateRef = stateRef[split[j]];
              } else {
                scheduler.schedule(function () {
                  stateRef[split[j]] = newVal;
                });
              }
            } else {
              if (childScopes[i].childScopes.length > 0) {
                _this.notifyChildScopes(childScopes[i], varName, newVal);
              }
              return "break";
            }
          };

          for (var j = 0; j <= splitLen; j++) {
            var _ret2 = _loop2(j);

            if (_ret2 === "break") break;
          }
        };

        for (var i = 0; i < childScopesLen; i++) {
          _loop(i);
        }
      }

      /** @method       notifyChanges
        * @description  Notifies all VNodes binded to a variable's name
        * @param        {String}  varName      the variable's name
        * @param        {Object}  watchers     list of watchers binded to varName
        * @param        {String}  newVal       new variable's value
        */

    }, {
      key: "notifyChanges",
      value: function notifyChanges(varName, watchers, newVal) {
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

    }, {
      key: "checkAndNotifyChanges",
      value: function checkAndNotifyChanges(state, newVal) {
        var stateKeys = Object.keys(state);
        var newValKeys = Object.keys(newVal);

        newValKeys.forEach(function (nv) {
          stateKeys.forEach(function (s) {
            // if property exists into the state, trigger its setter with the new value
            if (s === nv) {
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

    }, {
      key: "destroyChilds",
      value: function destroyChilds(rootState, watchersRef) {
        var $ = this;
        var root = rootState.value;
        var rootKeys = Object.keys(root);

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
        if (isObject(root) && rootKeys.length > 0) {
          // for each child name
          rootKeys.forEach(function (child) {
            // get the child value
            var nextChild = root[child].value;

            // if child's name is a "state object" (has the "_" prefix)
            if (child[0] === "_") {
              // if child value is an object (it means that child has own childs)
              if (isObject(nextChild)) {
                // traverse child
                $.updateChildsTree(nextChild);
              }
            } else {
              // the child's name is a getter&setter, so it needs to be called updating node value to an empty string
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

        Object.keys(watchersRef).forEach(function (child) {
          // remove every child except the parent watchers property
          if (child !== "watchers") watchersRef[child] = undefined; // triggering the Garbage collector instead of using use remove[prop]
        });
      }
    }, {
      key: "updateChildsTree",
      value: function updateChildsTree(root) {
        var $ = this;
        var rootKeys = Object.keys(root);

        // if the root state is an object and has some child to update
        if (isObject(root) && rootKeys.length > 0) {
          // for each child name
          rootKeys.forEach(function (child) {
            // get the child value
            var nextChild = root[child].value;

            // if child's name is a "state object" (has the "_" prefix)
            if (child[0] === "_") {
              // if child value is an object (it means that child has own childs)
              if (isObject(nextChild)) {
                // traverse child
                $.updateChildsTree(nextChild);
              }
            } else {
              // the child's name is a getter&setter, so it needs to be called updating node value to an empty string
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

    }, {
      key: "addWatcher",
      value: function addWatcher(vnode, watcherName, varName) {
        //console.log(vnode, watcherName, varName);
        var $ = this;
        //const api = $.api;
        var state = $.state;
        var watchers = $.watchers;

        // initializate utility "pointers" to get the next state and watchers in the tree's building process
        var stateRef = state;
        var watchersRef = watchers;

        /******** split the varName  (e.g: "a.b.c.d") getting every inner property *******/
        var varNameSplit = varName.split(".");
        var splitLen = varNameSplit.length;

        // define current variable chaining state
        var currentVarChain = "";

        // for every property
        for (var i = 0; i < splitLen; i++) {
          // get the inner property name  e.g : "b"
          var currentVar = varNameSplit[i];
          // get "_" notation property name
          var _currentVar = "_" + currentVar;
          // check if the property already exists in the state tree or in the watchers tree
          var exists = stateRef.hasOwnProperty(currentVar) && stateRef.hasOwnProperty(_currentVar) && watchersRef.hasOwnProperty(currentVar);

          // expand the chain with currentVar (e.g: if it was "a" now is "a.b")
          currentVarChain += i == 0 ? currentVar : "." + currentVar;

          // if it doesn't exist then build it
          if (!exists) {

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
            var newWatchersRef = watchersRef[currentVar];

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
            var newState = stateRef[_currentVar];

            // define the "value" properties (in the state's tree a variable value can contain other child variables)
            // this mechanism allows to chain variables
            Object.defineProperties(newState, {
              "value": {
                value: {}, //isLast ? undefined : {},
                writable: true,
                configurable: true,
                enumerable: true
              }
            });

            /** @type set
              * @type get
              * Define getter and setter for the current inner property
              */
            Object.defineProperty(stateRef, currentVar, {
              /** @type get
                * define a getter which bind its scope and return its value
                */
              get: function () {
                return this.value;
              }.bind(newState),

              /** @type get
                * define a getter which bind its scope and return its value
                */
              set: function (newVal) {
                var isObj = isObject(newVal);
                var isFunc = isFunction(newVal);

                // if new val is not an object
                if (!isObj || isFunc) {

                  // if its watchers still exists (could be removed by an ancestor which overwrites it)
                  if (this.watchersRef.watchers) {
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
              }.bind({ currentVar: currentVarChain, state: newState, watchersRef: newWatchersRef }),

              enumerable: true,
              configurable: true
            });
          } // end "exist" if

          // here the variable state already exists
          //stateRef[currentVar] = ""; // trigger blank at start (doesn't work because call controller not initializate yet)

          // update "pointers" reference
          stateRef = stateRef[_currentVar].value;
          watchersRef = watchersRef[currentVar];
        } // end for

        /*
         * Defines a new not-writable watcher' list if it doesn't exist yet. (e.g: "bind")
         * Here the watchersRef is the last (e.g: in "a.b.c.d", the reference is for "d" watchers)
         */
        if (!watchersRef.watchers.hasOwnProperty(watcherName)) {
          Object.defineProperty(watchersRef.watchers, watcherName, {
            value: [],
            writable: false,
            enumerable: true
          });
        }

        // push the vnode into his watcher' list (e.g: "bind")
        watchersRef.watchers[watcherName].push(vnode);
      }
    }]);
    return Scope;
  }();

  /** @namespace    Voodoo
    * @class        Http
    * @description  Describes an HTTP module which can be used to do get, post, put and remove requests
    *               to an entry point. It also provides chaining methods and parsing system for JSON responses
    */

  var Http = function () {
    function Http() {
      classCallCheck(this, Http);

      this.config = {
        contentType: "application/x-www-form-urlencoded"
      };
    }

    createClass(Http, [{
      key: "parse",
      value: function parse(req) {
        var result = void 0;
        try {
          result = JSON.parse(req.responseText);
        } catch (e) {
          result = req.responseText;
        }
        return [result, req];
      }
    }, {
      key: "xhr",
      value: function xhr(type, url, data) {
        var $ = this;

        var methods = {
          success: function success() {},
          error: function error() {},
          always: function always() {}
        };

        var XHR = window.XMLHttpRequest || window.ActiveXObject;

        var request = new XHR("MSXML2.XMLHTTP.3.0");
        request.open(type, url, true);

        request.setRequestHeader("Content-type", this.config.contentType);
        request.onreadystatechange = function () {
          var req;
          if (request.readyState === 4) {
            // DONE
            req = $.parse(request);
            if (request.status >= 200 && request.status < 300) {
              methods.success.apply(methods, req);
            } else {
              methods.error.apply(methods, req);
            }
            methods.always.apply(methods, req);
          }
        };
        request.send(data);

        var VoodooXHR = {
          success: function success(callback) {
            methods.success = callback;
            return VoodooXHR;
          },
          error: function error(callback) {
            methods.error = callback;
            return VoodooXHR;
          },
          always: function always(callback) {
            methods.always = callback;
            return VoodooXHR;
          }
        };

        return VoodooXHR;
      }
    }, {
      key: "get",
      value: function get$$1(src) {
        return this.xhr("GET", src);
      }
    }, {
      key: "put",
      value: function put(url, data) {
        return this.xhr("PUT", url, data);
      }
    }, {
      key: "post",
      value: function post(url, data) {
        return this.xhr("POST", url, data);
      }
    }, {
      key: "delete",
      value: function _delete(url) {
        return this.xhr("DELETE", url);
      }
    }, {
      key: "setContentType",
      value: function setContentType(value) {
        this.config.contentType = value;
      }
    }]);
    return Http;
  }();

  /** @namespace    Voodoo
    * @class        LocalStorage
    * @description  Provides a simple API for HTML5 local storage
    */

  var LocalStorage = function () {
    function LocalStorage() {
      classCallCheck(this, LocalStorage);

      this.storage = window.localStorage;
    }

    /** @method       set
      * @description  Set a local storage's item
      * @param        {String}    key        the item's key
      * @param        {any}       value      the item's value
      * @param        {boolean}   check      prevent overwriting if the item already exists
      */


    createClass(LocalStorage, [{
      key: "set",
      value: function set$$1(key, value, check) {
        var val = value;
        if (isObject(value) && !isFunction(value)) {
          val = JSON.stringify(value);
        }

        if (!check) {
          this.storage.setItem(key, val);
        } else {
          if (!this.get(key)) {
            this.storage.setItem(key, val);
          }
        }
      }

      /** @method       get
        * @description  Get a local storage's item
        * @param        {String}    key        the item's key
        * @return       {any}
        */

    }, {
      key: "get",
      value: function get$$1(key) {
        var val = this.storage.getItem(key);
        if (val) {
          try {
            val = JSON.parse(val);
          } catch (e) {}
          return val;
        } else return null;
      }

      /** @method       remove
        * @description  Remove a local storage's item
        * @param        {String}    key        the item's key
        */

    }, {
      key: "remove",
      value: function remove(key) {
        if (this.get(key) !== null) {
          this.storage.removeItem(key);
        }
      }
    }]);
    return LocalStorage;
  }();

  var Modules = function () {
    function Modules() {
      classCallCheck(this, Modules);

      this.modules = {};
    }

    createClass(Modules, [{
      key: "defineModule",
      value: function defineModule(moduleName, mod) {
        if (!this.modules.hasOwnProperty(moduleName)) {
          this.modules[moduleName] = mod;
        }
      }
    }]);
    return Modules;
  }();

  var modules = new Modules();
  modules.defineModule("$http", new Http());
  modules.defineModule("$localStorage", new LocalStorage());

  /** @namespace    Voodoo
    * @class        Injector
    * @description  A Dependency injection module which lets register new dependencies
    *               and get them as function parameters
    *               N.B: It requires the needed components twice (as array and as function parameters)
    *               and they can't be mixed in the parameter order.
    *               The additional custom parameters are always after the dependencies.
    *
    *               Usage:
    *                 const d = new Injector();
    *                 d.register("Printer", function(string) {
    *                   console.log(string);
    *                 });
    *
    *                 const myprinter = d.resolve(["Printer"], function(print, word) {
    *                   print(word);
    *                 });
    *
    *                 myprinter("hello world!");  // hello world!
    *
    * @see          http://krasimirtsonev.com/blog/article/Dependency-injection-in-JavaScript
    */
  var Injector = function () {
    function Injector(dependencies) {
      classCallCheck(this, Injector);

      this.dependencies = dependencies;
      /*
      Object.defineProperty(this, "dependencies", {
        value: {},
        writable: false
      });
      */
    }

    /** @method       register
      * @description  register a new dependency
      * @param        {String} key        new dependency's name
      * @param        {any}    value      the dependency's value
      */


    createClass(Injector, [{
      key: "register",
      value: function register(key, value) {
        this.dependencies[key] = value;
        /*
        Object.defineProperty(this.dependencies, key, {
          value: value,
          writable: false
        });
        */
      }

      /** @method resolve
        * @description  resolve a dependency name
        * @param        {Array}     deps        required dependencies
        * @param        {function}  func        the function where apply dependencies
        * @param        {Object}    scope [opt] the function's scope
        */

    }, {
      key: "resolve",
      value: function resolve(deps, func, scope) {
        // prepare new function parameters
        var args = [];

        // loop through required dependencies
        for (var i = 0, len = deps.length; i < len; i++) {
          var d = deps[i];
          // find required dependency in the injector's repository
          var depFound = this.dependencies[d];
          if (depFound) {
            // add the dependency to args
            args.push(depFound);
          } else throw new Error("Can't resolve " + d);
        }

        // return a function with "args" applied
        return function () {
          func.apply(scope || {}, args.concat(Array.prototype.slice.call(arguments, 0)));
        };
      }
    }]);
    return Injector;
  }();

  /** @namespace    Voodoo
    * @class        Controller
    * @description  Manages modules dependency and apply DOM changes (produced by change detection)
    */

  var Controller = function () {

    /** @constructor Controller
      * @param       {String} name   controller name
      * @param       {Scope} scope   local scope, produced by Parser
      *                 A controller interacts with the model (Scope) and produce DOM changes
      */
    function Controller(name, scope) {
      classCallCheck(this, Controller);

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


    createClass(Controller, [{
      key: "defineLocalInjector",
      value: function defineLocalInjector(scope) {
        /* bind the local scope with this controller
         * Scope interact with controller sending list of changes to apply, so it needs to know its controller
         */
        scope.bindController(this);

        // create a new Injector with all Voodoo modules (Http, LocalStorage, etc)
        var inj = new Injector(modules.modules);

        // register a new module called "$scope" using the passed local scope
        //inj.register("$scope", scope.api);
        inj.register("$scope", scope.state);
        this.injector = inj;
      }

      /** @constructor run
        * @param       {Array} deps      list of modules to inject into controller
        * @param       {Function} func   the controller callback which manage all view
        */

    }, {
      key: "run",
      value: function run(deps, func) {
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

    }, {
      key: "compile",
      value: function compile(varName, changes, newVal) {

        // for each watcher
        Object.keys(changes).forEach(function (watcherName) {
          // list of VNodes
          var watcher = changes[watcherName];
          var watcherLen = watcher.length;

          /* for each VNode call its render passing the watcher's name and the new value
           * VNodes contains internally all watcher binded to itself.
           * When render() is called passing the watcher name, the VNode can determines what it has to change
           */
          for (var i = 0; i < watcherLen; i++) {
            watcher[i].render(varName, watcherName, newVal);
          }
        });
      }
    }]);
    return Controller;
  }();

  /** @namespace    Voodoo
    * @class        Context
    * @description  Describes an execution context made of a controller and its local scope
    */

  var Context = function () {

    /** @constructor Context
      * @param       {Object} controllerSettings     controller configuration
      *                         {
      *                             name {String}:      controllerName
      *                             modules {Array}:    ["module1", "module2", ...]
      *                             caller {Function}:  controller callback
      *                         }
      * @param       {Scope} scope   local scope
      */
    function Context(controllerSettings, scope) {
      classCallCheck(this, Context);

      // set controller to null to wait document loading
      this.controller = null;
      this.controllerSettings = controllerSettings;
      this.scope = scope;

      this.init();
    }

    /** @method       init
      * @description  Initializes controller with its settings and its local scope
      */


    createClass(Context, [{
      key: "init",
      value: function init() {
        var ctrlSettings = this.controllerSettings;

        // create a new controller
        this.controller = new Controller(ctrlSettings.name, this.scope);

        // run the caller with modules dependency
        this.controller.run(ctrlSettings.modules, ctrlSettings.caller);
      }
    }]);
    return Context;
  }();

  var VNode = function () {
    function VNode(parser, parentScope, DOMRef, type, rawAttributes, directives, options) {
      classCallCheck(this, VNode);

      this.parser = parser;

      this.parentScope = parentScope;
      this.childScopesIndex = null;
      this.scope = null;

      this.DOMRef = DOMRef;
      this.type = type;
      this.rawAttributes = rawAttributes;
      this.directives = directives;
      this.options = options;
      this.children = [];
    }

    createClass(VNode, [{
      key: "addChild",
      value: function addChild(vnode) {
        this.children.push(vnode);
      }

      /** @method       forChange
        * @description  Generates a collection of items received through "newVal" and renders them
        *               into the DOM starting from the childrens' tree template.
        *               A for represents an individual scope made by the parser and it can interact with
        *               its parent scope to receive new data. An inner scope can't send its state to the parent,
        *               which can send its updates through its childs' scope
        * @param        {HTMLNode}    node        the DOM node's reference
        * @param        {String}  varName     the variable name which triggered the change
        * @param        {String}  watcherName the name of watcher
        * @param        {any}     newVal      the new variable's value render into the node
        */

    }, {
      key: "forChange",
      value: function forChange(node, varName, watcherName, newVal) {
        var _this = this;

        var doc = this.parser.document;
        var DOMRef = this.DOMRef;

        /* the for loop initialize a new scope based on template variables.
           Template variables may be "item." variables, rendered directly by the new for scope,
           or variables which are not "item." and they stand out from the for scope.
           In this case, for scope needs to know which variables it has to require to its parent scope
        */
        var requireList = [];

        // create a new scope connecting it with its parent scope
        this.scope = new Scope(this.parentScope);
        var scope = this.scope;

        // if the new scope hasn't an index in the "childsScope" parent array
        if (this.childScopesIndex === null) {
          // get an unique ID
          this.childScopesIndex = this.parentScope.getChildScopeIndex();
        }

        // add new scope into parent childsScope at specific index
        // this approach prevents to put new scope into parent multiple times
        this.parentScope.addChildScope(this.childScopesIndex, scope);

        // get vnode childrens
        var childs = this.children;
        var childsLen = childs.length;

        // if new value is an array of all objects
        if (isArray(newVal) && newVal.every(function (item) {
          return isObject(item);
        })) {
          var newValLen = newVal.length;
          var itemName = this.options.forStatement.item;
          var template = this.options.forStatement.template;

          // create a fragment away from DOM to prevent layout computations
          var frag = doc.createDocumentFragment();

          // for each row of newVal
          newVal.forEach(function (row, index) {
            // for each vnode children
            for (var i = 0; i < childsLen; i++) {
              // create a new DOM node starting from the children[i] subtree
              var rowNode = _this.buildForRow(childs[i], itemName, index, doc, requireList);
              // parse the rowNode and build the new scope based on it
              _this.parser.buildScope(rowNode, scope, false, -1);
              // append the rowNode to the fragment
              frag.appendChild(rowNode);
            }
          });

          var requireListLen = requireList.length;

          /* Require an unknown scope's variable to scope ancestors
             and set the scope variable with the found variable in ancestors
          */
          var requireParentVar = function requireParentVar(parentScope, scope) {
            // for every variable in the require list
            for (var i = 0; i < requireListLen; i++) {
              var currentVar = requireList[i];
              var parentStateRef = parentScope.state;
              var scopeRef = scope;

              // split the variable chain "a.b.c....."
              var split = currentVar.split(".");
              var splitLen = split.length;

              // rewire the chain looking into parent's scope
              for (var j = 0; j < splitLen; j++) {
                var currSplit = split[j];
                if (parentStateRef[currSplit] && scopeRef[currSplit]) {
                  if (j < splitLen - 1) {
                    parentStateRef = parentStateRef[currSplit];
                    scopeRef = scopeRef[currSplit];
                  } else {
                    // if the chain is been rewired, assign the parent's scope variable to scope
                    scopeRef[currSplit] = parentStateRef[currSplit];
                  }
                } else {
                  // if the parent hasn't the required variable
                  // if the parent has a parent, traverse it again
                  if (parentScope.parentScope !== null) {
                    requireParentVar(parentScope.parentScope, scope);
                  }
                  // otherwise exit: variable doesn't exist in the scope hierarchy
                  break;
                }
              }
            }
          };

          /* Create an execution context for the for loop with the created scope and a new own controller
           */
          var createForContext = function () {
            var $ = this;
            this.options.forStatement.context = new Context({
              name: "forController",
              // the new controller will need only the $scope module
              modules: ["$scope"],
              // the new controller called has to update "item." and requireList variables with newVal row's data
              caller: function caller($scope) {
                // require unknown variables from requireList
                requireParentVar($.parentScope, $scope);

                // update known variables ("item.") directly from newVal row's data
                for (var k = 0; k < newValLen; k++) {
                  $scope[itemName + k] = newVal[k];
                }
              }
            }, scope);
          }.bind(this);

          /* Schedule a DOM update to push generated collection of DOM nodes into "voo-for" wrapper
           */
          scheduler.schedule(function () {
            this.node.innerHTML = "";this.node.appendChild(this.changes);
            createForContext();
            this.parser.removeCloak(this.node, DIRECTIVES.cloak);
          }.bind({ node: DOMRef, changes: frag, parser: this.parser }));
        } // end if valid
      }

      /** @method       buildForRow
        * @description  Builds a for loop's row with the for template.
        *               It traverse a vnode and its childrens building a copy with new real DOM nodes
        *               Replacing all {{variable}} with newVal row's data and replacing "item." prefix with
        *               an indexed one ("item0.", "item1", ...)
        * @param        {VNode}   vnode       the vnode to traverse
        * @param        {String}  itemName    the for loop "item" label
        * @param        {Number}  index       the row's index
        * @param        {Object}  doc         the window.document reference to build new DOM nodes
        * @param        {Array}   requireList the requireList where to put unknown variables
        * @return       {HTMLNode}    nodeClone
        */

    }, {
      key: "buildForRow",
      value: function buildForRow(vnode, itemName, index, doc, requireList) {
        // create a DOM node clone for the virtual one
        var nodeClone = null;
        var type = vnode.type;

        // if the vnode type is not TEXT (every other element type)
        if (type !== "TEXT") {
          // create a node clone based on vnode type
          nodeClone = doc.createElement(vnode.type);

          // for each vnode raw attributes
          var vnodeAttributes = vnode.rawAttributes || [];
          for (var i = 0; i < vnodeAttributes.length; i++) {
            var attr = vnodeAttributes[i];
            var attrName = attr.name;
            var attrValue = attr.value;

            var isWatcher = this.parser.isWatcher(attrName);
            var isEvent = this.parser.isEvent(attrName);

            // check if the attribute name is a watcher or event label
            if (isWatcher || isEvent) {
              // if the label is a "for" label
              if (isWatcher === "for") {
                // split the attribute's value into for statements and split the "collection" token into "." chain
                var tokens = attrValue.split("in");
                var split = tokens[1].split(".");

                // if the first element of the chain is the itemName
                // rename it with an indexed one based on row's data index
                if (split[0].replace(/\s/g, "") === itemName) {
                  split[0] = itemName + index;
                  // rewire the for statement with the changes
                  attrValue = tokens[0] + "in " + split.reduce(function (a, b) {
                    return a.concat(".", b);
                  });
                }
                // else: nothing. Nested for inherit state from parent
              }
              // if it's not a for label
              else {
                  // split the attribute's value into "." chain
                  var _split = attrValue.split(".");
                  // if the first element of the chain is the itemName
                  // rename it with an indexed one based on row's data index
                  if (_split[0].replace(/\s/g, "") === itemName) {
                    _split[0] = itemName + index;
                    attrValue = _split.reduce(function (a, b) {
                      return a.concat(".", b);
                    });
                  }
                  // otherwise add the unknow variable to require list
                  else {
                      // replace () for event labels
                      var attrV = isEvent ? attrValue.replace("()", "") : attrValue;

                      if (!requireList.includes(attrV)) requireList.push(attrV);
                    }
                }
            }
            // set the nodeClone attribute with the new indexed attribute's value
            nodeClone.setAttribute(attrName, attrValue);
          }
        }
        // if it's a TEXT label
        else {
            // compile it's node value with indexed label and add unknown variables to requireList
            var compiled = this.compileForTextNode(vnode.DOMRef.nodeValue, itemName, index, requireList);
            // create a text node clone from the compiled value
            nodeClone = doc.createTextNode(compiled);
          }

        var childs = vnode.children;
        // for each vnode children
        for (var _i = 0; _i < childs.length; _i++) {
          // append its node clone tree to current clone node
          nodeClone.appendChild(this.buildForRow(childs[_i], itemName, index, doc, requireList));
        }

        // return the node clone
        return nodeClone;
      }

      /** @method       compileForTextNode
        * @description  Compiles a text node with indexed item prefix in {{variable}} notation.
        *               Adds unknown variables into require list
        * @param        {String}   nodeValue       the text value
        * @param        {String}   itemName    the for loop "item" label
        * @param        {Number}  index       the row's index
        * @param        {Array}   requireList the requireList where to put unknown variables
        * @return       {String}    the compiled text value
        */

    }, {
      key: "compileForTextNode",
      value: function compileForTextNode(nodeValue, itemName, index, requireList) {
        return nodeValue.replace(/{{[ ]*(.+?)[ ]*}}/g, function (pattern, match) {
          var split = match.split(".");
          if (split[0].replace(/\s/g, "") === itemName) {
            split[0] = itemName + index;
          } else {
            var varName = split.reduce(function (a, b) {
              return a.concat(".", b);
            });
            requireList.push(varName);
          }
          return "{{" + split.reduce(function (a, b) {
            return a.concat(".", b);
          }) + "}}";
        });
      }

      /** @method       bindChange
        * @description  Apply new variable's value to DOM node based on its type
        * @param        {HTMLNode}    node        the DOM node's reference
        * @param        {String}  varName     the variable name which triggered the change
        * @param        {String}  watcherName the name of watcher
        * @param        {any}     newVal      the new variable's value render into the node
        * @return       {String}    the compiled text value
        */

    }, {
      key: "bindChange",
      value: function bindChange(node, varName, watcherName, newVal) {
        var _this2 = this;

        switch (this.type) {
          case "TEXT":
            scheduler.schedule(function () {
              var textStatement = _this2.options.textStatement;
              var state = textStatement.state;
              var mask = textStatement.mask;

              state[varName] = newVal;

              node.nodeValue = mask.replace(/{{[ ]*(.+?)[ ]*}}/g, function (pattern, match) {
                return state[match];
              });
            });
            break;
          case "INPUT":
          case "TEXTAREA":
            scheduler.schedule(function () {
              node.value = newVal;
            });
            break;
          case "IMG":
            scheduler.schedule(function () {
              node.src = newVal;
            });
            break;
          default:
            scheduler.schedule(function () {
              node.innerHTML = newVal;
            });
        }
      }

      /** @method       ifChange
        * @description  Show or hide a DOM node based on variable's value
        * @param        {HTMLNode}    node        the DOM node's reference
        * @param        {String}  varName     the variable name which triggered the change
        * @param        {String}  watcherName the name of watcher
        * @param        {any}     newVal      the new variable's value render into the node
        * @return       {String}    the compiled text value
        */

    }, {
      key: "ifChange",
      value: function ifChange(node, varName, watcherName, newVal) {
        var ifStatement = this.options.ifStatement;
        ifStatement.state = newVal;

        if (ifStatement.state && ifStatement.state !== null) {
          console.log("si deve vedere", ifStatement.state);
          scheduler.schedule(function () {
            node.removeAttribute(DIRECTIVES.cloak);
          });
        } else {
          console.log("si deve nascondere");
          scheduler.schedule(function () {
            node.setAttribute(DIRECTIVES.cloak, "");
          });
        }
      }
    }, {
      key: "clickChange",
      value: function clickChange(node, varName, eventName, newVal) {
        node.addEventListener("click", newVal.bind(node));
      }
    }, {
      key: "mouseOverChange",
      value: function mouseOverChange(node, varName, eventName, newVal) {
        console.log("MOUSEOVER", node, varName, eventName, newVal);
        node.addEventListener("mouseover", newVal.bind(node));
      }
    }, {
      key: "keyUpChange",
      value: function keyUpChange(node, varName, eventName, newVal) {
        console.log("KEYUP", node, varName, eventName, newVal);
        node.addEventListener("keyup", newVal.bind(node));
      }
    }, {
      key: "render",
      value: function render(varName, watcherName, newVal) {
        if (this.directives.includes(watcherName)) {
          var changer = this[watcherName + "Change"];

          if (isFunction(changer)) {
            changer.apply(this, [this.DOMRef, varName, watcherName, newVal]);
          }
        }
      }
    }]);
    return VNode;
  }();

  /** @namespace    Voodoo
    * @class        Parser
    * @description  Parses DOM tree and builds local scopes for given controllers
    */

  var Parser = function () {

    /** @constructor Parser
      * @description Assign null value to document and root until document get fully loaded
      */
    function Parser() {
      classCallCheck(this, Parser);

      this.coreRef = null;
      this.document = null;
      this.root = null;
      this.view = null;
    }

    /** @method       init
      * @description  Called by Voodoo's main class after document loading.
      *               It finds the root node from which starts to traverse
      */


    createClass(Parser, [{
      key: "init",
      value: function init(core) {
        this.coreRef = core;
        this.document = window.document;
        this.root = this.findRootNode();
        this.view = this.findViewNode();
      }

      /** @method       queryAttr
        * @description  return the correct syntax to look for an attribute with querySelector
        * @return {String}
        */

    }, {
      key: "queryAttr",
      value: function queryAttr(name, value) {
        var val = value ? "=" + value : "";
        return "[" + name + val + "]";
      }

      /** @method       isDirective
        * @description  Determines if the given attribute is a directive or not
        *               A directive is an indication to follow some roles
        * @return {String|Null} returns the corresponding directive name (e.g. without "voo"- prefix)
        */

    }, {
      key: "isDirective",
      value: function isDirective(attrName) {
        var keys = Object.keys(DIRECTIVES);
        for (var i = 0; i < keys.length; i++) {
          if (DIRECTIVES[keys[i]] === attrName) {
            return keys[i];
          }
        }
        return null;
      }

      /** @method       isWatcher
        * @description  Determines if the given attribute is a watcher or not
        *               A watcher need to track data changes
        * @return {String|Null} returns the corresponding watcher name (e.g. without "voo"- prefix)
        */

    }, {
      key: "isWatcher",
      value: function isWatcher(attrName) {
        var keys = Object.keys(WATCHERS);
        for (var i = 0; i < keys.length; i++) {
          if (WATCHERS[keys[i]] === attrName) {
            return keys[i];
          }
        }
        return null;
      }

      /** @method       isEvent
        * @description  Determines if the given attribute is a event or not
        * @return {String|Null} returns the corresponding eveny name (e.g. without "voo"- prefix)
        */

    }, {
      key: "isEvent",
      value: function isEvent(attrName) {
        var keys = Object.keys(EVENTS);
        for (var i = 0; i < keys.length; i++) {
          if (EVENTS[keys[i]] === attrName) {
            return keys[i];
          }
        }
        return null;
      }

      /** @method       isForStatement
        * @description  Determines if the given for statement is valid ("item in collection")
        */

    }, {
      key: "isForStatement",
      value: function isForStatement(attrName) {
        return (/[\w\s]*in[\s]+[\w]+/.test(attrName)
        );
      }

      /** @method       resolveInterpolation
        * @description  Returns an array with variables name inside {{variable}} notation
        */

    }, {
      key: "resolveInterpolation",
      value: function resolveInterpolation(text) {
        var match = text.match(/{{\s*[\w.]+\s*}}/g);
        return match ? match.map(function (x) {
          return x.match(/[\w.]+/)[0];
        }) : [];
      }

      /** @method       findRootNode
        * @description  Finds the root node from which starts to traverse ("voo-app" attribute)
        * @return {Node} DOM node
        */

    }, {
      key: "findRootNode",
      value: function findRootNode() {
        return this.document.querySelector(this.queryAttr(DIRECTIVES.app));
      }

      /** @method       findViewNode
        * @description  Finds the view node where to put router's templates
        * @return {Node} DOM node
        */

    }, {
      key: "findViewNode",
      value: function findViewNode() {
        return this.root.querySelector(this.queryAttr(DIRECTIVES.view));
      }

      /** @method       loadView
        * @param {String} templateUrl   the template filename
        * @description  Request the template source code from template's filename and puts it into <view>
        */

    }, {
      key: "loadView",
      value: function loadView(templateUrl) {
        var $ = this;
        if ($.view) {
          modules.modules["$http"].get(templateUrl).success(function (data) {
            $.view.innerHTML = data;
            $.parseNode($.view);
          }).error(function (data) {
            console.error(data, "Cannot find " + templateUrl);
          });
        } //else {
        //$.parsePage();
        //}
      }
    }, {
      key: "parseApp",
      value: function parseApp() {
        var root = this.root;
        if (root) {
          this.parseNode(root);
        }
      }

      /** @method       parsePage
        * @description  Parse whole page starting from root node
        */

    }, {
      key: "parseNode",
      value: function parseNode(node) {
        var $ = this;
        var rootNode = node;
        if (rootNode) {
          var controllers = rootNode.querySelectorAll(this.queryAttr(DIRECTIVES.ctrl));
          controllers.forEach(function (ctrl) {
            var ctrlName = ctrl.getAttribute(DIRECTIVES.ctrl);
            var scope = $.parseController(ctrl);
            $.coreRef.createNewContext(ctrlName, scope);
          });

          this.removeCloak(this.root, DIRECTIVES.cloak);
        }
      }
    }, {
      key: "removeCloak",
      value: function removeCloak(node, cloak) {
        if (node.nodeType === 1 && !node.hasAttribute(WATCHERS.if)) {
          var childs = node.children;
          var childsLen = childs.length;
          for (var i = 0; i < childsLen; i++) {
            this.removeCloak(childs[i], cloak);
          }
          scheduler.schedule(function () {
            node.removeAttribute(cloak);
          });
        }
      }

      /** @method       parseController
        * @description  Parses a DOM sub-tree for a given controller's name
        * @return {Scope} local scope for the given controller name
        */

    }, {
      key: "parseController",
      value: function parseController(target) {
        var app = this.root;

        // get the root node for given controller name
        //const target = app.querySelector(this.queryAttr(DIRECTIVES.ctrl, ctrlName));
        //console.log(target);

        // create an empty scope
        var scope = new Scope(null);

        // find directives and fill the scope traversing the "target" subtree
        this.buildScope(target, scope, false, -1);
        return scope;
      }
    }, {
      key: "buildScope",
      value: function buildScope(node, scope, hasParentLoop, childControllers) {
        //console.log(node, scope, hasParentLoop, childControllers);
        if (!this.ignorableNode(node) && childControllers <= 0) {

          var tagName = this.getTagName(node);
          var labelsMap = tagName === "TEXT" ? this.getTextLabelsMap(node) : this.getElementLabelsMap(node, scope);

          if (tagName !== "TEXT" && node.hasAttribute(DIRECTIVES.ctrl)) {
            childControllers++;
          }

          var options = labelsMap.options;
          var labels = labelsMap.labels;
          var labelsName = Object.keys(labels);
          var rawAttributes = node.attributes;

          var vnode = new VNode(this, scope, node, tagName, rawAttributes, labelsName, options);

          var childs = node.childNodes;
          var childsLen = childs.length;

          if (!hasParentLoop) {
            // add a watcher to current VNode for every not-empty watcher
            for (var i = 0; i < labelsName.length; i++) {
              var lname = labelsName[i];
              var label = labels[lname];
              var len = label.length;
              //console.log(lname, label, len);
              for (var j = 0; j < len; j++) {
                var varName = label[j];
                scope.addWatcher(vnode, lname, varName);
              }
            }
            hasParentLoop = labelsName.includes("for");
          }

          for (var _i = 0; _i < childsLen; _i++) {
            if (!this.ignorableNode(childs[_i])) {
              vnode.addChild(this.buildScope(childs[_i], scope, hasParentLoop, childControllers));
            }
          }

          return vnode;
        }
      }

      /** @method       getTagName
        * @description  get the tagname for given DOM node
        * @param  {Node}  node    given node
        * @return {String}
        */

    }, {
      key: "getTagName",
      value: function getTagName(node) {
        return node.tagName ? node.tagName.toUpperCase() : "TEXT";
      }

      /** @method       ignorableNode
        * @description  Determines if the given node is ignorable or not.
        *               Comment nodes and text node with all whitespaces are ignorable
        * @param  {Node}  node    given node
        * @return {boolean}
        */

    }, {
      key: "ignorableNode",
      value: function ignorableNode(node) {
        return node.nodeType == 8 || // A comment node
        node.nodeType == 3 && !/[^\t\n\r ]/.test(node.textContent); // a text node, all ws
      }

      /** @method       getElementForWatcherMap
        * @description  Add "for" watcher label's information into element labels' map
        * @param  {HTMLNode}  node    given node
        * @param  {Object}    map     given node labels' map
        * @param  {String}    value   watcher value (attribute's value)
        */

    }, {
      key: "getElementForWatcherMap",
      value: function getElementForWatcherMap(node, map, value) {
        // check for statement
        var isFor = this.isForStatement(value);

        if (isFor) {
          var tokens = value.replace(/\s/g, "").split("in");
          var item = tokens[0];
          var collection = tokens[1];
          var forStatement = { item: item, collection: collection };

          if (!map.labels.hasOwnProperty("for")) {
            map.labels.for = [];
          }

          map.labels["for"].push(forStatement.collection);
          map.options.forStatement = { item: forStatement.item, template: node.innerHTML };
        } else {
          console.error("formato sbagliato", value);
        }
      }
    }, {
      key: "getElementIfWatcherMap",
      value: function getElementIfWatcherMap(node, map, value) {
        if (!map.labels.hasOwnProperty("if")) {
          map.labels.if = [];
        }

        scheduler.schedule(function () {
          node.setAttribute(DIRECTIVES.cloak, "");
        });
        map.labels["if"].push(value);
        map.options.ifStatement = { state: null };
      }

      /** @method       getElementWatchersMap
        * @description  Add watcher labels' information into element labels' map
        * @param  {HTMLNode}  node        given node
        * @param  {Object}    map         given node labels' map
        * @param  {String}    watcherName given node watcher's name
        * @param  {String}    value       watcher value (attribute's value)
        */

    }, {
      key: "getElementWatchersMap",
      value: function getElementWatchersMap(node, map, watcherName, value) {
        switch (watcherName) {
          case "for":
            this.getElementForWatcherMap(node, map, value);
            break;
          case "if":
            this.getElementIfWatcherMap(node, map, value);
            break;
          default:
            if (!map.labels.hasOwnProperty(watcherName)) {
              map.labels[watcherName] = [];
            }
            map.labels[watcherName].push(value);
        }
      }

      /** @method       getElementEventsMap
        * @description  Add event labels' information into element labels' map
        * @param  {HTMLNode}  node        given node
        * @param  {Object}    map         given node labels' map
        * @param  {String}    eventName   given node event's name
        * @param  {String}    value       event value (attribute's value)
        */

    }, {
      key: "getElementEventsMap",
      value: function getElementEventsMap(node, map, eventName, value) {
        if (!map.labels.hasOwnProperty(eventName)) {
          map.labels[eventName] = [];
        }
        if (/(.+?\(\))/.test(value)) {
          var funcName = value.replace(/\s/g, "").replace("()", "");
          map.labels[eventName].push(funcName);
        }
      }

      /** @method       getElementEventsMap
        * @description  Add text node binding information into element label's map
        * @param  {HTMLNode}  node        given node
        */

    }, {
      key: "getTextLabelsMap",
      value: function getTextLabelsMap(node) {
        var map = { labels: {}, options: {} };

        var binding = this.resolveInterpolation(node.nodeValue);
        //console.log(binding);
        var len = binding.length;

        if (len > 0) {
          map.labels.bind = [];
          map.options.textStatement = { state: {}, mask: node.nodeValue };
        }

        for (var i = 0; i < len; i++) {
          map.labels.bind.push(binding[i]);
          map.options.textStatement.state[binding[i]] = undefined;
        }

        return map;
      }

      /** @method       getElementEventsMap
        * @description  Add element labels' information into element labels' map
        * @param  {HTMLNode}  node        given node
        */

    }, {
      key: "getElementLabelsMap",
      value: function getElementLabelsMap(node) {
        var map = { labels: {}, options: {} };

        // if element has attributes
        if (node.attributes) {
          var attributes = node.attributes;
          var len = attributes.length;

          for (var i = 0; i < len; i++) {
            var attr = attributes[i];
            var watcherName = this.isWatcher(attr.name);
            var eventName = this.isEvent(attr.name);
            var value = attr.value;

            // if the attribute is a Watcher
            if (watcherName && value !== "") {
              this.getElementWatchersMap(node, map, watcherName, value);
            } else if (eventName && value !== "") {
              this.getElementEventsMap(node, map, eventName, value);
            }
          }
        }

        return map;
      }
    }]);
    return Parser;
  }();

  var parser = new Parser();

  var Router = function () {
    function Router(core, routes, defaultRoute) {
      classCallCheck(this, Router);

      this.core = core;
      this.routes = routes;
      this.default = defaultRoute;
      this.location = window.location;
      this.goTo();
      window.addEventListener("hashchange", this.goTo.bind(this));
    }

    createClass(Router, [{
      key: "goTo",
      value: function goTo() {
        var path = this.location.hash.slice(1) || "/";

        if (this.routes.hasOwnProperty(path)) {
          this.core.load(this.routes[path]);
        } else {
          this.core.load(this.default.template);
        }
      }
    }]);
    return Router;
  }();

  /** @namespace    Voodoo
    * @class        Voodoo
    * @description  Voodoo's core
    */

  var Voodoo = function () {
    function Voodoo() {
      classCallCheck(this, Voodoo);

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


    createClass(Voodoo, [{
      key: "init",
      value: function init() {
        parser.init(this);
        parser.parseApp();
        this.router = new Router(this, this.routes, this.defaultRoute);
      }
    }, {
      key: "load",
      value: function load(template) {
        parser.loadView(template);
      }

      /** @method       createNewContext
        * @description  Creates a new Context for the given controller name and local scope
        * @param  {String}  ctrlName    controller name
        * @param  {Scope} scope         controller's local scope
        */

    }, {
      key: "createNewContext",
      value: function createNewContext(ctrlName, scope) {
        var ctrlList = this.controllers;

        // if the controller's name is been defined in controllers' list
        if (ctrlList.hasOwnProperty(ctrlName)) {
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

    }, {
      key: "controller",
      value: function controller(name, caller) {

        // check if the controller's name is a string and there isn't another controller with the same name
        if (isString(name) && !this.controllers.hasOwnProperty(name)) {

          // check the syntax:
          //  Voodoo.controller(string, function)
          //
          if (isFunction(caller)) {
            //this.controllers[name] = new Controller(name).caller([], caller);
            this.controllers[name] = { modules: [], caller: caller };
          }
          // otherwise check the syntax:
          //  Voodoo.controller(string, [string, string, string..., func])
          //
          else if (isArray(caller)) {
              var lastIndex = caller.length - 1;
              var _modules = caller.slice(0, lastIndex);
              var func = caller[lastIndex];

              // check if all modules' names are string and the last element is a function
              if (_modules.every(function (val) {
                return isString(val);
              }) && isFunction(func)) {
                //this.controllers[name] = new Controller(name).caller(modules, func);
                this.controllers[name] = { modules: _modules, caller: func };
              }
            }
        }
      }
    }, {
      key: "when",
      value: function when(path, templateName) {
        if (path && templateName) {
          this.routes[path] = templateName;
        }
      }
    }, {
      key: "setDefaultRoute",
      value: function setDefaultRoute(defaultPath, defaultTemplateName) {
        if (defaultPath && defaultTemplateName) {
          this.defaultRoute.path = defaultPath;
          this.defaultRoute.template = defaultTemplateName;
        }
      }
    }, {
      key: "service",
      value: function service(serviceName, _service) {
        if (!modules.modules.hasOwnProperty(serviceName)) modules.defineModule(serviceName, _service);
      }
    }]);
    return Voodoo;
  }();

  var voodoo = new Voodoo();

  var controller = voodoo.controller.bind(voodoo);
  var when = voodoo.when.bind(voodoo);
  var defaultRoute = voodoo.setDefaultRoute.bind(voodoo);
  var service = voodoo.service.bind(voodoo);

  exports.controller = controller;
  exports.when = when;
  exports.defaultRoute = defaultRoute;
  exports.service = service;

  return exports;

}({},window));
