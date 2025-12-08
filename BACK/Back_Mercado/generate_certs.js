const selfsigned = require('selfsigned');
const fs = require('fs');

console.log('Iniciando generación de certificados de desarrollo...');

// Atributos del certificado: Common Name (CN) debe ser 'localhost'
const attrs = [
    { name: 'commonName', value: 'localhost' }
];

// Generar PEMs válidos por 365 días
const pems = selfsigned.generate(attrs, { days: 365 });

// Guardar llave privada
fs.writeFileSync('private.key', pems.private, { encoding: 'utf8' });
// Guardar certificado
fs.writeFileSync('certificate.crt', pems.cert, { encoding: 'utf8' });

console.log('Certificados generados exitosamente en la carpeta actual:');
console.log('   -> private.key');
console.log('   -> certificate.crt');