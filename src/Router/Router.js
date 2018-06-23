import * as window from "window";
import DEBUG from "../Utils/debug.js";

export default class Router {
  constructor(core, routes, defaultRoute) {
    this.core = core;
    this.routes = routes;
    this.default = defaultRoute;
    this.location = window.location;
    this.goTo();
    window.addEventListener("hashchange", this.goTo.bind(this));
  }

  goTo() {
    const path = this.location.hash.slice(1) || "/";

    if(this.routes.hasOwnProperty(path)) {
      this.core.load(this.routes[path]);
      }
    else {
      this.core.load(this.default.template);
    }
  }

}
