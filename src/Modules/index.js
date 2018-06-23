import Scope from "./Scope";
import Http from "./Http";
import LocalStorage from "./LocalStorage";
import Modules from "./Modules.js";
const modules = new Modules();
  modules.defineModule("$http", new Http());
  modules.defineModule("$localStorage", new LocalStorage());
export default modules;
