const express = require('express');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const cors = require('cors');

const app = express(); 
const port = 3000;

// Configuración básica
app.use(express.json());
app.use(cors()); 

// Configuración de certificados (HTTPS/WSS)
const options = {
    key: fs.readFileSync('./certificados/private.key'),
    cert: fs.readFileSync('./certificados/certificate.crt')
};

// Servidor HTTPS
const server = https.createServer(options, app);

// Servidor WebSocket anidado (WSS)
const wss = new WebSocket.Server({ server });

// Conexión WSS de Clientes
wss.on('connection', function connection(ws) {
    console.log('[WSS] Cliente conectado.');

    ws.on('close', () => {
        console.log('[WSS] Cliente desconectado.');
    });
});

// Rutas del API Gateway

// WSS_BROADCAST: Endpoint para recibir ofertas y notificar clientes conectados
app.post('/api/notificaciones', (req, res) => {
    const oferta = req.body; 

    if (!oferta || !oferta.producto) {
        return res.status(400).json({ error: 'Datos de oferta faltantes.' });
    }

    // Preparación del mensaje WSS
    const broadcastMessage = JSON.stringify({
        tipo: 'nueva_oferta',
        mensaje: `¡OFERTA! ${oferta.supermercado} tiene ${oferta.producto} por $${oferta.precio}.`,
        detalle_oferta: oferta
    });
    
    // Difusión a clientes WSS
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMessage);
        }
    });
    console.log(`[WSS] Notificación enviada a ${wss.clients.size} clientes.`);

    res.status(202).json({ 
        mensaje: 'Notificación procesada y enviada a través de WSS.'
    });
});


const proxy = require('express-http-proxy');

// PROXY CONFIGURATION
// El Gateway elimina el prefijo de la ruta antes de enviarla al microservicio.

// Proxy 1: Microservicio Consumidor (Puerto 3001)
app.use('/BACK/Back_Consumidor/modeloProducto.js', proxy('http://localhost:3001'));
app.use('/api/calificaciones', proxy('http://localhost:3001'));
app.use('/api/wishlist', proxy('http://localhost:3001'));
app.use('/api/reportar', proxy('http://localhost:3001'));

// Proxy 2: Microservicio Mercado (Puerto 3003)
app.use('/api/supermercados', proxy('http://localhost:3003'));
app.use('/api/precios', proxy('http://localhost:3003'));
app.use('/api/ofertas', proxy('http://localhost:3003'));

// Proxy 3: Microservicio ProFeCo (Puerto 3002)
app.use('/api/inconsistencias', proxy('http://localhost:3002'));

// Inicializar Servidor 
server.listen(port, () => {
    console.log(`[API Gateway] Servidor HTTPS/WSS escuchando en https://localhost:${port}`);
});