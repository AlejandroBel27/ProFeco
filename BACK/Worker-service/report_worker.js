// worker_service/report_worker.js
const amqp = require('amqplib'); 
const { sequelize, Inconsistencia } = require('./modeloProducto');

// Configuración de RabbitMQ
const RABBITMQ_URL = 'amqp://guest:guest@127.0.0.1:5672'; 
const QUEUE_NAME = 'reportes_inconsistencia'; 

async function startReportWorker() {
    try {
        // Conexión y sincronización con DB_Profeco
        await sequelize.authenticate();
        console.log('[Worker] Conexión a DB_Profeco establecida.');

        await Inconsistencia.sync({ alter: true });
        console.log('[Worker] Tabla Inconsistencia sincronizada.');
        
        // Conexión a RabbitMQ
        const connection = await amqp.connect(RABBITMQ_URL); 
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true }); 
        channel.prefetch(1); // Procesar 1 mensaje a la vez

        console.log(`[Worker Service] Esperando mensajes en la cola: ${QUEUE_NAME}...`); 
        
        // Consumidor de mensajes
        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg === null) return; 
            
            let tarea;
            
            try {
                tarea = JSON.parse(msg.content.toString());
                
                console.log(`[Worker] Mensaje recibido:`, tarea); 

                if (tarea && tarea.tipo === 'INCONSISTENCIA' && tarea.datos) {
                    
                    console.log(`[Worker] Procesando reporte: ${tarea.datos.producto}`);

                    // Mapeo y creación del registro en Sequelize
                    await Inconsistencia.create({
                        producto_nombre: tarea.datos.producto, 
                        supermercado_reportado: tarea.datos.supermercado, 
                        precio_encontrado: tarea.datos.precio,
                        descripcion: tarea.datos.descripcion,
                        estado: 'PENDIENTE'
                    });

                    console.log(`✅ [Worker] Reporte de ${tarea.datos.producto} guardado en la DB.`);

                } else {
                    console.log('[Worker] Mensaje con formato inesperado. Descartando.');
                }

            } catch (error) {
                // Manejo de errores de JSON.parse o DB (Sequelize)
                console.error('❌ ERROR CRÍTICO al procesar o guardar:', error.message);
                
                // Si es un error de Sequelize (Not Null, etc.), descartamos el mensaje (ack)
                // para evitar el bucle infinito de reintentos.
                if (error.name && error.name.includes('Sequelize')) {
                    console.error('⚠️ [Worker] Error de datos (Sequelize). Descartando mensaje.');
                } else if (error instanceof SyntaxError) {
                    console.log('[Worker] Error de formato (JSON.parse). Descartando mensaje.');
                }
            }

            // Confirmar al Broker (ACK)
            channel.ack(msg); 
        }, {
            noAck: false // Se requiere confirmación manual
        });

    } catch (error) {
        console.error('❌ Error fatal del Worker (conexión/inicio):', error.message);
        process.exit(1);
    }
}

startReportWorker();