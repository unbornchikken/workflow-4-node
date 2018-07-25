"use strict";

let EventEmitter = require("events").EventEmitter;
let Bluebird = require("bluebird");
let async = require("../common").asyncHelpers.async;
let debug = require("debug")("wf4node:WakeUp");
let util = require("util");

function WakeUp(knownInstaStore, persistence, options) {
    EventEmitter.call(this);

    this.knownInstaStore = knownInstaStore;
    this.persistence = persistence;
    this.options = options || {};
    this._working = false;
    this._timeout = null;
    this._batchSize = this.options.batchSize || 10;
    this._timer = Date.now();
}

util.inherits(WakeUp, EventEmitter);

WakeUp.prototype.start = function () {
    if (!this._timeout) {
        debug("Start.");
        let self = this;
        this._timeout = setTimeout(function () { self._step(); }, this.options.interval || 5000);
    }
};

WakeUp.prototype.stop = function () {
    if (this._timeout) {
        debug("Stop.");
        clearTimeout(this._timeout);
        this._timeout = null;
    }
};

WakeUp.prototype._step = async(function*() {
    const interval = Date.now() - this._timer;
    debug("wake up interval %d", interval);
    this._timer = Date.now();
    let self = this;
    try {
        if (this._working) {
            debug("Skipping current step because work in progress.");
            return;
        }
        debug("Starting next step.");
        this._working = true;
        try {
            let wakeupables = yield this._getNextWakeupables();
            if (wakeupables && wakeupables.length) {
                debug("%d selected to wake up.", wakeupables.length);
                let tasks = [];
                let count = 0;
                for (let wakeupable of wakeupables) {
                    tasks.push(async(function*() {
                        if (count >= self._batchSize) {
                            return;
                        }
                        debug("Waking up workflow %s, id: %s", wakeupable.workflowName, wakeupable.instanceId);
                        wakeupable.result = {};
                        let promise = new Bluebird(function (resolve, reject) {
                            wakeupable.result.resolve = resolve;
                            wakeupable.result.reject = reject;
                        });
                        self.emit("continue", wakeupable);
                        try {
                            yield promise;
                            count++;
                            debug("Processing delay completed.");
                        }
                        catch (e) {
                            debug("Processing delay error: %s", e.stack);
                            self.emit("error", e);
                        }
                    })());
                }

                let results = yield Bluebird.settle(tasks);
                for (let result of results) {
                    if (result.isRejected()) {
                        throw result.reason();
                    }
                }
            }
            else {
                debug("There is no instance to wake up.");
            }
        }
        catch (e) {
            this.emit("error", e);
        }
        finally {
            debug("Next step completed.");
            this._working = false;
        }
    }
    finally {
        if (this._timeout) {
            this._timeout = setTimeout(function () { self._step(); }, this.options.interval || 5000);
        }
    }
});

WakeUp.prototype._getNextWakeupables = async(function* () {
    if (this.persistence) {
        return yield this.persistence.getNextWakeupables(this._batchSize * 1.5);
    }
    else {
        return this.knownInstaStore.getNextWakeupables(this._batchSize * 1.5);
    }
});

module.exports = WakeUp;