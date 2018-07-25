/*jshint -W054 */

"use strict";

let constants = require("../common/constants");
let errors = require("../common/errors");
let enums = require("../common/enums");
let _ = require("lodash");
let specStrings = require("../common/specStrings");
let util = require("util");
let is = require("../common/is");
let CallContext = require("./callContext");
let uuid = require('uuid');
let async = require("../common/asyncHelpers").async;
let assert = require("better-assert");
let debug = require("debug")("wf4node:Activity");
let common = require("../common");
let SimpleProxy = common.SimpleProxy;

function Activity() {
    this.args = null;
    this.displayName = null;
    this.id = uuid.v4();
    this._instanceId = null;
    this._structureInitialized = false;
    this._scopeKeys = null;
    this._createScopePartImpl = null;
    this["@require"] = null;

    // Properties not serialized:
    this.nonSerializedProperties = new Set();

    // Properties are not going to copied in the scope:
    this.nonScopedProperties = new Set();
    this.nonScopedProperties.add("nonScopedProperties");
    this.nonScopedProperties.add("nonSerializedProperties");
    this.nonScopedProperties.add("arrayProperties");
    this.nonScopedProperties.add("activity");
    this.nonScopedProperties.add("id");
    this.nonScopedProperties.add("_instanceId");
    this.nonScopedProperties.add("args");
    this.nonScopedProperties.add("displayName");
    this.nonScopedProperties.add("complete");
    this.nonScopedProperties.add("cancel");
    this.nonScopedProperties.add("idle");
    this.nonScopedProperties.add("fail");
    this.nonScopedProperties.add("end");
    this.nonScopedProperties.add("schedule");
    this.nonScopedProperties.add("createBookmark");
    this.nonScopedProperties.add("resumeBookmark");
    this.nonScopedProperties.add("resultCollected");
    this.nonScopedProperties.add("codeProperties");
    this.nonScopedProperties.add("initializeStructure");
    this.nonScopedProperties.add("_initializeStructure");
    this.nonScopedProperties.add("_structureInitialized");
    this.nonScopedProperties.add("clone");
    this.nonScopedProperties.add("_scopeKeys");
    this.nonScopedProperties.add("_createScopePartImpl");
    this.nonScopedProperties.add("@require");
    this.nonScopedProperties.add("initializeExec");
    this.nonScopedProperties.add("unInitializeExec");

    this.codeProperties = new Set();
    this.arrayProperties = new Set(["args"]);
}

Object.defineProperties(Activity.prototype, {
    collectAll: {
        value: true,
        writable: false,
        enumerable: false
    },
    instanceId: {
        enumerable: false,
        get: function() {
            if (this._instanceId) {
                return this._instanceId;
            }
            throw new errors.ActivityRuntimeError("Activity is not initialized in a context.");
        },
        set: function(value) {
            this._instanceId = value;
        }
    }
});

Activity.prototype.toString = function () {
    return (this.displayName ? (this.displayName + " ") : "") + "(" + this.constructor.name + ":" + this.id + ")";
};

/* forEach */
Activity.prototype.all = function* (execContext) {
    yield * this._children(true, null, execContext, null);
};

Activity.prototype.children = function* (execContext) {
    yield * this._children(true, this, execContext, null);
};

Activity.prototype.immediateChildren = function* (execContext) {
    yield * this._children(false, this, execContext);
};

Activity.prototype._children = function* (deep, except, execContext, visited) {
    assert(execContext instanceof require("./activityExecutionContext"), "Cannot enumerate activities without an execution context.");
    visited = visited || new Set();
    let self = this;
    if (!visited.has(self)) {
        visited.add(self);

        // Ensure it's structure created:
        this._initializeStructure(execContext);

        if (self !== except) {
            yield self;
        }

        for (let fieldName in self) {
            if (self.hasOwnProperty(fieldName)) {
                let fieldValue = self[fieldName];
                if (fieldValue) {
                    if (_.isArray(fieldValue)) {
                        for (let obj of fieldValue) {
                            if (obj instanceof Activity) {
                                if (deep) {
                                    yield * obj._children(deep, except, execContext, visited);
                                }
                                else {
                                    yield obj;
                                }
                            }
                        }
                    }
                    else if (fieldValue instanceof Activity) {
                        if (deep) {
                            yield * fieldValue._children(deep, except, execContext, visited);
                        }
                        else {
                            yield fieldValue;
                        }
                    }
                }
            }
        }
    }
};
/* forEach */

/* Structure */
Activity.prototype.isArrayProperty = function (propName) {
    return this.arrayProperties.has(propName);
};

Activity.prototype._initializeStructure = function (execContext) {
    if (!this._structureInitialized) {
        this.initializeStructure(execContext);
        this._structureInitialized = true;
    }
};

