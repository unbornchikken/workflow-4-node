"use strict";

/* global describe,it */

let wf4node = require("../../../");
let Func = wf4node.activities.Func;
let activityMarkup = wf4node.activities.activityMarkup;
let ActivityExecutionEngine = wf4node.activities.ActivityExecutionEngine;
let assert = require("assert");
let Bluebird = require("bluebird");
let Block = wf4node.activities.Block;
let _ = require("lodash");

describe("declarators", function () {
    describe("Block", function () {
        it("should handle variables well", function (done) {
            let block = new Block();
            block.let1 = 1;
            block.let2 = 2;
            block.let3 = 3;

            let f1 = new Func();
            f1.code = function () {
                return (this.let3 = (this.let3 + this.let1 * 2));
            };

            let f2 = new Func();
            f2.code = function () {
                return (this.let3 = (this.let3 + this.let2 * 3));
            };

            let f3 = new Func();
            f3.code = function () {
                return this.let3 * 4;
            };

            block.args = [f1, f2, f3];

            let engine = new ActivityExecutionEngine(block);

            engine.invoke().then(
                function (result) {
                    let x1 = 1;
                    let x2 = 2;
                    let x3 = 3;
                    x3 += x1 * 2;
                    x3 += x2 * 3;
                    let r = x3 * 4;
                    assert.equal(result, r);
                }).nodeify(done);
        });

        it("can be generated from markup", function (done) {
            let block = activityMarkup.parse(
                {
                    "@block": {
                        let1: 1,
                        let2: {
                            "@func": {
                                code: function () {
                                    return 2;
                                }
                            }
                        },
                        let3: 3,
                        args: [
                            {
                                "@func": {
                                    code: function bubu() {
                                        return this.let3 += this.let1 * 2;
                                    }
                                }
                            },
                            {
                                "@func": {
                                    code: function kittyfuck() {
                                        return this.let3 += this.let2 * 3;
                                    }
                                }
                            },
                            {
                                "@func": {
                                    code: function () {
                                        return this.let3 * 4;
                                    }
                                }
                            }
                        ]
                    }
                });

            let engine = new ActivityExecutionEngine(block);

            engine.invoke().then(
                function (result) {
                    let x1 = 1;
                    let x2 = 2;
                    let x3 = 3;
                    x3 += x1 * 2;
                    x3 += x2 * 3;
                    let r = x3 * 4;
                    assert.equal(result, r);
                }).nodeify(done);
        });

        it("can be generated from markup string", function (done) {
            let markup = {
                "@block": {
                    let1: 1,
                    let2: 2,
                    let3: 3,
                    args: [
                        {
                            "@func": {
                                code: function bubu() {
                                    return (this.let3 = this.let3 + this.let1 * 2);
                                }
                            }
                        },
                        {
                            "@func": {
                                code: function kittyfuck() {
                                    return (this.let3 = this.let3 + this.let2 * 3);
                                }
                            }
                        },
                        {
                            "@func": {
                                code: function () {
                                    return this.let3 * 4;
                                }
                            }
                        }
                    ]
                }
            };

            let markupString = activityMarkup.stringify(markup);
            assert.ok(_.isString(markupString));
            let block = activityMarkup.parse(markupString);

            let engine = new ActivityExecutionEngine(block);

            engine.invoke().then(
                function (result) {
                    let x1 = 1;
                    let x2 = 2;
                    let x3 = 3;
                    x3 += x1 * 2;
                    x3 += x2 * 3;
                    let r = x3 * 4;
                    assert.equal(result, r);
                }).nodeify(done);
        });
    });

    describe("Parallel", function () {
        it("should work as expected with sync activities", function (done) {
            let activity = activityMarkup.parse(
                {
                    "@parallel": {
                        let1: "",
                        args: [
                            {
                                "@func": {
                                    code: function () {
                                        return this.let1 += "a";
                                    }
                                }
                            },
                            {
                                "@func": {
                                    code: 'function() { return this.let1 += "b"; }'
                                }
                            }
                        ]
                    }
                });

            let engine = new ActivityExecutionEngine(activity);
            //engine.addTracker(new ConsoleTracker());

            engine.invoke().then(
                function (result) {
                    assert.equal(result.length, 2);
                    assert.equal(result[0], "a");
                    assert.equal(result[1], "ab");
                }).nodeify(done);
        });

        it("should work as expected with async activities", function (done) {
            let activity = activityMarkup.parse(
                {
                    "@parallel": {
                        let1: "",
                        args: [
                            {
                                "@func": {
                                    code: function () {
                                        return this.let1 += "a";
                                    }
                                }
                            },
                            {
                                "@func": {
                                    code: 'function() { return this.let1 += "b"; }'
                                }
                            },
                            {
                                "@func": {
                                    code: function () {
                                        return Bluebird.delay(100).then(function () {
                                            return 42;
                                        });
                                    }
                                }
                            },
                            {
                                "@func": {
                                    code: function () {
                                        return new Bluebird(function (resolve, reject) {
                                            setImmediate(function () {
                                                resolve(0);
                                            });
                                        });
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
                    assert.equal(result.length, 4);
                    assert.equal(result[0], "a");
                    assert.equal(result[1], "ab");
                    assert.equal(result[2], 42);
                    assert.equal(result[3], 0);
                }).nodeify(done);
        });
    });

    describe.skip("Pick", function () {
        it("should work as expected with sync activities", function (done) {
            let activity = activityMarkup.parse(
                {
                    "@pick": {
                        let1: "",
                        args: [
                            {
                                "@func": {
                                    code: function () {
                                        return this.let1 += "a";
                                    }
                                }
                            },
                            {
                                "@func": {
                                    code: 'function() { return this.let1 += "b"; }'
                                }
                            }
                        ]
                    }
                });

            let engine = new ActivityExecutionEngine(activity);

            engine.invoke().then(
                function (result) {
                    assert.equal(result, "a");
                }).nodeify(done);
        });

        it("should work as expected with async activities", function (done) {
            let activity = activityMarkup.parse(
                {
                    "@pick": [
                        {
                            "@func": {
                                code: function () {
                                    return Bluebird.delay(100).then(function () {
                                        return 42;
                                    });
                                }
                            }
                        },
                        {
                            "@func": {
                                code: function () {
                                    return new Bluebird(function (resolve, reject) {
                                        setImmediate(function () {
                                            resolve(0);
                                        });
                                    });
                                }
                            }
                        }
                    ]
                });

            let engine = new ActivityExecutionEngine(activity);

            engine.invoke().then(
                function (result) {
                    assert.equal(result, 0);
                }).nodeify(done);
        });
    });
});
