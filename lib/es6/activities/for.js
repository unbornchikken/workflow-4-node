const Activity = require('./activity');
const WithBody = require('./withBody');
const BaseLoop = require('./baseLoop');
const _ = require('lodash');

class For extends BaseLoop {
    constructor(config) {
        super(config);
        this.from = null;
        this.to = null;
        this.step = 1;
        this.varName = 'i';
        this.nonScopedProperties.add('_doStep');
    }

    run(callContext, args) {
        const varName = this.varName;
        const from = this.from;
        const to = this.to;
        const step = this.step;
        if (!_.isNull(from) && !_.isNull(to) && !_.isNull(step)) {
            this[varName] = null;
            callContext.schedule([from, to, step], '_valuesGot');
        } else {
            callContext.complete();
        }
    }

    _valuesGot(callContext, reason, result) {
        if (reason === Activity.states.complete) {
            this._from = result[0];
            this._to = result[1];
            this._step = result[2];
            callContext.activity._doStep.call(this, callContext);
        } else {
            callContext.end(reason, result);
        }
    }

    _doStep(callContext, lastResult) {
        const varName = this.varName;
        const from = this._from;
        const to = this._to;
        const step = this._step;
        if (!_.isNumber(from)) {
            callContext.fail(new TypeError(`For activity's from value '${from}' is not a number.`));
            return;
        }
        if (!_.isNumber(to)) {
            callContext.fail(new TypeError(`For activity's to value '${to}' is not a number.`));
            return;
        }
        if (!_.isNumber(step)) {
            callContext.fail(new TypeError(`For activity's step value '${step}' is not a number.`));
            return;
        }
        let current;
        if (_.isNull(this[varName])) {
            this[varName] = from;
            current = this[varName];
        } else {
            this[varName] = (this[varName] + step);
            current = this[varName];
        }
        if (step >= 0 && current >= to) {
            callContext.complete(lastResult);
        } else if (step < 0 && current <= to) {
            callContext.complete(lastResult);
        } else {
            WithBody.prototype.run.call(this, callContext);
        }
    }
}

module.exports = For;