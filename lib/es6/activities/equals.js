"use strict";

let Activity = require("./activity");
let util = require("util");

function Equals() {
    Activity.call(this);

    this.value = null;
    this.to = null;
    this.is = true;
    this.isNot = false;
    this.strict = false;
}

util.inherits(Equals, Activity);

Equals.prototype.run = function(callContext, args) {
    callContext.schedule([this.value, this.to], "_valueAndToGot");
};

Equals.prototype._valueAndToGot = function(callContext, reason, result) {
    if (reason !== Activity.states.complete) {
        callContext.end(reason, result);
        return;
    }

    if (this.strict ? result[0] === result[1] : result[0] == result[1]) {
        callContext.schedule(this.is, "_done");
    }
    else {
        callContext.schedule(this.isNot, "_done");
    }
};

Equals.prototype._done = function(callContext, reason, result) {
    callContext.end(reason, result);
};

module.exports = Equals;
