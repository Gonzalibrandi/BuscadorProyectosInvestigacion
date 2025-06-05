document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('modal-agregar-documento');
    const btnAgregar = document.getElementById('agregar');
    const closeButtons = document.querySelectorAll('.close-modal');
    const form = document.getElementById('form-agregar-documento');
    const camposContainer = document.getElementById('campos-container');

    // Función para abrir el modal
    btnAgregar.addEventListener('click', async function() {
        try {
            // Obtener el índice actual de la URL
            const indiceActual = window.location.pathname.split('/').pop();
            
            // Obtener la configuración del índice
            const response = await fetch(`/admin/indices/${indiceActual}/config`);
            const config = await response.json();
            
            // Limpiar campos anteriores
            camposContainer.innerHTML = '';
            
            // Crear campos para cada atributo mostrado, excepto 'id'
            config.displayedAttributes.forEach(attr => {
                if (attr.toLowerCase() === 'id') return; // Omitir el campo Id
                const formGroup = document.createElement('div');
                formGroup.className = 'form-group';
                
                const label = document.createElement('label');
                label.htmlFor = `campo-${attr}`;
                label.textContent = attr.charAt(0).toUpperCase() + attr.slice(1).replace(/([A-Z])/g, ' $1');
                
                const input = document.createElement('input');
                input.type = 'text';
                input.id = `campo-${attr}`;
                input.name = attr;
                input.required = true;
                
                formGroup.appendChild(label);
                formGroup.appendChild(input);
                camposContainer.appendChild(formGroup);
            });
            
            modal.style.display = 'block';
        } catch (error) {
            console.error('Error al cargar la configuración del índice:', error);
            alert('Error al cargar la configuración del índice');
        }
    });

    // Función para cerrar el modal
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    });

    // Cerrar modal al hacer clic fuera de él
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Manejar el envío del formulario
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const indiceActual = window.location.pathname.split('/').pop();
        const formData = new FormData(form);
        const documento = {};
        
        for (let [key, value] of formData.entries()) {
            documento[key] = value;
        }

        // Generar un ID único para el documento
        // Usamos timestamp + número aleatorio simple. Para producción, considera UUIDs.
        documento.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
            const response = await fetch(`/admin/indices/${indiceActual}/documentos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(documento)
            });
            
            const result = await response.json();

            if (response.ok) {
                alert(result.message);
                modal.style.display = 'none';
                form.reset();
                
                // Si hay un taskUid, monitorear la tarea
                if (result.taskUid) {
                    monitorTaskStatus(indiceActual, result.taskUid);
                }
                
                // No recargar inmediatamente, esperar la indexación
                // window.location.reload(); 
            } else {
                throw new Error(result.error || 'Error al agregar el documento');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'Error al agregar el documento');
        }
    });

    // Función para monitorear el estado de la tarea de MeiliSearch
    async function monitorTaskStatus(indexUid, taskUid) {
        const checkStatus = async () => {
            try {
                const response = await fetch(`/admin/indices/${indexUid}/tasks/${taskUid}`);
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.message || 'Error al obtener estado de la tarea');
                }
                const taskStatus = await response.json();

                if (taskStatus.status === 'succeeded') {
                    alert('Documento indexado exitosamente!');
                    window.location.reload(); // Recargar una vez completada la indexación
                } else if (taskStatus.status === 'failed') {
                    alert('Error en la indexación del documento: ' + taskStatus.error.message);
                } else {
                    // Si la tarea aún está procesando, esperar y verificar de nuevo
                    setTimeout(checkStatus, 1000); // Verificar cada segundo
                }
            } catch (error) {
                console.error('Error monitoreando tarea:', error);
                alert('Error monitoreando estado de la tarea: ' + error.message);
            }
        };

        // Iniciar el monitoreo
        checkStatus();
    }
}); 