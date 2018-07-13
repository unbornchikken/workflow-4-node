const Activity = require('./activity');
const WithBody = require('./withBody');
const { LoopBreakEvent, LoopContinueEvent } = require('../common/events');

class BaseLoop extends Activity {
  constructor() {
    super();
    this.condition = null;
  }

  run(callContext) {
    const condition = this.condition;
    if (condition) {
      callContext.schedule(condition, '_conditionGot');
    } else {
      callContext.complete();
    }
  }

  initializeStructure() {
    WithBody.prototype.initializeStructure.call(this);
  }

  _conditionGot(callContext, reason, result) {
    if (reason === Activity.states.complete) {
      if (!result) {
        callContext.complete(this._lastBodyResult);
      } else {
        WithBody.prototype.run.call(this, callContext);
      }
    } else {
      callContext.end(reason, result);
    }
  }

  _doStep(callContext, reason, result) {
    if (reason === Activity.states.complete) {
      callContext.schedule(this.condition, '_conditionGot');
      return;
    }
    callContext.end(reason, result);
  }

  // 'bodyCompleted' is a callback by WithBody
  // https://github.com/CrossChx/workflow-4-node/blob/master/lib/es6/activities/withBody.js#L25
  bodyCompleted(callContext, reason, result) {
    if (reason === Activity.states.complete) {
      this._lastBodyResult = result;
      callContext.activity._doStep.call(this, callContext, reason, result);
    } else if (reason === Activity.states.fail && result instanceof LoopBreakEvent) {
      // on break, be done with for loop
      callContext.complete();
    } else if (reason === Activity.states.fail && result instanceof LoopContinueEvent) {
      // on continue, go to the next loop
      callContext.activity._doStep.call(this, callContext, reason, result);
    } else {
      callContext.end(reason, result);
    }
  }
}

module.exports = BaseLoop;
