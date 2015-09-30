"use strict";
var wf4node = require("../../../");
var Func = wf4node.activities.Func;
var ActivityExecutionEngine = wf4node.activities.ActivityExecutionEngine;
var assert = require("better-assert");
var Bluebird = require("bluebird");
var _ = require("lodash");
var async = wf4node.common.asyncHelpers.async;
describe("cancellation", function() {
  describe("Cancel", function() {
    it("when force is set then it should cancel other branches", function(done) {
      async($traceurRuntime.initGeneratorFunction(function $__5() {
        var x,
            engine,
            e;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                x = false;
                engine = new ActivityExecutionEngine({"@parallel": {args: [function() {
                      return Bluebird.delay(200).then(function() {
                        throw new Error("b+");
                      });
                    }, {"@block": [{"@delay": {ms: 200}}, function() {
                        x = true;
                      }]}, {"@block": [{"@delay": {ms: 100}}, {"@throw": {error: "foo"}}]}, {"@block": [{"@delay": {ms: 50}}, {"@cancel": {force: true}}]}]}});
                $ctx.state = 17;
                break;
              case 17:
                $ctx.pushTry(7, null);
                $ctx.state = 10;
                break;
              case 10:
                $ctx.state = 2;
                return engine.invoke();
              case 2:
                $ctx.maybeThrow();
                $ctx.state = 4;
                break;
              case 4:
                assert(false);
                $ctx.state = 6;
                break;
              case 6:
                $ctx.popTry();
                $ctx.state = -2;
                break;
              case 7:
                $ctx.popTry();
                $ctx.maybeUncatchable();
                e = $ctx.storedException;
                $ctx.state = 13;
                break;
              case 13:
                assert(e instanceof wf4node.common.errors.Cancelled);
                assert(!x);
                $ctx.state = -2;
                break;
              default:
                return $ctx.end();
            }
        }, $__5, this);
      }))().nodeify(done);
    });
    it("when not force it should run other branches before terminating", function(done) {
      async($traceurRuntime.initGeneratorFunction(function $__5() {
        var x,
            y,
            engine,
            e;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                x = 0;
                y = 0;
                engine = new ActivityExecutionEngine({"@block": {args: [{"@parallel": [function() {
                        x++;
                      }, {"@cancel": {}}]}, function() {
                      y++;
                    }]}});
                $ctx.state = 17;
                break;
              case 17:
                $ctx.pushTry(7, null);
                $ctx.state = 10;
                break;
              case 10:
                $ctx.state = 2;
                return engine.invoke();
              case 2:
                $ctx.maybeThrow();
                $ctx.state = 4;
                break;
              case 4:
                assert(false);
                $ctx.state = 6;
                break;
              case 6:
                $ctx.popTry();
                $ctx.state = -2;
                break;
              case 7:
                $ctx.popTry();
                $ctx.maybeUncatchable();
                e = $ctx.storedException;
                $ctx.state = 13;
                break;
              case 13:
                assert(e instanceof wf4node.common.errors.Cancelled);
                assert(x === 1);
                assert(!y);
                $ctx.state = -2;
                break;
              default:
                return $ctx.end();
            }
        }, $__5, this);
      }))().nodeify(done);
    });
  });
  describe("CancellationScope", function() {
    it("when force is set then it should cancel other branches, and it should handled in scope", function(done) {
      async($traceurRuntime.initGeneratorFunction(function $__5() {
        var x,
            y,
            engine;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                x = false;
                y = false;
                engine = new ActivityExecutionEngine({"@cancellationScope": {
                    args: {"@parallel": {args: [function() {
                          return Bluebird.delay(200).then(function() {
                            throw new Error("b+");
                          });
                        }, {"@block": [{"@delay": {ms: 200}}, function() {
                            x = true;
                          }]}, {"@block": [{"@delay": {ms: 100}}, {"@throw": {error: "foo"}}]}, {"@block": [{"@delay": {ms: 50}}, {"@cancel": {force: true}}]}]}},
                    cancelled: [function() {
                      y = true;
                    }]
                  }});
                $ctx.state = 6;
                break;
              case 6:
                $ctx.state = 2;
                return engine.invoke();
              case 2:
                $ctx.maybeThrow();
                $ctx.state = 4;
                break;
              case 4:
                assert(!x);
                assert(y);
                $ctx.state = -2;
                break;
              default:
                return $ctx.end();
            }
        }, $__5, this);
      }))().nodeify(done);
    });
    it("when not force it should run other branches before terminating", function(done) {
      async($traceurRuntime.initGeneratorFunction(function $__5() {
        var x,
            y,
            z,
            engine;
        return $traceurRuntime.createGeneratorInstance(function($ctx) {
          while (true)
            switch ($ctx.state) {
              case 0:
                x = 0;
                y = 0;
                z = false;
                engine = new ActivityExecutionEngine({"@cancellationScope": {
                    args: {"@block": {args: [{"@parallel": [function() {
                            x++;
                          }, {"@cancel": {}}]}, function() {
                          y++;
                        }]}},
                    cancelled: function() {
                      z = true;
                    }
                  }});
                $ctx.state = 6;
                break;
              case 6:
                $ctx.state = 2;
                return engine.invoke();
              case 2:
                $ctx.maybeThrow();
                $ctx.state = 4;
                break;
              case 4:
                assert(x === 1);
                assert(!y);
                assert(z);
                $ctx.state = -2;
                break;
              default:
                return $ctx.end();
            }
        }, $__5, this);
      }))().nodeify(done);
    });
  });
});
//# sourceMappingURL=data:application/json;base64,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OztrQkE4TFEsRUFBQTtrQkFDQSxFQUFBO2tCQUNBLE1BQUk7dUJBQ0MsSUFBSSx3QkFBc0IsQUFBQyxDQUFDLENBQ3JDLG9CQUFtQixDQUFHO0FBQ2xCLHVCQUFHLENBQUcsRUFDRixRQUFPLENBQUcsRUFDTixJQUFHLENBQUcsRUFDRixDQUNJLFdBQVUsQ0FBRyxFQUNULFNBQVUsQUFBRCxDQUFHO0FBQ1IsNEJBQUEsRUFBRSxDQUFDOzBCQUNQLENBQ0EsRUFDSSxTQUFRLENBQUcsR0FBQyxDQUNoQixDQUNKLENBQ0osQ0FDQSxVQUFVLEFBQUQsQ0FBRztBQUNSLDBCQUFBLEVBQUUsQ0FBQzt3QkFDUCxDQUNKLENBQ0osQ0FDSjtBQUNBLDRCQUFRLENBQUcsVUFBUyxBQUFELENBQUc7QUFDbEIsc0JBQUEsRUFBSSxLQUFHLENBQUM7b0JBQ1o7QUFBQSxrQkFDSixDQUNKLENBQUM7Ozs7O3FCQUVLLENBQUEsTUFBSyxPQUFPLEFBQUMsRUFBQzs7QUE3TnBDLG1CQUFHLFdBQVcsQUFBQyxFQUFDLENBQUE7Ozs7QUE4TkEscUJBQUssQUFBQyxDQUFDLENBQUEsSUFBTSxFQUFBLENBQUMsQ0FBQztBQUNmLHFCQUFLLEFBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQyxDQUFDO0FBQ1YscUJBQUssQUFBQyxDQUFDLENBQUEsQ0FBQyxDQUFDOzs7O0FBaE96QixxQkFBTyxDQUFBLElBQUcsSUFBSSxBQUFDLEVBQUMsQ0FBQTs7QUFDbUIsUUFDL0IsT0FBNkIsS0FBRyxDQUFDLENBQUM7TUErTjFCLENBak8yQyxDQWlPMUMsQUFBQyxFQUFDLFFBQVEsQUFBQyxDQUFDLElBQUcsQ0FBQyxDQUFDO0lBQ3RCLENBQUMsQ0FBQztFQUNOLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQztBQUFBIiwiZmlsZSI6ImFjdGl2aXRpZXMvY2FuY2VsbGF0aW9uLmpzIiwic291cmNlUm9vdCI6InRlc3RzL2VzNiIsInNvdXJjZXNDb250ZW50IjpbIlwidXNlIHN0cmljdFwiO1xyXG5cclxuLyogZ2xvYmFsIGRlc2NyaWJlLGl0ICovXHJcblxyXG5sZXQgd2Y0bm9kZSA9IHJlcXVpcmUoXCIuLi8uLi8uLi9cIik7XHJcbmxldCBGdW5jID0gd2Y0bm9kZS5hY3Rpdml0aWVzLkZ1bmM7XHJcbmxldCBBY3Rpdml0eUV4ZWN1dGlvbkVuZ2luZSA9IHdmNG5vZGUuYWN0aXZpdGllcy5BY3Rpdml0eUV4ZWN1dGlvbkVuZ2luZTtcclxubGV0IGFzc2VydCA9IHJlcXVpcmUoXCJiZXR0ZXItYXNzZXJ0XCIpO1xyXG5sZXQgQmx1ZWJpcmQgPSByZXF1aXJlKFwiYmx1ZWJpcmRcIik7XHJcbmxldCBfID0gcmVxdWlyZShcImxvZGFzaFwiKTtcclxubGV0IGFzeW5jID0gd2Y0bm9kZS5jb21tb24uYXN5bmNIZWxwZXJzLmFzeW5jO1xyXG5cclxuZGVzY3JpYmUoXCJjYW5jZWxsYXRpb25cIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgZGVzY3JpYmUoXCJDYW5jZWxcIiwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGl0KFwid2hlbiBmb3JjZSBpcyBzZXQgdGhlbiBpdCBzaG91bGQgY2FuY2VsIG90aGVyIGJyYW5jaGVzXCIsIGZ1bmN0aW9uIChkb25lKSB7XHJcbiAgICAgICAgICAgIGFzeW5jKGZ1bmN0aW9uKigpIHtcclxuICAgICAgICAgICAgICAgIGxldCB4ID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBsZXQgZW5naW5lID0gbmV3IEFjdGl2aXR5RXhlY3V0aW9uRW5naW5lKHtcclxuICAgICAgICAgICAgICAgICAgICBcIkBwYXJhbGxlbFwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBCbHVlYmlyZC5kZWxheSgyMDApLnRoZW4oZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImIrXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkBibG9ja1wiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQGRlbGF5XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtczogMjAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHggPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkBibG9ja1wiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQGRlbGF5XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtczogMTAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQHRocm93XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJmb29cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkBibG9ja1wiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQGRlbGF5XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtczogNTBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJAY2FuY2VsXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3JjZTogdHJ1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICB5aWVsZCBlbmdpbmUuaW52b2tlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGUgaW5zdGFuY2VvZiB3ZjRub2RlLmNvbW1vbi5lcnJvcnMuQ2FuY2VsbGVkKTtcclxuICAgICAgICAgICAgICAgICAgICBhc3NlcnQoIXgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KSgpLm5vZGVpZnkoZG9uZSk7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGl0KFwid2hlbiBub3QgZm9yY2UgaXQgc2hvdWxkIHJ1biBvdGhlciBicmFuY2hlcyBiZWZvcmUgdGVybWluYXRpbmdcIiwgZnVuY3Rpb24gKGRvbmUpIHtcclxuICAgICAgICAgICAgYXN5bmMoZnVuY3Rpb24qKCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHggPSAwO1xyXG4gICAgICAgICAgICAgICAgbGV0IHkgPSAwO1xyXG4gICAgICAgICAgICAgICAgbGV0IGVuZ2luZSA9IG5ldyBBY3Rpdml0eUV4ZWN1dGlvbkVuZ2luZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgXCJAYmxvY2tcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJAcGFyYWxsZWxcIjogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHgrKztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJAY2FuY2VsXCI6IHt9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeSsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICB5aWVsZCBlbmdpbmUuaW52b2tlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KGUgaW5zdGFuY2VvZiB3ZjRub2RlLmNvbW1vbi5lcnJvcnMuQ2FuY2VsbGVkKTtcclxuICAgICAgICAgICAgICAgICAgICBhc3NlcnQoeCA9PT0gMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0KCF5KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSkoKS5ub2RlaWZ5KGRvbmUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgZGVzY3JpYmUoXCJDYW5jZWxsYXRpb25TY29wZVwiLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaXQoXCJ3aGVuIGZvcmNlIGlzIHNldCB0aGVuIGl0IHNob3VsZCBjYW5jZWwgb3RoZXIgYnJhbmNoZXMsIGFuZCBpdCBzaG91bGQgaGFuZGxlZCBpbiBzY29wZVwiLCBmdW5jdGlvbiAoZG9uZSkge1xyXG4gICAgICAgICAgICBhc3luYyhmdW5jdGlvbiooKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgeCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgbGV0IHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGxldCBlbmdpbmUgPSBuZXcgQWN0aXZpdHlFeGVjdXRpb25FbmdpbmUoe1xyXG4gICAgICAgICAgICAgICAgICAgIFwiQGNhbmNlbGxhdGlvblNjb3BlXCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJAcGFyYWxsZWxcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3M6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gQmx1ZWJpcmQuZGVsYXkoMjAwKS50aGVuKGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImIrXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQGJsb2NrXCI6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQGRlbGF5XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zOiAyMDBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQGJsb2NrXCI6IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQGRlbGF5XCI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1zOiAxMDBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkB0aHJvd1wiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJmb29cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkBibG9ja1wiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkBkZWxheVwiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtczogNTBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkBjYW5jZWxcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yY2U6IHRydWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsbGVkOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHlpZWxkIGVuZ2luZS5pbnZva2UoKTtcclxuICAgICAgICAgICAgICAgIGFzc2VydCgheCk7XHJcbiAgICAgICAgICAgICAgICBhc3NlcnQoeSk7XHJcbiAgICAgICAgICAgIH0pKCkubm9kZWlmeShkb25lKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgaXQoXCJ3aGVuIG5vdCBmb3JjZSBpdCBzaG91bGQgcnVuIG90aGVyIGJyYW5jaGVzIGJlZm9yZSB0ZXJtaW5hdGluZ1wiLCBmdW5jdGlvbiAoZG9uZSkge1xyXG4gICAgICAgICAgICBhc3luYyhmdW5jdGlvbiooKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgeCA9IDA7XHJcbiAgICAgICAgICAgICAgICBsZXQgeSA9IDA7XHJcbiAgICAgICAgICAgICAgICBsZXQgeiA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGVuZ2luZSA9IG5ldyBBY3Rpdml0eUV4ZWN1dGlvbkVuZ2luZSh7XHJcbiAgICAgICAgICAgICAgICAgICAgXCJAY2FuY2VsbGF0aW9uU2NvcGVcIjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkBibG9ja1wiOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJnczogW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIkBwYXJhbGxlbFwiOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiQGNhbmNlbFwiOiB7fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeSsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYW5jZWxsZWQ6IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeiA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB5aWVsZCBlbmdpbmUuaW52b2tlKCk7XHJcbiAgICAgICAgICAgICAgICBhc3NlcnQoeCA9PT0gMSk7XHJcbiAgICAgICAgICAgICAgICBhc3NlcnQoIXkpO1xyXG4gICAgICAgICAgICAgICAgYXNzZXJ0KHopO1xyXG4gICAgICAgICAgICB9KSgpLm5vZGVpZnkoZG9uZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9KTtcclxufSk7Il19