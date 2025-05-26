// Inicializar la búsqueda si estamos en la página de búsqueda
if (document.getElementById('searchbox')) {
  // Obtener el índice de la URL
  const path = window.location.pathname;
  const indice = path.split('/').pop();

  // Función para generar el template según los atributos del índice
  async function generarTemplate() {
    try {
      // Obtener la configuración del índice
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:7700/indexes/${indice}/settings`);
      const settings = await response.json();
      
      // Obtener los atributos buscables y filtrables
      const searchableAttrs = settings.searchableAttributes || [];
      const filterableAttrs = settings.filterableAttributes || [];
      
      // Generar el template dinámicamente
      let template = '<div class="documento">';
      
      // Primero mostrar los atributos buscables
      searchableAttrs.forEach(attr => {
        template += `
          <div class="hit-item">
            <div class="hit-label">${attr.charAt(0).toUpperCase() + attr.slice(1)}</div>
            <div class="hit-value">
              {{#helpers.highlight}}{ "attribute": "${attr}" }{{/helpers.highlight}}
            </div>
          </div>`;
      });
      
      // Luego mostrar los atributos filtrables que no están en searchableAttrs
      filterableAttrs
        .filter(attr => !searchableAttrs.includes(attr))
        .forEach(attr => {
          template += `
            <div class="hit-item">
              <div class="hit-label">${attr.charAt(0).toUpperCase() + attr.slice(1)}</div>
              <div class="hit-value">{{${attr}}}</div>
            </div>`;
        });
      
      template += '</div>';
      return { template, filterableAttrs };
    } catch (error) {
      console.error('Error al obtener la configuración del índice:', error);
      return { 
        template: '<div class="error">Error al cargar el documento</div>',
        filterableAttrs: []
      };
    }
  }

  // Inicializar la búsqueda después de obtener el template
  async function inicializarBusqueda() {
    const { template, filterableAttrs } = await generarTemplate();
    
    const search = instantsearch({
      indexName: indice,
      searchClient: instantMeiliSearch(
        window.location.protocol + "//" + window.location.hostname + ":7700"
      ).searchClient,
      initialUiState: {
        [indice]: {
          refinementList: {}
        }
      }
    });

    // Agregar los widgets básicos
    search.addWidgets([
      instantsearch.widgets.searchBox({
        container: "#searchbox",
        placeholder: "Buscar en " + indice + "..."
      }),
      instantsearch.widgets.configure({ 
        hitsPerPage: 10
      }),
      instantsearch.widgets.hits({
        container: "#hits",
        templates: {
          item: template
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
        
        // Encontrar el elemento details correspondiente y agregar el contenedor
        const details = document.querySelector(`.filters_${attribute} details`);
        if (details) {
          const ul = details.querySelector('ul');
          if (ul) {
            ul.appendChild(container);
          }
        }
      }

      // Agregar el widget de refinamiento
      search.addWidget(
        instantsearch.widgets.refinementList({
          container: `#${containerId}`,
          attribute: attribute,
          operator: 'or',
          sortBy: ['name:asc'],
          templates: {
            item: `
              <label class="ais-RefinementList-label">
                <input type="checkbox" class="ais-RefinementList-checkbox" value="{{value}}" {{#isRefined}}checked{{/isRefined}}>
                <span class="ais-RefinementList-text">{{label}}</span>
                <span class="ais-RefinementList-count">{{count}}</span>
              </label>
            `
          }
        })
      );
    });

    search.start();
  }

  // Iniciar la búsqueda
  inicializarBusqueda();
} 