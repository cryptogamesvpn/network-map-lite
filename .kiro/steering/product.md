---
inclusion: always
---
# Product Steering

## Propósito

Network Map Lite es una SPA local para registrar contactos profesionales y visualizar sus relaciones, intereses y oportunidades de colaboración mediante un grafo interactivo. No tiene backend: toda la información vive en el navegador del usuario.

## Usuarios

- Profesionales que gestionan su red de contactos y quieren identificar oportunidades de colaboración.
- Uso individual, single-user, sin cuentas ni autenticación.

## Casos de uso

- Registrar un contacto (nombre, empresa, interés).
- Editar datos de un contacto existente.
- Eliminar contactos obsoletos.
- Crear conexiones entre dos contactos con un motivo.
- Filtrar contactos por interés, texto de búsqueda y empresa.
- Visualizar la red como grafo interactivo que se actualiza automáticamente.

## Funcionalidades del MVP

1. Alta de contacto.
2. Edición de contacto.
3. Eliminación de contacto (con eliminación en cascada de sus conexiones).
4. Alta de conexión (origen ≠ destino).
5. Filtrado por interés, texto y empresa.
6. Grafo interactivo con refresco automático.

## Reglas de calidad del producto

- Nombre obligatorio.
- Empresa obligatoria al registrar un contacto.
- No duplicados por combinación nombre + empresa.
- Contacto_origen y contacto_destino no pueden ser el mismo.
- El grafo se actualiza automáticamente tras cualquier modificación.

## Límites del producto

Fuera de alcance del MVP:

- Backend, cuentas de usuario, autenticación, sincronización.
- Importación/exportación de datos.
- Búsqueda avanzada, etiquetas, categorías jerárquicas.
- Notificaciones, analítica, telemetría.
- Edición de la posición de nodos persistida.
- Cualquier funcionalidad no listada expresamente arriba.
