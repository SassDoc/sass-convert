export function promisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn(...args, (err, ...args) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(...args);
      });
    });
  };
}

export function defer() {
  let ret = {};

  ret.promise = new Promise((resolve, reject) => {
    ret.resolve = resolve;
    ret.reject = reject;
  });

  return ret;
}

/**
 * Type checking helpers.
 */
let type = Function.prototype.call.bind(Object.prototype.toString);

export const is = {
  undef: arg => arg === void 0,
  falsy: arg => !is.undef(arg) && !arg,
  string: arg => typeof arg === 'string',
  function: arg => typeof arg === 'function',
  object: arg => type(arg) === '[object Object]',
  array: arg => Array.isArray(arg),
  promise: arg => arg && is.function(arg.then),
  stream: arg => arg && is.function(arg.pipe),
}
