const Activity = require("./activity");
const { LoopContinueEvent } = require('../common/events')

class Continue extends Activity {
  run(callContext) {
    callContext.fail(new LoopContinueEvent());
  }
}

module.exports = Continue;