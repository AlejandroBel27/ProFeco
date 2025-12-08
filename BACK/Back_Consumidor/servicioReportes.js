const amqp = require('amqplib'); 

// Configuración de RabbitMQ
const AMQP_URL = 'amqp://localhost'; 
const QUEUE_NAME = 'reportes_inconsistencia';

/**
 * Conecta a RabbitMQ y envía un mensaje a la cola. 
 * @param {object} tarea - Datos del reporte a encolar.
 */
async function enviarTareaReporte(tarea) {
    let connection;
    try {
        // Conexión al servidor
        connection = await amqp.connect(AMQP_URL);
        const channel = await connection.createChannel();

        // Asegurar que la cola sea duradera
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        // Enviar el mensaje como Buffer, marcado como persistente
        channel.sendToQueue(
            QUEUE_NAME, 
            Buffer.from(JSON.stringify(tarea)),
            { persistent: true } 
        );

        console.log(`[RabbitMQ] Tarea enviada a la cola: ${QUEUE_NAME}`);

    } catch (error) {
        console.error("[RabbitMQ - Productor] Error al enviar el mensaje:", error.message);
        throw new Error("Fallo en el servicio de mensajería.");
    } finally {
        if (connection) {
            // Cerrar conexión después del envío
            await connection.close(); 
        }
    }
}

module.exports = {
    enviarTareaReporte
};