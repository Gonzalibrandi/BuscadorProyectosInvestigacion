document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modal-favoritos');
    const btnFavoritos = document.getElementById('favoritos');
    const closeButtons = document.querySelectorAll('.close-modal');
    const form = document.getElementById('form-favoritos');
    const camposContainer = document.getElementById('campos-favoritos-container');
    const listaFavoritosContainer = document.getElementById('lista-favoritos-container');
    const listaFavoritosUl = document.getElementById('lista-favoritos');
    const btnVerBusquedas = document.getElementById('ver-busquedas');
    const btnVolverGuardar = document.getElementById('volver-guardar');

    // Función para abrir el modal (modificada para mostrar el formulario por defecto)
    btnFavoritos.addEventListener('click', async function() {
        // Asegurarse de que el formulario esté visible y la lista oculta al abrir
        form.style.display = 'block';
        listaFavoritosContainer.style.display = 'none';

        try {
            // Obtener el índice actual de la URL
            const indiceActual = window.location.pathname.split('/').pop();

            // Obtener la configuración del índice
            const response = await fetch(`/admin/indices/${indiceActual}/config`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const config = await response.json();

            // Limpiar campos anteriores
            camposContainer.innerHTML = '';

            // Crear campos solo para atributos filtrables
            if (config.filterableAttributes && config.filterableAttributes.length > 0) {
                config.filterableAttributes.forEach(attr => {
                    const formGroup = document.createElement('div');
                    formGroup.className = 'form-group';

                    const label = document.createElement('label');
                    label.htmlFor = `campo-${attr}`;
                    label.textContent = attr.charAt(0).toUpperCase() + attr.slice(1).replace(/([A-Z])/g, ' $1');

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = `campo-${attr}`;
                    input.name = attr;
                    // Los campos no son obligatorios
                    input.required = false;

                    formGroup.appendChild(label);
                    formGroup.appendChild(input);
                    camposContainer.appendChild(formGroup);
                });
            } else {
                camposContainer.innerHTML = '<p>Este índice no tiene atributos filtrables configurados. No se pueden guardar búsquedas favoritas.</p>';
                // Opcionalmente, deshabilitar el botón de guardar búsqueda si no hay atributos filtrables
                form.querySelector('button[type="submit"]').disabled = true;
            }

            modal.classList.add('active'); // Usar clase para mostrar/ocultar
        } catch (error) {
            console.error('Error al cargar la configuración del índice:', error);
            alert('Error al cargar la configuración del índice');
             modal.classList.remove('active'); // Ocultar si hay error
        }
    });

    // Función para cerrar el modal
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            modal.classList.remove('active');
            // Re-habilitar el botón de guardar al cerrar por si se deshabilitó
            form.querySelector('button[type="submit"]').disabled = false;
        });
    });

    // Cerrar modal al hacer clic fuera de él
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.classList.remove('active');
            // Re-habilitar el botón de guardar al cerrar por si se deshabilitó
            form.querySelector('button[type="submit"]').disabled = false;
        }
    });

    // Manejar el envío del formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const indiceActual = window.location.pathname.split('/').pop();
        const formData = new FormData(form);
        const busqueda = {};
        let tieneValores = false;

        // Solo incluir atributos que tienen valor y son potencialmente filtrables (aunque ya limitamos los campos)
        for (let [key, value] of formData.entries()) {
            if (value.trim() !== '') {
                 // Aquí podrías añadir una validación extra si quisieras,
                 // pero como los campos ya se generan de los filtrables, no es estrictamente necesario
                busqueda[key] = value.trim(); // Usar trim() para limpiar espacios
                tieneValores = true;
            }
        }

        if (!tieneValores) {
            alert('Debes ingresar al menos un valor para guardar la búsqueda');
            return;
        }

        try {
            const response = await fetch('/setearFavoritos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...busqueda,
                    indice: indiceActual
                })
            });

            const result = await response.json();

            if (response.ok) {
                alert('Búsqueda guardada exitosamente');
                modal.classList.remove('active');
                form.reset();
            } else {
                throw new Error(result.error || 'Error al guardar la búsqueda');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Error al guardar la búsqueda');
        }
    });

    // Manejar clic en el botón 'Ver mis búsquedas guardadas'
    btnVerBusquedas.addEventListener('click', async function() {
        try {
            const response = await fetch('/favoritos/mis-busquedas');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const busquedas = await response.json();

            // Ocultar formulario y mostrar lista
            form.style.display = 'none';
            listaFavoritosContainer.style.display = 'block';

            // Limpiar lista anterior
            listaFavoritosUl.innerHTML = '';

            if (busquedas.length > 0) {
                busquedas.forEach(busqueda => {
                    const listItem = document.createElement('li');
                    listItem.className = 'saved-search-item'; // Clase para estilizar
                    // Mostrar los criterios guardados (que ahora serán solo filtrables)
                    const criteriosHtml = Object.entries(busqueda.criterios)
                        .map(([key, value]) => `<strong>${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:</strong> ${value}`)
                        .join(', ');
                    const fecha = new Date(busqueda.createdAt).toLocaleDateString();
                    const estado = busqueda.activa ? 'Activa' : 'Inactiva';

                    listItem.innerHTML = `
                        <div class="search-details">
                            <p><strong>Índice:</strong> ${busqueda.indice}</p>
                            <p><strong>Criterios:</strong> ${criteriosHtml || 'Ninguno'}</p>
                            <p><strong>Guardada el:</strong> ${fecha}</p>
                        </div>
                        <div class="search-actions">
                            <button class="btn btn-danger btn-sm delete-search-btn" data-id="${busqueda._id}">Eliminar</button>
                        </div>
                    `;
                    listaFavoritosUl.appendChild(listItem);
                });

                // Agregar event listeners a los botones de eliminar
                document.querySelectorAll('.delete-search-btn').forEach(button => {
                    button.addEventListener('click', async function() {
                        const searchId = this.dataset.id;
                        const listItem = this.closest('li'); // Obtener el elemento li padre

                        if (confirm('¿Estás seguro de que quieres eliminar esta búsqueda?')) {
                            try {
                                const response = await fetch(`/favoritos/${searchId}`, {
                                    method: 'DELETE',
                                });

                                if (!response.ok) {
                                    const errorResult = await response.json();
                                    throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
                                }

                                const result = await response.json();
                                alert(result.message || 'Búsqueda eliminada exitosamente');
                                // Eliminar el elemento de la lista del DOM
                                if (listItem) {
                                    listItem.remove();
                                    // Si no quedan elementos, mostrar el mensaje de lista vacía
                                    if (listaFavoritosUl.children.length === 0) {
                                         listaFavoritosUl.innerHTML = '<p>No tienes búsquedas guardadas actualmente.</p>';
                                    }
                                }

                            } catch (error) {
                                console.error('Error al eliminar búsqueda:', error);
                                alert(error.message || 'Error al eliminar la búsqueda.');
                            }
                        }
                    });
                });

            } else {
                listaFavoritosUl.innerHTML = '<p>No tienes búsquedas guardadas actualmente.</p>';
            }

        } catch (error) {
            console.error('Error al obtener búsquedas favoritas:', error);
            alert('Error al cargar tus búsquedas guardadas.');
            // Si hay un error, volver al formulario
            form.style.display = 'block';
            listaFavoritosContainer.style.display = 'none';
        }
    });

    // Manejar clic en el botón 'Volver a Guardar Búsqueda'
    btnVolverGuardar.addEventListener('click', function() {
        listaFavoritosContainer.style.display = 'none';
        form.style.display = 'block';
    });
}); 