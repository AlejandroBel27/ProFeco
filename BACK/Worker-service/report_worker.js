const amqp = require('amqplib'); 
const { sequelize, Inconsistencia } = require('../Back_Mercado/modeloProducto');

// Nombres y URLs estandarizados (USAR RABBITMQ_URL para la conexión)
const RABBITMQ_URL = 'amqp://guest:guest@127.0.0.1:5672'; 
const QUEUE_NAME = 'cola_final_mercado';
const EXCHANGE_NAME = 'profeco_exchange'; // Debe coincidir con servicioReportes.js
const BINDING_KEY = 'reporte_key'; 

async function startReportWorker() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL); 
        const channel = await connection.createChannel();

        // 1. Asegurar que el Exchange exista
        await channel.assertExchange(EXCHANGE_NAME, 'direct', { durable: true });
        
        // 2. Asegurar que la cola exista
        await channel.assertQueue(QUEUE_NAME, { durable: true }); 

        // 3. Crear el Enlace (Binding)
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, BINDING_KEY);
        
        console.log(`[Worker Service] Esperando tareas en AMQP (conectado al Exchange)...`); 
        
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg === null) return; 
            console.log('[Worker] Mensaje recibido del broker.'); 
    
            const tarea = JSON.parse(msg.content.toString());
            console.log(`[Worker] Iniciando procesamiento de reporte: ${tarea.tipo}`);
            if (tarea.tipo === 'INCONSISTENCIA') {
                
                // ... (Lógica de autenticación y persistencia en BD)
                try {
                    await sequelize.authenticate();
                    console.log('[Worker] Conexión a la BD establecida para el reporte.');
                } catch (authError) {
                    console.error('[Worker] FALLO FATAL DE CONEXIÓN A MySQL:', authError.message);
                    channel.nack(msg); 
                    return; 
                }

                try {
                    await Inconsistencia.create({
                        producto_nombre: tarea.datos.producto,
                        supermercado_reportado: tarea.datos.supermercado,
                        precio_encontrado: tarea.datos.precio,
                        descripcion: tarea.datos.descripcion,
                        estado: 'PENDIENTE'
                    });

                    console.log(`[Worker] Reporte de ${tarea.datos.producto} guardado en la BD.`);

                } catch (dbError) {
                    console.error('[Worker] Error al crear registro en BD:', dbError.message);
                    channel.nack(msg); 
                    return;
                }
            }

            // 3. Confirmar al Broker que la tarea ha terminado con éxito
            channel.ack(msg); 
        }, {
            noAck: false 
        });

    } catch (error) {
        console.error('Error fatal del Worker (RabbitMQ):', error.message);
    }
}

// Iniciar el Worker
startReportWorker();