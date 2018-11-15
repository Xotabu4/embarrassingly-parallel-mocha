describe('Suite', function () {
    before(function () {
        console.log('beforeAll')
    })
    beforeEach(function () {
        console.log('beforeEach')
    })
    console.log('Tests to generate:', global.testsNum)
    for (let i = 1; i <= global.testsNum; i++) {
        it(`Test ${i}`, function (done) {
            // Execution time will be random from 1000 to 10000 rounded to hundrends
            let time = Math.floor(Math.random() * (10000 - 1000 + 1) ) + 1000;
            time = Math.round(time/100)*100
            setTimeout(done, time)
            console.log(`Hello from Test ${i}:: time: ${time} !`)
            console.log(this.id)
        })
    }

    afterEach(function () {
        console.log('afterEach')
    })
    after(function () {
        console.log('afterAll')
    })
})