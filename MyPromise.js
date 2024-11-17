// 先定义三个常量表示状态
var PENDING = 'pending';
var FULFILLED = 'fulfilled';
var REJECTED = 'rejected';

class MyPromise {
  status = PENDING;
  value = undefined;
  reason = undefined;

  onRejectedCallbacks = [];
  onFulfilledCallbacks = [];
  resolve(value) {
    if (this.status === PENDING) {
      this.status = FULFILLED;
      this.value = value;
      queueMicrotask(() => {
        this.onFulfilledCallbacks.forEach((fn) => fn(this.value));
      });
    }
  }
  reject(reason) {
    if (this.status === PENDING) {
      this.status = REJECTED;
      this.reason = reason;
      queueMicrotask(() => {
        this.onRejectedCallbacks.forEach((fn) => fn(this.reason));
      });
    }
  }
  constructor(executor) {
    try {
      executor(this.resolve.bind(this), this.reject.bind(this));
    } catch (err) {
      this.reject(err);
    }
  }

  then(onFulfilled, onRejected) {
    const promise2 = new MyPromise((resolve, reject) => {
      if (this.status === FULFILLED) {
        queueMicrotask(() => {
          if (typeof onFulfilled === 'function') {
            try {
              resolvePromise(
                promise2,
                resolve,
                reject,
                onFulfilled(this.value)
              );
            } catch (err) {
              reject(err);
            }
          } else {
            resolve(this.value);
          }
        });
        return;
      }
      if (this.status === REJECTED) {
        queueMicrotask(() => {
          if (typeof onRejected === 'function') {
            try {
              resolvePromise(
                promise2,
                resolve,
                reject,
                onRejected(this.reason)
              );
            } catch (err) {
              reject(err);
            }
          } else {
            reject(this.reason);
          }
        });
        return;
      }
      // status === PENDING
      if (typeof onFulfilled === 'function') {
        this.onFulfilledCallbacks.push(() => {
          try {
            resolvePromise(promise2, resolve, reject, onFulfilled(this.value));
          } catch (err) {
            reject(err);
          }
        });
      } else {
        this.onFulfilledCallbacks.push(() => {
          resolve(this.value);
        });
      }
      if (typeof onRejected === 'function') {
        this.onRejectedCallbacks.push(() => {
          try {
            resolvePromise(promise2, resolve, reject, onRejected(this.reason));
          } catch (err) {
            reject(err);
          }
        });
      } else {
        this.onRejectedCallbacks.push(() => {
          reject(this.reason);
        });
      }
    });
    return promise2;
  }
  static deferred() {
    var result = {};
    result.promise = new MyPromise(function (resolve, reject) {
      result.resolve = resolve;
      result.reject = reject;
    });

    return result;
  }
}

function resolvePromise(promise2, resolve, reject, x) {
  if (x === promise2) {
    reject(new TypeError());
    return;
  }
  if (x instanceof MyPromise) {
    x.then(
      (y) => resolvePromise(promise2, resolve, reject, y),
      (reason) => reject(reason)
    );
    return;
  }
  if (
    Object.prototype.toString.call(x) === '[object Object]' ||
    Object.prototype.toString.call(x) === '[object Function]'
  ) {
    let then;
    try {
      then = x.then;
    } catch (err) {
      reject(err);
      return;
    }
    if (typeof then === 'function') {
      let called = false;
      try {
        then.call(
          x,
          (y) => {
            if (called) return;
            resolvePromise(promise2, resolve, reject, y);
            called = true;
          },
          (err) => {
            if (called) return;
            reject(err);
            called = true;
          }
        );
      } catch (err) {
        if (called) return;
        reject(err);
      }
      return;
    }
  }

  resolve(x);
}

module.exports = MyPromise;
