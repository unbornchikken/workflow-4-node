"use strict";

var _ = require("lodash");
var Reflection = require("backpack-node").system.Reflection;

var maxDepth = 10;

var templateHelpers = {

    isFunctionString: function isFunctionString(str) {
        return _.isString(str) && str.match(/^\s*function\s*\w*\s*\(\s*((\w+)*|((\w+)(\s*,\s*\w+)+))\s*\)\s*\{/);
    },
    isTemplate: function isTemplate(obj) {
        var activityCount = 0;
        templateHelpers.visitActivities(obj, function () {
            activityCount++;
        });
        return activityCount > 0;
    },
    visitActivities: function visitActivities(obj, f) {
        if (!_.isPlainObject(obj) && !_.isArray(obj)) {
            return;
        }
        Reflection.visitObject(obj, function (subObj, parent, pkey) {
            if (_.isString(subObj)) {
                var str = subObj.trim();
                if (str.length > 1) {
                    if (str[0] === "=") {
                        var markup = {
                            "@expression": {
                                expr: str.substr(1)
                            }
                        };
                        f(markup, parent, pkey);
                        return false;
                    }
                    if (templateHelpers.isFunctionString(str)) {
                        var markup = {
                            "@func": {
                                code: str
                            }
                        };
                        f(markup, parent, pkey);
                        return false;
                    }
                }
            } else if (_.isPlainObject(subObj)) {
                var keys = _.keys(subObj);

                if (keys.length === 1) {
                    var key = keys[0];
                    if (key[0] === "@" && key.length > 1) {
                        var markup = {};
                        markup[key] = subObj[key];
                        f(markup, parent, pkey);
                        return false;
                    }
                } else if (keys.length === 2) {
                    var key1 = keys[0];
                    var key2 = keys[1];
                    if (key1 === "@require" && key2[0] === "@" && key2.length > 1) {
                        var markup = {};
                        markup[key1] = subObj[key1];
                        markup[key2] = subObj[key2];
                        f(markup, parent, pkey);
                        return false;
                    } else if (key2 === "@require" && key1[0] === "@" && key1.length > 1) {
                        var markup = {};
                        markup[key2] = subObj[key2];
                        markup[key1] = subObj[key1];
                        f(markup, parent, pkey);
                        return false;
                    }
                }
            } else if (_.isFunction(subObj)) {
                var markup = {
                    "@func": {
                        code: subObj
                    }
                };
                f(markup, parent, pkey);
                return false;
            }
            return true;
        }, maxDepth);
    },
    cloneDeep: function cloneDeep(obj) {
        if (_.isPlainObject(obj)) {
            var other = {};
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    other[key] = this.cloneDeep(obj[key]);
                }
            }
            return other;
        } else if (_.isArray(obj)) {
            var other = [];
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = obj[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var item = _step.value;

                    other.push(this.cloneDeep(item));
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            return other;
        } else if (_.isObject(obj) && _.isFunction(obj.clone)) {
            return obj.clone();
        }
        return obj;
    }
};

module.exports = templateHelpers;
//# sourceMappingURL=templateHelpers.js.map
