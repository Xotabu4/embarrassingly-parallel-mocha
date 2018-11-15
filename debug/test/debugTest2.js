describe('Suite 2', function () {
    before(function () {
        console.log('beforeAll')
    })
    beforeEach(function () {
        console.log('beforeEach')
    })
    it(`Test 2`, function () {
        console.log(`Test 2 is Running!`)
    })
    afterEach(function () {
        console.log('afterEach')
    })
    after(function () {
        console.log('afterAll')
    })
})

/**
 * 
  before: [Function: before],
  after: [Function: after],
  beforeEach: [Function: beforeEach],
  afterEach: [Function: afterEach],
  run: undefined,
  context: { [Function] skip: [Function], only: [Function] },
  describe: { [Function] skip: [Function], only: [Function] },
  xcontext: [Function],
  xdescribe: [Function],
  specify: { [Function] only: [Function], skip: [Function], retries: [Function] },
  it: [Function],
  xspecify: [Function],
  xit: [Function] }
 */