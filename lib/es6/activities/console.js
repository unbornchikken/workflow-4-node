"use strict";

let Activity = require("./activity");

class Console extends Activity {

  run(callContext, args) {
    callContext.schedule(args, "_argsGot");
  }

  _argsGot(callContext, reason, result) {
    if (reason === Activity.states.complete) {
        let f = console.log;
        switch (this.level) {
            case "error":
                f = console.error;
                break;
            case "warn":
                f = console.warn;
                break;
            case "info":
                f = console.info;
                break;
        }
        f.apply(console, result);
        callContext.complete();
    }
    else {
        callContext.end(reason, result);
    }
  }

}

module.exports = Console;
