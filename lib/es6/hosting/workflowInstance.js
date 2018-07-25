"use strict";

let Workflow = require("../activities/workflow");
let ActivityExecutionContext = require("../activities/activityExecutionContext");
let ActivityExecutionEngine = require("../activities/activityExecutionEngine");
let BeginMethod = require("../activities/beginMethod");
let EndMethod = require("../activities/endMethod");
let errors = require("../common/errors");
let enums = require("../common/enums");
let specStrings = require("../common/specStrings");
let _ = require("lodash");
let constants = require("../common/constants");
let Bluebird = require("bluebird");
let is = require("../common/is");
let asyncHelpers = require("../common/asyncHelpers");
let async = asyncHelpers.async;
let EventEmitter = require('events').EventEmitter;
let util = require("util");
let debug = require("debug")("wf4node:WorkflowInstance");

function WorkflowInstance(host) {
    EventEmitter.call(this);

    this._host = host;
    this.id = null;
    this._engine = null;
    this.createdOn = null;
    this._beginMethodWithCreateInstCallback = null;
    this._endMethodCallback = null;
    this._idleInstanceIdPathCallback = null;
    this.activeDelays = [];
    this.workflowVersion = null;
}

util.inherits(WorkflowInstance, EventEmitter);

Object.defineProperties(
    WorkflowInstance.prototype, {
        execState: {
            get: function () {
                return this._engine ? this._engine.execState : null;
            }
        },
        workflowName: {
            get: function () {
                return this._engine ? this._engine.rootActivity.name.trim() : null;
            }
        },
        updatedOn: {
            get: function () {
                return this._engine ? this._engine.updatedOn : null;
            }
        },
        persistence: {
            get: function() {
                return this._host._persistence;
            }
        }
    });

WorkflowInstance.prototype.create = async(function* (execContext, workflowVersion, methodName, args, lockInfo) {
    let self = this;

    self.setWorkflow(execContext, workflowVersion);
    self._resetCallbacksAndState();

    let createMethodReached = false;
    let instanceIdPath = null;
    self._beginMethodWithCreateInstCallback = function (mn, ip) {
        if (mn === methodName) {
            createMethodReached = true;
            instanceIdPath = ip;
        }
    };

    self.createdOn = new Date();

    try {
        if (self._engine.isIdle(yield self._engine.invoke())) {
            if (createMethodReached) {
                self._resetCallbacksAndState();

                if (instanceIdPath) {
                    if (_.isUndefined(self.id = self._host._instanceIdParser.parse(instanceIdPath, args))) {
                        throw new errors.WorkflowError("Cannot parse BeginMethod's instanceIdPath '" + instanceIdPath + "' on arguments of method '" + methodName + "'.");
                    }
                    yield (self._enterLockForCreatedInstance(lockInfo));
                }

                let createEndMethodReached = false;
                let result;
                let endInstanceIdPath = null;
                self._endMethodCallback =
                    function (mn, ip, r) {
                        if (mn === methodName) {
                            createEndMethodReached = true;
                            endInstanceIdPath = ip;
                            result = r;
                        }
                    };

                let idleMethods = [];
                self._idleInstanceIdPathCallback =
                    function (mn, ip) {
                        idleMethods.push(
                            {
                                methodName: mn,
                                instanceIdPath: ip
                            });
                    };

                yield (self._engine.resumeBookmark(specStrings.hosting.createBeginMethodBMName(methodName), enums.activityStates.complete, args));

                if (createEndMethodReached) {
                    if (_.isUndefined(self.id)) {
                        if (endInstanceIdPath) {
                            if (_.isUndefined(self.id = self._host._instanceIdParser.parse(endInstanceIdPath, result))) {
                                throw new errors.WorkflowError("Cannot parse EndMethods's instanceIdPath '" + instanceIdPath + "' on arguments of method '" + methodName + "'.");
                            }
                            yield self._enterLockForCreatedInstance(lockInfo);
                        }
                        else {
                            throw new errors.WorkflowError("BeginMethod or EndMethod of method '" + methodName + "' doesn't specify an instanceIdPath property value.");
                        }
                    }
                }
                else {
                    throw new errors.WorkflowError("Workflow has been completed or gone to idle without reaching an EndMethod activity of method '" + methodName + "'.");
                }

                if (self.execState === enums.activityStates.idle) {
                    if (idleMethods.length === 0) {
                        throw new errors.WorkflowError("Workflow has gone to idle, but there is no active BeginMethod activities to wait for.");
                    }
                }
                else {
                    if (idleMethods.length !== 0) {
                        throw new errors.WorkflowError("Workflow has completed, but there is active BeginMethod activities to wait for.");
                    }
                }

                return result;
            }
            else {
                throw new errors.WorkflowError("Workflow has gone to idle without reaching an instance creator BeginMethod activity of method '" + methodName + "'.");
            }
        }
        else {
            throw new errors.WorkflowError("Workflow has been completed without reaching an instance creator BeginMethod activity.");
        }
    }
    catch (e) {
        debug("Create error: %s", e.stack);
        if (e instanceof errors.TimeoutError) {
            throw new errors.MethodIsNotAccessibleError("Cannot create instanceof workflow '" + self.workflowName + "', because '" + methodName + "' is locked.");
        }
        if (e instanceof errors.BookmarkNotFoundError) {
            throw new errors.MethodIsNotAccessibleError("Cannot create instanceof workflow '" + self.workflowName + "', because bookmark of '" + methodName + "' doesn't exist.");
        }
        throw e;
    }
    finally {
        self._resetCallbacks();
    }
});

