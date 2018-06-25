import * as window from "window";
import { isArray, isFunction, isObject } from "../Utils/types.js";
import scheduler from "../Scheduler";
import WATCHERS from "./lexer/watchers.js";
import DIRECTIVES from "./lexer/directives.js";
import Scope from "../Modules/Scope";
import Context from "../Context";

export default class VNode {

  constructor(parser, parentScope, DOMRef, type, rawAttributes, directives, options) {
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

  addChild(vnode) {
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
  forChange(node, varName, watcherName, newVal) {
    const doc = this.parser.document;
    const DOMRef = this.DOMRef;

    /* the for loop initialize a new scope based on template variables.
       Template variables may be "item." variables, rendered directly by the new for scope,
       or variables which are not "item." and they stand out from the for scope.
       In this case, for scope needs to know which variables it has to require to its parent scope
    */
    const requireList = [];

    // create a new scope connecting it with its parent scope
    this.scope = new Scope(this.parentScope);
    const scope = this.scope;

    // if the new scope hasn't an index in the "childsScope" parent array
    if(this.childScopesIndex === null) {
      // get an unique ID
      this.childScopesIndex = this.parentScope.getChildScopeIndex();
    }

    // add new scope into parent childsScope at specific index
    // this approach prevents to put new scope into parent multiple times
    this.parentScope.addChildScope(this.childScopesIndex, scope);

    // get vnode childrens
    const childs = this.children;
    const childsLen = childs.length;

    // if new value is an array of all objects
    if(isArray(newVal) && newVal.every(item => isObject(item))) {
      const newValLen = newVal.length;
      const itemName = this.options.forStatement.item;
      const template = this.options.forStatement.template;

      // create a fragment away from DOM to prevent layout computations
      const frag = doc.createDocumentFragment();

      // for each row of newVal
      newVal.forEach((row, index) => {
        // for each vnode children
        for(let i = 0; i < childsLen; i++) {
          // create a new DOM node starting from the children[i] subtree
          const rowNode = this.buildForRow(childs[i], itemName, index, doc, requireList);
          // parse the rowNode and build the new scope based on it
          this.parser.buildScope(rowNode, scope, false, -1);
          // append the rowNode to the fragment
          frag.appendChild(rowNode);
        }

      });

      const requireListLen = requireList.length;


      /* Require an unknown scope's variable to scope ancestors
         and set the scope variable with the found variable in ancestors
      */
      const requireParentVar = function(parentScope, scope) {
        // for every variable in the require list
        for(let i = 0; i < requireListLen; i++) {
          const currentVar = requireList[i];
          let parentStateRef = parentScope.state;
          let scopeRef = scope;

          // split the variable chain "a.b.c....."
          const split = currentVar.split(".");
          const splitLen = split.length;

          // rewire the chain looking into parent's scope
          for(let j = 0; j < splitLen; j++) {
            const currSplit = split[j];
            if(parentStateRef[currSplit] && scopeRef[currSplit]) {
              if(j < (splitLen - 1)) {
                parentStateRef = parentStateRef[currSplit];
                scopeRef = scopeRef[currSplit];
              } else {
                // if the chain is been rewired, assign the parent's scope variable to scope
                scopeRef[currSplit] = parentStateRef[currSplit];
              }
            } else {  // if the parent hasn't the required variable
              // if the parent has a parent, traverse it again
              if(parentScope.parentScope !== null) {
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
      const createForContext = function() {
        const $ = this;
        this.options.forStatement.context = new Context({
          name: "forController",
           // the new controller will need only the $scope module
          modules: ["$scope"],
          // the new controller called has to update "item." and requireList variables with newVal row's data
          caller: function($scope) {
              // require unknown variables from requireList
              requireParentVar($.parentScope, $scope);

              // update known variables ("item.") directly from newVal row's data
              for(let k = 0; k < newValLen; k++) {
                $scope[itemName + k] = newVal[k];
              }

          }
        }, scope);
      }.bind(this);

      /* Schedule a DOM update to push generated collection of DOM nodes into "voo-for" wrapper
       */
      scheduler.schedule(function() {
        this.node.innerHTML = ""; this.node.appendChild(this.changes);
        createForContext();
        this.parser.removeCloak(this.node, DIRECTIVES.cloak);
      }.bind({ node: DOMRef, changes: frag, parser: this.parser }));

    }  // end if valid
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
  buildForRow(vnode, itemName, index, doc, requireList) {
    // create a DOM node clone for the virtual one
    let nodeClone = null;
    const type = vnode.type;

    // if the vnode type is not TEXT (every other element type)
    if(type !== "TEXT") {
      // create a node clone based on vnode type
      nodeClone = doc.createElement(vnode.type);

      // for each vnode raw attributes
      const vnodeAttributes = vnode.rawAttributes || [];
      for(let i = 0; i < vnodeAttributes.length; i++) {
        const attr = vnodeAttributes[i];
        const attrName = attr.name;
        let attrValue = attr.value;

        const isWatcher = this.parser.isWatcher(attrName);
        const isEvent = this.parser.isEvent(attrName);

        // check if the attribute name is a watcher or event label
        if(isWatcher || isEvent) {
          // if the label is a "for" label
          if(isWatcher === "for") {
            // split the attribute's value into for statements and split the "collection" token into "." chain
            const tokens = attrValue.split("in");
            const split = tokens[1].split(".");

            // if the first element of the chain is the itemName
            // rename it with an indexed one based on row's data index
            if(split[0].replace(/\s/g, "") === itemName) {
              split[0] = itemName + index;
              // rewire the for statement with the changes
              attrValue = tokens[0] + "in " + split.reduce((a, b) => a.concat(".", b));
            }
            // else: nothing. Nested for inherit state from parent
          }
          // if it's not a for label
          else {
            // split the attribute's value into "." chain
            const split = attrValue.split(".");
              // if the first element of the chain is the itemName
              // rename it with an indexed one based on row's data index
              if(split[0].replace(/\s/g, "") === itemName) {
                split[0] = itemName + index;
                attrValue = split.reduce((a, b) => a.concat(".", b));
              }
              // otherwise add the unknow variable to require list
              else {
                // replace () for event labels
                const attrV = isEvent ? attrValue.replace("()", "") : attrValue;

                if(!requireList.includes(attrV))
                  requireList.push(attrV);
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
      const compiled = this.compileForTextNode(vnode.DOMRef.nodeValue, itemName, index, requireList);
      // create a text node clone from the compiled value
      nodeClone = doc.createTextNode(compiled);
    }

    const childs = vnode.children;
    // for each vnode children
    for(let i = 0; i < childs.length; i++) {
      // append its node clone tree to current clone node
      nodeClone.appendChild(this.buildForRow(childs[i], itemName, index, doc, requireList));
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
  compileForTextNode(nodeValue, itemName, index, requireList) {
    return nodeValue.replace(/{{[ ]*(.+?)[ ]*}}/g, function(pattern, match) {
        const split = match.split(".");
        if(split[0].replace(/\s/g, "") === itemName) {
          split[0] = itemName + index;
        } else {
          const varName = split.reduce((a, b) => a.concat(".", b));
          requireList.push(varName);
        }
        return "{{" + split.reduce((a, b) => a.concat(".", b)) + "}}";
      }
    );
  }


  /** @method       bindChange
    * @description  Apply new variable's value to DOM node based on its type
    * @param        {HTMLNode}    node        the DOM node's reference
    * @param        {String}  varName     the variable name which triggered the change
    * @param        {String}  watcherName the name of watcher
    * @param        {any}     newVal      the new variable's value render into the node
    * @return       {String}    the compiled text value
    */
  bindChange(node, varName, watcherName, newVal) {
    switch(this.type) {
      case "TEXT":
          scheduler.schedule(() => {
            const textStatement = this.options.textStatement;
            const state = textStatement.state;
            const mask = textStatement.mask;

            state[varName] = newVal;

            node.nodeValue = mask.replace(/{{[ ]*(.+?)[ ]*}}/g, function(pattern, match) {
              return state[match]; });
            });
        break;
      case "INPUT":
      case "TEXTAREA":
        scheduler.schedule(() => { node.value = newVal; });
        break;
      case "IMG":
        scheduler.schedule(() => { node.src = newVal; });
        break;
      default:
        scheduler.schedule(() => { node.innerHTML = newVal; });
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
  ifChange(node, varName, watcherName, newVal) {
    const ifStatement = this.options.ifStatement;
    ifStatement.state = newVal;

    if(ifStatement.state && ifStatement.state !== null) {
      console.log("si deve vedere", ifStatement.state);
      scheduler.schedule(() => { node.removeAttribute(DIRECTIVES.cloak); });
    } else {
      console.log("si deve nascondere");
      scheduler.schedule(() => { node.setAttribute(DIRECTIVES.cloak, ""); });
    }

  }

  clickChange(node, varName, eventName, newVal) {
    node.addEventListener("click", newVal.bind(node));
  }

  mouseOverChange(node, varName, eventName, newVal) {
    console.log("MOUSEOVER", node, varName, eventName, newVal);
    node.addEventListener("mouseover", newVal.bind(node));
  }

  keyUpChange(node, varName, eventName, newVal) {
    console.log("KEYUP", node, varName, eventName, newVal);
    node.addEventListener("keyup", newVal.bind(node));
  }

  render(varName, watcherName, newVal) {
    if(this.directives.includes(watcherName)) {
      const changer = this[watcherName + "Change"];

      if(isFunction(changer)) {
        changer.apply(this, [ this.DOMRef, varName, watcherName, newVal ]);
      }
    }
  }


}
