/**
  * @description  requestIdleCallback & cancelIdleCallback shim
  * @see          https://developers.google.com/web/updates/2015/08/using-requestidlecallback
  */
import * as window from "window";

  const rIC = window.requestIdleCallback ||
  function (cb) {
    var start = Date.now();
    return setTimeout(function () {
      cb({
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50 - (Date.now() - start));
        }
      });
    }, 1);
  };

  const cIC = window.cancelIdleCallback ||
  function (id) {
    clearTimeout(id);
  };

  export { rIC, cIC };
