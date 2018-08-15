"use strict";

let Activity = require("./activity");
let ActivityExecutionContext = require("./activityExecutionContext");
let ActivityExecutionState = require("./activityExecutionState");
let CallContext = require("./callContext");
let EventEmitter = require('events').EventEmitter;
let util = require("util");
let errors = require("../common/errors");
let _ = require("lodash");
let ActivityStateTracker = require("./activityStateTracker");
let enums = require("../common/enums");
let Bluebird = require("bluebird");
let asyncHelpers = require("../common/asyncHelpers");
let async = asyncHelpers.async;
let activityMarkup = require("./activityMarkup");

function ActivityExecutionEngine(contextOrActivity, instance) {
    EventEmitter.call(this);
    
    if (contextOrActivity instanceof Activity) {
        this.rootActivity = contextOrActivity;
        this.context = new ActivityExecutionContext(this);
        this._isInitialized = false;
    }
    else if (contextOrActivity instanceof ActivityExecutionContext) {
        this.rootActivity = contextOrActivity.rootActivity;
        this.context = contextOrActivity;
        this.context.engine = this;
        this._isInitialized = true;
    }
    else if (_.isPlainObject(contextOrActivity)) {
        this.rootActivity = activityMarkup.parse(contextOrActivity);
        this.context = new ActivityExecutionContext(this);
        this._isInitialized = false;
    }
    else {
        throw new TypeError("Argument 'contextOrActivity' is not an activity, context or a markup.");
    }
    
    this._rootState = null;
    this._trackers = [];
    this._hookContext();
    this.updatedOn = null;
    this.instance = instance || null;
}

util.inherits(ActivityExecutionEngine, EventEmitter);

Object.defineProperties(ActivityExecutionEngine.prototype, {
    execState: {
        get: function () {
            if (this._rootState) {
                return this._rootState.execState;
            }
            else {
                return null;
            }
        }
    },
    version: {
        get: function () {
            return this.rootActivity.version;
        }
    }
});

ActivityExecutionEngine.prototype.cancelExecution = function (scope, ids) {
  this.context.cancelExecution(scope, ids);
};

ActivityExecutionEngine.prototype._idle = {
    toString: function () {
        return enums.activityStates.idle;
    }
};

ActivityExecutionEngine.prototype.isIdle = function (result) {
    return result === this._idle;
};

ActivityExecutionEngine.prototype._initialize = function () {
    if (!this._isInitialized) {
        this.context.initialize(this.rootActivity);
        this._isInitialized = true;
    }
};

ActivityExecutionEngine.prototype._setRootState = function (state) {
    let self = this;
    if (!self._rootState) {
        self._rootState = state;
        self._rootState.on(
            Activity.states.cancel, function (args) {
                self.emit(Activity.states.cancel, args);
            });
        self._rootState.on(
            Activity.states.complete, function (args) {
                self.emit(Activity.states.complete, args);
            });
        self._rootState.on(
            Activity.states.end, function (args) {
                self.updatedOn = new Date();
                self.emit(Activity.states.end, args);
            });
        self._rootState.on(
            Activity.states.fail, function (args) {
                self.emit(Activity.states.fail, args);
            });
        self._rootState.on(
            Activity.states.run, function (args) {
                self.emit(Activity.states.run, args);
            });
        self._rootState.on(
            Activity.states.idle, function (args) {
                self.emit(Activity.states.idle, args);
            });
    }
};

ActivityExecutionEngine.prototype._hookContext = function () {
    let self = this;
    self.context.on(
        Activity.states.run,
        function (args) {
            for (let t of self._trackers) {
                t.activityStateChanged(args);
            }
        });
    self.context.on(
        Activity.states.end,
        function (args) {
            for (let t of self._trackers) {
                t.activityStateChanged(args);
            }
        });
    self.context.on(
        enums.events.workflowEvent,
        function(args) {
            self.emit(enums.events.workflowEvent, args);
        }
    );
};

ActivityExecutionEngine.prototype.addTracker = function (tracker) {
    if (!_.isObject(tracker)) {
        throw new TypeError("Parameter is not an object.");
    }
    this._trackers.push(new ActivityStateTracker(tracker));
};

