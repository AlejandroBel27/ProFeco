const API_GATEWAY_URL = "https://localhost:3000";
let GLOBAL_USUARIO_ID = null; 
let GLOBAL_USER_TOKEN = null; // JWT: Variable global para almacenar el token

// --- 1. Lógica de LOGIN y Carga Inicial ---
function loginSimulado() {
    const userIdInput = document.getElementById('userIdInput').value;
    if (userIdInput) {
        GLOBAL_USUARIO_ID = userIdInput;
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('usuario-display').textContent = `Usuario ID: ${GLOBAL_USUARIO_ID}`;
        
        conectarWebSocket(); // Iniciar el canal WSS
        cargarWishlist();    // Cargar datos del usuario
    } else {
        alert("Por favor, ingrese un ID de usuario.");
    }
}
window.loginSimulado = loginSimulado;


// --- 2. Lógica de Wishlist ---

async function cargarWishlist() {
    if (!GLOBAL_USUARIO_ID) return;

    try {
        // GET /api/wishlist/:usuarioId
        const response = await fetch(`${API_GATEWAY_URL}/api/wishlist/${GLOBAL_USUARIO_ID}`);
        const data = await response.json();
        
        const infoDiv = document.getElementById('wishlist-info');
        infoDiv.innerHTML = `
            <p>Lista: **${data.wishlist.nombreLista}**</p>
            <p>Productos (SKU): **${data.wishlist.productos.join(', ') || 'Ninguno'}**</p>
            <p style="color: green;">${data.mensaje}</p>
        `;

    } catch (error) {
        document.getElementById('wishlist-info').innerHTML = `<p style="color: red;">Error al cargar Wishlist: ${error.message}. ¿El Puerto 3001 está activo?</p>`;
    }
}

async function agregarProductoAWishlist() {
    if (!GLOBAL_USUARIO_ID) {
        alert("Debe iniciar sesión primero.");
        return;
    }

    const sku = document.getElementById('skuProducto').value;
    if (!sku) {
        alert("Ingrese un SKU para añadir.");
        return;
    }

    try {
        // POST /api/wishlist/:usuarioId/producto
        const response = await fetch(`${API_GATEWAY_URL}/api/wishlist/${GLOBAL_USUARIO_ID}/producto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ skuProducto: sku })
        });
        const data = await response.json();
        
        if (response.status === 200) {
            alert(data.mensaje);
            document.getElementById('skuProducto').value = '';
            cargarWishlist(); 
        } else {
            alert(`Error: ${data.error}`);
        }

    } catch (error) {
        alert(`Error al agregar a Wishlist: ${error.message}`);
    }
}
window.agregarProductoAWishlist = agregarProductoAWishlist;


// --- 3. Lógica WebSocket (WSS) ---
function conectarWebSocket() {
    const wssStatus = document.getElementById('wss-status');
    const ofertasFeed = document.getElementById('ofertas-feed');
    
    // Conexión WSS al Puerto 3000
    const ws = new WebSocket(`wss://localhost:3000`); 

    ws.onopen = () => {
        wssStatus.textContent = 'Conectado';
        wssStatus.style.color = 'green';
    };

    ws.onerror = (error) => {
        wssStatus.textContent = 'Error';
        wssStatus.style.color = 'red';
        console.error("Error en la conexión WSS:", error);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.tipo === 'nueva_oferta') {
            const ofertaDiv = document.createElement('div');
            ofertaDiv.className = 'oferta';
            ofertaDiv.innerHTML = `
                📢 **${data.detalle_oferta.supermercado}**: ${data.mensaje} 
                <span style="color: red;">($${data.detalle_oferta.precio})</span>
            `;
            ofertasFeed.prepend(ofertaDiv); 
        }
    };
}


// --- 4. Lógica de Reporte Asíncrono (RabbitMQ) ---
document.getElementById('reporte-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!GLOBAL_USUARIO_ID) {
        alert("Debe iniciar sesión para enviar reportes.");
        return;
    }

    const feedbackDiv = document.getElementById('feedback');
    feedbackDiv.textContent = 'Enviando reporte...';
    feedbackDiv.style.color = 'gray';

    const reporteData = {
        producto: document.getElementById('producto').value,
        supermercado: document.getElementById('supermercado').value,
        precio: parseFloat(document.getElementById('precio').value),
        descripcion: document.getElementById('descripcion').value
    };

    try {
        // POST /api/reportar (Productor RabbitMQ vía 3001)
        const response = await fetch(`${API_GATEWAY_URL}/api/reportar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reporteData)
        });

        const data = await response.json();

        // 202 Accepted (Procesamiento ASÍNCRONO)
        if (response.status === 202) {
            feedbackDiv.textContent = `✅ ${data.mensaje}. El Worker lo procesará pronto.`;
            feedbackDiv.style.color = 'green';
            e.target.reset(); 
        } else {
            feedbackDiv.textContent = `❌ Error (${response.status}): ${data.error || data.mensaje}`;
            feedbackDiv.style.color = 'red';
        }

    } catch (error) {
        feedbackDiv.textContent = `❌ Error de conexión: ${error.message}. Asegúrese que el API Gateway (Puerto 3000) esté activo.`;
        feedbackDiv.style.color = 'red';
    }
});