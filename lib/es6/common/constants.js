"use strict";

let _ = require("lodash");

const maxLen = "collectingCompletedBookmark".length;
const identity = "-:\|$WF4N$|/:-";
const undefinedReplacement = "__UNDEFINED__";

function make(name) {
    let inner = _.snakeCase(name).toUpperCase();
    if (inner.length > maxLen) {
        inner = inner.substr(0, maxLen);
    }
    else while (inner.length < maxLen) {
        inner += "_";
    }
    return identity + inner;
}

let constants = {
    identity: identity,
    undefinedReplacement: undefinedReplacement,
    markers: {
        valueCollectedBookmark: make("mValueCollectedBookmark"),
        collectingCompletedBookmark: make("mCollectingCompletedBookmark"),
        beginMethodBookmark: make("mBeginMethodBookmark"),
        activityProperty: make("mActivityProperty"),
        activityInstance: make("mActivityInstance"),
        keySeparator: make("mKeySeparator"),
        nope: make("mNope"),
        delayToMethodNamePrefix: make("mDelayToMethodNamePrefix"),
        $parent: make("mParent")
    },
    ids: {
        initialScope: make("mInitialScope")
    },
    types: {
        error: make("mError"),
        schedulingState: make("mSchedulingState"),
        date: make("mDate"),
        set: make("mSet"),
        map: make("mMap"),
        rex: make("mRex"),
        object: make("mObject")
    }
};

module.exports = constants;
