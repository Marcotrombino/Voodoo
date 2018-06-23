import * as window from "window";

/** @namespace    Voodoo
  * @class        Http
  * @description  Describes an HTTP module which can be used to do get, post, put and remove requests
  *               to an entry point. It also provides chaining methods and parsing system for JSON responses
  */
export default class Http {
  constructor() {
    this.config = {
      contentType: "application/x-www-form-urlencoded"
    };
  }

  parse(req) {
    let result;
    try {
      result = JSON.parse(req.responseText);
    } catch (e) {
      result = req.responseText;
    }
    return [result, req];
  }

  xhr(type, url, data) {
    const $ = this;

    const methods = {
      success: function() {},
      error: function() {},
      always: function() {}
    };

    let XHR = window.XMLHttpRequest || window.ActiveXObject;

    let request = new XHR("MSXML2.XMLHTTP.3.0");
    request.open(type, url, true);

    request.setRequestHeader("Content-type", this.config.contentType);
    request.onreadystatechange = function () {
      var req;
      if (request.readyState === 4) { // DONE
        req = $.parse(request);
        if (request.status >= 200 && request.status < 300) {
          methods.success.apply(methods, req);
        } else {
          methods.error.apply(methods, req);
        }
        methods.always.apply(methods, req);
      }
    };
    request.send(data);

    const VoodooXHR = {
      success: function (callback) {
        methods.success = callback;
        return VoodooXHR;
      },
      error: function (callback) {
        methods.error = callback;
        return VoodooXHR;
      },
      always: function (callback) {
        methods.always = callback;
        return VoodooXHR;
      }
    };

    return VoodooXHR;
  }

  get(src) {
    return this.xhr("GET", src);
  }

  put(url, data) {
    return this.xhr("PUT", url, data);
  }

  post(url, data) {
    return this.xhr("POST", url, data);
  }

  delete(url) {
    return this.xhr("DELETE", url);
  }

  setContentType(value) {
    this.config.contentType = value;
  }

}
