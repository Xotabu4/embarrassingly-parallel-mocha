// Testing pub/sub messaging

const PubSub = require(`@google-cloud/pubsub`);

const pubsub = new PubSub({
    projectId: 'embarrassingly-parallel',
    keyFilename: './keys/googlekey.json',
    location: 'us-east1'
})

const subscription = pubsub.subscription('launcherSubcriber');

// Create an event handler to handle messages
let messageCount = 0;
const messageHandler = message => {
    //console.log(`\tData: ${message.data}`);
    //console.log(`\tAttributes: ${JSON.stringify(message.attributes)}`);
    messageCount += 1;
    console.log(`Received message #${messageCount}:`);
    // "Ack" (acknowledge receipt of) the message
    message.ack();
};

// Listen for new messages until timeout is hit
subscription.on(`message`, messageHandler);

// setTimeout(() => {
//     subscription.removeListener('message', messageHandler);
//     console.log(`${messageCount} message(s) received.`);
// }, 10000);