const express = require('express');
const app = express();
// Puerto para este microservicio
const port = 3001; 

// Importar la lógica de persistencia (Sequelize) desde el Back_Mercado
const { sequelize, Producto, Supermercado, Calificacion, Sequelize } = require('../Back_Mercado/modeloProducto');

// Configuración de Express
app.use(express.json());

// --- Funciones de Inicialización ---
async function iniciarBaseDeDatos() {
    try {
        await sequelize.authenticate();
        console.log("[Consumidor] Conexión exitosa a MySQL.");
    } catch (error) {
        console.error("[Consumidor] Error al iniciar la DB:", error.message);
        process.exit(1); 
    }
}

// --- Rutas del Consumidor ---

// 1. Obtener Productos y Precios para Comparación
app.get('/api/productos', async (req, res) => {
    try {
        const { nombre } = req.query; 

        const opcionesConsulta = {
            include: [{
                model: Supermercado,
                as: 'tienda', 
                attributes: ['nombre', 'direccion', 'calificacion_promedio']
            }]
        };

        if (nombre) {
            opcionesConsulta.where = {
                nombre: {
                    [Sequelize.Op.like]: `%${nombre}%` 
                }
            };
        }
        
        const productos = await Producto.findAll(opcionesConsulta);
        
        res.json({ productos });
    } catch (error) {
        console.error("[Consumidor] ERROR: Comparación de Precios:", error.message); 
        res.status(500).json({ error: 'Error al obtener productos.', detalles: error.message });
    }
});

// 2. Obtener Calificaciones por Supermercado
app.get('/api/calificaciones/:supermercadoId', async (req, res) => {
    try {
        const { supermercadoId } = req.params; 

        const supermercado = await Supermercado.findByPk(supermercadoId);
        if (!supermercado) {
            return res.status(404).json({ error: "Supermercado no encontrado." });
        }

        const calificaciones = await Calificacion.findAll({
            where: { supermercadoId: supermercadoId },
            order: [['createdAt', 'DESC']], 
            attributes: ['puntuacion', 'comentario', 'usuario_anonimo', 'createdAt'] 
        });

        res.status(200).json({ 
            supermercado_nombre: supermercado.nombre,
            promedio_actual: supermercado.calificacion_promedio,
            total_calificaciones: calificaciones.length,
            calificaciones
        });

    } catch (error) {
        console.error("[Consumidor] ERROR: Obtener Calificaciones:", error.message);
        res.status(500).json({ error: 'Error al consultar las calificaciones.', detalles: error.message });
    }
});

// 3. Registrar Calificaciones y Actualizar Promedio
app.post('/api/calificaciones', async (req, res) => {
    const { supermercadoId, puntuacion, comentario, usuario_anonimo } = req.body;
    
    if (!supermercadoId || !puntuacion) {
        return res.status(400).json({ error: "Faltan datos obligatorios (supermercadoId y puntuacion)." });
    }

    try {
        const supermercado = await Supermercado.findByPk(supermercadoId);
        if (!supermercado) {
            return res.status(404).json({ error: "Supermercado no encontrado." });
        }

        await Calificacion.create({
            supermercadoId,
            puntuacion,
            comentario,
            usuario_anonimo
        });

        const resultadoPromedio = await Calificacion.findAll({
            attributes: [
                [Sequelize.fn('AVG', Sequelize.col('puntuacion')), 'promedio']
            ],
            where: { supermercadoId: supermercadoId },
            raw: true
        });

        const nuevoPromedio = parseFloat(resultadoPromedio[0].promedio).toFixed(1);

        await supermercado.update({ calificacion_promedio: nuevoPromedio });

        res.status(201).json({ 
            mensaje: `Calificación de ${puntuacion} guardada. Promedio actualizado a ${nuevoPromedio}.`,
            supermercado_id: supermercadoId,
            nuevo_promedio: nuevoPromedio
        });

    } catch (error) {
        console.error("[Consumidor] ERROR: Guardar Calificación:", error.message);
        res.status(500).json({ error: 'Error al registrar la calificación.', detalles: error.message });
    }
});


// --- Inicializar y Correr Servidor ---
iniciarBaseDeDatos()
    .then(() => {
        app.listen(port, () => {
            console.log(`[Consumidor] Microservicio-Consumidor escuchando en http://localhost:${port}`);
        });
    });