Activity.prototype.initializeStructure = _.noop;

Activity.prototype.clone = function () {
    function makeClone(value, canCloneArrays) {
        if (value instanceof Activity) {
            return value.clone();
        }
        else if (value instanceof Set) {
            let newSet = new Set();
            for (let item of value.values()) {
                newSet.add(item);
            }
            return newSet;
        }
        else if (_.isArray(value)) {
            if (canCloneArrays) {
                let newArray = [];
                for (let item of value) {
                    newArray.push(makeClone(item, false));
                }
                return newArray;
            }
            else {
                return value;
            }
        }
        else {
            return value;
        }
    }

    let Constructor = this.constructor;
    let newInst = new Constructor();
    for (let key in this) {
        if (this.hasOwnProperty(key)) {
            let value = this[key];
            if (newInst[key] !== value) {
                newInst[key] = makeClone(value, true);
            }
        }
    }
    return newInst;
};

/* RUN */
Activity.prototype.start = function (callContext) {
    if (!(callContext instanceof CallContext)) {
        throw new Error("Argument 'context' is not an instance of ActivityExecutionContext.");
    }

    let args;
    if (arguments.length > 1) {
        args = [];
        for (let i = 1; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
    }

    this._start(callContext, null, args);
};

Activity.prototype._start = function (callContext, variables, args) {
    let self = this;

    if (_.isUndefined(args)) {
        args = this.args || [];
    }

    if (!_.isArray(args)) {
        args = [args];
    }

    let myCallContext = callContext.next(self, variables);
    let state = myCallContext.executionState;
    if (state.isRunning) {
        throw new Error("Activity is already running.");
    }

    // We should allow IO operations to execute:
    setImmediate(
        function () {
            state.reportState(Activity.states.run, null, myCallContext.scope);
            try {
                self.initializeExec.call(myCallContext.scope);
                self.run.call(myCallContext.scope, myCallContext, args);
            }
            catch (e) {
                self.fail(myCallContext, e);
            }
        });
};

Activity.prototype.initializeExec = _.noop;

Activity.prototype.unInitializeExec = _.noop;

Activity.prototype.run = function (callContext, args) {
    callContext.activity.complete(callContext, args);
};

Activity.prototype.complete = function (callContext, result) {
    this.end(callContext, Activity.states.complete, result);
};

Activity.prototype.cancel = function (callContext) {
    this.end(callContext, Activity.states.cancel);
};

Activity.prototype.idle = function (callContext) {
    this.end(callContext, Activity.states.idle);
};

Activity.prototype.fail = function (callContext, e) {
    this.end(callContext, Activity.states.fail, e);
};

Activity.prototype.end = function (callContext, reason, result) {
    try {
        this.unInitializeExec.call(callContext.scope, reason, result);
    }
    catch (e) {
        let message = `unInitializeExec failed. Reason of ending was '${reason}' and the result is '${result}.`;
        reason = Activity.states.fail;
        result = e;
    }

    let state = callContext.executionState;

    if (state.execState === Activity.states.cancel || state.execState === Activity.states.fail) {
        // It was cancelled or failed:
        return;
    }

    state.execState = reason;

    let inIdle = reason === Activity.states.idle;
    let execContext = callContext.executionContext;
    let savedScope = callContext.scope;
    savedScope.update(SimpleProxy.updateMode.oneWay);
    callContext = callContext.back(inIdle);

    if (callContext) {
        try {
            let bmName = specStrings.activities.createValueCollectedBMName(this.instanceId);
            if (execContext.isBookmarkExists(bmName)) {
                execContext.resumeBookmarkInScope(callContext, bmName, reason, result)
                    .then(function() {
                        state.emitState(result, savedScope);
                    })
                    .catch(function(e) {
                        state.emitState(result, savedScope);
                        callContext.fail(e);
                    });
                return;
            } else {
                debug("value collected bookmark not found");
            }
        }
        catch (e) {
            callContext.fail(e);
        }
    }
    else {
        // We're on root, done.
        // If wf in idle, but there are internal bookmark resume request,
        // then instead of emitting done, we have to continue them.
        if (inIdle && execContext.processResumeBookmarkQueue()) {
            // We should not emmit idle event, because there was internal bookmark continutations, so we're done.
            return;
        }
    }
    state.emitState(result, savedScope);
};

Activity.prototype._defaultEndCallback = function (callContext, reason, result) {
    callContext.end(reason, result);
};

Activity.prototype.schedule = function (callContext, obj, endCallback) {
    let self = this;
    let scope = callContext.scope;
    let execContext = callContext.executionContext;
    let selfId = callContext.instanceId;

    if (!endCallback) {
        endCallback = "_defaultEndCallback";
    }

    let invokeEndCallback = function (_reason, _result) {
        setImmediate(function () {
            scope[endCallback].call(scope, callContext, _reason, _result);
        });
    };

    if (!_.isString(endCallback)) {
        callContext.fail(new TypeError("Provided argument 'endCallback' value is not a string."));
        return;
    }
    let cb = scope[endCallback];
    if (!_.isFunction(cb)) {
        callContext.fail(new TypeError(`'${endCallback}' is not a function.`));
        return;
    }

    if (scope.__schedulingState) {
        debug("%s: Error, already existsing state: %j", selfId, scope.__schedulingState);
        callContext.fail(new errors.ActivityStateExceptionError("There are already scheduled items exists."));
        return;
    }

    debug("%s: Scheduling object(s) by using end callback '%s': %j", selfId, endCallback, obj);

    let state =
    {
        many: _.isArray(obj),
        indices: new Map(),
        results: [],
        total: 0,
        idleCount: 0,
        cancelCount: 0,
        completedCount: 0,
        endBookmarkName: null,
        endCallbackName: endCallback
    };

    let bookmarkNames = [];
    try {
        let startedAny = false;
        let index = 0;
        let processValue = function (value) {
            debug("%s: Checking value: %j", selfId, value);
            let activity, variables = null;
            if (value instanceof Activity) {
                activity = value;
            }
            else if (_.isObject(value) && value.activity instanceof Activity) {
                activity = value.activity;
                variables = _.isObject(value.variables) ? value.variables : null;
            }
            if (activity) {
                let instanceId = activity.instanceId;
                debug("%s: Value is an activity with instance id: %s", selfId, instanceId);
                if (state.indices.has(instanceId)) {
                    throw new errors.ActivityStateExceptionError(`Activity instance '${instanceId} has been scheduled already.`);
                }
                debug("%s: Creating end bookmark, and starting it.", selfId);
                bookmarkNames.push(execContext.createBookmark(selfId, specStrings.activities.createValueCollectedBMName(instanceId), "resultCollected"));
                activity._start(callContext, variables);
                startedAny = true;
                state.indices.set(instanceId, index);
                state.results.push(null);
                state.total++;
            }
            else {
                debug("%s: Value is not an activity.", selfId);
                state.results.push(value);
            }
        };
        if (state.many) {
            debug("%s: There are many values, iterating.", selfId);
            for (let value of obj) {
                processValue(value);
                index++;
            }
        }
        else {
            processValue(obj);
        }
        if (!startedAny) {
            debug("%s: No activity has been started, calling end callback with original object.", selfId);
            let result = state.many ? state.results : state.results[0];
            invokeEndCallback(Activity.states.complete, result);
        }
        else {
            debug("%s: %d activities has been started. Registering end bookmark.", selfId, state.indices.size);
            let endBM = specStrings.activities.createCollectingCompletedBMName(selfId);
            bookmarkNames.push(execContext.createBookmark(selfId, endBM, endCallback));
            state.endBookmarkName = endBM;
            scope.__schedulingState = state;
        }
        scope.update(SimpleProxy.updateMode.oneWay);
    }
    catch (e) {
        debug("%s: Runtime error happened: %s", selfId, e.stack);
        if (bookmarkNames.length) {
            debug("%s: Set bookmarks to noop: $j", selfId, bookmarkNames);
            execContext.noopCallbacks(bookmarkNames);
        }
        scope.delete("__schedulingState");
        debug("%s: Invoking end callback with the error.", selfId);
        invokeEndCallback(Activity.states.fail, e);
    }
    finally {
        debug("%s: Final state indices count: %d, total: %d", selfId, state.indices.size, state.total);
    }
};

Activity.prototype.resultCollected = function (callContext, reason, result, bookmark) {
    let selfId = callContext.instanceId;
    let execContext = callContext.executionContext;
    let childId = specStrings.getString(bookmark.name);
    debug("%s: Scheduling result item collected, childId: %s, reason: %s, result: %j, bookmark: %j", selfId, childId, reason, result, bookmark);

    let finished = null;
    let state = this.__schedulingState;
    let fail = false;
    try {
        if (!_.isObject(state)) {
            throw new errors.ActivityStateExceptionError("Value of __schedulingState is '" + state + "'.");
        }
        let index = state.indices.get(childId);
        if (_.isUndefined(index)) {
            throw new errors.ActivityStateExceptionError(`Child activity of '${childId}' scheduling state index out of range.`);
        }

        debug("%s: Finished child activity id is: %s", selfId, childId);

        switch (reason) {
            case Activity.states.complete:
                debug("%s: Setting %d. value to result: %j", selfId, index, result);
                state.results[index] = result;
                debug("%s: Removing id from state.", selfId);
                state.indices.delete(childId);
                state.completedCount++;
                break;
            case Activity.states.fail:
                debug("%s: Failed with: %s", selfId, result.stack);
                fail = true;
                state.indices.delete(childId);
                break;
            case Activity.states.cancel:
                debug("%s: Incrementing cancel counter.", selfId);
                state.cancelCount++;
                debug("%s: Removing id from state.", selfId);
                state.indices.delete(childId);
                break;
            case Activity.states.idle:
                debug("%s: Incrementing idle counter.", selfId);
                state.idleCount++;
                break;
            default:
                throw new errors.ActivityStateExceptionError(`Result collected with unknown reason '${reason}'.`);
        }

        debug("%s: State so far = total: %s, indices count: %d, completed count: %d, cancel count: %d, error count: %d, idle count: %d",
            selfId,
            state.total,
            state.indices.size,
            state.completedCount,
            state.cancelCount,
            state.idleCount);

        let endWithNoCollectAll = !callContext.activity.collectAll && reason !== Activity.states.idle;
        if (endWithNoCollectAll || fail) {
            if (!fail) {
                debug("%s: ---- Collecting of values ended, because we're not collecting all values (eg.: Pick).", selfId);
            }
            else {
                debug("%s: ---- Collecting of values ended, because of an error.", selfId);
            }
            debug("%s: Shutting down %d other, running acitvities.", selfId, state.indices.size);
            let ids = [];
            for (let id of state.indices.keys()) {
                ids.push(id);
                debug("%s: Deleting scope of activity: %s", selfId, id);
                execContext.deleteScopeOfActivity(callContext, id);
                let ibmName = specStrings.activities.createValueCollectedBMName(id);
                debug("%s: Deleting value collected bookmark: %s", selfId, ibmName);
                execContext.deleteBookmark(ibmName);
            }
            execContext.cancelExecution(this, ids);
            debug("%s: Activities cancelled: %j", selfId, ids);
            debug("%s: Reporting the actual reason: %s and result: %j", selfId, reason, result);
            finished = function () { execContext.resumeBookmarkInScope(callContext, state.endBookmarkName, reason, result); };
        }
        else {
            assert(!fail);
            let onEnd = (state.indices.size - state.idleCount) === 0;
            if (onEnd) {
                debug("%s: ---- Collecting of values ended (ended because of collect all is off: %s).", selfId, endWithNoCollectAll);
                if (state.cancelCount) {
                    debug("%s: Collecting has been cancelled, resuming end bookmarks.", selfId);
                    finished = function () { execContext.resumeBookmarkInScope(callContext, state.endBookmarkName, Activity.states.cancel); };
                }
                else if (state.idleCount) {
                    debug("%s: This entry has been gone to idle, propagating counter.", selfId);
                    state.idleCount--; // Because the next call will wake up a thread.
                    execContext.resumeBookmarkInScope(callContext, state.endBookmarkName, Activity.states.idle);
                }
                else {
                    result = state.many ? state.results : state.results[0];
                    debug("%s: This entry has been completed, resuming collect bookmark with the result(s): %j", selfId, result);
                    finished = function () { execContext.resumeBookmarkInScope(callContext, state.endBookmarkName, Activity.states.complete, result); };
                }
            }
        }
    }
    catch (e) {
        callContext.fail(e);
        this.delete("__schedulingState");
    }
    finally {
        if (finished) {
            debug("%s: Schduling finished, removing state.", selfId);
            this.delete("__schedulingState");

            finished();
        }
    }
};
/* RUN */

/* SCOPE */
Activity.prototype._getScopeKeys = function () {
    let self = this;
    if (!self._scopeKeys || !self._structureInitialized) {
        self._scopeKeys = [];
        for (let key in self) {
            if (!self.nonScopedProperties.has(key) &&
                (_.isUndefined(Activity.prototype[key]) || key === "_defaultEndCallback" || key === "_subActivitiesGot")) {
                self._scopeKeys.push(key);
            }
        }
    }
    return self._scopeKeys;
};

Activity.prototype.createScopePart = function () {
    if (!this._structureInitialized) {
        throw new errors.ActivityRuntimeError("Cannot create activity scope for uninitialized activities.");
    }

    if (this._createScopePartImpl === null) {
        let first = true;
        let src = "return {";
        for (let fieldName of this._getScopeKeys()) {
            if (first) {
                first = false;
            }
            else {
                src += ",\n";
            }
            src += fieldName + ":a." + fieldName;
        }
        src += "}";

        try {
            this._createScopePartImpl = new Function("a,_", src);
        }
        catch (e) {
            debug("Invalid scope part function:%s", src);
            throw e;
        }
    }

    return this._createScopePartImpl(this, _);
};
/* SCOPE */

Activity.states = enums.activityStates;

module.exports = Activity;
