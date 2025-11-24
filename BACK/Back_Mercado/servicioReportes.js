const amqp = require('amqplib');

// URL de conexión cifrada (AMQPS)
const AMQPS_URL = 'amqps://user:password@tu-servidor-rabbit.com:5671';
const QUEUE_NAME = 'cola_reportes_mercado'; 

async function enviarTareaReporte(tipoReporte, fechaInicio, correoDestino) {
    let connection;
    try {
        // Conexión AMQPS cifrada al Servidor de Colas
        connection = await amqp.connect(AMQPS_URL);
        const channel = await connection.createChannel();

        // Asegura que la cola exista
        await channel.assertQueue(QUEUE_NAME, { durable: true }); 

        const tarea = { 
            tipo: tipoReporte, 
            rango: `${fechaInicio} - ${new Date().toISOString()}`,
            destino: correoDestino 
        };

        // Publicar el mensaje
        channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(tarea)), {
            persistent: true 
        });

        console.log(`[Backend Mercado] Tarea de Reporte (${tipoReporte}) enviada a la cola AMQPS.`);
        return { success: true, message: "Tarea delegada." };

    } catch (error) {
        console.error('Error al publicar tarea por AMQPS:', error.message);
        return { success: false, error: 'Fallo al delegar tarea.' };
    } finally {
        if (connection) await connection.close();
    }
}

module.exports = { enviarTareaReporte };