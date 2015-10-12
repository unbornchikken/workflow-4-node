"use strict";
var wf4node = require("../../../");
var ActivityExecutionEngine = wf4node.activities.ActivityExecutionEngine;
var _ = require("lodash");
var assert = require("assert");
describe("templates", function() {
  it("should parse object correctly", function(done) {
    var engine = new ActivityExecutionEngine({"@template": {declare: {
          a: "foo",
          b: ["zoo", {c: {"@func": {code: function() {
                  return 6;
                }}}}, "= 42"]
        }}});
    engine.invoke().then(function(result) {
      assert.ok(_.isPlainObject(result));
      assert.equal(result.a, "foo");
      assert.ok(_.isArray(result.b));
      assert.equal(result.b.length, 3);
      assert.equal(result.b[0], "zoo");
      assert.ok(_.isPlainObject(result.b[1]));
      assert.equal(result.b[1].c, 6);
      assert.equal(result.b[2], 42);
    }).nodeify(done);
  });
  it("should work when specialized", function(done) {
    var engine = new ActivityExecutionEngine({"@block": [{
        a: "foo",
        b: ["zoo", {c: {"@func": {code: function() {
                return 6;
              }}}}, "= 42"]
      }]});
    engine.invoke().then(function(result) {
      assert.ok(_.isPlainObject(result));
      assert.equal(result.a, "foo");
      assert.ok(_.isArray(result.b));
      assert.equal(result.b.length, 3);
      assert.equal(result.b[0], "zoo");
      assert.ok(_.isPlainObject(result.b[1]));
      assert.equal(result.b[1].c, 6);
      assert.equal(result.b[2], 42);
    }).nodeify(done);
  });
  it("should work on arrays", function(done) {
    var engine = new ActivityExecutionEngine({"@block": {
        rule: {value: 22},
        args: [{"@block": {
            a: [{$project: {$literal: "= this.rule.value"}}],
            args: ["= this.a"]
          }}]
      }});
    engine.invoke().then(function(result) {
      assert.ok(_.isArray(result));
      assert.ok(_.isPlainObject(result[0].$project));
      assert.equal(result[0].$project.$literal, 22);
    }).nodeify(done);
  });
  it("should ignore escaped markup", function(done) {
    var engine = new ActivityExecutionEngine({"@block": {
        id: "poo",
        stuff: {_: {sayHello: function(name) {
              return "Hello, " + name + "!";
            }}},
        args: [{"@func": {
            args: " = this.poo.stuff.sayHello",
            code: function(f) {
              return f("Gabor");
            }
          }}]
      }});
    engine.invoke().then(function(result) {
      assert.equal(result, "Hello, Gabor!");
    }).nodeify(done);
  });
});

//# sourceMappingURL=templates.js.map
