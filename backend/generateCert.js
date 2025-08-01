const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const attributes = [{name: 'commonName', value: 'localhost'}];

const options = {
    days: 365,
    algorithm: 'sha256',
    keySize: 2048,
};

const pems = selfsigned.generate(attributes, options);

const certsPath = path.join(__dirname, 'certs');
if(!fs.existsSync(certsPath)) {
    fs.mkdirSync(certsPath);
}

fs.writeFileSync(path.join(certsPath, 'key.pem'), pems.private);
fs.writeFileSync(path.join(certsPath, 'cert.pem'), pems.cert);

console.log('✅ Successfully generated self-signed certificate!');
console.log('   - Private Key: backend/certs/key.pem');
console.log('   - Certificate: backend/certs/cert.pem');