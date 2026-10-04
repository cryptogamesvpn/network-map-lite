# Esquema Dexie.js — Network Map Lite

Extraído directamente de `app.js`. No documentación genérica de Dexie.

---

## 1. Definición del esquema

```js
const db = new Dexie('network-map-lite');

db.version(1).stores({
  // ++id: autoincremental
  // [name+company]: índice compuesto para detectar duplicados (Req 1.4, 2.3)
  contacts: '++id, name, company, interest, [name+company]',
  connections: '++id, sourceId, targetId, reason',
});
```

**Puntos críticos:**
- `[name+company]` es el índice compuesto que permite buscar duplicados en una sola query. Sin él, habría que cargar todos los contactos y filtrar en memoria.
- `sourceId` y `targetId` están indexados individualmente para poder hacer `where('sourceId').equals(id)` en la cascada de borrado.
- `interest` y `reason` están indexados aunque no se usen en queries actualmente — facilita búsquedas futuras sin migración de versión.

---

## 2. Modelo de datos

### `contacts`

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | number (autoincremental) | — | Generado por Dexie |
| `name` | string | ✅ | Trimmed antes de guardar |
| `company` | string | ✅ | Trimmed antes de guardar |
| `interest` | string | No | Trimmed; vacío `''` si no se proporciona |

### `connections`

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `id` | number (autoincremental) | — | Generado por Dexie |
| `sourceId` | number | ✅ | FK a `contacts.id` |
| `targetId` | number | ✅ | FK a `contacts.id`; `sourceId !== targetId` |
| `reason` | string | No | Trimmed; vacío `''` si no se proporciona |

---

## 3. Operaciones CRUD

### Alta de contacto (Req 1.1)

```js
async function addContact({ name, company, interest = '' }) {
  return db.contacts.add({
    name: name.trim(),
    company: company.trim(),
    interest: interest.trim(),
  });
  // Devuelve el id autoincremental generado
}
```

### Actualización de contacto (Req 2.1)

```js
async function updateContact(id, { name, company, interest = '' }) {
  return db.contacts.update(id, {
    name: name.trim(),
    company: company.trim(),
    interest: interest.trim(),
  });
  // Devuelve 1 si el registro existía, 0 si no
}
```

### Borrado con cascada (Req 3.1, 3.2)

```js
async function deleteContact(id) {
  await db.transaction('rw', db.contacts, db.connections, async () => {
    // Cascada: eliminar todas las conexiones donde este contacto es origen o destino
    await db.connections.where('sourceId').equals(id).delete();
    await db.connections.where('targetId').equals(id).delete();
    // Eliminar el contacto
    await db.contacts.delete(id);
  });
}
```

La transacción `'rw'` garantiza que si alguna operación falla, ningún cambio se persiste (atomicidad).

### Alta de conexión (Req 4.1)

```js
async function addConnection({ sourceId, targetId, reason = '' }) {
  return db.connections.add({
    sourceId,       // number — ya validado sourceId !== targetId antes de llamar
    targetId,
    reason: reason.trim(),
  });
}
```

### Listado de contactos

```js
async function listContacts() {
  return db.contacts.orderBy('name').toArray();
  // Devuelve todos los contactos ordenados alfabéticamente por nombre
}
```

### Listado de conexiones

```js
async function listConnections() {
  return db.connections.toArray();
}
```

---

## 4. Detección de duplicados con índice compuesto (Req 1.4, 2.3)

```js
async function isDuplicate(name, company, excludeId = null) {
  const existing = await db.contacts
    .where('[name+company]')
    .equals([name.trim(), company.trim()])   // array con los dos valores del índice compuesto
    .first();

  if (!existing) return false;
  // En edición: excluir el propio contacto que se está editando
  if (excludeId !== null && existing.id === excludeId) return false;
  return true;
}
```

**Uso:**
```js
// Alta (excludeId = null)
const dup = await isDuplicate(name, company);

// Edición (excluir el contacto que se edita)
const dup = await isDuplicate(name, company, contactId);
```

---

## 5. Patrón de carga completa del estado

```js
async function loadAll() {
  try {
    state.contacts = await listContacts();
    state.connections = await listConnections();
  } catch (err) {
    showNotification('Error al cargar datos: ' + err.message);
  }
}
```

Llamar a `loadAll()` seguido de `refreshGraph()` tras cada operación CRUD para mantener el estado Vue sincronizado con IndexedDB.

---

## 6. Manejo de errores de IndexedDB (Req 6.1)

Todas las operaciones Dexie están envueltas en `try/catch`. Si IndexedDB no está disponible (modo privado sin persistencia, cuota excedida), se muestra una notificación no bloqueante:

```js
try {
  await addContact({ name, company, interest });
} catch (err) {
  showNotification('Error al guardar contacto: ' + err.message);
  // La app sigue operativa; el grafo y la lista conservan el estado anterior
}
```

---

## 7. Consultas de diagnóstico con voidwalker-mcp

Para inspeccionar IndexedDB desde Kiro con el MCP `voidwalker`:

```
# Ver todos los contactos almacenados
Usa voidwalker para consultar el almacén "contacts" de la base de datos "network-map-lite"

# Ver todas las conexiones
Usa voidwalker para consultar el almacén "connections" de la base de datos "network-map-lite"

# Buscar contactos cuyo nombre contenga "Ana"
Usa voidwalker para buscar en "contacts" registros donde name contenga "Ana"
```

Estos prompts activan las herramientas `query_indexeddb` y `search_indexeddb` del servidor MCP, que están en `autoApprove` y no requieren confirmación manual.

---

## 8. Notas de migración de versión

Si en el futuro se añaden campos o índices, incrementar la versión **sin eliminar la anterior**:

```js
db.version(1).stores({
  contacts: '++id, name, company, interest, [name+company]',
  connections: '++id, sourceId, targetId, reason',
});

db.version(2).stores({
  // Añadir índice de fecha de creación sin romper v1
  contacts: '++id, name, company, interest, [name+company], createdAt',
});
```

Dexie aplica la migración automáticamente al detectar una versión superior al abrir la base de datos.
