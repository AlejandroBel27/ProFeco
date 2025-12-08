const amqp = require('amqplib');
const RABBITMQ_URL = 'amqp://guest:guest@127.0.0.1:5672'; 
const EXCHANGE_NAME = 'profeco_exchange'; 
const BINDING_KEY = 'reporte_key'; 

const AMQPS_URL = 'amqp://localhost:5672'; // URL no usada en el cuerpo de la función.
const QUEUE_NAME = 'cola_reportes_mercado'; 

/**
 * Conecta a RabbitMQ y publica un mensaje en el Exchange 'profeco_exchange'.
 * @param {object} tarea - Datos del reporte a encolar.
 */
async function enviarTareaReporte(tarea) {
    let connection;
    try {
        // Conexión al servidor de colas
        connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        // Asegurar la existencia del Exchange (tipo 'direct')
        await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true }); 

        // Asegurar la existencia de la cola
        await channel.assertQueue(QUEUE_NAME, { durable: true }); 
        
        // Vincular la cola al Exchange mediante la BINDING_KEY
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME,  BINDING_KEY); 

        const mensaje = JSON.stringify(tarea);
        
        // Publicar el mensaje en el Exchange
        channel.publish(
            EXCHANGE_NAME, 
            BINDING_KEY, 
            Buffer.from(mensaje), 
            { persistent: true } // Mensaje persistente
        );

        console.log(`[Backend Mercado] Tarea de Reporte (${tarea.tipo}) enviada al Exchange AMQP.`);

    } catch (error) {
        throw new Error(`Error al publicar tarea por AMQP: ${error.message}`);
    } finally {
        if (connection) await connection.close(); // Cerrar conexión
    }
}

module.exports = { enviarTareaReporte };