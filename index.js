const fs = require('fs');
const path = require('path')
const PubSub = require(`@google-cloud/pubsub`);
// https://cloud.google.com/nodejs/docs/reference/pubsub/0.20.x/Publisher
const pubsub = new PubSub()

// exports.httpInvoke = (request, response) => {
//   console.log(request.body)
//   global.testsNum = request.body.testsNum || 10
//   runMochaJS({
//     grep: request.body.testName,
//     timeout: 20000
//   }, function (failures) {
//     if (failures) {
//       response.status(500).send(request.body.testName + ' FAILED')
//     } else {
//       response.status(200).send(request.body.testName + ' PASSED!')
//     }
//   })
// }

// https://cloud.google.com/functions/docs/writing/background#functions_background_parameters-node6
exports.pubSubInvoke = async function (event) {
  const Mocha = require('mocha')
  // const mochaELKreporter = {
  //   reporter: 'mocha-elk-reporter'
  // }

  // Reports each test as serparate launch
  // console.log('Using Launch ID', event.attributes.reportPortalLaunchId)
  // const mochaRPconfig = {
  //   reporter: 'mocha-rp-reporter',
  //   reporterOptions: {
  //     configOptions: {
  //       // will be passed in message body
  //     }
  //   }
  // }

  const mocha = new Mocha({
    grep: event.attributes.testName,
    timeout: 20000
  })
  const testDir = './test/'

  fs.readdirSync(testDir).filter(function (file) {
    // Only keep the .js files
    return file.substr(-3) === '.js'
  }).forEach(function (file) {
    let localpath = path.join(testDir, file)
    let fullpath = path.resolve(localpath)
    // IMPORTANT: Clearing cache is needed!
    delete require.cache[fullpath]
    mocha.addFile(localpath)
  })
  const failures = await new Promise(resolve => mocha.run(resolve))

  console.log('Got event data:', event.data)
  console.log('Got event attributes:', event.attributes)
  // notice all attributes keys and values are strings
  global.testsNum = event.attributes.testsNum ? parseInt(event.attributes.testsNum) : 10

  const runResultMessage = {
    status: null
  }
  if (failures) {
    await pubsub
      .topic('projects/embarrassingly-parallel/topics/testsResults')
      .publisher()
      .publish(
        // Body, TODO: use JSON as buffer instead attributes
        Buffer.from(JSON.stringify(runResultMessage)),
        // Attributes
        {
          bodyBufferType: 'json',
          status: 'failed',
          testName: event.attributes.testName,
          id: event.attributes.testId,
          // testsNum is for debug only, will not be included in real framework
          testsNum: new String(global.testsNum).toString(),
        })
  } else {
    await pubsub
      .topic('projects/embarrassingly-parallel/topics/testsResults')
      .publisher()
      .publish(
        // Body, TODO: use JSON as buffer instead attributes
        Buffer.from(''),
        // Attributes
        {
          status: 'passed',
          testName: event.attributes.testName,
          id: event.attributes.testId,
          // testsNum is for debug only, will not be included in real framework
          testsNum: new String(global.testsNum).toString(),
        })
  }
}

