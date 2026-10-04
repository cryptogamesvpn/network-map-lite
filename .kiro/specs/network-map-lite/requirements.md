# Documento de Requisitos

## Introducción

Network Map Lite es una SPA para registrar contactos profesionales y visualizar relaciones, intereses y oportunidades de colaboración mediante un grafo interactivo. El MVP se limita estrictamente a: CRUD de contactos, creación de conexiones entre contactos, filtrado por interés/empresa/texto, y visualización en grafo que se actualiza automáticamente. La persistencia es local mediante IndexedDB.

## Requisitos

### Requisito 1: Registrar contacto

**Historia de Usuario:** Como usuario, quiero registrar un contacto para mantener mi red profesional organizada.

#### Criterios de Aceptación

1.1. WHEN el usuario envía el formulario de nuevo contacto con nombre y empresa no vacíos THEN el sistema SHALL guardar el contacto en IndexedDB.

1.2. WHEN el usuario envía el formulario con el campo nombre vacío THEN el sistema SHALL mostrar un error de validación y no guardar el contacto.

1.3. WHEN el usuario envía el formulario con el campo empresa vacío THEN el sistema SHALL mostrar un error de validación y no guardar el contacto.

1.4. IF ya existe un contacto con la misma combinación de nombre y empresa THEN el sistema SHALL mostrar un error de duplicado y no guardar el contacto.

1.5. WHEN un contacto se guarda exitosamente THEN el sistema SHALL actualizar el grafo automáticamente.

### Requisito 2: Editar contacto

**Historia de Usuario:** Como usuario, quiero actualizar datos de un contacto para mantener la información vigente.

#### Criterios de Aceptación

2.1. WHEN el usuario selecciona un contacto existente y envía cambios con nombre y empresa no vacíos THEN el sistema SHALL actualizar el registro en IndexedDB.

2.2. WHEN el usuario intenta editar un contacto dejando el nombre o la empresa vacíos THEN el sistema SHALL mostrar un error de validación y no aplicar los cambios.

2.3. IF los cambios generarían una combinación duplicada de nombre y empresa con otro contacto THEN el sistema SHALL mostrar un error de duplicado y no aplicar los cambios.

2.4. WHEN un contacto se edita exitosamente THEN el sistema SHALL actualizar el grafo automáticamente.

### Requisito 3: Eliminar contacto

**Historia de Usuario:** Como usuario, quiero eliminar contactos obsoletos para mantener limpia mi red.

#### Criterios de Aceptación

3.1. WHEN el usuario confirma la eliminación de un contacto THEN el sistema SHALL eliminar el contacto de IndexedDB.

3.2. WHEN un contacto se elimina THEN el sistema SHALL eliminar todas las conexiones que lo referencian como origen o destino.

3.3. WHEN un contacto se elimina exitosamente THEN el sistema SHALL actualizar el grafo automáticamente.

### Requisito 4: Crear conexión

**Historia de Usuario:** Como usuario, quiero relacionar dos contactos para visualizar posibles oportunidades.

#### Criterios de Aceptación

4.1. WHEN el usuario selecciona dos contactos distintos y proporciona un motivo THEN el sistema SHALL guardar la conexión en IndexedDB con origen, destino y motivo.

4.2. IF el usuario intenta crear una conexión donde contacto_origen y contacto_destino son el mismo contacto THEN el sistema SHALL mostrar un error y no guardar la conexión.

4.3. WHEN una conexión se crea exitosamente THEN el sistema SHALL actualizar el grafo automáticamente.

### Requisito 5: Filtrar red

**Historia de Usuario:** Como usuario, quiero filtrar contactos por interés, texto de búsqueda y empresa para identificar conexiones relevantes.

#### Criterios de Aceptación

5.1. WHEN el usuario introduce un texto en el campo de búsqueda THEN el sistema SHALL filtrar los contactos cuyo nombre o empresa contengan ese texto.

5.2. WHEN el usuario introduce un interés en el campo de filtro por interés THEN el sistema SHALL filtrar los contactos cuyo interés coincida total o parcialmente.

5.3. WHEN el usuario introduce una empresa en el campo de filtro por empresa THEN el sistema SHALL filtrar los contactos cuya empresa coincida total o parcialmente.

5.4. WHEN el usuario combina múltiples filtros THEN el sistema SHALL aplicar todos los criterios simultáneamente (AND).

5.5. WHEN el usuario limpia todos los filtros THEN el sistema SHALL mostrar todos los contactos.

5.6. WHILE hay filtros activos THEN el sistema SHALL resaltar en el grafo los nodos que coinciden sin eliminarlos de la vista.

### Requisito 6: Resiliencia básica

**Historia de Usuario:** Como usuario, quiero que la aplicación me informe cuando algo falla en lugar de romperse silenciosamente, para poder entender qué ocurrió.

#### Criterios de Aceptación

6.1. WHEN una operación de lectura o escritura en IndexedDB falla THEN el sistema SHALL mostrar una notificación no bloqueante con el mensaje del error y continuar operativo en modo solo lectura.

6.2. IF Cytoscape.js no está disponible al iniciar la aplicación THEN el sistema SHALL mostrar un mensaje de fallback en el contenedor del grafo y continuar operativo en modo lista.