WorkflowInstance.prototype._enterLockForCreatedInstance = async(
    function* (lockInfo) {
        if (lockInfo) {
            yield this._host._enterLockForCreatedInstance(this, lockInfo);
        }
    });

WorkflowInstance.prototype.setWorkflow = function (execContext, workflowVersion, instanceId) {
    let self = this;
    if (!(execContext instanceof ActivityExecutionContext)) {
        throw new TypeError("Workflow argument expected.");
    }
    if (!(_.isString(workflowVersion)) || !workflowVersion) {
        throw new TypeError("Workflow version expected.");
    }
    this.workflowVersion = workflowVersion;
    this._engine = new ActivityExecutionEngine(execContext, this);
    this._engine.on(
        enums.events.workflowEvent,
        function (args) {
            let arr = _.toArray(args);
            arr.splice(0, 0, self.instanceId);
            self.emit(enums.events.workflowEvent, args);
        });
    this._addMyTrackers();
    if (!_.isUndefined(instanceId)) {
        this.id = instanceId;
    }
    this._copyParsFromHost();
};

WorkflowInstance.prototype.callMethod = async(function* (methodName, args) {
    let self = this;

    self._resetCallbacksAndState(methodName);

    let endMethodReached = false;
    let result = null;
    self._endMethodCallback =
        function (mn, ip, r) {
            if (mn === methodName) {
                endMethodReached = true;
                result = r;
            }
        };

    let idleMethods = [];
    self._idleInstanceIdPathCallback =
        function (mn, ip) {
            idleMethods.push(
                {
                    methodName: mn,
                    instanceIdPath: ip
                });
        };

    try {
        yield self._engine.resumeBookmark(specStrings.hosting.createBeginMethodBMName(methodName), enums.activityStates.complete, args);

        if (!endMethodReached) {
            throw new errors.WorkflowError("Workflow has been completed or gone to idle without reaching an EndMethod activity of method name '" + methodName + "'.");
        }

        if (self.execState === enums.activityStates.idle) {
            if (idleMethods.length === 0) {
                throw new errors.WorkflowError("Workflow has gone to idle, but there is no active BeginMethod activities to wait for.");
            }
        }
        else {
            if (idleMethods.length !== 0) {
                throw new errors.WorkflowError("Workflow has completed, but there is active BeginMethod activities to wait for.");
            }
        }

        return result;
    }
    catch (e) {
        debug("Call method error: %s", e.stack);
        if (e instanceof errors.BookmarkNotFoundError) {
            throw new errors.MethodIsNotAccessibleError("Cannot call method '" + methodName + "' of workflow '" + self.workflowName + "', because its bookmark doesn't exist.");
        }
        throw e;
    }
    finally {
        self._resetCallbacks();
    }
});

WorkflowInstance.prototype._copyParsFromHost = function () {
    for (let t of this._host._trackers) {
        this._engine.addTracker(t);
    }
};

WorkflowInstance.prototype._addMyTrackers = function () {
    this._addBeginMethodWithCreateInstHelperTracker();
    this._addEndMethodHelperTracker();
    this._addIdleInstanceIdPathTracker();
};

WorkflowInstance.prototype._resetCallbacks = function () {
    this._beginMethodWithCreateInstCallback = null;
    this._endMethodCallback = null;
    this._idleInstanceIdPathCallback = null;
};

