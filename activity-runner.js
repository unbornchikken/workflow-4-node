'use strict';

const wf = require("./lib");
const {ActivityExecutionEngine} = wf.activities;
const activityExample = require('./examples/activity.json')

const jsonWorkflow = JSON.parse(JSON.stringify(activityExample));
const engine = new ActivityExecutionEngine(jsonWorkflow);

engine.invoke()
  .then(() => {
    console.log('Activity completed successfully');
  })
  .catch((error) => {
    console.log('Activity error', error);
  });
