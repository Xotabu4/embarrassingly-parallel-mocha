// Testing pub/sub messaging
const PubSub = require(`@google-cloud/pubsub`);

const pubsub = new PubSub({
    projectId: 'embarrassingly-parallel',
    keyFilename: './keys/googlekey.json',
    location: 'us-east1'
})

let count = 0
while (count < 100) {
    count++
    console.log('#' + count)
    pubsub
        .topic('projects/embarrassingly-parallel/topics/testsResults')
        .publisher()
        .publish(
            // Body, TODO: use JSON as buffer instead attributes
            Buffer.from(''),
            // Attributes
            {
                status: 'passed',
                testName: 'testname',
                id: count + 'id',
                testsNum: '1488',
            }).then(function () {
                const subscription = pubsub.topic('projects/embarrassingly-parallel/topics/testsResults').subscription('launcherSubcriber');

                // let seekCount = 0
                // dunno how seek works, seems it duplicates a lot of messages thousands! 
                // shitty fucking docs without nice examples.
                // subscription.seek(new Date('2020-10-02T15:01:23.045123456Z'), function (res) {
                //     //console.log(res)
                //     seekCount += 1
                //     console.log(seekCount)
                // })
            })
}