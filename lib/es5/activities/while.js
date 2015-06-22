"use strict";
var Activity = require("./activity");
var util = require("util");
function While() {
  Activity.call(this);
  this.condition = null;
  this.body = null;
}
util.inherits(While, Activity);
While.prototype.run = function(callContext, args) {
  var condition = this.get("condition");
  if (condition) {
    callContext.schedule(condition, "_conditionGot");
  } else {
    callContext.complete();
  }
};
While.prototype._conditionGot = function(callContext, reason, result) {
  if (reason === Activity.states.complete) {
    if (!result) {
      callContext.complete(this.get("_lastBodyResult"));
    } else {
      callContext.schedule(this.get("body"), "_bodyFinished");
    }
  } else {
    callContext.end(reason, result);
  }
};
While.prototype._bodyFinished = function(callContext, reason, result) {
  if (reason === Activity.states.complete) {
    this.set("_lastBodyResult", result);
    callContext.schedule(this.get("condition"), "_conditionGot");
  } else {
    callContext.end(reason, result);
  }
};
module.exports = While;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndoaWxlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsQUFBSSxFQUFBLENBQUEsUUFBTyxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsWUFBVyxDQUFDLENBQUM7QUFDcEMsQUFBSSxFQUFBLENBQUEsSUFBRyxFQUFJLENBQUEsT0FBTSxBQUFDLENBQUMsTUFBSyxDQUFDLENBQUM7QUFFMUIsT0FBUyxNQUFJLENBQUUsQUFBRCxDQUFHO0FBQ2IsU0FBTyxLQUFLLEFBQUMsQ0FBQyxJQUFHLENBQUMsQ0FBQztBQUVuQixLQUFHLFVBQVUsRUFBSSxLQUFHLENBQUM7QUFDckIsS0FBRyxLQUFLLEVBQUksS0FBRyxDQUFDO0FBQ3BCO0FBQUEsQUFFQSxHQUFHLFNBQVMsQUFBQyxDQUFDLEtBQUksQ0FBRyxTQUFPLENBQUMsQ0FBQztBQUU5QixJQUFJLFVBQVUsSUFBSSxFQUFJLFVBQVUsV0FBVSxDQUFHLENBQUEsSUFBRyxDQUFHO0FBQy9DLEFBQUksSUFBQSxDQUFBLFNBQVEsRUFBSSxDQUFBLElBQUcsSUFBSSxBQUFDLENBQUMsV0FBVSxDQUFDLENBQUM7QUFDckMsS0FBSSxTQUFRLENBQUc7QUFDWCxjQUFVLFNBQVMsQUFBQyxDQUFDLFNBQVEsQ0FBRyxnQkFBYyxDQUFDLENBQUM7RUFDcEQsS0FDSztBQUNELGNBQVUsU0FBUyxBQUFDLEVBQUMsQ0FBQztFQUMxQjtBQUFBLEFBQ0osQ0FBQTtBQUVBLElBQUksVUFBVSxjQUFjLEVBQUksVUFBVSxXQUFVLENBQUcsQ0FBQSxNQUFLLENBQUcsQ0FBQSxNQUFLLENBQUc7QUFDbkUsS0FBSSxNQUFLLElBQU0sQ0FBQSxRQUFPLE9BQU8sU0FBUyxDQUFHO0FBQ3JDLE9BQUksQ0FBQyxNQUFLLENBQUc7QUFDVCxnQkFBVSxTQUFTLEFBQUMsQ0FBQyxJQUFHLElBQUksQUFBQyxDQUFDLGlCQUFnQixDQUFDLENBQUMsQ0FBQztJQUNyRCxLQUNLO0FBQ0QsZ0JBQVUsU0FBUyxBQUFDLENBQUMsSUFBRyxJQUFJLEFBQUMsQ0FBQyxNQUFLLENBQUMsQ0FBRyxnQkFBYyxDQUFDLENBQUM7SUFDM0Q7QUFBQSxFQUNKLEtBQ0s7QUFDRCxjQUFVLElBQUksQUFBQyxDQUFDLE1BQUssQ0FBRyxPQUFLLENBQUMsQ0FBQztFQUNuQztBQUFBLEFBQ0osQ0FBQTtBQUVBLElBQUksVUFBVSxjQUFjLEVBQUksVUFBVSxXQUFVLENBQUcsQ0FBQSxNQUFLLENBQUcsQ0FBQSxNQUFLLENBQUc7QUFDbkUsS0FBSSxNQUFLLElBQU0sQ0FBQSxRQUFPLE9BQU8sU0FBUyxDQUFHO0FBQ3JDLE9BQUcsSUFBSSxBQUFDLENBQUMsaUJBQWdCLENBQUcsT0FBSyxDQUFDLENBQUM7QUFDbkMsY0FBVSxTQUFTLEFBQUMsQ0FBQyxJQUFHLElBQUksQUFBQyxDQUFDLFdBQVUsQ0FBQyxDQUFHLGdCQUFjLENBQUMsQ0FBQztFQUNoRSxLQUNLO0FBQ0QsY0FBVSxJQUFJLEFBQUMsQ0FBQyxNQUFLLENBQUcsT0FBSyxDQUFDLENBQUM7RUFDbkM7QUFBQSxBQUNKLENBQUE7QUFFQSxLQUFLLFFBQVEsRUFBSSxNQUFJLENBQUM7QUFBQSIsImZpbGUiOiJhY3Rpdml0aWVzL3doaWxlLmpzIiwic291cmNlUm9vdCI6ImxpYi9lczYiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgQWN0aXZpdHkgPSByZXF1aXJlKFwiLi9hY3Rpdml0eVwiKTtcclxudmFyIHV0aWwgPSByZXF1aXJlKFwidXRpbFwiKTtcclxuXHJcbmZ1bmN0aW9uIFdoaWxlKCkge1xyXG4gICAgQWN0aXZpdHkuY2FsbCh0aGlzKTtcclxuXHJcbiAgICB0aGlzLmNvbmRpdGlvbiA9IG51bGw7XHJcbiAgICB0aGlzLmJvZHkgPSBudWxsO1xyXG59XHJcblxyXG51dGlsLmluaGVyaXRzKFdoaWxlLCBBY3Rpdml0eSk7XHJcblxyXG5XaGlsZS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKGNhbGxDb250ZXh0LCBhcmdzKSB7XHJcbiAgICB2YXIgY29uZGl0aW9uID0gdGhpcy5nZXQoXCJjb25kaXRpb25cIik7XHJcbiAgICBpZiAoY29uZGl0aW9uKSB7XHJcbiAgICAgICAgY2FsbENvbnRleHQuc2NoZWR1bGUoY29uZGl0aW9uLCBcIl9jb25kaXRpb25Hb3RcIik7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICBjYWxsQ29udGV4dC5jb21wbGV0ZSgpO1xyXG4gICAgfVxyXG59XHJcblxyXG5XaGlsZS5wcm90b3R5cGUuX2NvbmRpdGlvbkdvdCA9IGZ1bmN0aW9uIChjYWxsQ29udGV4dCwgcmVhc29uLCByZXN1bHQpIHtcclxuICAgIGlmIChyZWFzb24gPT09IEFjdGl2aXR5LnN0YXRlcy5jb21wbGV0ZSkge1xyXG4gICAgICAgIGlmICghcmVzdWx0KSB7XHJcbiAgICAgICAgICAgIGNhbGxDb250ZXh0LmNvbXBsZXRlKHRoaXMuZ2V0KFwiX2xhc3RCb2R5UmVzdWx0XCIpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGxDb250ZXh0LnNjaGVkdWxlKHRoaXMuZ2V0KFwiYm9keVwiKSwgXCJfYm9keUZpbmlzaGVkXCIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGNhbGxDb250ZXh0LmVuZChyZWFzb24sIHJlc3VsdCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbldoaWxlLnByb3RvdHlwZS5fYm9keUZpbmlzaGVkID0gZnVuY3Rpb24gKGNhbGxDb250ZXh0LCByZWFzb24sIHJlc3VsdCkge1xyXG4gICAgaWYgKHJlYXNvbiA9PT0gQWN0aXZpdHkuc3RhdGVzLmNvbXBsZXRlKSB7XHJcbiAgICAgICAgdGhpcy5zZXQoXCJfbGFzdEJvZHlSZXN1bHRcIiwgcmVzdWx0KTtcclxuICAgICAgICBjYWxsQ29udGV4dC5zY2hlZHVsZSh0aGlzLmdldChcImNvbmRpdGlvblwiKSwgXCJfY29uZGl0aW9uR290XCIpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgY2FsbENvbnRleHQuZW5kKHJlYXNvbiwgcmVzdWx0KTtcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBXaGlsZTsiXX0=