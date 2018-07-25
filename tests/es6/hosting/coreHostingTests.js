"use strict";

/* global describe,it */

let wf4node = require("../../../");
let InstanceIdParser = wf4node.hosting.InstanceIdParser;
let _ = require("lodash");
let hostingTestCommon = require("./hostingTestCommon");
let MemoryPersistence = wf4node.hosting.MemoryPersistence;
let Serializer = require("backpack-node").system.Serializer;

let assert = require("assert");

describe("InstanceIdParser", function () {
    describe("parse()", function () {
        it("should understand common paths", function () {
            let p = new InstanceIdParser();
            assert.equal(p.parse("this", 1), 1);
            assert.equal(p.parse("[0]", [1]), 1);
            assert.equal(p.parse("[0]", [4, 5]), 4);
            assert.equal(p.parse("[1].id", [{ id: 1 }, { id: 2 }]), 2);
            assert.equal(p.parse("id[0].a", { id: [{ a: "foo" }] }), "foo");
        });
    });
});

describe("WorkflowHost", function () {
    this.timeout(60000);

    function getInfo(options) {
        return `persistence: ${options.persistence ? "on" : "off"}, lazy: ${options.lazyPersistence ? "yes" : "no"}, serializer: ${options.serializer ? "yes" : "no"}, alwaysLoad: ${options.alwaysLoadState ? "yes" : "no"}`;
    }

    function testBasic(options) {
        it("should run by: " + getInfo(options), function (done) {
            hostingTestCommon.doBasicHostTest(options).nodeify(done);
        });
    }

    function testCalc(options) {
        it("should run by: " + getInfo(options), function (done) {
            hostingTestCommon.doCalculatorTest(options).nodeify(done);
        });
    }

    function testDelayTo(options) {
        it("should run by: " + getInfo(options), function (done) {
            hostingTestCommon.doDelayTest(options).nodeify(done);
        });
    }

    function testStopOutdatedVersions(options) {
        it("should run by: " + getInfo(options), function (done) {
            hostingTestCommon.doStopOutdatedVersionsTest(options).nodeify(done);
        });
    }

    let allOptions = [
        {
            persistence: null,
            lazyPersistence: false,
            serializer: null,
            alwaysLoadState: false
        },
        {
            persistence: new MemoryPersistence(),
            lazyPersistence: false,
            serializer: null,
            alwaysLoadState: false
        },
        {
            persistence: new MemoryPersistence(),
            lazyPersistence: true,
            serializer: null,
            alwaysLoadState: false
        },
        {
            persistence: new MemoryPersistence(),
            lazyPersistence: false,
            serializer: new Serializer(),
            alwaysLoadState: false
        },
        {
            persistence: new MemoryPersistence(),
            lazyPersistence: true,
            serializer: new Serializer(),
            alwaysLoadState: false
        },
        {
            persistence: new MemoryPersistence(),
            lazyPersistence: false,
            serializer: new Serializer(),
            alwaysLoadState: true
        },
        {
            persistence: new MemoryPersistence(),
            lazyPersistence: true,
            serializer: new Serializer(),
            alwaysLoadState: true
        }
    ];

    describe("Without Persistence and With Memory Persistence", function () {
        describe("Basic Example", function () {
            for (let opt of allOptions) {
                if (opt.persistence) {
                    opt.persistence.clear();
                }
                testBasic(opt);
            }
        });

        describe("Calculator Example", function () {
            for (let opt of allOptions) {
                if (opt.persistence) {
                    opt.persistence.clear();
                }
                testCalc(opt);
            }
        });

        describe("DelayTo Example", function () {
            for (let opt of allOptions) {
                if (opt.persistence) {
                    opt.persistence.clear();
                }
                testDelayTo(opt);
            }
        });

        describe("StopOutdatedVersions Example", function () {
            for (let opt of allOptions) {
                if (opt.persistence) {
                    opt.persistence.clear();
                }
                testStopOutdatedVersions(opt);
            }
        });
    });
});
