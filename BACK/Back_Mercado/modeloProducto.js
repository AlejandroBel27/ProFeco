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

module.exports = {
    sequelize,
    Producto 
};