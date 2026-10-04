# Patrones Cytoscape.js — Network Map Lite

Patrones concretos extraídos de `app.js`. No documentación genérica.

---

## 1. Inicialización (una sola vez en `onMounted`)

```js
cy = cytoscape({
  container: document.getElementById('cy'),
  style: [ /* ver sección 4 */ ],
  layout: { name: 'grid' },   // layout inicial antes del primer render
  userZoomingEnabled: true,
  userPanningEnabled: true,
});
```

Inicializar **una sola vez**. No volver a llamar a `cytoscape(...)` en cada actualización.

---

## 2. Mapeo contactos → nodos

```js
const nodes = state.contacts.map((c) => ({
  data: {
    id: String(c.id),          // SIEMPRE string — Cytoscape trata ids como strings
    label: c.name,
    company: c.company,
    interest: c.interest || '',
  },
}));
```

**Regla crítica:** `data.id` debe ser `String(contact.id)`. Si se pasa como número, Cytoscape lo convierte internamente pero los selectores por id fallan de forma impredecible.

---

## 3. Mapeo conexiones → aristas

```js
const edges = state.connections.map((conn) => ({
  data: {
    id: 'e' + conn.id,                  // prefijo 'e' para evitar colisión con ids de nodos
    source: String(conn.sourceId),
    target: String(conn.targetId),
    label: conn.reason || '',
  },
}));
```

---

## 4. Refresco completo del grafo (`refreshGraph`)

```js
function refreshGraph() {
  if (!cy) return;

  const nodes = state.contacts.map(/* ver sección 2 */);
  const edges = state.connections.map(/* ver sección 3 */);

  cy.elements().remove();               // limpiar estado anterior
  cy.add([...nodes, ...edges]);         // añadir nodos primero, luego aristas
  cy.layout({ name: 'cose', animate: false, padding: 30 }).run();

  applyGraphFilters();                  // re-aplicar atenuación tras cada refresco
}
```

Llamar a `refreshGraph()` tras cada operación CRUD:
- `addContact` → `refreshGraph()` (Req 1.5)
- `updateContact` → `refreshGraph()` (Req 2.4)
- `deleteContact` → `refreshGraph()` (Req 3.3)
- `addConnection` → `refreshGraph()` (Req 4.3)

---

## 5. Atenuación de nodos por filtro activo (Req 5.6)

No eliminar nodos del grafo cuando hay filtros activos. Usar clase CSS `dimmed`:

```js
function applyGraphFilters() {
  if (!cy) return;

  const activeFilters = hasActiveFilters.value;
  const matchingIds = new Set(filteredContacts.value.map((c) => String(c.id)));

  cy.nodes().forEach((node) => {
    if (activeFilters && !matchingIds.has(node.id())) {
      node.addClass('dimmed');       // atenuar: no coincide con filtro
    } else {
      node.removeClass('dimmed');    // visible: coincide o no hay filtro activo
    }
  });
}
```

Estilo CSS para nodos atenuados:

```js
{
  selector: 'node.dimmed',
  style: { 'opacity': 0.2 },
},
```

**Regla:** llamar `applyGraphFilters()` al final de `refreshGraph()` y en el `watch` de filtros.

---

## 6. Estilos base del grafo

```js
style: [
  {
    selector: 'node',
    style: {
      'background-color': '#6366f1',
      'label': 'data(label)',
      'color': '#1e1b4b',
      'font-size': '11px',
      'text-valign': 'bottom',
      'text-margin-y': '4px',
      'width': '36px',
      'height': '36px',
      'border-width': '2px',
      'border-color': '#fff',
    },
  },
  {
    selector: 'node.dimmed',
    style: { 'opacity': 0.2 },
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': '#a5b4fc',
      'target-arrow-color': '#a5b4fc',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': '9px',
      'color': '#6b7280',
      'text-background-color': '#f9fafb',
      'text-background-opacity': 1,
      'text-background-padding': '2px',
    },
  },
],
```

---

## 7. Layout `cose` para redes de contactos

```js
cy.layout({ name: 'cose', animate: false, padding: 30 }).run();
```

- `cose` (Compound Spring Embedder): posiciona nodos separándolos por fuerzas de repulsión. Adecuado para grafos de relaciones de tamaño medio (< 200 nodos).
- `animate: false`: evita parpadeo al refrescar tras cada CRUD.
- `padding: 30`: margen interior para que los nodos no queden pegados al borde.
- Alternativa para grafos pequeños y determinismo visual: `{ name: 'grid' }`.

---

## 8. Fallback si Cytoscape no está disponible (Req 6.2)

```js
const cytoscapeAvailable = typeof cytoscape === 'function';

// En onMounted:
if (cytoscapeAvailable) {
  cy = cytoscape({ /* ... */ });
  refreshGraph();
} else {
  console.error('[NetworkMapLite] Cytoscape.js no está disponible. Modo lista activo.');
}
```

En el template, mostrar fallback cuando `!cytoscapeAvailable`:

```html
<div v-if="!cytoscapeAvailable" class="...">
  El grafo no está disponible (Cytoscape.js no se pudo cargar).
</div>
<div v-else id="cy" class="w-full h-full"></div>
```

---

## 9. Observar cambios de filtro para re-atenuar (Vue watch)

```js
watch(
  () => ({ ...state.filters }),
  () => { applyGraphFilters(); },
  { deep: true }
);
```

No llamar a `refreshGraph()` en cada cambio de filtro — solo `applyGraphFilters()`. Refrescar el grafo completo (con `cy.elements().remove()`) solo cuando cambien los datos, no los filtros.
