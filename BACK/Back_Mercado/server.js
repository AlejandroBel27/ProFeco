const express = require('express');
const app = express();
const port = 3000;

// --- 1. Importaciones ---
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
// Usamos Inconsistencia y sequelize directamente para el reporte SÍNCRONO
const { sequelize, Inconsistencia } = require('./modeloProducto'); 

// Cargar certificados SSL (deben estar en la misma carpeta)
const credentials = {
    key: fs.readFileSync('private.key', 'utf8'),
    cert: fs.readFileSync('certificate.crt', 'utf8')
};

// --- 2. CONFIGURACIÓN DE EXPRESS ---
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
    // Si estás aquí, el navegador confía en el certificado, lo cual es bueno para WSS.
    res.send('API Gateway y WSS funcionando. Los microservicios escuchan en otros puertos.');
});

// Ruta: Registrar Inconsistencias (MÉTODO SÍNCRONO)
// Mantenida en el Gateway para la notificación WSS inmediata
app.post('/api/reportes', async (req, res) => {
    const tarea = req.body;
    
    if (!tarea || !tarea.tipo || !tarea.datos) {
        return res.status(400).json({ error: 'Faltan campos "tipo" o "datos" en la tarea del reporte.' });
    }

    try {
        const { producto, supermercado, precio, descripcion } = tarea.datos;
        
        // PERSISTENCIA DIRECTA (SÍNCRONA)
        const nuevoReporte = await Inconsistencia.create({
            producto_nombre: producto,
            supermercado_reportado: supermercado,
            precio_encontrado: precio,
            descripcion: descripcion,
            estado: 'PENDIENTE'
        });

        console.log(`[Gateway - SÍNCRONO] Reporte de ${producto} guardado. ID: ${nuevoReporte.id}`);

        // ENVÍO DE NOTIFICACIÓN EN TIEMPO REAL A TODOS LOS CLIENTES WSS
        const broadcastMessage = JSON.stringify({
            tipo: 'nuevo_reporte',
            mensaje: `Se ha recibido un nuevo reporte de inconsistencia sobre ${producto}.`,
            id: nuevoReporte.id 
        });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(broadcastMessage);
            }
        });
        console.log(`[WSS] Notificación de nuevo reporte enviada a ${wss.clients.size} clientes.`);

        res.status(202).json({ 
            mensaje: 'Reporte guardado y notificado.',
            detalle: `ID: ${nuevoReporte.id}`
        });
        
    } catch (error) {
        console.error("Error al procesar reporte síncrono:", error.message); 
        res.status(500).json({ 
            error: 'No se pudo guardar el reporte.', 
            detalles: error.message 
        });
    }
});


// --- 3. CONFIGURACIÓN DE WSS Y ENTRADA PRINCIPAL ---

const httpsServer = https.createServer(credentials, app);

const wss = new WebSocket.Server({ server: httpsServer });

wss.on('connection', function connection(ws, req) {
    console.log(`Cliente WSS conectado.`);
    
    // El setTimeout de prueba de 10 segundos fue removido, puedes agregarlo aquí si lo necesitas.

    ws.on('close', () => console.log('Cliente WSS desconectado.'));
});

// Inicialización
sequelize.authenticate()
    .then(() => {
        console.log("[Gateway] Conexión DB OK. Iniciando servidores...");
        httpsServer.listen(port, () => {
            console.log(`[Gateway] Servidor API REST y WSS escuchando en https://localhost:${port}`);
        });
    })
    .catch(error => {
        console.error("Error al iniciar el Gateway (DB):", error.message);
        process.exit(1); 
    });