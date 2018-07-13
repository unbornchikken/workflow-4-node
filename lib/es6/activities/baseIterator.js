const _ = require('lodash');
const { errors } = require('../common');
const Activity = require('./activity')
const Block = require('./block')
const WithBody = require('./withBody')
const { LoopBreakEvent, LoopContinueEvent } = require('../common/events');

class BaseIterator extends Activity {
  constructor() {
    super();
    this.items = null;
    this.varName = 'item';
    this.parallel = false;
    this._bodies = null;
  }
  initializeStructure() {
    if (this.parallel) {
      const numCPUs = require('os').cpus().length;
      this._bodies = [];
      if (this.args && this.args.length) {
        /* eslint-disable no-plusplus */
        for (let i = 0; i < Math.min(process.env.UV_THREADPOOL_SIZE || 100000, numCPUs); i++) {
          const newArgs = [];
          for (const arg of this.args) {
            if (arg instanceof Activity) {
              newArgs.push(arg.clone());
            } else {
              newArgs.push(arg);
            }
          }
          const newBody = new Block();
          newBody.args = newArgs;
          this._bodies.push(newBody);
        }
      }
      this.args = null;
    } else {
      WithBody.prototype.initializeStructure.call(this);
    }
  }

  run(callContext) {
    const varName = this.varName;
    const items = this.items;
    if (!_.isNull(items)) {
      this[varName] = null;
      callContext.schedule(items, '_itemsGot');
    } else {
      callContext.complete();
    }
  }

  _itemsGot(callContext, reason, result) {
    if (reason === Activity.states.complete && !_.isUndefined(result)) {
      if (result && _.isFunction(result.next)) {
        this._iterator = result;
      } else {
        this._remainingItems = _.isArray(result) ? result.slice() : [result];
      }
      callContext.activity._doStep.call(this, callContext);
    } else {
      callContext.end(reason, result);
    }
  }

  _doStep(callContext, lastResult) {
    const varName = this.varName;
    const remainingItems = this._remainingItems;
    const iterator = this._iterator;
    if (remainingItems && remainingItems.length) {
      if (this.parallel) {
        const bodies = this._bodies;
        const pack = [];
        let idx = 0;
        while (remainingItems.length && idx < bodies.length) {
          const item = remainingItems[0];
          remainingItems.splice(0, 1);
          const variables = {};
          variables[varName] = item;
          pack.push({
            variables,
            /* eslint-disable no-plusplus */
            activity: bodies[idx++],
          });
        }
        callContext.schedule(pack, '_bodyFinished');
      } else {
        const item = remainingItems[0];
        remainingItems.splice(0, 1);
        const variables = {};
        variables[varName] = item;
        callContext.schedule({ activity: this._body, variables }, '_bodyFinished');
      }
      return;
    }
    if (iterator) {
      if (this.parallel) {
        callContext.fail(new errors.ActivityRuntimeError('Parallel execution not supported with generators.'));
        return;
      }

      const next = iterator.next();
      if (!next.done) {
        const variables = {};
        variables[varName] = next.value;
        callContext.schedule({ activity: this._body, variables }, '_bodyFinished');
        return;
      }
    }
    callContext.complete(lastResult);
  }

  // baseLoop calls 'bodyCompleted', but this guy is '_bodyFinished'
  // difference is that baseIterator uses WithBody only to initializeStructure (a hack that does this.args = new Block(this.args))
  // manages its own run because it needs to support multi threading
  // baseLoop uses WithBody.run to run its loops, and has no parallel support
  _bodyFinished(callContext, reason, result) {
    if (reason === Activity.states.complete) {
      callContext.activity._doStep.call(this, callContext, reason, result);
    } else if (reason === Activity.states.fail && result instanceof LoopBreakEvent) {
      callContext.complete();
    } else if (reason === Activity.states.fail && result instanceof LoopContinueEvent) {
      callContext.activity._doStep.call(this, callContext, reason, result);
    } else {
      callContext.end(reason, result);
    }
  }
}

module.exports = BaseIterator;
