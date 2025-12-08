const { Sequelize, DataTypes } = require('sequelize');

// Configuración de conexión a MySQL
const sequelize = new Sequelize('db_profeco', 'root', 'admin', { 
  host: 'localhost',
  dialect: 'mysql',
  logging: false // Desactivar logs de SQL en consola
});

// --- 2. Definición de Modelos (Entidades) ---

const Producto = sequelize.define('Producto', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  categoria: {
    type: DataTypes.STRING
  },
  sku: {
    type: DataTypes.STRING,
    unique: true
  },
  // Campo para ofertas
  enOferta: {
    type: DataTypes.BOOLEAN,
    defaultValue: false 
  }
});


const Supermercado = sequelize.define('Supermercado', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: false
  },
  latitud: {
    type: DataTypes.DECIMAL(10, 8) 
  },
  longitud: {
    type: DataTypes.DECIMAL(11, 8) 
  },
  calificacion_promedio: {
    type: DataTypes.DECIMAL(2, 1), 
    defaultValue: 0.0
  }
});

const Inconsistencia = sequelize.define('Inconsistencia', {
  producto_nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nombre del producto reportado'
  },
  supermercado_reportado: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Nombre del Supermercado'
  },
  precio_encontrado: {
    type: DataTypes.DECIMAL(10, 2),
    comment: 'Precio encontrado por el cliente'
  },
  descripcion: {
    type: DataTypes.TEXT,
    comment: 'Detalles del reporte'
  },
  estado: {
    type: DataTypes.STRING,
    defaultValue: 'PENDIENTE',
    comment: 'PENDIENTE, EN_REVISION, RESUELTO'
  }
});

const Calificacion = sequelize.define('Calificacion', {
    puntuacion: {
        type: DataTypes.DECIMAL(2, 1), 
        allowNull: false,
        validate: {
            min: 1.0,
            max: 5.0
        }
    },
    comentario: {
        type: DataTypes.TEXT,
        comment: 'Comentario opcional.'
    },
    usuario_anonimo: {
        type: DataTypes.STRING,
        defaultValue: 'Anonimo',
        comment: 'Nombre de usuario que envió la calificación'
    }
});

// Modelo: Wishlist
const Wishlist = sequelize.define('Wishlist', {
    usuarioId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombreLista: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Mi Wishlist'
    },
    // Productos almacenados como JSON Array de SKUs/nombres
    productos: {
        type: DataTypes.JSON, 
        defaultValue: []
    }
});


// --- 3. Definición de Relaciones (Asociaciones) ---

// Producto -> Supermercado (1:N)
Supermercado.hasMany(Producto, {
  foreignKey: 'supermercadoId', 
  as: 'ofertas' 
});

Producto.belongsTo(Supermercado, {
  foreignKey: 'supermercadoId',
  as: 'tienda'
});

// Calificación -> Supermercado (1:N)
Supermercado.hasMany(Calificacion, {
    foreignKey: 'supermercadoId',
    as: 'reviews' 
});

Calificacion.belongsTo(Supermercado, {
    foreignKey: 'supermercadoId', 
    as: 'tienda_calificada' 
});


// --- 4. Sincronización e Inicialización ---

async function iniciarBaseDeDatos() {
  try {
    // Sincroniza modelos (crea tablas si no existen)
    await sequelize.sync({ force: false }); 
    console.log("[Sequelize] Tablas creadas automáticamente en MySQL");
  } catch (error) {
    console.error("[Sequelize] Error al conectar y sincronizar:", error);
  }
}

iniciarBaseDeDatos();

// --- 5. Exportación de Módulos ---

module.exports = {
  sequelize,
  Producto,
  Supermercado,
  Inconsistencia,
  Calificacion,
  Wishlist,
  Sequelize 
};