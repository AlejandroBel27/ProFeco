const express = require('express');
const app = express();
const port = 3002; 
const cors = require('cors'); 

// Importar lógica de persistencia (Sequelize)
const { sequelize, Supermercado, Inconsistencia, Producto } = require('./modeloProducto'); 

// Configuración Express
app.use(express.json());
app.use(cors()); 

// --- Funciones de Inicialización ---
async function iniciarBaseDeDatos() {
    try {
        await sequelize.authenticate();
        console.log("[ProFeCo] Conexión exitosa a MySQL.");
        
    } catch (error) {
        console.error("[ProFeCo] Error al iniciar la DB:", error.message);
        process.exit(1); 
    }
}


// A. Listar Inconsistencias (GET /)
app.get('/', async (req, res) => {
    try {
        const reportes = await Inconsistencia.findAll({
            order: [
                ['estado', 'ASC'], 
                ['createdAt', 'DESC'] 
            ]
        });

        res.status(200).json({ 
            total_reportes: reportes.length,
            reportes 
        });

    } catch (error) {
        console.error("[ProFeCo] ERROR: Obtener Inconsistencias:", error.message);
        res.status(500).json({ error: 'Error al consultar los reportes.', detalles: error.message });
    }
});

// B. Actualizar Estado de Inconsistencia (PUT /:id/estado)
app.put('/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevo_estado } = req.body; 

        if (!['PENDIENTE', 'EN_REVISION', 'RESUELTO'].includes(nuevo_estado)) {
            return res.status(400).json({ error: 'Estado no válido.' });
        }

        const reporte = await Inconsistencia.findByPk(id);

        if (!reporte) {
            return res.status(404).json({ error: "Reporte no encontrado." });
        }

        await reporte.update({ estado: nuevo_estado });

        res.status(200).json({ 
            mensaje: `Estado actualizado a ${nuevo_estado}.`,
            reporte_id: id,
            nuevo_estado: nuevo_estado
        });

    } catch (error) {
        console.error("[ProFeCo] ERROR: Actualizar Estado:", error.message);
        res.status(500).json({ error: 'Error al actualizar el reporte.', detalles: error.message });
    }
});

// C. Obtener Inconsistencia por ID (GET /:id)
app.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const reporte = await Inconsistencia.findByPk(id);

        if (!reporte) {
            return res.status(404).json({ error: "Reporte no encontrado." });
        }

        res.status(200).json({ reporte });

    } catch (error) {
        console.error("[ProFeCo] ERROR: Obtener por ID:", error.message);
        res.status(500).json({ error: 'Error al consultar el reporte.', detalles: error.message });
    }
});


// --- Inicializar y Correr Servidor ---
iniciarBaseDeDatos()
    .then(() => {
        app.listen(port, () => {
            console.log(`[ProFeCo] Microservicio escuchando en http://localhost:${port}`);
        });
    });