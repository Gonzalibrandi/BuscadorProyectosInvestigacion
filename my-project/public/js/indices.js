function addLogEntry(message, type = 'info') {
  const logContainer = document.getElementById('log-container');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = message;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

async function crearIndicePeliculas() {
  const button = document.getElementById('crear-peliculas');
  button.disabled = true;
  addLogEntry('Iniciando creación del índice de películas...', 'info');
  
  try {
    const response = await fetch('/admin/crear-indice-peliculas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      // Asegurarnos de que se envíen las credenciales
      credentials: 'same-origin'
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      try {
        const errorJson = JSON.parse(errorText);
        addLogEntry(`Error: ${errorJson.error}`, 'error');
      } catch {
        addLogEntry(`Error: ${errorText}`, 'error');
      }
      return;
    }

    const data = await response.json();
    addLogEntry(data.message, 'success');
    // Recargar los índices
    await cargarIndices();
  } catch (error) {
    addLogEntry(`Error: ${error.message}`, 'error');
    console.error('Error completo:', error);
  } finally {
    button.disabled = false;
  }
}

async function cargarIndices() {
  console.log('Iniciando carga de índices...');
  
  // Verificar si estamos en la vista correcta
  const isIndicesView = document.querySelector('.wrapper-box') !== null;
  console.log('¿Estamos en la vista de índices?', isIndicesView);
  
  try {
    console.log('Intentando conectar con MeiliSearch...');
    const response = await fetch('http://localhost:7700/indexes');
    const data = await response.json();
    console.log('Índices obtenidos:', data);
    
    const contenedor = document.getElementById('indices-container');
    if (!contenedor) {
      console.error('No se encontró el contenedor de índices');
      return;
    }

    // Limpiar el contenedor
    contenedor.innerHTML = '';

    if (!data.results || data.results.length === 0) {
      contenedor.innerHTML = '<p class="error">No se encontraron índices disponibles.</p>';
      return;
    }

    data.results.forEach(indice => {
      console.log('Procesando índice:', indice);
      const card = document.createElement('div');
      card.className = 'indice-card';
      
      const nombre = document.createElement('h2');
      nombre.textContent = indice.uid;
      
      const info = document.createElement('p');
      info.textContent = `Última actualización: ${new Date(indice.updatedAt).toLocaleDateString('es-AR')}`;
      
      const link = document.createElement('a');
      link.href = `/buscar/${indice.uid}`;
      link.className = 'indice-link';
      link.textContent = 'Acceder';
      
      card.appendChild(nombre);
      card.appendChild(info);
      card.appendChild(link);
      contenedor.appendChild(card);
    });
  } catch (error) {
    console.error('Error al cargar los índices:', error);
    const contenedor = document.getElementById('indices-container');
    if (contenedor) {
      contenedor.innerHTML = '<p class="error">Error al cargar los índices. Por favor, verifica que MeiliSearch esté funcionando en el puerto 7700.</p>';
    }
  }
}

// Asegurarnos de que el DOM está cargado
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM cargado, iniciando aplicación...');
  console.log('URL actual:', window.location.pathname);
  cargarIndices();
  
  // Agregar el event listener para el botón de crear índice
  const btnCrearPeliculas = document.getElementById('crear-peliculas');
  if (btnCrearPeliculas) {
    btnCrearPeliculas.addEventListener('click', crearIndicePeliculas);
  }
}); 