import * as window from "window";
import DEBUG from "../Utils/debug.js";
import DIRECTIVES from "./lexer/directives.js";
import WATCHERS from "./lexer/watchers.js";
import EVENTS from "./lexer/events.js";
import VNode from "./VNode.js";
import Scope from "../Modules/Scope";
import scheduler from "../Scheduler";
import modules from "../Modules";

/** @namespace    Voodoo
  * @class        Parser
  * @description  Parses DOM tree and builds local scopes for given controllers
  */
export default class Parser {

  /** @constructor Parser
    * @description Assign null value to document and root until document get fully loaded
    */
  constructor() {
    this.coreRef = null;
    this.document = null;
    this.root = null;
    this.view = null;
  }


  /** @method       init
    * @description  Called by Voodoo's main class after document loading.
    *               It finds the root node from which starts to traverse
    */
  init(core) {
    this.coreRef = core;
    this.document = window.document;
    this.root = this.findRootNode();
    this.view = this.findViewNode();
  }


  /** @method       queryAttr
    * @description  return the correct syntax to look for an attribute with querySelector
    * @return {String}
    */
  queryAttr(name, value) {
    const val = value ? ("=" + value) : "";
    return "[" + name + val + "]";
  }


  /** @method       isDirective
    * @description  Determines if the given attribute is a directive or not
    *               A directive is an indication to follow some roles
    * @return {String|Null} returns the corresponding directive name (e.g. without "voo"- prefix)
    */
  isDirective(attrName) {
    const keys = Object.keys(DIRECTIVES);
    for(let i = 0; i < keys.length; i++) {
      if(DIRECTIVES[keys[i]] === attrName) {
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
  isWatcher(attrName) {
    const keys = Object.keys(WATCHERS);
    for(let i = 0; i < keys.length; i++) {
      if(WATCHERS[keys[i]] === attrName) {
        return keys[i];
      }
    }
    return null;
  }

  /** @method       isEvent
    * @description  Determines if the given attribute is a event or not
    * @return {String|Null} returns the corresponding eveny name (e.g. without "voo"- prefix)
    */
  isEvent(attrName) {
    const keys = Object.keys(EVENTS);
    for(let i = 0; i < keys.length; i++) {
      if(EVENTS[keys[i]] === attrName) {
        return keys[i];
      }
    }
    return null;
  }

  /** @method       isForStatement
    * @description  Determines if the given for statement is valid ("item in collection")
    */
  isForStatement(attrName) {
    return /[\w\s]*in[\s]+[\w]+/.test(attrName);
  }

  /** @method       resolveInterpolation
    * @description  Returns an array with variables name inside {{variable}} notation
    */
  resolveInterpolation(text) {
    const match = text.match(/{{\s*[\w.]+\s*}}/g);
    return match ? match.map(function(x) { return x.match(/[\w.]+/)[0]; }) : [];
  }


  /** @method       findRootNode
    * @description  Finds the root node from which starts to traverse ("voo-app" attribute)
    * @return {Node} DOM node
    */
  findRootNode() {
    return this.document.querySelector(this.queryAttr(DIRECTIVES.app));
  }

  /** @method       findViewNode
    * @description  Finds the view node where to put router's templates
    * @return {Node} DOM node
    */
  findViewNode() {
    return this.root.querySelector(this.queryAttr(DIRECTIVES.view));
  }

  /** @method       loadView
    * @param {String} templateUrl   the template filename
    * @description  Request the template source code from template's filename and puts it into <view>
    */
  loadView(templateUrl) {
    const $ = this;
    if($.view) {
      modules.modules["$http"].get(templateUrl).success(function (data) {
        $.view.innerHTML = data;
        $.parsePage();
      })
      .error(function (data) {
        console.error(data, "Cannot find " + templateUrl);
      });
    } else {
      $.parsePage();
    }

  }

  /** @method       parsePage
    * @description  Parse whole page starting from root node
    */
  parsePage() {
    const $ = this;
    const app = this.root;
    if(app) {
      const controllers = app.querySelectorAll(this.queryAttr(DIRECTIVES.ctrl));
      controllers.forEach(function(ctrl) {
        const ctrlName = ctrl.getAttribute(DIRECTIVES.ctrl);
        const scope = $.parseController(ctrl);
        $.coreRef.createNewContext(ctrlName, scope);
      });

      this.removeCloak(this.root, DIRECTIVES.cloak);
    }
  }

  removeCloak(node, cloak) {
    if(node.nodeType === 1 && !node.hasAttribute(WATCHERS.if)) {
      const childs = node.children;
      const childsLen = childs.length;
      for(let i = 0; i < childsLen; i++) {
        this.removeCloak(childs[i], cloak);
      }
      scheduler.schedule(() => { node.removeAttribute(cloak); });
    }
  }

  /** @method       parseController
    * @description  Parses a DOM sub-tree for a given controller's name
    * @return {Scope} local scope for the given controller name
    */
  parseController(target) {
    const app = this.root;

    // get the root node for given controller name
    //const target = app.querySelector(this.queryAttr(DIRECTIVES.ctrl, ctrlName));
    //console.log(target);

    // create an empty scope
    const scope = new Scope(null);

    // find directives and fill the scope traversing the "target" subtree
    this.buildScope(target, scope, false);

    if(DEBUG) {console.log(scope); }
    return scope;
  }


  buildScope(node, scope, hasParentLoop) {

    if(!this.ignorableNode(node)) {
      const tagName = this.getTagName(node);
      const labelsMap = tagName === "TEXT" ? this.getTextLabelsMap(node) : this.getElementLabelsMap(node, scope);

      const options = labelsMap.options;
      const labels = labelsMap.labels;
      const labelsName = Object.keys(labels);
      const rawAttributes = node.attributes;

      const vnode = new VNode(this, scope, node, tagName, rawAttributes, labelsName, options);

      const childs = node.childNodes;
      const childsLen = childs.length;

      if(!hasParentLoop) {
        // add a watcher to current VNode for every not-empty watcher
        for(let i = 0; i < labelsName.length; i++) {
          const lname = labelsName[i];
          const label = labels[lname];
          const len = label.length;
          //console.log(lname, label, len);
          for(let j = 0; j < len; j++) {
            const varName = label[j];
            scope.addWatcher(vnode, lname, varName);
          }
        }
        hasParentLoop = labelsName.includes("for");
      }

      for(let i = 0; i < childsLen; i++) {
        if(!this.ignorableNode(childs[i])) {
          vnode.addChild(this.buildScope(childs[i], scope, hasParentLoop));
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
  getTagName(node) {
    return node.tagName ? node.tagName.toUpperCase() : "TEXT";
  }


  /** @method       ignorableNode
    * @description  Determines if the given node is ignorable or not.
    *               Comment nodes and text node with all whitespaces are ignorable
    * @param  {Node}  node    given node
    * @return {boolean}
    */
  ignorableNode(node) {
    return ( node.nodeType == 8) || // A comment node
       ( (node.nodeType == 3) && !(/[^\t\n\r ]/.test(node.textContent)) ); // a text node, all ws
  }

  /** @method       getElementForWatcherMap
    * @description  Add "for" watcher label's information into element labels' map
    * @param  {HTMLNode}  node    given node
    * @param  {Object}    map     given node labels' map
    * @param  {String}    value   watcher value (attribute's value)
    */
  getElementForWatcherMap(node, map, value) {
    // check for statement
    const isFor = this.isForStatement(value);

    if(isFor) {
      const tokens = value.replace(/\s/g, "").split("in");
      const item = tokens[0];
      const collection = tokens[1];
      const forStatement = { item, collection };

      if(!map.labels.hasOwnProperty("for")) {
        map.labels.for = [];
      }

      map.labels["for"].push(forStatement.collection);
      map.options.forStatement = { item: forStatement.item, template: node.innerHTML };
    } else {
      console.error("formato sbagliato", value);
    }

  }

  getElementIfWatcherMap(node, map, value) {
    if(!map.labels.hasOwnProperty("if")) {
      map.labels.if = [];
    }

    scheduler.schedule(() => { node.setAttribute(DIRECTIVES.cloak, ""); });
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
  getElementWatchersMap(node, map, watcherName, value) {
    switch(watcherName) {
      case "for":
        this.getElementForWatcherMap(node, map, value);
        break;
      case "if":
        this.getElementIfWatcherMap(node, map, value);
        break;
      default:
        if(!map.labels.hasOwnProperty(watcherName)) {
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
  getElementEventsMap(node, map, eventName, value) {
    if(!map.labels.hasOwnProperty(eventName)) {
      map.labels[eventName] = [];
    }
    if(/(.+?\(\))/.test(value)) {
      const funcName = value.replace(/\s/g, "").replace("()", "");
      map.labels[eventName].push(funcName);
    }
  }

  /** @method       getElementEventsMap
    * @description  Add text node binding information into element label's map
    * @param  {HTMLNode}  node        given node
    */
  getTextLabelsMap(node) {
    let map = { labels: {}, options: {} };

    const binding = this.resolveInterpolation(node.nodeValue);
    //console.log(binding);
    const len = binding.length;

    if(len > 0) {
      map.labels.bind = [];
      map.options.textStatement = { state: {}, mask: node.nodeValue };
    }

    for(let i = 0; i < len; i++) {
      map.labels.bind.push(binding[i]);
      map.options.textStatement.state[binding[i]] = undefined;
    }

    return map;
  }

  /** @method       getElementEventsMap
    * @description  Add element labels' information into element labels' map
    * @param  {HTMLNode}  node        given node
    */
  getElementLabelsMap(node) {
    let map = { labels: {}, options: {} };

    // if element has attributes
    if(node.attributes) {
      const attributes = node.attributes;
      const len = attributes.length;

      for(let i = 0; i < len; i++) {
        const attr = attributes[i];
        const watcherName = this.isWatcher(attr.name);
        const eventName = this.isEvent(attr.name);
        const value = attr.value;

        // if the attribute is a Watcher
        if(watcherName && value !== "") {
          this.getElementWatchersMap(node, map, watcherName, value);
        } else if(eventName && value !== "") {
          this.getElementEventsMap(node, map, eventName, value);
        }
      }

    }

    return map;
  }

}
