"use strict";

var Activity = require("./activity");
var util = require("util");
var _ = require("lodash");
var Block = require("./block");
var WithBody = require("./withBody");
var errors = require("../common/errors");

function ForEach() {
    WithBody.call(this);

    this.items = null;
    this.varName = "item";
    this.parallel = false;
    this._bodies = null;
}

util.inherits(ForEach, WithBody);

ForEach.prototype.initializeStructure = function () {
    if (this.parallel) {
        var numCPUs = require("os").cpus().length;
        this._bodies = [];
        if (this.args && this.args.length) {
            for (var i = 0; i < Math.min(process.env.UV_THREADPOOL_SIZE || 100000, numCPUs); i++) {
                var newArgs = [];
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = this.args[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var arg = _step.value;

                        if (arg instanceof Activity) {
                            newArgs.push(arg.clone());
                        } else {
                            newArgs.push(arg);
                        }
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

                var newBody = new Block();
                newBody.args = newArgs;
                this._bodies.push(newBody);
            }
        }
        this.args = null;
    } else {
        WithBody.prototype.initializeStructure.call(this);
    }
};

ForEach.prototype.run = function (callContext, args) {
    var varName = this.varName;
    var items = this.items;
    if (!_.isNull(items)) {
        this[varName] = null;
        callContext.schedule(items, "_itemsGot");
    } else {
        callContext.complete();
    }
};

ForEach.prototype._itemsGot = function (callContext, reason, result) {
    if (reason === Activity.states.complete && !_.isUndefined(result)) {
        if (result && _.isFunction(result.next)) {
            this._iterator = result;
        } else {
            this._remainingItems = _.isArray(result) ? result.slice() : [result];
        }
        callContext.activity._doStep.call(this, callContext);
    } else {
        callContext.end(reason, result);
    }
};

ForEach.prototype._doStep = function (callContext, lastResult) {
    var varName = this.varName;
    var remainingItems = this._remainingItems;
    var iterator = this._iterator;
    if (remainingItems && remainingItems.length) {
        if (this.parallel) {
            var bodies = this._bodies;
            var pack = [];
            var idx = 0;
            while (remainingItems.length && idx < bodies.length) {
                var item = remainingItems[0];
                remainingItems.splice(0, 1);
                var variables = {};
                variables[varName] = item;
                pack.push({
                    variables: variables,
                    activity: bodies[idx++]
                });
            }
            callContext.schedule(pack, "_bodyFinished");
        } else {
            var item = remainingItems[0];
            remainingItems.splice(0, 1);
            var variables = {};
            variables[varName] = item;
            callContext.schedule({ activity: this._body, variables: variables }, "_bodyFinished");
        }
        return;
    }

    if (iterator) {
        if (this.parallel) {
            callContext.fail(new errors.ActivityRuntimeError("Parallel execution not supported with generators."));
            return;
        } else {
            var next = iterator.next();
            if (!next.done) {
                var variables = {};
                variables[varName] = next.value;
                callContext.schedule({ activity: this._body, variables: variables }, "_bodyFinished");
                return;
            }
        }
    }

    callContext.complete(lastResult);
};

ForEach.prototype._bodyFinished = function (callContext, reason, result) {
    if (reason === Activity.states.complete) {
        callContext.activity._doStep.call(this, callContext, result);
    } else {
        callContext.end(reason, result);
    }
};

module.exports = ForEach;
//# sourceMappingURL=forEach.js.map
