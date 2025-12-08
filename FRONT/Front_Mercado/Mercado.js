const API_GATEWAY_URL = "https://localhost:3000";

document.getElementById('oferta-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const feedbackDiv = document.getElementById('feedback-mercado');
    feedbackDiv.textContent = 'Enviando oferta y notificación...';
    feedbackDiv.style.color = 'gray';
    feedbackDiv.classList.add('asincrono-feedback'); // Clase de feedback

    // Recopilar datos
    const ofertaData = {
        supermercadoId: parseInt(document.getElementById('supermercadoId').value),
        nombre: document.getElementById('nombre').value,
        precio: parseFloat(document.getElementById('precio').value),
        porcentajeDescuento: parseFloat(document.getElementById('porcentajeDescuento').value),
        sku: document.getElementById('sku').value
    };

    try {
        // POST /api/ofertas (Proxy a Back_Mercado:3003)
        const response = await fetch(`${API_GATEWAY_URL}/api/ofertas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ofertaData)
        });

        const data = await response.json();

        if (response.status === 201) {
            feedbackDiv.textContent = `✅ Éxito: ${data.mensaje}. Notificación WSS enviada.`;
            feedbackDiv.style.backgroundColor = '#d4edda'; 
            feedbackDiv.style.color = '#155724'; 
        } else {
            feedbackDiv.textContent = `❌ Error (${response.status}): ${data.error || data.mensaje}`;
            feedbackDiv.style.backgroundColor = '#f8d7da'; 
            feedbackDiv.style.color = '#721c24'; 
        }

    } catch (error) {
        feedbackDiv.textContent = `❌ Error de conexión con el API Gateway: ${error.message}. Verifique Puertos 3000 y 3003.`;
        feedbackDiv.style.backgroundColor = '#f8d7da';
        feedbackDiv.style.color = '#721c24';
    }
});