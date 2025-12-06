// server.js (Backend Mercado)
const express = require('express');
const app = express();
const port = 3000;

// --- 1. IMPORTACIONES PARA WEB SOCKETS (WSS) y HTTPS ---
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');

// Importar la lógica de RabbitMQ (Productor Asíncrono)
const { enviarTareaReporte } = require('./servicioReportes'); 

// Importar la lógica de persistencia (Sequelize)
const { sequelize, Producto } = require('./modeloProducto'); 

// Cargar certificados SSL (¡REQUERIDOS para HTTPS y WSS!)
const credentials = {

    key: fs.readFileSync('private.key', 'utf8'),
    cert: fs.readFileSync('certificate.crt', 'utf8')

};

// --- 2. FUNCIÓN DE INICIALIZACIÓN DE LA BASE DE DATOS ---

async function iniciarBaseDeDatos() {

    try {

        await sequelize.authenticate();
        console.log("Conexión exitosa a MySQL (DB Mercado)");

        // Sincronización: Crea o verifica la tabla 'Productos'
        await sequelize.sync({ alter: true });
        console.log("Tablas sincronizadas automáticamente por Sequelize.");

    } catch (error) {

        console.error("Error al iniciar la Base de Datos:", error.message);
        process.exit(1); 

    }
}


// --- 3. CONFIGURACIÓN DE EXPRESS Y RUTAS SÍNCRONAS (HTTPS) ---

// Middleware para parsear JSON
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {

    res.send('API REST Mercado funcionando. Conexión segura lista.');

});

// Ejemplo de Ruta Síncrona (Acceso directo a la BD)
app.get('/api/productos', async (req, res) => {

    try {

         const { nombre } = req.query; // Capturamos el parámetro de búsqueda
        // Definimos las opciones de consulta
        const opcionesConsulta = {

            // Incluimos el modelo Supermercado asociado
            include: [{

                model: Supermercado,
                as: 'tienda', // Usamos el alias definido en modeloProducto.js
                attributes: ['nombre', 'direccion', 'calificacion_promedio'] // Solo incluimos datos relevantes
            
            }]

        };

        // Si se proporciona un nombre, filtramos la consulta
        if (nombre) {

            opcionesConsulta.where = {

                nombre: {

                    // Usamos LIKE con comodines % para búsqueda parcial
                    [Sequelize.Op.like]: `%${nombre}%` 

                }

            };

        }
        // Consulta segura y parametrizada por Sequelize
        const productos = await Producto.findAll(opcionesConsulta);
        res.json({ productos, seguridad: "Consulta parametrizada por Sequelize." });

    } catch (error) {

        // 🚨 CAMBIO CLAVE: Imprimir el error real de MySQL/Sequelize 
        console.error("🚨 ERROR REAL DE PERSISTENCIA:", error.message);
        res.status(500).json({ error: 'Error al obtener productos para comparación.', detalles: error.message });

    }

});


app.post('/api/precios', async (req, res) => {

     try {

        const { nombre, precio, sku, categoria, supermercadoId } = req.body;
        if (!nombre || !precio || !supermercadoId) {

            return res.status(400).json({ error: "Faltan datos obligatorios (nombre, precio, supermercadoId)." });
        
        }

        // Buscar si ya existe una oferta para este producto y este supermercado (usamos sku si existe, sino el nombre)
        const [producto, creado] = await Producto.findOrCreate({

            where: {

                // Buscamos si existe esta oferta específica para este supermercado
                nombre: nombre, 
                supermercadoId: supermercadoId 

            },
            defaults: {

                nombre, 
                precio, 
                sku: sku || 'N/A', 
                categoria,
                supermercadoId

            }
        });
        if (!creado) {

            // Si la oferta ya existía, la actualizamos
            await producto.update({ precio, categoria, sku });
            return res.status(200).json({ mensaje: `Precio actualizado para ${nombre} en Supermercado ID ${supermercadoId}.`, producto });
        
        }
        res.status(201).json({ mensaje: `Nuevo producto-precio registrado para ${nombre}.`, producto });

    } catch (error) {

        console.error("Error al cargar precio:", error.message);
        res.status(500).json({ error: 'Error al registrar el precio.', detalles: error.message });
    
    }

});

app.post('/api/supermercados', async (req, res) => {

    try {

        // req.body debe contener: nombre, direccion, latitud, longitud (opcional)
        const nuevoSupermercado = await Supermercado.create(req.body);
        // Envía una respuesta 201 (Creado) con los datos del nuevo registro
        res.status(201).json({ 

            mensaje: 'Supermercado creado exitosamente.',
            supermercado: nuevoSupermercado 

        });

    } catch (error) {

        console.error("🚨 Error al crear supermercado:", error.message);
        // Manejo de errores de Sequelize (ej. datos faltantes o nombre duplicado)
        res.status(400).json({ 

            error: 'No se pudo crear el supermercado.', 
            detalles: error.message 

        });
        
    }

});


// --- 5. CONFIGURACIÓN DE WSS Y ENTRADA PRINCIPAL ---

// Creamos el servidor HTTPS que alojará tanto REST como WSS cifrado
const httpsServer = https.createServer(credentials, app);

// Creamos el Servidor WebSocket sobre el Servidor HTTPS
const wss = new WebSocket.Server({ server: httpsServer });

// Lógica de gestión de conexiones WSS
wss.on('connection', function connection(ws, req) {
    console.log(`Cliente conectado por canal WSS seguro: ${req.socket.remoteAddress}`);
    
    // --- SIMULACIÓN DE NOTIFICACIÓN EN TIEMPO REAL ---
    setTimeout(() => {
        const message = JSON.stringify({
            tipo: 'alerta_precio',
            producto: 'Artículo Z',
            mensaje: 'Alerta generada por el Backend y enviada por WSS.',
            protocolo: 'WSS Cifrado'
        });
        ws.send(message); 
        console.log('Notificación de alerta enviada por WSS.');
    }, 10000);

    ws.on('close', () => console.log('Cliente desconectado del canal WSS.'));
});

iniciarBaseDeDatos()
    .then(() => {
        // Iniciamos el servidor HTTPS/WSS
        httpsServer.listen(port, () => {
            console.log(`Servidor API REST y WSS Cifrado escuchando en https://localhost:${port}`);
        });
    });