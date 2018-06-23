import Voodoo from "./Voodoo";
const voodoo = new Voodoo();

  const controller = voodoo.controller.bind(voodoo);
  const when = voodoo.when.bind(voodoo);
  const defaultRoute = voodoo.setDefaultRoute.bind(voodoo);
  const service = voodoo.service.bind(voodoo);

export {
  controller,
  when,
  defaultRoute,
  service
};