WorkflowInstance.prototype._resetCallbacksAndState = function (methodName) {
    this._resetCallbacks();
    if (_.isString(methodName)) {
        _.remove(this.activeDelays, function(elem) {
            return methodName === elem.methodName;
        });
    } else {
        this.activeDelays = [];
    }
};

WorkflowInstance.prototype._addBeginMethodWithCreateInstHelperTracker = function () {
    let self = this;
    let tracker = {
        activityStateFilter: function (args) {
            return self._beginMethodWithCreateInstCallback &&
                args.scope.$activity instanceof BeginMethod &&
                args.scope.canCreateInstance &&
                _.isString(args.scope.methodName) &&
                (!args.scope.instanceIdPath || _.isString(args.scope.instanceIdPath)) &&
                args.reason === enums.activityStates.idle;
        },
        activityStateChanged: function (args) {
            let methodName = args.scope.methodName.trim();
            let instanceIdPath = args.scope.instanceIdPath ? args.scope.instanceIdPath.trim() : null;
            self._beginMethodWithCreateInstCallback(methodName, instanceIdPath);
        }
    };
    self._engine.addTracker(tracker);
};

WorkflowInstance.prototype._addEndMethodHelperTracker = function () {
    let self = this;
    let tracker = {
        activityStateFilter: function (args) {
            return self._endMethodCallback &&
                args.scope.$activity instanceof EndMethod &&
                _.isString(args.scope.methodName) &&
                (!args.scope.instanceIdPath || _.isString(args.scope.instanceIdPath)) &&
                args.reason === enums.activityStates.complete;
        },
        activityStateChanged: function (args) {
            let methodName = args.scope.methodName.trim();
            let instanceIdPath = args.scope.instanceIdPath ? args.scope.instanceIdPath.trim() : null;
            self._endMethodCallback(methodName, instanceIdPath, args.result);
        }
    };
    self._engine.addTracker(tracker);
};

WorkflowInstance.prototype._addIdleInstanceIdPathTracker = function () {
    let self = this;
    let tracker = {
        activityStateFilter: function (args) {
            return  self._idleInstanceIdPathCallback &&
                    args.scope.$activity instanceof BeginMethod &&
                    _.isString(args.scope.methodName) &&
                    _.isString(args.scope.instanceIdPath) &&
                    args.reason === enums.activityStates.idle;
        },
        activityStateChanged: function (args) {
            let methodName = args.scope.methodName.trim();
            let instanceIdPath = args.scope.instanceIdPath.trim();
            self._idleInstanceIdPathCallback(methodName, instanceIdPath);

            // This is where a method goes idle.
            // So if it a DelayTo method, we should remember that.
            if (specStrings.hosting.isDelayToMethodName(methodName)) {
                self.activeDelays.push({
                    methodName: methodName,
                    delayTo: args.scope.delayTo
                });
            }
        }
    };
    self._engine.addTracker(tracker);
};

WorkflowInstance.prototype.getStateToPersist = function () {
    let sp = this._engine.getStateAndPromotions(this._host.options.serializer, this._host.options.enablePromotions);
    return {
        instanceId: this.id,
        createdOn: this.createdOn,
        workflowName: this.workflowName,
        workflowVersion: this.workflowVersion,
        updatedOn: this._engine.updatedOn,
        state: sp.state,
        promotedProperties: sp.promotedProperties,
        activeDelays: this.activeDelays
    };
};

WorkflowInstance.prototype.restoreState = function (json) {
    if (!_.isObject(json)) {
        throw new TypeError("Argument 'json' is not an object.");
    }
    if (json.instanceId !== this.id) {
        throw new Error("State instanceId property value of '" + json.instanceId + "' is different than the current instance id '" + this.id + "'.");
    }
    if (json.workflowName !== this.workflowName) {
        throw new Error("State workflowName property value of '" + json.workflowName + "' is different than the current Workflow name '" + this.workflowName + "'.");
    }
    if (json.workflowVersion !== this.workflowVersion) {
        throw new Error("State workflowVersion property value of '" + json.workflowVersion + "' is different than the current Workflow version '" + this.workflowVersion + "'.");
    }
    if (!_.isDate(json.createdOn)) {
        throw new Error("State createdOn property value of '" + json.createdOn + "' is not a Date.");
    }

    this.createdOn = json.createdOn;
    this._engine.setState(this._host.options.serializer, json.state);
};

WorkflowInstance.prototype.addTracker = function(tracker) {
    this._engine.addTracker(tracker);
};

module.exports = WorkflowInstance;
