const Activity = require("./activity");
const { LoopContinueEvent, IgnoredByTryCatchEvent } = require('../common/events')

class Continue extends Activity {
  run(callContext) {
    callContext.fail(new IgnoredByTryCatchEvent(new LoopContinueEvent()));
  }
}

module.exports = Continue;