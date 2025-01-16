
# Pasos para la instalación nueva

1. Tener instalado Docker, recomendamos Docker Desktop que trae todas las herramientas necesarias.

2. Crear una carpeta para almacenar el pryecto. En esa carpeta, clonar el repositorio:

   ```bash
   git clone https://github.com/Gonzalibrandi/BuscadorProyectosInvestigacion.git
   ```

3. Iniciar sesión en Google Cloud Platform e ir a [https://console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials).
   
   - Ir a: **Credenciales → Crear credenciales → ID de cliente OAuth**  
   - Tipo de aplicación → **Aplicación web**  
   - Nombre → `<el que quieras>`, ej. **Aplicación web 3**  
   - URI de redirección autorizados → **Añadir URI** → `http://localhost:3000/auth/google/callback` → haz clic en "CREAR"  
   - Ahora obtendrás tu **GOOGLE_CLIENT_ID** y **GOOGLE_CLIENT_SECRET** que se verán algo así:
     - i. **Client secret**: XyLuTLlKFix9Z8WRHX6Ov_93PiP  
     - ii. **Client ID**: 3184701-tn6fvte2831.apps.googleusercontent.com

5. Crea un archivo llamado `.env` en la carpeta `my-project` siguiendo los pasos:

   a. Dentro de la carpeta `my-project`, ejecutar el comando:  
      En Linux:
      ```bash
      cp .env.example .env
      ```
      En Windows:
      ```bash
      copy .\.env.example .\.env
      ```

   b. Dentro del archivo `.env`, reemplazar con las credenciales obtenidas en el paso 3.

6. Dentro de la carpeta `BuscadorProyectosInvestigacion`, construir los contenedores con el comando:
   ```bash
   docker compose up
   ```
   (Necesario tener abierto Docker Desktop).

7. Dentro del contenedor `buscador-1`, ejecutar:
   ```bash
   bun run config/inicializacion-indice.js
   ```

8. Abrir el navegador en la dirección `localhost:3000`.
