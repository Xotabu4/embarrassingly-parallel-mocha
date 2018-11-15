// debug UI


let Mocha = require('mocha');
let Suite = require('mocha/lib/suite');
let Test = require('mocha/lib/test');
let uniqid = require('uniqid')
var fs = require('fs')
var path = require('path')

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

let initialRequire = true
module.exports = Mocha.interfaces['test-ui'] = function (rootSuite) {


    if (initialRequire) {
        console.log('this is root suite!')
        rootSuite.beforeAll('test', function () {
            console.log('Global before all')
            rootSuite.eachTest((test)=> {
                console.log('each test', test.title)
            })
        })
    }

    rootSuite.on('pre-require', function (context, file, mocha) {
        // Delaying to run tests on gcf first
        mocha.delay()
        const common = require('mocha/lib/interfaces/common')([rootSuite], context)
        // In case you need mocha globally
        // global.mochaInstance = mocha
        


        // console.log('Context:', context)
        // context.run = mocha.options.delay && common.runWithSuite(rootSuite)

        context.it = function (title, fn) {
            


            const test = new Test(title, fn)
            test.file = file
            rootSuite.addTest(test)

            return test
        }
    })

    rootSuite.on('require', function (context, file, mocha) {
        //console.log('file', file)
        // console.log('Context:', context)
    })

    rootSuite.on('post-require', function (context, file, mocha) {
        initialRequire = false
        // console.log(mocha.files)
        if (file === mocha.files[mocha.files.length - 1]) {
            console.log('Last file imported', file)
            setImmediate(function () {
                console.log('Delayed running!')
                run()
            })
        }
    })
}



// Instantiate a Mocha instance.
// var mocha = new Mocha({
//     delay: true
// })
// mocha.ui('test-ui')
// var testDir = './debug/test/'

// // Add each .js file to the mocha instance
// fs.readdirSync(testDir).filter(function (file) {
//     // Only keep the .js files
//     return file.substr(-3) === '.js'
// }).forEach(function (file) {
//     //let resolve = require('path').resolve
//     let filename = path.join(testDir, file)
//     mocha.addFile(filename)
// })
// /**
//  * mocha.loadFiles() is not needed because mocha.run does load if .addFile was called.
//  */

// mocha.run()