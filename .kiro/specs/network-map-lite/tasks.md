# Plan de Implementación

- [ ] 1. Estructura base de la SPA
  - Crear `index.html` con Vue 3, Tailwind, Dexie y Cytoscape desde CDN.
  - Crear `app.js` con instancia Vue y layout de dos columnas.
  - _Requirements: 1.1_
  - _Evidence: index.html y app.js cargan sin errores en consola; layout visible._

- [ ] 2. Capa de persistencia con Dexie
  - Definir `db.version(1).stores({contacts, connections})` con índice `[name+company]`.
  - Exponer operaciones: `addContact`, `updateContact`, `deleteContact`, `addConnection`, `listContacts`, `listConnections`.
  - _Requirements: 1.1, 2.1, 3.1, 4.1_
  - _Depends on: 1_
  - _Evidence: en consola, un `db.contacts.toArray()` tras un alta devuelve el registro._

- [ ] 3. Formulario y validaciones de contacto
  - Campos nombre, empresa, interés.
  - Validación: nombre y empresa no vacíos; no duplicado por `[name+company]`.
  - Mensajes de error inline.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3_
  - _Depends on: 2_
  - _Evidence: alta válida guarda; alta con vacío muestra error; duplicado muestra error._

- [ ] 4. Listado, edición y borrado con cascada
  - Listar contactos desde Dexie.
  - Editar inline o modal simple.
  - Eliminar contacto y todas sus conexiones (origen o destino).
  - _Requirements: 2.1, 2.4, 3.1, 3.2, 3.3_
  - _Depends on: 3_
  - _Evidence: editar refleja cambio en lista; borrar elimina también conexiones asociadas._

- [ ] 5. Formulario de conexión
  - Selectores de origen y destino; campo motivo.
  - Validación: origen ≠ destino.
  - _Requirements: 4.1, 4.2_
  - _Depends on: 2_
  - _Evidence: conexión válida aparece; misma selección muestra error._

- [ ] 6. Grafo con Cytoscape.js
  - Inicializar Cytoscape con contenedor dedicado.
  - Mapear contactos → nodos, conexiones → aristas.
  - Refrescar elementos tras cada alta/edición/borrado/conexión.
  - _Requirements: 1.5, 2.4, 3.3, 4.3_
  - _Depends on: 4, 5_
  - _Evidence: el grafo refleja cambios sin recargar la página._

- [ ] 7. Filtros y atenuación en el grafo
  - Campos: interés, texto búsqueda, empresa.
  - Aplicar filtros en memoria (AND entre criterios).
  - Atenuar nodos no coincidentes con estilos de Cytoscape.
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
  - _Depends on: 6_
  - _Evidence: al escribir un filtro, la lista se reduce y el grafo atenúa nodos sin eliminarlos._

- [ ] 8. Manejo de errores y fallback de CDN
  - try/catch en operaciones Dexie con notificación no bloqueante.
  - Detección de Cytoscape no disponible y mensaje de fallback.
  - _Requirements: 6.1, 6.2_
  - _Depends on: 6_
  - _Evidence: simular error de IndexedDB o CDN caída muestra mensaje, la app sigue operativa._

- [ ] 9. Pruebas property-based de reglas de negocio
  - Configurar fast-check y Jest (o Vitest).
  - Propiedades: no duplicado `[name+company]`, origen≠destino en conexiones, invariantes de filtros.
  - _Requirements: 1.4, 2.3, 4.2, 5.4_
  - _Depends on: 3, 5_
  - _Evidence: `npx jest` pasa con las propiedades generadas._

- [ ] 10. Verificación manual del MVP completo
  - Recorrer los 5 requisitos end-to-end.
  - Confirmar persistencia tras recargar la página.
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_
  - _Depends on: 7, 8_
  - _Evidence: checklist completado manualmente con todos los casos en verde._
