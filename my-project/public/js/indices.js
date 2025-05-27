// Funciones globales para eliminar y renombrar índices
async function eliminarIndice(uid) {
  if (!confirm(`¿Estás seguro de que deseas eliminar el índice "${uid}"?`)) {
    return;
  }

  try {
    const response = await fetch(`/admin/indices/${uid}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al eliminar el índice');
    }

    mostrarLog(`✅ Índice "${uid}" eliminado exitosamente`, 'success');
    await cargarIndices();
  } catch (error) {
    mostrarLog(`❌ Error: ${error.message}`, 'error');
  }
}

async function renombrarIndice(uid) {
  const newName = prompt(`Ingresa el nuevo nombre para el índice "${uid}":`, uid);
  
  if (!newName || newName === uid) {
    return;
  }

  try {
    const response = await fetch(`/admin/indices/${uid}/rename`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newName })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al renombrar el índice');
    }

    mostrarLog(`✅ Índice renombrado exitosamente a "${newName}"`, 'success');
    await cargarIndices();
  } catch (error) {
    mostrarLog(`❌ Error: ${error.message}`, 'error');
  }
}

function addLogEntry(message, type = 'info') {
  const logContainer = document.getElementById('log-container');
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = message;
  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Función global para mostrar logs
function mostrarLog(mensaje, tipo = 'info') {
  const logContainer = document.getElementById('log-container');
  const logItem = document.createElement('div');
  logItem.className = `log-item log-${tipo}`;
  logItem.textContent = mensaje;
  logContainer.appendChild(logItem);
  logContainer.classList.add('active');
  logContainer.scrollTop = logContainer.scrollHeight;
}

// Función global para cargar índices
async function cargarIndices() {
  const indicesContainer = document.getElementById('indices-container');
  
  try {
    const response = await fetch('/admin/indices');
    if (!response.ok) {
      throw new Error('Error al obtener los índices');
    }
    
    const indices = await response.json();
    
    if (!Array.isArray(indices)) {
      throw new Error('La respuesta del servidor no es un array válido');
    }
    
    if (indices.length === 0) {
      indicesContainer.innerHTML = '<p class="text-center">No hay índices disponibles.</p>';
      return;
    }

    // Obtener estadísticas detalladas para cada índice
    const indicesConStats = await Promise.all(indices.map(async (indice) => {
      try {
        // Obtener estadísticas del índice
        const statsResponse = await fetch(`/admin/indices/${indice.uid}/stats`);
        if (!statsResponse.ok) {
          throw new Error('Error al obtener estadísticas');
        }
        const stats = await statsResponse.json();
        
        return {
          ...indice,
          numberOfDocuments: stats.numberOfDocuments,
          fieldCount: stats.fieldCount
        };
      } catch (error) {
        console.error(`Error al obtener estadísticas para ${indice.uid}:`, error);
        return {
          ...indice,
          numberOfDocuments: 0,
          fieldCount: 0
        };
      }
    }));

    indicesContainer.innerHTML = indicesConStats.map(indice => `
      <div class="indice-card">
        <h3>${indice.uid}</h3>
        <div class="indice-stats">
          <span>${indice.numberOfDocuments} documentos</span>
          <span>${indice.fieldCount} campos</span>
        </div>
        <div class="indice-actions">
          <button class="btn btn-secondary btn-small" onclick="window.location.href='/buscar/${indice.uid}'">
            Buscar
          </button>
          <button class="btn btn-warning btn-small" onclick="renombrarIndice('${indice.uid}')">
            Renombrar
          </button>
          <button class="btn btn-danger btn-small" onclick="eliminarIndice('${indice.uid}')">
            Eliminar
          </button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Error al cargar índices:', error);
    indicesContainer.innerHTML = `
      <p class="error">
        Error al cargar los índices: ${error.message}
      </p>
    `;
  }
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

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('modal-crear-indice');
  const btnCrearIndice = document.getElementById('crear-indice');
  const btnsCerrarModal = document.querySelectorAll('.close-modal');
  const formCrearIndice = document.getElementById('form-crear-indice');
  const logContainer = document.getElementById('log-container');
  const indicesContainer = document.getElementById('indices-container');
  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const nextStepBtn = document.getElementById('next-step');
  const prevStepBtn = document.getElementById('prev-step');
  const sheetInput = document.getElementById('sheet-input');
  const columnasContainer = document.getElementById('columnas-container');
  let columnasDisponibles = [];

  // Funciones auxiliares
  const mostrarLog = (mensaje, tipo = 'info') => {
    const logItem = document.createElement('div');
    logItem.className = `log-item log-${tipo}`;
    logItem.textContent = mensaje;
    logContainer.appendChild(logItem);
    logContainer.classList.add('active');
    logContainer.scrollTop = logContainer.scrollHeight;
  };

  const extraerSheetId = (input) => {
    if (input.includes('spreadsheets/d/')) {
      const match = input.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    }
    return input;
  };

  // Función para cargar las columnas del sheet
  async function cargarColumnas() {
    const sheetId = extraerSheetId(sheetInput.value);
    const sheetRange = document.getElementById('sheet-range').value || 'A1:Z1';

    try {
      const response = await fetch('/admin/obtener-columnas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sheetId, sheetRange })
      });

      if (!response.ok) {
        throw new Error('Error al obtener las columnas');
      }

      const data = await response.json();
      columnasDisponibles = data.columnas;
      
      // Renderizar las columnas
      columnasContainer.innerHTML = columnasDisponibles.map(columna => `
        <div class="columna-item" data-columna="${columna}">
          <input type="checkbox" id="col-${columna}" name="columnas[]" value="${columna}">
          <label for="col-${columna}">${columna}</label>
        </div>
      `).join('');

      // Agregar eventos de click a las columnas
      document.querySelectorAll('.columna-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const checkbox = item.querySelector('input[type="checkbox"]');
          if (e.target !== checkbox) {
            checkbox.checked = !checkbox.checked;
          }
          item.classList.toggle('selected', checkbox.checked);
        });
      });

    } catch (error) {
      mostrarLog('Error al cargar las columnas: ' + error.message, 'error');
      columnasContainer.innerHTML = '<div class="error">Error al cargar las columnas</div>';
    }
  }

  // Navegación entre pasos
  nextStepBtn.addEventListener('click', async () => {
    if (!sheetInput.value) {
      mostrarLog('Por favor, ingresa la URL o ID del Google Sheet', 'error');
      return;
    }

    step1.classList.remove('active');
    step2.classList.add('active');
    await cargarColumnas();
  });

  prevStepBtn.addEventListener('click', () => {
    step2.classList.remove('active');
    step1.classList.add('active');
  });

  // Manejadores de eventos del modal
  if (btnCrearIndice) {
    btnCrearIndice.addEventListener('click', () => {
      modal.classList.add('active');
      step1.classList.add('active');
      step2.classList.remove('active');
    });
  }

  btnsCerrarModal.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.remove('active');
      formCrearIndice.reset();
      step1.classList.add('active');
      step2.classList.remove('active');
    });
  });

  // Click fuera del modal para cerrar
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      formCrearIndice.reset();
      step1.classList.add('active');
      step2.classList.remove('active');
    }
  });

  // Manejo del formulario
  formCrearIndice.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nombreIndice = document.getElementById('nombre-indice').value;
    const sheetId = extraerSheetId(sheetInput.value);
    const sheetRange = document.getElementById('sheet-range').value || 'A1:Z1000';
    
    // Obtener columnas seleccionadas
    const columnasSeleccionadas = Array.from(
      document.querySelectorAll('input[name="columnas[]"]:checked')
    ).map(input => input.value);

    if (!sheetId) {
      mostrarLog('ID o URL del Google Sheet inválido', 'error');
      return;
    }

    if (columnasSeleccionadas.length === 0) {
      mostrarLog('Selecciona al menos una columna para filtrar', 'error');
      return;
    }

    try {
      mostrarLog('Iniciando creación del índice...', 'info');
      
      const response = await fetch('/admin/crear-indice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: nombreIndice,
          sheetId,
          sheetRange,
          columnasFiltrables: columnasSeleccionadas
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        mostrarLog(`✅ Índice "${nombreIndice}" creado exitosamente`, 'success');
        modal.classList.remove('active');
        formCrearIndice.reset();
        step1.classList.add('active');
        step2.classList.remove('active');
        await cargarIndices();
      } else {
        mostrarLog(`❌ Error: ${data.error}`, 'error');
      }
    } catch (error) {
      mostrarLog(`❌ Error: ${error.message}`, 'error');
    }
  });

  // Cargar índices al iniciar
  cargarIndices();
}); 