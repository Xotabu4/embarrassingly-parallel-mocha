// This is how i tested what exist on google-cloud-functions runtime

let message = `const testFolder = '/srv/node_modules';
const fs = require('fs');

let files = fs.readdirSync(testFolder)
files.forEach(file => {
  console.log(file);
})
`

let message2 = `
console.log(process.env)
`

let message3 = `
const execSync = require('child_process').execSync;
const output = execSync('npm list -g --depth 0', { encoding: 'utf-8' });
console.log(output);
`

// let x = `npm list -g --depth 0`

eval(message3)

console.log(JSON.stringify({ message: message3 }))



