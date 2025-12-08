const express = require('express');
const app = express();
const port = 3003; 

const axios = require('axios'); // Cliente HTTP para notificaciones
const https = require('https'); // Necesario para ignorar certificados self-signed

// Importar modelos de DB
const { 
    sequelize, 
    Supermercado, 
    Producto, 
    Sequelize 
} = require('./modeloProducto'); 

// Configuración Express
app.use(express.json());

// --- Funciones de Soporte ---

// Notificación WSS: Envía solicitud al API Gateway (Puerto 3000)
async function notificarOferta(oferta) {
    try {
        const urlWSS = 'https://localhost:3000/api/notificaciones'; 

        // Agente HTTPS para ignorar el certificado autofirmado (dev)
        const agent = new https.Agent({ rejectUnauthorized: false }); 
        
        await axios.post(urlWSS, oferta, { httpsAgent: agent });
        console.log(`[Mercado] Notificación de oferta enviada a API Gateway (WSS).`);
    } catch (error) {
        console.error(`[Mercado] Error al notificar a WSS Channel: ${error.message}`);
    }
}

// --- Rutas de Gestión del Mercado ---

// 1. Listar Supermercados (GET /api/supermercados)
app.get('/api/supermercados', async (req, res) => {
    try {
        const supermercados = await Supermercado.findAll({
            attributes: ['id', 'nombre', 'direccion', 'calificacion_promedio', 'createdAt'],
            order: [['calificacion_promedio', 'DESC']]
        });

        res.status(200).json({ 
            total_supermercados: supermercados.length,
            supermercados 
        });

    } catch (error) {
        console.error("[Mercado] ERROR: Obtener Supermercados:", error.message);
        res.status(500).json({ error: 'Error al consultar la lista de supermercados.', detalles: error.message });
    }
});

// 2. Crear Supermercado (POST /api/supermercados)
app.post('/api/supermercados', async (req, res) => {
    try {
        const nuevoSupermercado = await Supermercado.create(req.body);

        res.status(201).json({ 
            mensaje: 'Supermercado creado exitosamente.',
            supermercado: nuevoSupermercado 
        });

    } catch (error) {
        console.error("[Mercado] ERROR: Crear Supermercado:", error.message);
        res.status(400).json({ 
            error: 'No se pudo crear el supermercado.', 
            detalles: error.message 
        });
    }
});

// 3. Registrar/Actualizar Precios (POST /api/precios)
app.post('/api/precios', async (req, res) => {
    try {
        const { nombre, precio, sku, categoria, supermercadoId } = req.body;

        if (!nombre || !precio || !supermercadoId) {
            return res.status(400).json({ error: "Faltan datos obligatorios." });
        }

        // Busca o crea el producto asociado al supermercado
        const [producto, creado] = await Producto.findOrCreate({
            where: { nombre: nombre, supermercadoId: supermercadoId },
            defaults: { nombre, precio, sku: sku || 'N/A', categoria, supermercadoId, enOferta: false } 
        });

        if (!creado) {
            // Actualizar si ya existía
            await producto.update({ precio, categoria, sku, enOferta: false });
            return res.status(200).json({ mensaje: `Precio actualizado para ${nombre}.`, producto });
        }

        res.status(201).json({ mensaje: `Nuevo producto-precio registrado para ${nombre}.`, producto });

    } catch (error) {
        console.error("[Mercado] ERROR: Cargar Precio:", error.message);
        res.status(500).json({ error: 'Error al registrar el precio.', detalles: error.message });
    }
});

// 4. Publicar Oferta y Notificar WSS (POST /)
// Ruta raíz asumida como /api/ofertas en el Gateway
app.post('/', async (req, res) => { 
    try {
        const { nombre, precio, sku, categoria, supermercadoId, porcentajeDescuento } = req.body;

        if (!nombre || !precio || !supermercadoId || !porcentajeDescuento) {
            return res.status(400).json({ error: "Faltan datos obligatorios para la oferta." });
        }

        // 1. Guardar o actualizar el precio y marcar como OFERTA
        const [producto, creado] = await Producto.findOrCreate({
            where: { nombre: nombre, supermercadoId: supermercadoId },
            defaults: { nombre, precio, sku: sku || 'N/A', categoria, supermercadoId, enOferta: true }
        });
        
        await producto.update({ precio, categoria, sku, enOferta: true }); 

        // 2. Obtener datos del supermercado para la notificación WSS
        const supermercado = await Supermercado.findByPk(supermercadoId);

        const ofertaData = {
            producto: nombre,
            supermercado: supermercado ? supermercado.nombre : 'Desconocido',
            precio: precio,
            descuento: porcentajeDescuento
        };
        
        // 3. Notificación WSS (asíncrona)
        notificarOferta(ofertaData); 

        res.status(201).json({ 
            mensaje: `Oferta registrada para ${nombre} y notificación enviada.`, 
            producto 
        });

    } catch (error) {
        console.error("[Mercado] ERROR: Publicar Oferta:", error.message);
        res.status(500).json({ error: 'Error al publicar la oferta.', detalles: error.message });
    }
});


// --- Inicialización y Seeding de DB ---
async function iniciarBaseDeDatos() {
    try {
        await sequelize.authenticate();
        console.log("[Mercado] Conexión exitosa a MySQL.");
        
        // Creación de datos iniciales (Seeding)
        const [supermercado, creado] = await Supermercado.findOrCreate({
            where: { id: 1 }, 
            defaults: { 
                nombre: 'Super Prueba Central', 
                direccion: 'Calle de Prueba 101', 
                calificacion_promedio: 5.0 
            }
        });

        if (creado) {
            console.log("✅ Supermercado inicial ID 1 creado para pruebas.");
        } else {
            console.log("✅ Supermercado inicial ID 1 ya existe.");
        }

    } catch (error) {
        console.error("[Mercado] Error al iniciar la DB:", error.message);
        process.exit(1); 
    }
}

// --- Inicializar y Correr Servidor ---
iniciarBaseDeDatos()
    .then(() => {
        app.listen(port, () => {
            console.log(`[Mercado] Microservicio-Mercado escuchando en http://localhost:${port}`);
        });
    });