function initializeSidebar() {
  const toggleButton = document.getElementById('toggle-sidebar');
  const sidebar = document.querySelector('.sidebar');
  const mainContent = document.querySelector('.main-content');
  
  if (!toggleButton || !sidebar || !mainContent) {
    console.log('No se encontraron los elementos necesarios');
    return;
  }

  // Función para verificar si estamos en modo móvil
  const isMobileView = () => window.innerWidth <= 768;

  // Función para actualizar el estado inicial
  const updateInitialState = () => {
    if (isMobileView()) {
      sidebar.style.transform = 'translateX(-100%)';
      mainContent.style.marginLeft = '0';
      toggleButton.style.display = 'block';
    } else {
      sidebar.style.transform = 'translateX(0)';
      mainContent.style.marginLeft = '300px';
      toggleButton.style.display = 'none';
    }
  };

  // Toggle del sidebar
  toggleButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (sidebar.style.transform === 'translateX(0px)') {
      sidebar.style.transform = 'translateX(-100%)';
      mainContent.classList.remove('shifted');
    } else {
      sidebar.style.transform = 'translateX(0)';
      mainContent.classList.add('shifted');
    }
  });

  // Cerrar el sidebar al hacer clic fuera
  document.addEventListener('click', (event) => {
    if (isMobileView() && 
        sidebar.style.transform === 'translateX(0px)' && 
        !sidebar.contains(event.target) && 
        !toggleButton.contains(event.target)) {
      sidebar.style.transform = 'translateX(-100%)';
      mainContent.classList.remove('shifted');
    }
  });

  // Manejar cambios de tamaño de ventana
  window.addEventListener('resize', updateInitialState);

  // Establecer estado inicial
  updateInitialState();
}

// Inicializar el sidebar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initializeSidebar); 