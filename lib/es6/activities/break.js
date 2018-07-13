const Activity = require("./activity");
const { LoopBreakEvent } = require('../common/events')


class Break extends Activity {
  run(callContext) {
    callContext.fail(new LoopBreakEvent());
  }
}

module.exports = Break;