/**
  * NodeList.forEach polyfill
  * @see https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach
  */
  import * as window from "window";

  if (window.NodeList && !NodeList.prototype.forEach) {
      window.NodeList.prototype.forEach = function (callback, thisArg) {
          thisArg = thisArg || window;
          for (var i = 0; i < this.length; i++) {
              callback.call(thisArg, this[i], i, this);
          }
      };
  }
