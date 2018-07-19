const Activity = require('./activity')
const Block = require('./block')
const { errors } = require('../common');
const { IgnoredByTryCatchEvent } = require('../common/events');

class Try extends Activity {
    constructor(config) {
        super();
        this.arrayProperties.add('catch');
        this.arrayProperties.add('finally');
        this.nonScopedProperties.add('continueAfterFinally');

        this.varName = 'e';
        this._body = null;
        this.catch = null;
        this.finally = null;
    }
    initializeStructure() {
        this._body = new Block();
        this._body.args = this.args;
        this.args = null;
        if (this.catch) {
            const prev = this.catch;
            this.catch = new Block();
            this.catch.args = prev;
        }
        if (this.finally) {
            const prev = this.finally;
            this.finally = new Block();
            this.finally.args = prev;
        }
    }

    run(callContext, args) {
        callContext.schedule(this._body, '_bodyFinished');
    }

    _bodyFinished(callContext, reason, result) {
        // if we found continue or break, forget rest of this try/catch logic, and let it ride up
        // this is when break/continue is inside args[] of @Try
        if (result instanceof IgnoredByTryCatchEvent) {
            callContext.fail(result);
            return;
        }
        if (this.catch || this.finally) {
            this._originalResult = result;
            this._originalReason = reason;
            if (reason === Activity.states.fail
                && !(result instanceof errors.ActivityRuntimeError) && this.catch) {
                this[this.varName] = result;
                this.Try_ReThrow = false;
                callContext.schedule(this.catch, '_catchDone');
                return;
            } else if ((reason === Activity.states.fail || reason === Activity.states.complete) && this.finally) {
                callContext.schedule(this.finally, '_finallyDone');
                return;
            }
        }
        callContext.end(reason, result);
    }

    _catchDone(callContext, reason, result) {
        // continue/break inside a catch{} of @Try will fail the callContext and ride up
        // so although it's not explicitly coded, keep in mind continue/breaks are still riding up
        // explicit code would look like: if (result instanceof LoopEvent) callContext.end(reason, result)
        if (reason !== Activity.states.complete) {
            callContext.end(reason, result);
            return;
        }

        this._catchResult = result;
        if (this.finally) {
            callContext.schedule(this.finally, '_finallyDone');
        } else {
            callContext.activity.continueAfterFinally.call(this, callContext);
        }
    }

    _finallyDone(callContext, reason, result) {
        // same notes as _catchDone
        if (reason !== Activity.states.complete) {
            callContext.end(reason, result);
            return;
        }
        callContext.activity.continueAfterFinally.call(this, callContext);
    }

    continueAfterFinally(callContext) {
        const reason = this._originalReason;
        const result = this._originalResult;
        if (reason === Activity.states.fail && !_.isUndefined(this.Try_ReThrow)) {
            // We've came from a catch:
            if (this.Try_ReThrow === true) {
                callContext.fail(result);
            } else if (this.Try_ReThrow instanceof Error) {
                callContext.fail(this.Try_ReThrow);
            } else {
                callContext.complete(this._catchResult);
            }
        } else {
            callContext.end(reason, result);
        }
    }
}
module.exports = Try;