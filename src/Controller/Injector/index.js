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
export default class Injector {

  constructor(dependencies) {
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
  register(key, value) {
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
  resolve(deps, func, scope) {
    // prepare new function parameters
    let args = [];

    // loop through required dependencies
    for (let i = 0, len = deps.length; i < len; i++) {
      const d = deps[i];
      // find required dependency in the injector's repository
      const depFound = this.dependencies[d];
      if(depFound) {
        // add the dependency to args
        args.push(depFound);
      }
      else
        throw new Error("Can't resolve " + d);
    }

    // return a function with "args" applied
    return function() {
      func.apply(scope || {}, args.concat(Array.prototype.slice.call(arguments, 0)));
    };
  }

}
