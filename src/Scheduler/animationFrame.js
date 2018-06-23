/**
  * @description        requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
  * @see                http://paulirish.com/2011/requestanimationframe-for-smart-animating/
  * @see                http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
  */
  import * as window from "window";

  const rAF = window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame    ||
        function( callback ){
          window.setTimeout(callback, 1000 / 60);
        };

export default rAF;
