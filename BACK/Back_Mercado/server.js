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
        // Consulta segura y parametrizada por Sequelize
        const productos = await Producto.findAll();
        res.json({ productos, seguridad: "Consulta parametrizada por Sequelize." });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos.' });
    }
});


// --- 4. RUTA ASÍNCRONA (DELEGACIÓN A RABBITMQ / AMQPS) ---

app.post('/api/reportes', async (req, res) => {
    const { tipo, correo } = req.body;
    
    // El Backend delega el trabajo pesado
    const resultadoDelegacion = await enviarTareaReporte(tipo, new Date().toISOString(), correo);

    if (resultadoDelegacion.success) {
        // Respuesta Inmediata (202 Accepted) sin esperar el resultado de la tarea
        res.status(202).json({ 
            mensaje: `Reporte tipo ${tipo} delegado.`,
            estado: 'Procesamiento asíncrono iniciado'
        });
    } else {
        res.status(500).json({ 
            mensaje: 'Error interno al delegar la tarea.',
            detalles: resultadoDelegacion.error
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