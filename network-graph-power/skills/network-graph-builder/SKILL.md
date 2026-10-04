---
name: network-graph-builder
description: Build and update interactive network graphs with Cytoscape.js and persist nodes/edges with Dexie.js for the Network Map Lite app. Use when the user asks about graph rendering, contact-connection visualization, or IndexedDB persistence.
---

# Network Graph Builder

## Propósito

Guiar la implementación de la capa de visualización y persistencia de Network Map Lite: cómo mapear contactos y conexiones a nodos y aristas de Cytoscape.js, cómo refrescar el grafo tras cada operación CRUD, y cómo definir el esquema Dexie con índice compuesto para detectar duplicados.

## Condiciones de activación

Activar cuando el usuario:
- Pida crear, modificar o depurar el grafo de contactos.
- Pregunte cómo conectar Cytoscape.js con el estado Vue.
- Necesite definir o ajustar el esquema Dexie (`contacts`, `connections`).
- Trabaje en `app.js` en funciones relacionadas con `NetworkGraph`.

**No activar** cuando el usuario solo esté ajustando estilos Tailwind de los formularios o trabajando en tests de reglas sin relación al grafo.

## Entradas

- Lista de contactos: `{ id, name, company, interest }[]`.
- Lista de conexiones: `{ id, sourceId, targetId, reason }[]`.
- Contenedor DOM del grafo (ej. `<div id="cy">`).

## Pasos de trabajo

1. **Definir el esquema Dexie** con índice compuesto para detectar duplicados:
   ```js
   db.version(1).stores({
     contacts: '++id, name, company, interest, [name+company]',
     connections: '++id, sourceId, targetId, reason'
   });
   ```

2. **Inicializar Cytoscape** una sola vez con `elements: []`, `style` y `layout` `cose` (o `grid` si el grafo es pequeño y se quiere determinismo visual).

3. **Mapear contactos a nodos** con `data.id = String(contact.id)` y `data.label = contact.name`. El id debe ser string porque Cytoscape trata ids como strings.

4. **Mapear conexiones a aristas** con `data.source = String(connection.sourceId)` y `data.target = String(connection.targetId)`, más `data.reason` si se quiere mostrar en tooltip.

5. **Refrescar el grafo** con una sola función `refreshGraph()` que recalcule `elements` y llame a `cy.json({ elements })` o `cy.elements().remove()` + `cy.add(...)`. Invocarla tras cada alta, edición, borrado o creación de conexión.

6. **Aplicar filtros con atenuación**: no eliminar nodos. Añadir una clase CSS temporal (`filtered-out`) a los nodos que no coinciden y definir su estilo con `opacity: 0.2`.

7. **Manejar ausencia de Cytoscape**: verificar `typeof cytoscape !== 'undefined'` antes de inicializar. Si no está disponible, mostrar mensaje de fallback y dejar la app operativa en modo lista.

## Salidas esperadas

- Grafo que se actualiza tras cada operación sin recargar la página.
- Esquema Dexie con índice `[name+company]` funcional para detectar duplicados.
- Nodos atenuados (no eliminados) cuando hay filtros activos.

## Límites

- No persistir posiciones de nodos: el layout se recalcula en cada render.
- No añadir interacciones no pedidas (drag para reorganizar, zoom persistente, exportación de imagen).
- No crear un motor de diagramación propio: todo layout lo resuelve Cytoscape.

## Dependencias

- Cytoscape.js (CDN, build global).
- Dexie.js (CDN, build global).
- Vue 3 (CDN, build global) como capa de estado.

## Recursos

- `references/cytoscape-patterns.md`: patrones concretos de Cytoscape para este proyecto.
- `references/dexie-schema.md`: esquema Dexie y operaciones CRUD.
