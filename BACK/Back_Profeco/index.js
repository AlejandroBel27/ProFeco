const express = require('express');
const app = express();
const port = 3002; 

// Importar la lógica de persistencia (Sequelize)
// Ajusta el 'require' si modeloProducto no está una carpeta arriba del nivel de Back_Profeco
const { sequelize, Supermercado, Inconsistencia, Producto } = require('../Back_Mercado/modeloProducto');

// Configuración de Express
app.use(express.json());

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

// --- Rutas de ProFeCo y Precios (Administrativas) ---

// A. Listar Inconsistencias
app.get('/api/inconsistencias', async (req, res) => {
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

// B. Actualizar Estado de Inconsistencia
app.put('/api/inconsistencias/:id/estado', async (req, res) => {
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

// C. Listar Supermercados
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
        console.error("[ProFeCo] ERROR: Obtener Supermercados:", error.message);
        res.status(500).json({ error: 'Error al consultar la lista de supermercados.', detalles: error.message });
    }
});

// D. Crear Supermercado
app.post('/api/supermercados', async (req, res) => {
    try {
        const nuevoSupermercado = await Supermercado.create(req.body);

        res.status(201).json({ 
            mensaje: 'Supermercado creado exitosamente.',
            supermercado: nuevoSupermercado 
        });

    } catch (error) {
        console.error("[ProFeCo] ERROR: Crear Supermercado:", error.message);
        res.status(400).json({ 
            error: 'No se pudo crear el supermercado.', 
            detalles: error.message 
        });
    }
});

// E. Registrar/Actualizar Precios (Lógica de Precios)
app.post('/api/precios', async (req, res) => {
    try {
        const { nombre, precio, sku, categoria, supermercadoId } = req.body;

        if (!nombre || !precio || !supermercadoId) {
            return res.status(400).json({ error: "Faltan datos obligatorios (nombre, precio, supermercadoId)." });
        }

        const [producto, creado] = await Producto.findOrCreate({
            where: { nombre: nombre, supermercadoId: supermercadoId },
            defaults: { nombre, precio, sku: sku || 'N/A', categoria, supermercadoId }
        });

        if (!creado) {
            await producto.update({ precio, categoria, sku });
            return res.status(200).json({ mensaje: `Precio actualizado para ${nombre}.`, producto });
        }

        res.status(201).json({ mensaje: `Nuevo producto-precio registrado para ${nombre}.`, producto });

    } catch (error) {
        console.error("[ProFeCo] ERROR: Cargar Precio:", error.message);
        res.status(500).json({ error: 'Error al registrar el precio.', detalles: error.message });
    }
});


// --- Inicializar y Correr Servidor ---
iniciarBaseDeDatos()
    .then(() => {
        app.listen(port, () => {
            console.log(`[ProFeCo] Microservicio escuchando en http://localhost:${port}`);
        });
    });