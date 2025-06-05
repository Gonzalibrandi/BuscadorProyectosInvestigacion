// Inicializar la búsqueda si estamos en la página de búsqueda
if (document.getElementById('searchbox')) {
  // Obtener el índice de la URL
  const path = window.location.pathname;
  const indice = path.split('/').pop();

  // Función para generar el template según los atributos del índice
  async function generarTemplate() {
    try {
      // Asegurar que el campo id esté en displayedAttributes
      await fetch(`/admin/indices/${indice}/asegurar-id`, { method: 'POST' });
      // Obtener la configuración del índice
      const response = await fetch(`/admin/indices/${indice}/config`);
      const config = await response.json();
      
      // Obtener los atributos a mostrar
      const displayedAttrs = config.displayedAttributes || [];
      const searchableAttrs = config.searchableAttributes || [];
      const filterableAttrs = config.filterableAttributes || [];
      
      // Generar el template dinámicamente
      let template = '<div class="documento">';
      
      // Agregar el botón de eliminación al inicio del documento
      template += `
        <div class="document-actions">
          <button class="delete-document" data-document-id="{{id}}" title="Eliminar documento">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      
      // Mostrar los primeros 3 atributos, excluyendo 'id'
      displayedAttrs.filter(attr => attr !== 'id').slice(0, 3).forEach(attr => {
        const isSearchable = searchableAttrs.includes(attr);
        const isFilterable = filterableAttrs.includes(attr);
        
        template += `
          <div class="hit-item">
            <div class="hit-label">${attr.toUpperCase()}</div>
            <div class="hit-value ${isSearchable ? 'searchable' : ''} ${isFilterable ? 'filterable' : ''}">
              ${isSearchable ? 
                `{{#helpers.highlight}}{ "attribute": "${attr}" }{{/helpers.highlight}}` :
                `{{${attr}}}`
              }
            </div>
          </div>`;
      });

      // Si hay más de 3 atributos, agregar el contenedor para los campos ocultos
      if (displayedAttrs.length > 3) {
        template += '<div class="hidden-fields">';
        displayedAttrs.filter(attr => attr !== 'id').slice(3).forEach(attr => {
          const isSearchable = searchableAttrs.includes(attr);
          const isFilterable = filterableAttrs.includes(attr);
          
          template += `
            <div class="hit-item">
              <div class="hit-label">${attr.toUpperCase()}</div>
              <div class="hit-value ${isSearchable ? 'searchable' : ''} ${isFilterable ? 'filterable' : ''}">
                ${isSearchable ? 
                  `{{#helpers.highlight}}{ "attribute": "${attr}" }{{/helpers.highlight}}` :
                  `{{${attr}}}`
                }
              </div>
            </div>`;
        });
        template += '</div>';
        
        // Agregar el botón de expandir/colapsar
        template += `
          <button class="expand-button">
            <i class="fas fa-chevron-down"></i>
          </button>`;
      }
      
      template += '</div>';

      return { template, filterableAttrs, searchableAttrs, displayedAttrs };
    } catch (error) {
      console.error('Error al obtener la configuración del índice:', error);
      return { 
        template: '<div class="error">Error al cargar el documento</div>',
        filterableAttrs: [],
        searchableAttrs: [],
        displayedAttrs: []
      };
    }
  }

  // Inicializar la búsqueda después de obtener el template
  async function inicializarBusqueda() {
    const { template, filterableAttrs, searchableAttrs, displayedAttrs } = await generarTemplate();
    
    const search = instantsearch({
      indexName: indice,
      searchClient: instantMeiliSearch(
        window.location.protocol + "//" + window.location.hostname + ":7700"
      ).searchClient,
      routing: true
    });

    // Agregar los widgets básicos
    search.addWidgets([
      instantsearch.widgets.searchBox({
        container: "#searchbox",
        placeholder: "Buscar en " + indice + "...",
        showReset: true,
        showSubmit: true,
        showLoadingIndicator: true
      }),
      
      instantsearch.widgets.configure({ 
        hitsPerPage: 10,
        attributesToHighlight: searchableAttrs,
        attributesToRetrieve: displayedAttrs
      }),

      instantsearch.widgets.hits({
        container: "#hits",
        templates: {
          item: template,
          empty: `
            <div class="no-results">
              <p>No se encontraron resultados para <strong>"{{query}}"</strong></p>
              <p>Sugerencias:</p>
              <ul>
                <li>Revisa si hay errores de escritura</li>
                <li>Prueba con términos más generales</li>
                <li>Prueba con otros términos</li>
              </ul>
            </div>
          `
        }
      }),

      // Agregar un widget personalizado para manejar el expandir/colapsar
      {
        init: function() {
          // Agregar el event listener al contenedor de hits
          document.getElementById('hits').addEventListener('click', function(e) {
            if (e.target.closest('.expand-button')) {
              const button = e.target.closest('.expand-button');
              const hiddenFields = button.previousElementSibling;
              const isExpanded = button.classList.contains('expanded');
              
              if (isExpanded) {
                hiddenFields.style.display = 'none';
                button.classList.remove('expanded');
                button.innerHTML = '<i class="fas fa-chevron-down"></i>';
              } else {
                hiddenFields.style.display = 'block';
                button.classList.add('expanded');
                button.innerHTML = '<i class="fas fa-chevron-down"></i>';
              }
            }
          });
        }
      },

      instantsearch.widgets.pagination({
        container: '#pagination',
        padding: 2,
        showFirst: true,
        showLast: true,
        showNext: true,
        showPrevious: true
      }),

      instantsearch.widgets.stats({
        container: '#stats',
        templates: {
          text: `
            {{#hasNoResults}}No hay resultados{{/hasNoResults}}
            {{#hasOneResult}}1 resultado{{/hasOneResult}}
            {{#hasManyResults}}{{#helpers.formatNumber}}{{nbHits}}{{/helpers.formatNumber}} resultados{{/hasManyResults}}
            encontrados en {{processingTimeMS}}ms
          `
        }
      })
    ]);

    // Agregar widgets de refinamiento para cada atributo filtrable
    filterableAttrs.forEach(attribute => {
      // Crear un contenedor para el refinement list si no existe
      const containerId = `refinement-${attribute}`;
      let container = document.getElementById(containerId);
      
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'refinement-list';
        
        // Encontrar el elemento details correspondiente o crearlo
        let details = document.querySelector(`.filters_${attribute}`);
        if (!details) {
          details = document.createElement('details');
          details.className = `filters_${attribute}`;
          details.innerHTML = `
            <summary>${attribute.toUpperCase()}</summary>
            <ul></ul>
          `;
          document.querySelector('.sidebar').appendChild(details);
        }
        
        const ul = details.querySelector('ul');
        if (ul) {
          ul.appendChild(container);
        }
      }

      // Agregar el widget de refinamiento
      search.addWidget(
        instantsearch.widgets.refinementList({
          container: `#${containerId}`,
          attribute: attribute,
          operator: 'or',
          sortBy: ['name:asc'],
          limit: 25,
          showMore: false,
          showMoreLimit: 20,
          searchable: true,
          searchablePlaceholder: 'Buscar...',
          templates: {
            item: `
              <label class="ais-RefinementList-label">
                <input type="checkbox" class="ais-RefinementList-checkbox" value="{{value}}" {{#isRefined}}checked{{/isRefined}}>
                <span class="ais-RefinementList-text">{{label}}</span>
                <span class="ais-RefinementList-count">{{count}}</span>
              </label>
            `,
            noResults: 'No hay resultados',
            showMoreText: `
              {{#isShowingMore}}
                Mostrar menos
              {{/isShowingMore}}
              {{^isShowingMore}}
                Mostrar más
              {{/isShowingMore}}
            `
          }
        })
      );
    });

    search.start();

    // Agregar el manejador de eventos para el botón de eliminación
    document.getElementById('hits').addEventListener('click', async function(e) {
      const deleteButton = e.target.closest('.delete-document');
      if (deleteButton) {
        e.preventDefault();
        e.stopPropagation();
        
        const documentId = deleteButton.dataset.documentId;
        
        if (confirm('¿Estás seguro de que deseas eliminar este documento?')) {
          try {
            const response = await fetch(`/admin/indices/${indice}/documents/${documentId}`, {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              // Refrescar la búsqueda para actualizar los resultados
              alert('Documento eliminado exitosamente');
              window.location.reload();
            } else {
              const error = await response.json();
              alert(`Error al eliminar el documento: ${error.error || 'Error desconocido'}`);
            }
          } catch (error) {
            console.error('Error al eliminar el documento:', error);
            alert('Error al eliminar el documento. Por favor, intente nuevamente.');
          }
        }
      }
    });
  }

  // Iniciar la búsqueda
  inicializarBusqueda();
} 