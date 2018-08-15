'use strict';

const { ActivityExecutionEngine, activityMarkup } = require('./lib').activities;
const workflow = require('./examples/example.json')

const jsonWorkflow = JSON.parse(JSON.stringify(workflow));
const Engine = new ActivityExecutionEngine(jsonWorkflow);

Engine.invoke()
  .then(() => {
    console.log('Workflow Completed Successfully');
  })
  .catch((error) => {
    console.log('Workflow Error', error);
  });
