import * as window from "window";
import { isObject, isFunction } from "../..//Utils/types.js";

/** @namespace    Voodoo
  * @class        LocalStorage
  * @description  Provides a simple API for HTML5 local storage
  */
export default class LocalStorage {
  constructor() {
    this.storage = window.localStorage;
  }

  /** @method       set
    * @description  Set a local storage's item
    * @param        {String}    key        the item's key
    * @param        {any}       value      the item's value
    * @param        {boolean}   check      prevent overwriting if the item already exists
    */
  set(key, value, check) {
    let val = value;
    if(isObject(value) && !isFunction(value)) {
      val = JSON.stringify(value);
    }

    if(!check) {
      this.storage.setItem(key, val);
    } else {
      if(!this.get(key)) {
        this.storage.setItem(key, val);
      }
    }
  }

  /** @method       get
    * @description  Get a local storage's item
    * @param        {String}    key        the item's key
    * @return       {any}
    */
  get(key) {
    let val = this.storage.getItem(key);
    if(val) {
      try {
        val = JSON.parse(val);
      } catch(e) {}
      return val;
    } else
      return null;
  }


  /** @method       remove
    * @description  Remove a local storage's item
    * @param        {String}    key        the item's key
    */
  remove(key) {
    if(this.get(key) !== null) {
      this.storage.removeItem(key);
    }
  }
}
