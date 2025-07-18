# login-parking

Este proyecto es una API para la gestión de usuarios y parkings.

## Requisitos

- Node.js (v14 o superior)
- npm
- Base de datos (PostgreSQL)
- Archivo `.env` configurado correctamente

## Instalación

1. Clona el repositorio:
    ```bash
    git clone https://github.com/tu-usuario/login-parking.git cd login-parking
    ```

2. Instala las dependencias:
    ```bash
    npm install
    ```
3. Configura las variables de entorno:
    - Crea un archivo `.env` en la raíz del proyecto.
    - Asegúrate de definir las variables necesarias, por ejemplo:
      ```
      PORT=3000
      DB_HOST=localhost
      DB_USER=tu_usuario
      DB_PASSWORD=tu_contraseña
      DB_NAME=nombre_base_datos
      ```

4. Inicia la base de datos y asegúrate de que esté corriendo.

5. Ejecuta el servidor en local:
    ```bash
    node app.js
    ```
El servidor estará disponible en `http://localhost:3000` (o el puerto que definas en `.env`).

## Observaciones

- Es indispensable tener el archivo `.env` correctamente configurado antes de iniciar el proyecto.
- Si tienes problemas de conexión con la base de datos, revisa las credenciales y que el servicio esté activo.
- Para pruebas de endpoints, recomendable usar Postman como herramienta.

## Endpoints principales

- `/api/users`: Gestión de usuarios.
- `/api/parking`: Gestión de parqueaderos.
- `/api/vehicles`: Gestión de vehiculos.
- `/api/email`: Gestión de envío de email.

---

Si tienes dudas o problemas, contáctame via email.