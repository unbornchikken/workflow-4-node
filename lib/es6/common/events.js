class IgnoredByTryCatchEvent {
  constructor(event) {
    this.event = event;
  }
}

class LoopBreakEvent {

}

class LoopContinueEvent {

}

module.exports = {
  LoopBreakEvent, LoopContinueEvent, IgnoredByTryCatchEvent
};
