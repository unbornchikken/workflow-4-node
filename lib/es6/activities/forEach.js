"use strict";

let Activity = require("./activity");
let util = require("util");
let _ = require("lodash");
let Block = require("./block");
let WithBody = require("./withBody");
let errors = require("../common/errors");

function ForEach() {
    WithBody.call(this);

    this.items = null;
    this.varName = "item";
    this.parallel = false;
    this._bodies = null;
}

util.inherits(ForEach, WithBody);

ForEach.prototype.initializeStructure = function() {
    if (this.parallel) {
        let numCPUs = require("os").cpus().length;
        this._bodies = [];
        if (this.args && this.args.length) {
            for (let i = 0; i < Math.min(process.env.UV_THREADPOOL_SIZE || 100000, numCPUs); i++) {
                let newArgs = [];
                for (let arg of this.args) {
                    if (arg instanceof Activity) {
                        newArgs.push(arg.clone());
                    }
                    else {
                        newArgs.push(arg);
                    }
                }
                let newBody = new Block();
                newBody.args = newArgs;
                this._bodies.push(newBody);
            }
        }
        this.args = null;
    }
    else {
        WithBody.prototype.initializeStructure.call(this);
    }
};

ForEach.prototype.run = function (callContext, args) {
    const varName = this.varName;
    let items = this.items;
    if (!_.isNull(items)) {
        this[varName] = null;
        callContext.schedule(items, "_itemsGot");
    }
    else {
        callContext.complete();
    }
};

ForEach.prototype._itemsGot = function (callContext, reason, result) {
    if (reason === Activity.states.complete && !_.isUndefined(result)) {
        if (result && _.isFunction(result.next)) {
            this._iterator = result;
        }
        else {
            this._remainingItems = _.isArray(result) ? _.cloneDeep(result) : [result];
        }
        callContext.activity._doStep.call(this, callContext);
    }
    else {
        callContext.end(reason, result);
    }
};

ForEach.prototype._doStep = function (callContext, lastResult) {
    const varName = this.varName;
    let remainingItems = this._remainingItems;
    let iterator = this._iterator;
    if (remainingItems && remainingItems.length) {
        if (this.parallel) {
            let bodies = this._bodies;
            let pack = [];
            let idx = 0;
            while (remainingItems.length && idx < bodies.length) {
                let item = remainingItems[0];
                remainingItems.splice(0, 1);
                let variables = {};
                variables[varName] = item;
                pack.push({
                    variables: variables,
                    activity: bodies[idx++]
                });
            }
            callContext.schedule(pack, "_bodyFinished");
        }
        else {
            let item = remainingItems[0];
            remainingItems.splice(0, 1);
            let variables = {};
            variables[varName] = item;
            callContext.schedule({ activity: this._body, variables: variables }, "_bodyFinished");
        }
        return;
    }

    if (iterator) {
        if (this.parallel) {
            callContext.fail(new errors.ActivityRuntimeError("Parallel execution not supported with generators."));
            return;
        }
        else {
            let next = iterator.next();
            if (!next.done) {
                let variables = {};
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
    }
    else {
        callContext.end(reason, result);
    }
};

module.exports = ForEach;