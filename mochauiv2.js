// Debug parameter
global.testsNum = 100

let Mocha = require('mocha');
let Suite = require('mocha/lib/suite');
let Test = require('mocha/lib/test');
let uniqid = require('uniqid')

const PubSub = require(`@google-cloud/pubsub`);

let rpcredentials = null
// try {
//     rpcredentials = require('../keys/reportportal.json')
// } catch (error) {
//     throw new ReferenceError(`
//     Missing reportportal credentials file: keys/reportportal.json
//     Should contain following:
//     {
//         "endpoint": "https://reportportal.com/api/v1",
//         "username": "xxx",
//         "password": "xxx"
//     }
//     ${error}`)
// }

// https://cloud.google.com/nodejs/docs/reference/pubsub/0.20.x/Publisher
const pubsub = new PubSub({
    projectId: 'embarrassingly-parallel',
    keyFilename: './keys/googlekey.json',
    location: 'us-east1'
})

const publisher = pubsub
    .topic('projects/embarrassingly-parallel/topics/testsToRun')
    .publisher({
        batching: {
            maxMessages: 999,
            maxMilliseconds: 1000
        }
    })

console.log('Starting RP launch')
// const Connector = require('mocha-rp-reporter/rp_connector_sync.js')
// const rpMochaReporterOptions = Object.assign({},
//     rpcredentials,
//     {
//         launch: "embarrassingly-parallel-mocha" + new Date().toString(),
//         project: "DEMO_MOCHA",
//         tags: [
//             "embarrassingly-parallel-mocha"
//         ],
//     })
// const RPconnector = new Connector(rpMochaReporterOptions)
// let startLaunchRes = RPconnector.startLaunch(
//     'This is test description for embarrassingly-parallel-mocha',
//     'Mocha embarrassingly-parallel-mocha')
// let launchId = startLaunchRes.body.id
// console.log('RP started, ID', launchId)

// { id, test: test, publishedMessageResponse: Promise}
global.scheduledTests = []

global.executedTests = []

/**
 Suite events 
 
 pre-require
 require
 post-require
 beforeAll
 afterAll
 beforeEach
 afterEach
 suite - on suite add
 test - on test add
 run - actually run
 */
initialRequire = true
module.exports = Mocha.interfaces['embarrassingly-parallel-mocha'] = function (suite) {
    if (initialRequire) {
        const subscription = pubsub.subscription('launcherSubcriber');

        let timeoutTimer = setTimeout(() => {
            subscription.removeListener('message', messageHandler);
            console.log(`${messageCount} message(s) received.`);
            console.log(`Timed out`);
            //RPconnector.finishLaunch(launchId)
            console.timeEnd('All tests results received took')
        }, (15 * 60) * 1000); // 5 min timeout, to not wait forever


        let messageCount = 0;
        let duplicatesCount = 0
        const messageHandler = message => {
            // console.log(`Received message ${messageCount}/${resps.length} ::: ${message.id}:`);
            // console.log(`\tData: ${message.data}`);
            // console.log(`\tAttributes: `, message.attributes);
            if (global.executedTests.some(tst => tst.id === message.attributes.id)) {
                // Huge load of duplicated messages! dunno why!
                duplicatesCount += 1
                message.ack();
                return
            }
            message.ack();
            messageCount += 1;
            global.executedTests.push(message.attributes)
            // When all responses recieved
            if (messageCount === global.scheduledTests.length) {
                console.log('Got feedback from all tests!')
                subscription.removeListener('message', messageHandler);

                //RPconnector.finishLaunch(launchId)
                clearTimeout(timeoutTimer);
                console.timeEnd('All tests results received took')
                console.log(`Got total: ${messageCount} , and ${duplicatesCount} duplicate messages`)
                // actually running fake tests
                global.run()
            }
        }
        // Listen for new messages until timeout is hit, or all messages received
        subscription.on(`message`, messageHandler);
        console.log('Started listening for test results...')

        console.time('Tests messages posting took')
        console.log('this is root suite!')
        suite.beforeAll('test', function () {
            console.log('Global before all')
        })
    }

    suite.on('pre-require', function (context, file, mocha) {
        global.mochaInstance = mocha
        console.log('embarrassingly-parallel-mocha plugin will be used')
        // TODO: broken for some reason. run is not a function
        mocha.delay()
        var common = require('mocha/lib/interfaces/common')([suite], context)

        context.it = function (title, fn) {
            //console.log('Running test:', title)
            let testId = uniqid(title + ':id:')
            let newTest = function () {
                console.log('Test', testId)
                let associatedTest = global.executedTests.find(test => {
                    return test.id === testId
                })
                if (associatedTest.status === 'failed') {
                    throw new Error(associatedTest.testName + ' is failed!')
                }
            }
            const test = new Test(title, newTest)
            test.file = file
            test.id = testId
            suite.addTest(test)
            return test
        }
    })

    suite.on('require', function (context, file, mocha) {
        //console.log('file', file)
        // console.log('Context:', context)
    })

    suite.on('post-require', function (context, file, mocha) {
        mocha.delay()
        initialRequire = false
        console.log(mocha.files)
        if (file === mocha.files[mocha.files.length - 1]) {
            console.log('Last spec file imported and parsed, ready to rummble!')
            suite.eachTest((test) => {
                console.log('got test id', test.id)
                let testId = test.id
                // const payload = {
                //     rpReporterOptions: rpMochaReporterOptions
                // }
                const resp = publisher.publish(
                    // Body, TODO: use JSON as buffer instead attributes
                    Buffer.from(''),
                    // Attributes
                    {
                        testName: `${test.title}$`,
                        testId: testId,
                        // testsNum is for debug only, will not be included in real framework
                        testsNum: new String(global.testsNum).toString(),
                        reportPortalLaunchId: 'new String(launchId).toString()'
                    })
                global.scheduledTests.push({
                    id: testId,
                    test: test,
                    publishedMessageResponse: resp
                })
            })

            mocha.delay()
            console.time('All tests results received took')
            Promise.all(global.scheduledTests.map(test => test.publishedMessageResponse)).then(resps => {
                // This can be used as hook on all tests scheduled
                console.timeEnd('Tests messages posting took')
                console.log(resps.length, 'Messages published')
            })
        }
    })
}