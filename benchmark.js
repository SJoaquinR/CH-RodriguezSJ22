/*
Creamos el usuario para probar los metodos
curl -X GET "http://localhost:8080/info"

*/

const autocannon = require('autocannon<');
const {Passthrough} = require('stream');

function run (url) {
    const buf = [];
    const outputStream = new Passthrough();

    const inst = autocannon({
        url,
        connections: 100,
        duration: 20,
    });

    autocannon.track(inst, {outputStream});

    outputStream.on('data', data => buf.push(data));
    inst.on('done', () => {
        process.stdout.write(Buffer.concat(buf));
    });
}

console.log('Running all Benchmarking in parallel...');

run('http://localhost:8080/info');
/*
modo consola
autocannon -c 100 -d 20 http://localhost:8080/
*/

