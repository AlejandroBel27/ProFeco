const express = require('express');
const app = express();
const amqp = require('amqplib');
const cors = require('cors');
const PORT = 3001;
const RABBITMQ_URL = 'amqp://localhost';



app.use(express.json());
app.use(cors());


let wishlistDB = {
    '101': { nombreLista: 'Favoritos de Ale', productos: ['LECHE-LALA', 'ATUN-DOLORES'] },
    '102': { nombreLista: 'Artículos de Limpieza', productos: ['PINOL', 'FABULOSO'] }
};



let channel;

// --- 1. Inicializar RabbitMQ como Productor ---

async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        // Aseguramos que la cola para los reportes exista
        await channel.assertQueue('reportes_inconsistencia', { durable: true });
        console.log("✅ Conectado a RabbitMQ como Productor.");
    } catch (error) {
        console.error("❌ Error al conectar a RabbitMQ:", error.message);
        // Si falla, el servicio debe seguir corriendo para las rutas HTTP
    }
}
connectRabbitMQ();


// 1. WISHLIST: OBTENER (GET) - Corregido para el Proxy

app.get('/:usuarioId', async (req, res) => {
    try {
        const usuarioId = req.params.usuarioId;
        const wishlist = wishlistDB[usuarioId] || { nombreLista: 'Nueva Lista', productos: [] };
        console.log(`[GET /${usuarioId}] Solicitud de Wishlist recibida.`);
        return res.status(200).json({
            mensaje: `Wishlist cargada para el usuario ${usuarioId}.`,
            wishlist: wishlist
        });
    } catch (error) {
        console.error("❌ Error al cargar Wishlist:", error);
        return res.status(500).json({
            error: "Error interno del servidor al cargar la Wishlist."
        });
    }
});


// 2. WISHLIST: AÑADIR PRODUCTO (POST) - Corregido para el Proxy

app.post('/:usuarioId/producto', async (req, res) => {

    try {
        const usuarioId = req.params.usuarioId;
        const { skuProducto } = req.body;
        console.log(`[POST /${usuarioId}/producto] Solicitud para añadir SKU: ${skuProducto}`);
        if (!wishlistDB[usuarioId]) {
            wishlistDB[usuarioId] = { nombreLista: 'Nueva Lista', productos: [] };
        }
        if (!wishlistDB[usuarioId].productos.includes(skuProducto)) {
            wishlistDB[usuarioId].productos.push(skuProducto);
            return res.status(200).json({
                mensaje: `Producto ${skuProducto} añadido a la Wishlist de ${usuarioId}.`,
                wishlist: wishlistDB[usuarioId]
            });
        } else {
            return res.status(200).json({
                mensaje: `Producto ${skuProducto} ya estaba en la lista.`
            });
        }
    } catch (error) {
        console.error("❌ Error al agregar producto a Wishlist:", error);
        return res.status(500).json({
            error: "Error interno del servidor al actualizar Wishlist."
        });
    }
});

// 3. REPORTE DE INCONSISTENCIA (POST) 
// El Worker espera un objeto encapsulado { tipo: 'INCONSISTENCIA', datos: {...} }
app.post('/', async (req, res) => {
    const reporteData = req.body;
    if (!channel) {
        return res.status(500).json({ error: "No se pudo conectar a RabbitMQ. El reporte no será procesado." });
    }
    try {
        // Añadir información de tiempo para el Worker (Opcional, pero útil)
        reporteData.timestamp = new Date().toISOString();
        const tareaReporte = {
            tipo: 'INCONSISTENCIA',
            datos: reporteData
        };
        channel.sendToQueue(
            'reportes_inconsistencia',
            Buffer.from(JSON.stringify(tareaReporte)),
            { persistent: true }
        );
        console.log("✅ Tarea de Reporte enviada a RabbitMQ:", tareaReporte.tipo);
        // El código 202 Accepted indica que la petición fue aceptada para procesamiento ASÍNCRONO
        return res.status(202).json({
            mensaje: "Reporte recibido y encolado para procesamiento asíncrono por Profeco."
        });
    } catch (error) {
        console.error("❌ Error al enviar mensaje a RabbitMQ:", error);
        return res.status(500).json({
            error: "Fallo al encolar el reporte."
        });
    }
});


// INICIO DEL SERVIDOR
app.listen(PORT, () => {
    console.log(`✅ Microservicio Consumidor (Back_Consumidor) escuchando en puerto ${PORT}`);
});