ActivityExecutionEngine.prototype.removeTracker = function (tracker) {
    let idx = -1;
    for (let i = 0; i < this._trackers.length; i++) {
        let t = this._trackers[i];
        if (t._impl === tracker) {
            idx = i;
            break;
        }
    }
    if (idx !== -1) {
        this._trackers.splice(idx, 1);
    }
};

ActivityExecutionEngine.prototype.start = async(function* () {
    this._verifyNotStarted();

    this._initialize();

    let args = [new CallContext(this.context)];
    for (let a of arguments) {
        args.push(a);
    }

    this._setRootState(yield this.rootActivity.start.apply(this.rootActivity, args));
});

ActivityExecutionEngine.prototype.invoke = function () {
    let self = this;

    self._verifyNotStarted();

    self._initialize();

    let args = [];
    for (let a of arguments) {
        args.push(a);
    }

    args.unshift(new CallContext(self.context));

    return new Bluebird(function (resolve, reject) {
        try {
            self._setRootState(self.context.getExecutionState(self.rootActivity));
            self.once(
                Activity.states.end, function (eArgs) {
                    let reason = eArgs.reason;
                    let result = eArgs.result;
                    switch (reason) {
                        case Activity.states.complete:
                            resolve(result);
                            break;
                        case Activity.states.cancel:
                            reject(new errors.Cancelled());
                            break;
                        case Activity.states.idle:
                            resolve(self._idle);
                            break;
                        default :
                            result = result || new errors.ActivityRuntimeError("Unknown error.");
                            reject(result);
                            break;
                    }
                });

            self.rootActivity.start.apply(self.rootActivity, args);
        }
        catch (e) {
            reject(e);
        }
    });
};

ActivityExecutionEngine.prototype._verifyNotStarted = function () {
    if (!(!this.execState || this.execState === enums.activityStates.complete)) {
        throw new errors.ActivityStateExceptionError("Workflow has been already started.");
    }
};

ActivityExecutionEngine.prototype.resumeBookmark = function (name, reason, result) {
    let self = this;
    self._initialize();
    return new Bluebird(function (resolve, reject) {
        try {
            self._setRootState(self.context.getExecutionState(self.rootActivity));

            if (self.execState === enums.activityStates.idle) {
                let bmTimestamp = self.context.getBookmarkTimestamp(name);
                self.once(
                    Activity.states.end,
                    function (args) {
                        let _reason = args.reason;
                        let _result = args.result;
                        try {
                            if (_reason === enums.activityStates.complete || _reason === enums.activityStates.idle) {
                                let endBmTimestamp = self.context.getBookmarkTimestamp(name);
                                if (endBmTimestamp && endBmTimestamp === bmTimestamp) {
                                    if (_reason === enums.activityStates.complete) {
                                        reject(new errors.ActivityRuntimeError("Workflow has been completed before bookmark '" + name + "' reached."));
                                    }
                                    else {
                                        reject(new errors.Idle("Workflow has been gone to idle before bookmark '" + name + "' reached."));
                                    }
                                }
                                else {
                                    resolve();
                                }
                            }
                            else if (_reason === enums.activityStates.cancel) {
                                reject(new errors.ActivityRuntimeError("Workflow has been cancelled before bookmark '" + name + "' reached."));
                            }
                            else if (_reason === enums.activityStates.fail) {
                                reject(_result);
                            }
                        }
                        catch (e) {
                            reject(e);
                        }
                    });
                self.context.resumeBookmarkExternal(name, reason, result);
            }
            else {
                reject(new errors.ActivityRuntimeError("Cannot resume bookmark, while the workflow is not in the idle state."));
            }
        }
        catch (e) {
            reject(e);
        }
    });
};

/* SERIALIZATION */
ActivityExecutionEngine.prototype.getStateAndPromotions = function (serializer, enablePromotions) {
    if (serializer && !_.isObject(serializer)) {
        throw new Error("Argument 'serializer' is not an object.");
    }

    this._initialize();
    return this.context.getStateAndPromotions(serializer, enablePromotions);
};

ActivityExecutionEngine.prototype.setState = function (serializer, json) {
    if (serializer && !_.isObject(serializer)) {
        throw new Error("Argument 'serializer' is not an object.");
    }
    if (!_.isObject(json)) {
        throw new TypeError("Argument 'json' is not an object.");
    }

    this._initialize();
    this.updatedOn = new Date();
    this.context.setState(serializer, json);
};
/* SERIALIZATION */

module.exports = ActivityExecutionEngine;