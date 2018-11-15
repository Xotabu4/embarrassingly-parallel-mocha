let Mocha = require('mocha');
let Suite = require('mocha/lib/suite');
let Test = require('mocha/lib/test');
let request = require("request-promise-native")
const PubSub = require(`@google-cloud/pubsub`);
const rpcredentials
try {
    rpcredentials = require('../keys/reportportal.json')
} catch (error) {
    throw new ReferenceError(`
    Missing reportportal credentials file: keys/reportportal.json
    Should contain following:
    {
        "endpoint": "https://reportportal.com/api/v1",
        "username": "xxx",
        "password": "xxx"
    }
    ${error}` )
}

// https://cloud.google.com/nodejs/docs/reference/pubsub/0.20.x/Publisher
const pubsub = new PubSub({
  projectId: 'embarrassingly-parallel',
  keyFilename: './keys/googlekey.json'
})

global.testsNum = 500
global.responsesPromArray = []

console.log('Starting RP launch')
let Connector = require('mocha-rp-reporter/rp_connector_sync.js')
const rpMochaReporterOptions = Object.assign({},
  rpcredentials,
  {
      launch: "embarrassingly-parallel-mocha" + new Date().toString(),
      project: "DEMO_MOCHA",
      tags: [
          "embarrassingly-parallel-mocha"
      ],
  })
const RPconnector = new Connector(rpMochaReporterOptions)

const startLaunchRes = RPconnector.startLaunch(
  'This is test description for embarrassingly-parallel-mocha',
  'Mocha embarrassingly-parallel-mocha')
// console.log(startLaunchRes)
const launchId = startLaunchRes.body.id
console.log('RP launch ID', launchId)






module.exports = Mocha.interfaces['embarrassingly-parallel-mocha'] = function (suite) {


  suite.on('pre-require', function (context, file, mocha) {
    console.log('Hello from embarrassingly-parallel-mocha!')
    var common = require('mocha/lib/interfaces/common')([suite], context)

    common.after('WaitingTestsToFinish', function () {
      const ProgressPromise = require('progress-promise')
      console.time('Tests messages posting took')
      console.time('All tests results received took')
      ProgressPromise.all(global.responsesPromArray)
        .progress(results => {
          // This can be used as hook on each scheduled test

          //console.log('.', results.proportion)
        })
        .then(resps => {
          // This can be used as hook on all tests scheduled
          //console.log(resps.map(r => r.body))
          console.timeEnd('Tests messages posting took')
          console.log(resps.length, 'Messages published')

          const subscription = pubsub.subscription('launcherSubcriber');


          let timeoutTimer = setTimeout(() => {
            subscription.removeListener('message', messageHandler);
            console.log(`${messageCount} message(s) received.`);
            console.log(`Timed out`);
            RPconnector.finishLaunch(launchId)
            console.timeEnd('All tests results received took')
          }, (15 * 60) * 1000); // 5 min timeout, to not wait forever

          // Create an event handler to handle messages
          let messageCount = 0;
          const messageHandler = message => {
            messageCount += 1;
            console.log(`Received message ${messageCount}/${resps.length} ::: ${message.id}:`);
            console.log(`\tData: ${message.data}`);
            console.log(`\tAttributes: `, message.attributes);

            // "Ack" (acknowledge receipt of) the message
            message.ack();
            if (messageCount === resps.length) {
              console.log('All tests passed')
              subscription.removeListener('message', messageHandler);
              RPconnector.finishLaunch(launchId)
              clearTimeout(timeoutTimer);
              console.timeEnd('All tests results received took')
            }
          };

          // Listen for new messages until timeout is hit, or all messages received
          subscription.on(`message`, messageHandler);
        })
    })

    context.run = mocha.options.delay && common.runWithSuite(suite)

    const wrappedIt = context.it
    context.it = function (title, fn) {

      console.log('Scheduling test:', title)

      let newTest = function () {

        const resp = pubsub
          .topic('projects/embarrassingly-parallel/topics/testsToRun')
          .publisher()
          .publish(
            // Body, TODO: use JSON as buffer instead attributes
            Buffer.from(''),
            // Attributes
            {
              testName: `${title}$`,
              // testsNum is for debug only, will not be included in real framework
              testsNum: new String(global.testsNum).toString(),
              reportPortalLaunchId: new String(launchId).toString()
            })
          .catch(err => {
            console.error('ERROR:', err);
          })
        global.responsesPromArray.push(resp)
      }
      const test = new Test(title, newTest)
      test.file = file
      suite.addTest(test)

      return test
    }
  })
}