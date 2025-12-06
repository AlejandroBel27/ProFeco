const { Sequelize, DataTypes } = require('sequelize');

// 1. Conexión a la Base de Datos
// primero necesitan crear la bd desde mysql, awas
const sequelize = new Sequelize('db_mercado', 'root', 'amospro2024', {

  host: 'localhost',
  dialect: 'mysql',
  logging: true

});

// 2. Definición del Modelo
const Producto = sequelize.define('Producto', {

  // Atributos del modelo
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
    comment: 'Nombre del Supermercado donde se encontró la inconsistencia'

  },
  precio_encontrado: {

    type: DataTypes.DECIMAL(10, 2),
    comment: 'Precio que el cliente encontró en la tienda'

  },
  descripcion: {

    type: DataTypes.TEXT,
    comment: 'Detalles del reporte (ej. "Precio de góndola no coincide con el de caja")'
  
    },
  estado: {

    type: DataTypes.STRING,
    defaultValue: 'PENDIENTE',
    comment: 'Estado de la investigación: PENDIENTE, EN_REVISION, RESUELTO'

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
        comment: 'Comentario opcional del usuario.'
    },
    usuario_anonimo: {
        type: DataTypes.STRING,
        defaultValue: 'Anonimo',
        comment: 'Nombre de usuario que envió la calificación'
    }
});

Supermercado.hasMany(Producto, {

  foreignKey: 'supermercadoId', 
  as: 'ofertas' 

});

Supermercado.hasMany(Calificacion, {
    foreignKey: 'supermercadoId',
    as: 'reviews' 
});

Calificacion.belongsTo(Supermercado, {
    foreignKey: 'supermercadoId', 
    as: 'tienda_calificada' 
});

Producto.belongsTo(Supermercado, {

  foreignKey: 'supermercadoId',
  as: 'tienda'
    
});

async function iniciarBaseDeDatos() {

  try {

    await sequelize.sync({ force: false }); 
    console.log("Tablas creadas automáticamente en MySQL");

  } catch (error) {

    console.error("Error al conectar:", error);

  }

}

iniciarBaseDeDatos();

module.exports = {

  sequelize,
  Producto,
  Supermercado,
  Inconsistencia,
  Calificacion,
  Sequelize 

};