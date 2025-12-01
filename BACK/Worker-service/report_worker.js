// reportWorker.js
const amqp = require('amqplib');
// Opcional: const { sequelize } = require('./configDB'); // Si el Worker necesita la BD

const AMQPS_URL = 'amqp://guest:guest@localhost:5672';
const QUEUE_NAME = 'cola_reportes_mercado';

async function startReportWorker() {
    try {
        // Conexión AMQPS cifrada al Broker
        const connection = await amqp.connect(AMQPS_URL);
        const channel = await connection.createChannel();

        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`[Worker Service] Esperando tareas en AMQPS...`);
        
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const tarea = JSON.parse(msg.content.toString());
                console.log(`[Worker] Iniciando procesamiento de reporte: ${tarea.tipo}`);

                // --- SIMULACIÓN DE TRABAJO PESADO ---
                await new Promise(resolve => setTimeout(resolve, 6000));
                console.log(`[Worker] Reporte completado y enviado a ${tarea.destino}.`);
                
                // Confirmar al Broker que la tarea ha terminado
                channel.ack(msg); 
            }
        });

    } catch (error) {
        console.error('Error fatal del Worker:', error.message);
        // En un entorno de producción, podrías reintentar la conexión aquí.
    }
}

// Iniciar el Worker
startReportWorker();