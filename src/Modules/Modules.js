export default class Modules {
  constructor() {
    this.modules = {};
  }

  defineModule(moduleName, mod) {
    if(!this.modules.hasOwnProperty(moduleName)) {
      this.modules[moduleName] = mod;
    }
  }
}
