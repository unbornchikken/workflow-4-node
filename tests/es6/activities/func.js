"use strict";

/* global describe,it */

let wf4node = require("../../../");
let Func = wf4node.activities.Func;
let activityMarkup = wf4node.activities.activityMarkup;
let ActivityExecutionEngine = wf4node.activities.ActivityExecutionEngine;
let assert = require("assert");
let Bluebird = require("bluebird");
let _ = require("lodash");
let errors = wf4node.common.errors;

describe("Func", function () {
    before(function () {
        activityMarkup.registerTypes('../../../lib/es6/activities/index');
    });
    it("should run with a synchronous code", function (done) {
        let fop = new Func();
        fop.code = function (obj) {
            return obj.name;
        };

        let engine = new ActivityExecutionEngine(fop);

        engine.invoke({ name: "Gabor" }).then(
            function (result) {
                assert.equal(result, "Gabor");
            }).nodeify(done);
    });

    it("should run when created from markup", function (done) {
        let fop = activityMarkup.parse(
            {
                "@func": {
                    code: function (obj) {
                        return obj.name;
                    }
                }
            });

        let engine = new ActivityExecutionEngine(fop);

        engine.invoke({ name: "Gabor" }).then(
            function (result) {
                assert.equal(result, "Gabor");
            }).nodeify(done);
    });

    it("should run twice", function (done) {
        let fop = activityMarkup.parse(
            {
                "@func": {
                    code: function (obj) {
                        return obj.name;
                    }
                }
            });

        let engine = new ActivityExecutionEngine(fop);

        engine.invoke({ name: "Gabor" })
            .then(function (result) {
                assert.equal(result, "Gabor");
                return engine.invoke({ name: "Pisti" })
                    .then(function (result2) {
                        assert.equal(result2, "Pisti");
                    });
            }).nodeify(done);
    });

    it("should run when code is asynchronous", function (done) {
        let fop = new Func();
        fop.code = function (obj) {
            return Bluebird.resolve(obj.name);
        };

        let engine = new ActivityExecutionEngine(fop);

        engine.invoke({ name: "Mezo" }).then(
            function (result) {
                assert.equal(result, "Mezo");
            }).nodeify(done);
    });

    it("should run asynchronously when code is a generator", function (done) {
        let fop = Func.async(function* (a) {
            yield Bluebird.delay(100);
            return a.name;
        });

        let engine = new ActivityExecutionEngine(fop);

        engine.invoke({ name: "Mezo" }).then(
            function (result) {
                assert.equal(result, "Mezo");
            }).nodeify(done);
    });

    it("should not accept activities as arguments", function (done) {
        let expected = { name: "Gabor" };
        let fop = new Func();
        fop.code = function (obj) {
            return obj.name;
        };
        let fopin = new Func();
        fopin.code = function () {
            return expected;
        };

        let engine = new ActivityExecutionEngine(fop);

        engine.invoke(fopin)
            .then(function (result) {
                assert(false);
            },
                function (e) {
                    assert(e instanceof errors.ActivityRuntimeError);
                }).nodeify(done);
    });

    it("should work as an agument", function (done) {
        let expected = { name: "Gabor" };

        let fop = activityMarkup.parse(
            {
                "@func": {
                    args: {
                        "@func": {
                            code: function () {
                                return expected;
                            }
                        }
                    },
                    code: function (obj) {
                        return obj.name;
                    }
                }
            });

        let engine = new ActivityExecutionEngine(fop);

        engine.invoke().then(
            function (result) {
                assert.equal(result, expected.name);
            }).nodeify(done);
    });

    it("should include lodash as last argument", function (done) {
        let expected = { name: "GaborMezo" };

        let fop = activityMarkup.parse(
            {
                "@func": {
                    args: {
                        "@func": {
                            code: function () {
                                return expected;
                            }
                        }
                    },
                    code: function (obj, __) {
                        return __.camelCase(obj.name);
                    }
                }
            });

        let engine = new ActivityExecutionEngine(fop);

        engine.invoke().then(
            function (result) {
                assert.equal(result, _.camelCase(expected.name));
            }).nodeify(done);
    });

    describe("calling other methods", function () {
        it("should run when created from markup", function (done) {
            let markup = activityMarkup.parse(
                {
                    "@block": {
                        id: "block",
                        "code": {
                            _: function (obj) {
                                return obj.name;
                            }
                        },
                        args: {
                            "@func": {
                                code: "= this.block.code",
                                args: { name: "Gabor" }
                            }
                        }
                    }
                });

            let engine = new ActivityExecutionEngine(markup);

            engine.invoke().then(
                function (result) {
                    assert.equal(result, "Gabor");
                }).nodeify(done);
        });

        it("should run when code is asynchronous", function (done) {
            let markup = activityMarkup.parse(
                {
                    "@block": {
                        id: "block",
                        "code": {
                            _: function (obj) {
                                return Bluebird.delay(10).then(function () {
                                    return obj.name;
                                });
                            }
                        },
                        args: {
                            "@func": {
                                code: "= this.block.code",
                                args: { name: "Gabor" }
                            }
                        }
                    }
                });

            let engine = new ActivityExecutionEngine(markup);

            engine.invoke().then(
                function (result) {
                    assert.equal(result, "Gabor");
                }).nodeify(done);
        });

        it("should include lodash as last argument", function (done) {
            let markup = activityMarkup.parse(
                {
                    "@block": {
                        id: "block",
                        "code": {
                            _: function (obj, __) {
                                return Bluebird.delay(10).then(function () {
                                    return __.camelCase(obj.name);
                                });
                            }
                        },
                        args: {
                            "@func": {
                                code: "= this.block.code",
                                args: { name: "GaborMezo" }
                            }
                        }
                    }
                });

            let engine = new ActivityExecutionEngine(markup);

            engine.invoke().then(
                function (result) {
                    assert.equal(result, _.camelCase("GaborMezo"));
                }).nodeify(done);
        });

        it("should fail with error", function (done) {
            let markup = activityMarkup.parse(
                {
                    "@block": [
                        function () {
                            throw new Error("Boo.");
                        }
                    ]
                });

            let engine = new ActivityExecutionEngine(markup);

            engine.invoke()
                .then(function (result) {
                    assert(false);
                },
                    function (e) {
                        assert(/Boo/.test(e.message));
                    }).nodeify(done);
        });
    });
});
