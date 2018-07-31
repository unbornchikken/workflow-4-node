"use strict";

/* global describe,it */

let wf4node = require("../../../");
let Expression = wf4node.activities.Expression;
let Func = wf4node.activities.Func;
let Block = wf4node.activities.Block;
let activityMarkup = wf4node.activities.activityMarkup;
let ActivityExecutionEngine = wf4node.activities.ActivityExecutionEngine;
let _ = require("lodash");
let ConsoleTracker = wf4node.activities.ConsoleTracker;
let WorkflowHost = wf4node.hosting.WorkflowHost;
let InstanceIdParser = wf4node.hosting.InstanceIdParser;
let assert = require("assert");

describe("bookmarking", function () {
    it("should handle parallel activities", function (done) {
        let activity = activityMarkup.parse(
            {
                "@parallel": {
                    var1: "",
                    displayName: "Root",
                    args: [
                        {
                            "@block": {
                                displayName: "Wait Block 1",
                                args: [
                                    {
                                        "@waitForBookmark": {
                                            displayName: "Wait 1",
                                            bookmarkName: "bm1"
                                        }
                                    },
                                    {
                                        "@func": {
                                            displayName: "Func 1",
                                            code: function () {
                                                return this.var1 += "a";
                                            }
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            "@block": {
                                displayName: "Wait Block 2",
                                args: [
                                    {
                                        "@waitForBookmark": {
                                            displayName: "Wait 2",
                                            bookmarkName: "bm2"
                                        }
                                    },
                                    {
                                        "@func": {
                                            displayName: "Func 2",
                                            code: function () {
                                                return this.var1 += "b";
                                            }
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            "@block": {
                                displayName: "Resume Block",
                                args: [
                                    {
                                        "@resumeBookmark": {
                                            displayName: "Resume 1",
                                            bookmarkName: "bm1"
                                        }
                                    },
                                    {
                                        "@resumeBookmark": {
                                            displayName: "Resume 2",
                                            bookmarkName: "bm2"
                                        }
                                    },
                                    "bubu"
                                ]
                            }
                        }
                    ]
                }
            });

        let engine = new ActivityExecutionEngine(activity);
        //engine.addTracker(new ConsoleTracker());

        engine.invoke().then(
            function (result) {
                try {
                    assert.ok(_.isArray(result));
                    assert.equal(result.length, 3);
                    assert.equal(result[0], "a");
                    assert.equal(result[1], "ab");
                    assert.equal(result[2], "bubu");
                }
                catch (e) {
                    assert.ifError(e);
                }
            }).nodeify(done);
    });

    it.skip("should handle of picking activities", function (done) {
        let activity = activityMarkup.parse(
            {
                "@block": {
                    var1: 0,
                    args: [
                        {
                            "@parallel": [
                                {
                                    "@pick": [
                                        {
                                            "@block": [
                                                {
                                                    "@waitForBookmark": {
                                                        bookmarkName: "foo"
                                                    }
                                                },
                                                {
                                                    "@func": {
                                                        displayName: "Do Not Do This Func",
                                                        code: function () {
                                                            this.var1 = -1;
                                                        }
                                                    }
                                                }
                                            ]
                                        },
                                        {
                                            "@block": [
                                                {
                                                    "@waitForBookmark": {
                                                        bookmarkName: "bm"
                                                    }
                                                },
                                                {
                                                    "@func": {
                                                        displayName: "Do This Func",
                                                        code: function () {
                                                            this.var1 = 1;
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                },
                                {
                                    "@resumeBookmark": {
                                        bookmarkName: "bm"
                                    }
                                }
                            ]
                        },
                        {
                            "@func": {
                                displayName: "Final Func",
                                code: function () {
                                    return this.var1;
                                }
                            }
                        }
                    ]
                }
            });

        let engine = new ActivityExecutionEngine(activity);
        //engine.addTracker(new ConsoleTracker());

        engine.invoke().then(
            function (result) {
                try {
                    assert.equal(result, 1);
                }
                catch (e) {
                    assert.ifError(e);
                }
            }).nodeify(done);
    });
});