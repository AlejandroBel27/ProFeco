const amqp = require('amqplib');
const RABBITMQ_URL = 'amqp://guest:guest@127.0.0.1:5672'; 
const EXCHANGE_NAME = 'profeco_exchange'; 
const BINDING_KEY = 'reporte_key'; 

const AMQPS_URL = 'amqp://localhost:5672';
const QUEUE_NAME = 'cola_reportes_mercado'; 

async function enviarTareaReporte(tarea) {
    let connection;
    try {
        // Conexión AMQPS cifrada al Servidor de Colas
        connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        // Asegura que la cola exista
        await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true }); 

        await channel.assertQueue(QUEUE_NAME, { durable: true }); 
        
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME,  BINDING_KEY); 

        const mensaje = JSON.stringify(tarea);
        
        channel.publish(EXCHANGE_NAME, BINDING_KEY, Buffer.from(mensaje), {
            persistent: true 
        });

        console.log(`[Backend Mercado] Tarea de Reporte (${tarea.tipo}) enviada al Exchange AMQP.`);

    } catch (error) {
        throw new Error(`Error al publicar tarea por AMQP: ${error.message}`);
    } finally {
        if (connection) await connection.close();
    }
}

module.exports = { enviarTareaReporte };