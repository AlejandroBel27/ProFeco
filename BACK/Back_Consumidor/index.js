const express = require('express');
const app = express();
const amqp = require('amqplib'); 
const cors = require('cors');
// const { Sequelize, DataTypes } = require('sequelize');
const PORT = 3001;
const RABBITMQ_URL = 'amqp://localhost'; 

// Configuración Express
app.use(express.json());
app.use(cors()); 

// SIMULACIÓN DB (Memoria)
let wishlistDB = {
    '101': { nombreLista: 'Favoritos de Ale', productos: ['LECHE-LALA', 'ATUN-DOLORES'] },
    '102': { nombreLista: 'Artículos de Limpieza', productos: ['PINOL', 'FABULOSO'] }
};

let channel; // Conexión RabbitMQ

// Conectar RabbitMQ (Productor)
async function connectRabbitMQ() {
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        // Asegurar cola para reportes
        await channel.assertQueue('reportes_inconsistencia', { durable: true });
        console.log("✅ Conectado a RabbitMQ como Productor.");
    } catch (error) {
        console.error("❌ Error al conectar a RabbitMQ:", error.message);
        // El servicio HTTP continúa si falla RabbitMQ
    }
}
connectRabbitMQ();

// --- RUTAS DEL MICROSERVICIO CONSUMIDOR ---

// 1. WISHLIST: OBTENER (GET /:usuarioId)
// Recibe ruta raíz del proxy /api/wishlist
app.get('/:usuarioId', async (req, res) => {
    try {
        const usuarioId = req.params.usuarioId;
        const wishlist = wishlistDB[usuarioId] || { nombreLista: 'Nueva Lista', productos: [] };
        
        console.log(`[GET /${usuarioId}] Solicitud de Wishlist.`);

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

// 2. WISHLIST: AÑADIR PRODUCTO (POST /:usuarioId/producto)
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