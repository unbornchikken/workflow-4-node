"use strict";
let _ = require("lodash");
let assert = require("better-assert");
const undefinedReplacement = require("./constants").undefinedReplacement;

function SimpleProxy(backend) {
    assert(_.isObject(backend));
    let self = this;

    Object.defineProperty(this, "_backend", {
        enumerable: false,
        value: backend
    });
    Object.defineProperty(this, "_backendKeys", {
        enumerable: false,
        writable: false,
        value: []
    });
    Object.defineProperty(this, "$keys", {
        enumerable: false,
        get: function () {
            return backend.getKeys(self);
        }
    });
    this.update(SimpleProxy.updateMode.init);
}

SimpleProxy.updateMode = {
    twoWay: 0,
    oneWay: 1,
    init: 2
};

Object.defineProperties(SimpleProxy.prototype, {
    _skipKeys: {
        enumerable: false,
        writable: false,
        value: new Set(["getKeys", "getValue", "setValue"])
    },
    update: {
        enumerable: false,
        writable: false,
        value: function(mode) {
            let self = this;
            if (mode === SimpleProxy.updateMode.init) {
                for (let newKey of this._backend.getKeys(this)) {
                    if (_.isUndefined(this[newKey])) { // This makes the list as unique
                        this._backendKeys.push(newKey);
                        Object.defineProperty(
                            self,
                            newKey,
                            {
                                enumerable: true,
                                configurable: true,
                                get: function () {
                                    const getVal = self._backend.getValue(self, newKey);
                                    return getVal === undefinedReplacement ? undefined : getVal;
                                },
                                set: function (value) {
                                    self._backend.setValue(self, newKey, value === undefined ? undefinedReplacement : value);
                                }
                            }
                        );
                    }
                }
            }
            else if (mode === SimpleProxy.updateMode.oneWay) {
                let currBackendKeys = new Set(this._backend.getKeys(this));
                for (let key in this) {
                    if (!currBackendKeys.has(key)) {
                        // new key on proxy, and not defined on backend:
                        this._backend.setValue(self, key, this[key]);
                        Object.defineProperty(
                            self,
                            key,
                            {
                                enumerable: true,
                                configurable: true,
                                get: function () {
                                    return self._backend.getValue(self, key);
                                },
                                set: function (value) {
                                    self._backend.setValue(self, key, value);
                                }
                            }
                        );
                        this._backendKeys.push(key);
                    }
                    else {
                        currBackendKeys.delete(key);
                    }
                }
                for (let oldKey of currBackendKeys) {
                    delete this[oldKey];
                }
            }
            else {
                let prevBackendKeys = new Set(this._backendKeys);
                let currBackendKeys = new Set(this._backend.getKeys(this));
                let backedKeys = new Set();

                for (let key in this) {
                    if (!prevBackendKeys.has(key) && !currBackendKeys.has(key)) {
                        // new key on proxy, and not defined on backend:
                        this._backend.setValue(self, key, this[key]);
                        Object.defineProperty(
                            self,
                            key,
                            {
                                enumerable: true,
                                configurable: true,
                                get: function () {
                                    return self._backend.getValue(self, key);
                                },
                                set: function (value) {
                                    self._backend.setValue(self, key, value);
                                }
                            }
                        );
                        backedKeys.add(key);
                    }
                }

                this._backendKeys.length = 0;
                for (let newKey of currBackendKeys) {
                    if (!this._skipKeys.has(newKey)) {
                        this._backendKeys.push(newKey);
                        if (!prevBackendKeys.has(newKey) && !backedKeys.has(newKey)) {
                            Object.defineProperty(
                                self,
                                newKey,
                                {
                                    enumerable: true,
                                    configurable: true,
                                    get: function () {
                                        return self._backend.getValue(self, newKey);
                                    },
                                    set: function (value) {
                                        self._backend.setValue(self, newKey, value);
                                    }
                                }
                            );
                        }
                        else {
                            prevBackendKeys.delete(newKey);
                        }
                    }
                }
                for (let oldKey of prevBackendKeys) {
                    delete this[oldKey];
                }
            }
        }
    },
    delete: {
        enumerable: false,
        writable: false,
        value: function(key) {
            delete this[key];
            this._backend.delete(this, key);
        }
    }
});

module.exports = SimpleProxy;
