const API_GATEWAY_URL = "https://localhost:3000";

// --- Función para cargar todos los reportes ---
async function cargarReportes() {
    const listDiv = document.getElementById('reportes-list');
    listDiv.innerHTML = 'Cargando reportes...';
    
    try {
        // GET /api/inconsistencias (Proxy a Back_Profeco:3002)
        const response = await fetch(`${API_GATEWAY_URL}/api/inconsistencias`);
        const data = await response.json();

        if (response.status === 200 && data.reportes) {
            if (data.reportes.length === 0) {
                listDiv.innerHTML = '<p>No hay reportes pendientes.</p>';
                return;
            }

            listDiv.innerHTML = ''; // Limpiar lista
            
            data.reportes.forEach(reporte => {
                const itemDiv = document.createElement('div');
                const estadoClass = reporte.estado === 'PENDIENTE' ? 'estado-pendiente' : 'estado-cerrado';
                itemDiv.className = `reporte-item ${estadoClass}`;
                
                // Usar nombres de columna de la DB (producto_nombre, supermercado_reportado, precio_encontrado)
                itemDiv.innerHTML = `
                    <p><strong>ID: ${reporte.id}</strong> | Estado: ${reporte.estado}</p>
                    <p>Producto: ${reporte.producto_nombre} en ${reporte.supermercado_reportado} ($${reporte.precio_encontrado})</p>
                    <p>Descripción: ${reporte.descripcion}</p>
                `;
                
                if (reporte.estado === 'PENDIENTE') {
                    const cerrarBtn = document.createElement('button');
                    cerrarBtn.className = 'btn-cerrar';
                    cerrarBtn.textContent = 'Cerrar Reporte';
                    cerrarBtn.onclick = () => cerrarReporte(reporte.id);
                    itemDiv.appendChild(cerrarBtn);
                }

                listDiv.appendChild(itemDiv);
            });

        } else {
            listDiv.innerHTML = `<p style="color: red;">Error al cargar: ${data.error || 'Respuesta inesperada'}</p>`;
        }
    } catch (error) {
        listDiv.innerHTML = `<p style="color: red;">❌ Error de conexión: ${error.message}. ¿Puertos 3000 y 3002 activos?</p>`;
    }
}
window.cargarReportes = cargarReportes; 

// --- Función para cerrar un reporte (Actualizar estado) ---
async function cerrarReporte(id) {
    if (!confirm(`¿Está seguro de cerrar el Reporte ID ${id}?`)) return;

    try {
        // PUT /api/inconsistencias/:id/estado 
        const response = await fetch(`${API_GATEWAY_URL}/api/inconsistencias/${id}/estado`, {
            method: 'PUT', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nuevo_estado: 'RESUELTO' })
        });

        const data = await response.json();

        if (response.status === 200) {
            alert(`✅ Reporte ID ${id} cerrado con éxito.`);
            cargarReportes(); // Recargar la lista
        } else {
            alert(`❌ Error al cerrar: ${data.error}`);
        }

    } catch (error) {
        alert(`❌ Error de conexión al cerrar reporte: ${error.message}`);
    }
}
window.cerrarReporte = cerrarReporte; 

// --- Función para consultar un solo reporte por ID ---
async function consultarReporteId() {
    const id = document.getElementById('reporteId').value;
    const individualDiv = document.getElementById('consulta-individual');
    individualDiv.innerHTML = 'Consultando...';

    if (!id) {
        individualDiv.innerHTML = 'Por favor ingrese un ID.';
        return;
    }

    try {
        // GET /api/inconsistencias/:id
        const response = await fetch(`${API_GATEWAY_URL}/api/inconsistencias/${id}`);
        const data = await response.json();

        if (response.status === 200 && data.reporte) {
            const reporte = data.reporte;
            // Usar nombres de columna de la DB
            individualDiv.innerHTML = `
                <div class="reporte-item estado-cerrado">
                    <p><strong>ID: ${reporte.id}</strong> | Estado: ${reporte.estado}</p>
                    <p>Producto: ${reporte.producto_nombre} en ${reporte.supermercado_reportado}</p>
                    <p>Precio Reportado: $${reporte.precio_encontrado}</p>
                </div>
            `;
        } else {
            individualDiv.innerHTML = `<p style="color: red;">Reporte no encontrado o error: ${data.error || 'Verifique el ID.'}</p>`;
        }
    } catch (error) {
        individualDiv.innerHTML = `<p style="color: red;">Error de conexión: ${error.message}</p>`;
    }
}
window.consultarReporteId = consultarReporteId;

// Cargar reportes automáticamente al inicio
document.addEventListener('DOMContentLoaded', cargarReportes);