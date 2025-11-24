const selfsigned = require('selfsigned');
const fs = require('fs');

console.log('Iniciando generación de certificados de desarrollo...');

const attrs = [
    { name: 'commonName', value: 'localhost' }
];

const pems = selfsigned.generate(attrs, { days: 365 });

fs.writeFileSync('private.key', pems.private, { encoding: 'utf8' });
fs.writeFileSync('certificate.crt', pems.cert, { encoding: 'utf8' });

console.log('Certificados generados exitosamente en la carpeta actual:');
console.log('   -> private.key');
console.log('   -> certificate.crt');