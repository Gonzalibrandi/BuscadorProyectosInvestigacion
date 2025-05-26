
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

6. Desde Google Cloud, crear una cuenta de servicio dentro del proyecto.
 - Ir a: https://console.cloud.google.com/iam-admin/serviceaccounts

👉 Google Cloud Console – Cuentas de servicio

   - Seleccioná tu proyecto actual.
   - Hacé clic en "Crear cuenta de servicio".
      - Nombre: "sheets-importer".
      - Rol: Editor.
      - Click en “Continuar” y “Finalizar”.

   - Descargar credenciales
      - Una vez creada, hacé clic en los 3 puntitos ⋮ → “Administrar claves”.
      - Clic en “Agregar clave” → “Crear nueva clave” → Tipo JSON.
      - Descargá el archivo y guardalo como: "google-sheet-credentials.json" en tu proyecto, dentro de my-project.

7. Cargar la hoja de calculo en google drive, y compartir al mail de la cuenta de servicios (se obtiene desde google-sheet-credentials.json -> client-email) como Editor.

8. Dentro de la carpeta `BuscadorProyectosInvestigacion`, construir los contenedores con el comando:
   ```bash
   docker compose up
   ```
   (Necesario tener abierto Docker Desktop).

9. 
   - Habilitar la API de Google Sheets en Google Console Cloud.
   - Ejecutar: bun run scripts/cargarDesdeSheets.ts 1-mjj0_b9QPgv4u0ijEaSTHRv57-qZcRdNxt9aV9e9IE A1:BH2762 --reset

10. Abrir el navegador en la dirección `localhost:3000`.