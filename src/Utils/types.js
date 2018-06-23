export const isString = arg => typeof arg === "string";
export const isArray = arg => Array.isArray(arg);
export const isFunction = arg => typeof arg === "function";
//export const isObject = arg => arg === Object(arg);
/*export const isObject = arg => {
    if (arg === null) { return false;}
    return ( (typeof arg === "function") || (typeof arg === "object") );
};*/
export const isObject = arg => {
  return arg === Object(arg) && Object.prototype.toString.call(arg) !== "[object Array]";
};
