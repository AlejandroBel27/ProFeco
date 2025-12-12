const path = require('path');

const express = require('express');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const cors = require('cors');
const proxy = require('express-http-proxy'); // Asegúrate de instalar: npm install express-http-proxy

const app = express();
const port = 3000;

// Configuración básica
app.use(cors()); // Permite peticiones desde tus HTML locales
app.use(express.static(path.join(__dirname, '../../front')));

// Cargar certificados generados
const options = {
    key: fs.readFileSync('certificados/private.key'),
    cert: fs.readFileSync('certificados/certificate.crt')
};

// --- CONFIGURACIÓN DE PROXIES ---

// 1. MICROSERVICIO CONSUMIDOR (Puerto 3001)
// Wishlist: El back espera /api/wishlist, así que pasamos la ruta tal cual.
app.use('/api/wishlist', proxy('http://localhost:3001'));

// Reportar: El back (index.js) escucha en la raíz '/' (app.post('/')), 
// por lo que debemos quitar '/api/reportar' de la ruta al enviarlo.
app.use('/api/reportar', proxy('http://localhost:3001', {
    proxyReqPathResolver: () => {
        return '/'; // Transforma /api/reportar -> /
    }
}));

// 2. MICROSERVICIO PROFECO (Puerto 3002)
// Inconsistencias: El back escucha en raíz '/' (app.get('/')), 
// así que también quitamos el prefijo.
app.use('/api/inconsistencias', proxy('http://localhost:3002', {
    proxyReqPathResolver: (req) => {
        // Si piden un ID (ej: /api/inconsistencias/5), devolvemos /5. Si no, /
        const parts = req.url.split('/');
        return parts.length > 1 ? `/${parts[1]}` : '/'; 
    }
}));

// 3. MICROSERVICIO MERCADO (Puerto 3003)
// Supermercados y Ofertas: Asumimos que el back de Mercado sí tiene las rutas completas
// (/api/supermercados), por lo que lo dejamos directo.
app.use('/api/supermercados', proxy('http://localhost:3003'));
app.use('/api/ofertas', proxy('http://localhost:3003'));


// --- SERVIDOR HTTPS & WEBSOCKET ---

const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server });

// WebSocket: Difusión de ofertas
wss.on('connection', (ws) => {
    console.log('[WSS] Cliente conectado al canal de ofertas.');
});

// Endpoint para que el Microservicio Mercado notifique ofertas
app.post('/api/notificaciones', (req, res) => {
    const oferta = req.body;
    
    // Broadcast a todos los clientes conectados
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                tipo: 'NUEVA_OFERTA',
                mensaje: `¡OFERTA EN ${oferta.supermercadoId}! ${oferta.nombre} a $${oferta.precio}`,
                datos: oferta
            }));
        }
    });
    
    console.log(`[Gateway] Oferta difundida a ${wss.clients.size} clientes.`);
    res.status(200).json({ mensaje: 'Notificación enviada.' });
});

server.listen(port, () => {
    console.log(`✅ API Gateway corriendo en https://localhost:${port}`);
});