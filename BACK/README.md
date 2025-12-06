# ProFeco Backend - Documentación y Guía de Inicio

## Estructura del Proyecto

```
BACK/
├── Back_Mercado/
│   ├── server.js
│   ├── modeloProducto.js
│   ├── servicioReportes.js
│   ├── generate_certs.js
│   ├── package.json
│   ├── private.key
│   └── certificate.crt
├── Worker-service/
│   ├── report_worker.js
│   └── package.json
├── Back_Profeco/
│   └── package.json
├── Back_Consumidor/
│   └── package.json
└── .gitignore
```

## Descripción de Componentes

### Back_Mercado
- **server.js**: Servidor Express con HTTPS y WebSocket seguro (WSS). Expone rutas REST para productos y reportes. Usa Sequelize para MySQL y delega tareas pesadas a RabbitMQ.
- **modeloProducto.js**: Define el modelo Producto y la conexión a MySQL con Sequelize.
- **servicioReportes.js**: Envía tareas de reporte a RabbitMQ (cola `cola_reportes_mercado`).
- **generate_certs.js**: Genera certificados autofirmados para desarrollo (`private.key`, `certificate.crt`).
- **package.json**: Dependencias principales: express, mysql2, sequelize, ws, amqplib, selfsigned.

### Worker-service
- **report_worker.js**: Worker que consume tareas de la cola RabbitMQ y simula el procesamiento de reportes.
- **package.json**: Solo depende de amqplib.

### Back_Profeco y Back_Consumidor
- Ambos tienen un `package.json` con dependencias para Express, Sequelize y MySQL2.

---

## Guía de Instalación y Ejecución

### 1. Clonar el repositorio
```powershell
git clone <URL-del-repo>
cd <carpeta-del-repo>
```

### 2. Instalar dependencias
Instala las dependencias en cada subproyecto:
```powershell
cd Back_Mercado
npm install
cd ../Worker-service
npm install
cd ../Back_Profeco
npm install
cd ../Back_Consumidor
npm install
```

### 3. Generar certificados para HTTPS
```powershell
cd ../Back_Mercado
node generate_certs.js
```

### 4. Configurar la base de datos MySQL
- Crea la base de datos `db_mercado` en tu servidor MySQL.
- Verifica usuario y contraseña en `modeloProducto.js`.

### 5. Iniciar RabbitMQ
- Instala y ejecuta RabbitMQ en tu máquina (por defecto en `localhost:5672`).

### 6. Arrancar los servicios
- Backend Mercado:
  ```powershell
  node server.js
  ```
- Worker:
  ```powershell
  cd ../Worker-service
  node report_worker.js
  ```

---

## Ejemplo de Comandos para Inicializar Todo
```powershell
git clone <URL-del-repo>
cd <repo>
cd BACK\Back_Mercado
npm install
node generate_certs.js
node server.js
cd ..\Worker-service
npm install
node report_worker.js
```

---

## Notas y Recomendaciones
- Usa variables de entorno para credenciales y configuración sensible.
- Protege tus certificados en producción.
- Revisa los logs para depurar errores de conexión o base de datos.
- Puedes agregar CORS si el frontend está en otro dominio.

---

## Contacto y Soporte
Para dudas o soporte, contacta al propietario del repositorio.
