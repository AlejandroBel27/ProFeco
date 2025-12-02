const { Sequelize, DataTypes } = require('sequelize');

// 1. Conexión a la Base de Datos
// primero necesitan crear la bd desde mysql, awas
const sequelize = new Sequelize('db_mercado', 'root', '63690Val', {
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
    type: DataTypes.DECIMAL(10, 8) // Para geolocalización
  },
  longitud: {
    type: DataTypes.DECIMAL(11, 8) // Para geolocalización
  },
    calificacion_promedio: {
    type: DataTypes.DECIMAL(2, 1), // Ej. 4.5
    defaultValue: 0.0
  }
});

// 3. Sincronización
async function iniciarBaseDeDatos() {
  try {
    await sequelize.sync({ force: false }); 
    console.log("Tablas creadas automáticamente en MySQL");
  } catch (error) {
    console.error("Error al conectar:", error);
  }
}

iniciarBaseDeDatos();

// Un Supermercado (el "uno") tiene muchos Productos (el "muchos")
Supermercado.hasMany(Producto, {
    foreignKey: 'supermercadoId', // El campo que se agregará a la tabla Productos
    as: 'ofertas' // Alias para cuando consultamos el supermercado
});

// Un Producto (el "muchos") pertenece a un Supermercado (el "uno")
Producto.belongsTo(Supermercado, {
    foreignKey: 'supermercadoId', // Mismo campo en la tabla Productos
    as: 'tienda' // Alias para cuando consultamos el producto
});

module.exports = {
    sequelize,
    Producto,
    Supermercado
};