const Activity = require("./activity");
const { LoopBreakEvent, IgnoredByTryCatchEvent } = require('../common/events')


class Break extends Activity {
  run(callContext) {
    callContext.fail(new IgnoredByTryCatchEvent(new LoopBreakEvent()));
  }
}

module.exports = Break;