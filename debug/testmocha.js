// Debug parameter
global.testsNum = 50

const PubSub = require(`@google-cloud/pubsub`);
require('../mochauiv2.js')

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
    keyFilename: './keys/googlekey.json',
    location: 'us-east1'
})

console.log('Starting RP launch')
const Connector = require('mocha-rp-reporter/rp_connector_sync.js')
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
let startLaunchRes = RPconnector.startLaunch(
    'This is test description for embarrassingly-parallel-mocha',
    'Mocha embarrassingly-parallel-mocha')
let launchId = startLaunchRes.body.id
console.log('RP started, ID', launchId)

// { id, test: test, publishedMessageResponse: Promise}
global.scheduledTests = []

global.executedTests = []

function runMochaJS(props, cb) {
    var Mocha = require('mocha')
    var fs = require('fs')
    var path = require('path')

    // Instantiate a Mocha instance.
    var mocha = new Mocha(props)
    mocha.ui('embarrassingly-parallel-mocha')
    var testDir = './test/'

    // Add each .js file to the mocha instance
    fs.readdirSync(testDir).filter(function (file) {
        // Only keep the .js files
        return file.substr(-3) === '.js'
    }).forEach(function (file) {
        let resolve = require('path').resolve
        let filename = path.join(testDir, file)
        console.log(filename, resolve(filename))

        mocha.addFile(filename)
        //console.log(require.cache)
    })
    mocha.loadFiles()
    console.time('Tests messages posting took')
    for (let suite of mocha.suite.suites) {
        console.log(suite)
        for (let test of suite.parent.tests) {
            console.log('got test id', test.id)
            let testId = test.id
            //let testId = uniqid(test.title + ':id:')
            // {
            //     "title": "Test 1",
            //     "body": "function (done) {\n            // Execution time will be random from 1000 to 10000 rounded to hundrends\n         let time = Math.floor(Math.random() * (10000 - 1000 + 1) ) + 1000;\n            time = Math.round(time/100)*100\n            setTimeout(done, time)\n            console.log(`Hello from Test ${i}:: time: ${time} !`)\n        }",
            //     "async": 1,
            //     "sync": false,
            //     "timedOut": false,
            //     "pending": false,
            //     "type": "test",
            //     "file": "/Users/oleksandrkhotemskyi/Documents/GitHub/embarrassingly-parallel-mocha/test/test.js",
            //     "parent": "#<Suite>",
            //     "ctx": "#<Context>"
            //   }
            const payload = {
                rpReporterOptions: rpMochaReporterOptions
            }

            const resp = pubsub
                .topic('projects/embarrassingly-parallel/topics/testsToRun')
                .publisher()
                .publish(
                    // Body, TODO: use JSON as buffer instead attributes
                    Buffer.from(''),
                    // Attributes
                    {
                        testName: `${test.title}$`,
                        testId: testId,
                        // testsNum is for debug only, will not be included in real framework
                        testsNum: new String(global.testsNum).toString(),
                        reportPortalLaunchId: new String(launchId).toString()
                    })
            global.scheduledTests.push({
                id: testId,
                test: test,
                publishedMessageResponse: resp
            })
        }
    }

    console.time('All tests results received took')
    Promise.all(global.scheduledTests.map(test => test.publishedMessageResponse)).then(resps => {
        // This can be used as hook on all tests scheduled
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

            global.executedTests.push(message.attributes)
            // "Ack" (acknowledge receipt of) the message
            message.ack();
            if (messageCount === resps.length) {
                console.log('Got feedback from all tests!')
                subscription.removeListener('message', messageHandler);
                RPconnector.finishLaunch(launchId)
                clearTimeout(timeoutTimer);
                console.timeEnd('All tests results received took')
                mocha.run(cb)
            }
        }

        // Listen for new messages until timeout is hit, or all messages received
        subscription.on(`message`, messageHandler);


    })
}


runMochaJS({ timeout: 20000 }, function (failures) {
    console.log(failures)
})
