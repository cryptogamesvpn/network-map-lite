// =============================================================================
// Network Map Lite — app.js
// Stack: Vue 3 (CDN global build) + Dexie.js + Cytoscape.js + Tailwind CSS
// Sin build step. Abrir index.html directamente en el navegador.
// =============================================================================

// ---------------------------------------------------------------------------
// SECCIÓN 1: Capa de persistencia — Dexie / IndexedDB  (Req 1.1, 2.1, 3.1, 4.1)
// ---------------------------------------------------------------------------

const db = new Dexie('network-map-lite');

db.version(1).stores({
  // ++id: autoincremental. Índice compuesto [name+company] para detectar duplicados.
  contacts: '++id, name, company, interest, [name+company]',
  connections: '++id, sourceId, targetId, reason',
});

/**
 * Añade un contacto. Lanza DuplicateError si ya existe [name+company].
 * @param {{ name: string, company: string, interest?: string }} data
 * @returns {Promise<number>} id generado
 */
async function addContact({ name, company, interest = '' }) {
  return db.contacts.add({ name: name.trim(), company: company.trim(), interest: interest.trim() });
}

/**
 * Actualiza un contacto existente.
 * @param {number} id
 * @param {{ name: string, company: string, interest?: string }} data
 */
async function updateContact(id, { name, company, interest = '' }) {
  return db.contacts.update(id, { name: name.trim(), company: company.trim(), interest: interest.trim() });
}

/**
 * Elimina un contacto y todas sus conexiones (origen o destino). (Req 3.2)
 * @param {number} id
 */
async function deleteContact(id) {
  await db.transaction('rw', db.contacts, db.connections, async () => {
    await db.connections.where('sourceId').equals(id).delete();
    await db.connections.where('targetId').equals(id).delete();
    await db.contacts.delete(id);
  });
}

/**
 * Añade una conexión entre dos contactos.
 * @param {{ sourceId: number, targetId: number, reason?: string }} data
 * @returns {Promise<number>} id generado
 */
async function addConnection({ sourceId, targetId, reason = '' }) {
  return db.connections.add({ sourceId, targetId, reason: reason.trim() });
}

/**
 * Devuelve todos los contactos ordenados por nombre.
 * @returns {Promise<Array>}
 */
async function listContacts() {
  return db.contacts.orderBy('name').toArray();
}

/**
 * Devuelve todas las conexiones.
 * @returns {Promise<Array>}
 */
async function listConnections() {
  return db.connections.toArray();
}

/**
 * Verifica si ya existe un contacto con la misma combinación [name+company],
 * excluyendo opcionalmente un id (para edición).
 * @param {string} name
 * @param {string} company
 * @param {number|null} excludeId
 * @returns {Promise<boolean>}
 */
async function isDuplicate(name, company, excludeId = null) {
  const existing = await db.contacts
    .where('[name+company]')
    .equals([name.trim(), company.trim()])
    .first();
  if (!existing) return false;
  if (excludeId !== null && existing.id === excludeId) return false;
  return true;
}

// ---------------------------------------------------------------------------
// SECCIÓN 2: Reglas de negocio puras — cargadas desde rules.js
// rules.js se incluye antes de app.js en index.html y expone las funciones
// como globales del browser. (Req 1.2-1.4, 2.2-2.3, 4.2, 5.1-5.4)
// ---------------------------------------------------------------------------
// validateContactFields, validateConnectionFields, applyFilters
// están definidas en rules.js (disponibles como globales en browser).

// ---------------------------------------------------------------------------
// SECCIÓN 3: Aplicación Vue 3
// ---------------------------------------------------------------------------

const { createApp, reactive, computed, onMounted, watch, nextTick } = Vue;

createApp({
  setup() {
    // -----------------------------------------------------------------------
    // Estado reactivo centralizado
    // -----------------------------------------------------------------------
    const state = reactive({
      contacts: [],       // todos los contactos cargados desde Dexie
      connections: [],    // todas las conexiones cargadas desde Dexie
      filters: { text: '', interest: '', company: '' },
      editingContact: null,    // contacto en edición o null
      deletingContact: null,   // contacto pendiente de confirmación de borrado
      notification: null,      // mensaje de error no bloqueante (Req 6.1)
    });

    // Formularios
    const contactForm = reactive({ name: '', company: '', interest: '' });
    const contactFormErrors = reactive({ name: '', company: '', duplicate: '' });

    const connectionForm = reactive({ sourceId: '', targetId: '', reason: '' });
    const connectionFormErrors = reactive({ source: '', target: '', sameContact: '' });

    // Disponibilidad de Cytoscape (Req 6.2)
    const cytoscapeAvailable = typeof cytoscape === 'function';

    // Instancia de Cytoscape (se asigna en onMounted)
    let cy = null;

    // -----------------------------------------------------------------------
    // Computed
    // -----------------------------------------------------------------------
    const filteredContacts = computed(() => applyFilters(state.contacts, state.filters));

    const hasActiveFilters = computed(() =>
      state.filters.text.trim() !== '' ||
      state.filters.interest.trim() !== '' ||
      state.filters.company.trim() !== ''
    );

    // -----------------------------------------------------------------------
    // Notificaciones de error (Req 6.1)
    // -----------------------------------------------------------------------
    function showNotification(message) {
      state.notification = message;
      console.error('[NetworkMapLite]', message);
    }

    function clearNotification() {
      state.notification = null;
    }

    // -----------------------------------------------------------------------
    // Carga de datos desde Dexie
    // -----------------------------------------------------------------------
    async function loadAll() {
      try {
        state.contacts = await listContacts();
        state.connections = await listConnections();
        console.info('[NetworkMapLite] datos cargados:', state.contacts.length, 'contactos,', state.connections.length, 'conexiones');
      } catch (err) {
        showNotification('Error al cargar datos: ' + err.message);
      }
    }

    // -----------------------------------------------------------------------
    // SECCIÓN 4: Grafo Cytoscape.js  (Req 1.5, 2.4, 3.3, 4.3)
    // -----------------------------------------------------------------------

    /**
     * Única función responsable de recalcular el grafo completo.
     * Siempre muestra TODOS los nodos/aristas; los filtros solo atenúan. (Req 5.6)
     */
    function refreshGraph() {
      if (!cy) return;

      const nodes = state.contacts.map((c) => ({
        data: { id: String(c.id), label: c.name, company: c.company, interest: c.interest || '' },
      }));

      const edges = state.connections.map((conn) => ({
        data: {
          id: 'e' + conn.id,
          source: String(conn.sourceId),
          target: String(conn.targetId),
          label: conn.reason || '',
        },
      }));

      cy.elements().remove();
      cy.add([...nodes, ...edges]);
      cy.layout({ name: 'cose', animate: false, padding: 30 }).run();

      applyGraphFilters();
    }

    /**
     * Aplica estilos de atenuación a los nodos que no coincidan con los filtros activos. (Req 5.6)
     * No elimina nodos; solo modifica opacity.
     */
    function applyGraphFilters() {
      if (!cy) return;

      const activeFilters = hasActiveFilters.value;
      const matchingIds = new Set(filteredContacts.value.map((c) => String(c.id)));

      cy.nodes().forEach((node) => {
        if (activeFilters && !matchingIds.has(node.id())) {
          node.addClass('dimmed');
        } else {
          node.removeClass('dimmed');
        }
      });
    }

    // -----------------------------------------------------------------------
    // SECCIÓN 5: ContactForm — alta y edición  (Req 1, 2)
    // -----------------------------------------------------------------------

    function resetContactForm() {
      contactForm.name = '';
      contactForm.company = '';
      contactForm.interest = '';
      contactFormErrors.name = '';
      contactFormErrors.company = '';
      contactFormErrors.duplicate = '';
    }

    function startEditContact(contact) {
      state.editingContact = contact;
      contactForm.name = contact.name;
      contactForm.company = contact.company;
      contactForm.interest = contact.interest || '';
      contactFormErrors.name = '';
      contactFormErrors.company = '';
      contactFormErrors.duplicate = '';
    }

    function cancelEditContact() {
      state.editingContact = null;
      resetContactForm();
    }

    async function submitContactForm() {
      // Limpiar errores previos
      contactFormErrors.name = '';
      contactFormErrors.company = '';
      contactFormErrors.duplicate = '';

      const { name, company, interest } = contactForm;
      const editId = state.editingContact?.id ?? null;

      // Validación campos vacíos (Req 1.2, 1.3, 2.2)
      const fieldsErrors = validateContactFields({ name, company }, false);
      if (fieldsErrors.name) { contactFormErrors.name = fieldsErrors.name; return; }
      if (fieldsErrors.company) { contactFormErrors.company = fieldsErrors.company; return; }

      // Verificación de duplicado (Req 1.4, 2.3)
      let dup = false;
      try {
        dup = await isDuplicate(name, company, editId);
      } catch (err) {
        showNotification('Error al verificar duplicado: ' + err.message);
        return;
      }
      if (dup) {
        contactFormErrors.duplicate = 'Ya existe un contacto con ese nombre y empresa.';
        return;
      }

      try {
        if (editId !== null) {
          // Edición (Req 2.1)
          await updateContact(editId, { name, company, interest });
          console.info('[NetworkMapLite] contacto actualizado:', editId);
          state.editingContact = null;
        } else {
          // Alta (Req 1.1)
          const newId = await addContact({ name, company, interest });
          console.info('[NetworkMapLite] contacto añadido:', newId);
        }
        resetContactForm();
        await loadAll();
        refreshGraph();
      } catch (err) {
        showNotification('Error al guardar contacto: ' + err.message);
      }
    }

    // -----------------------------------------------------------------------
    // SECCIÓN 6: ContactList — borrado con cascada  (Req 3)
    // -----------------------------------------------------------------------

    function confirmDeleteContact(contact) {
      state.deletingContact = contact;
    }

    function cancelDeleteContact() {
      state.deletingContact = null;
    }

    async function executeDeleteContact() {
      if (!state.deletingContact) return;
      const contact = state.deletingContact;
      state.deletingContact = null;

      try {
        await deleteContact(contact.id); // incluye cascada de conexiones (Req 3.2)
        console.info('[NetworkMapLite] contacto eliminado:', contact.id);
        // Si estábamos editando este contacto, cancelar edición
        if (state.editingContact?.id === contact.id) cancelEditContact();
        await loadAll();
        refreshGraph(); // (Req 3.3)
      } catch (err) {
        showNotification('Error al eliminar contacto: ' + err.message);
      }
    }

    // -----------------------------------------------------------------------
    // SECCIÓN 7: ConnectionForm  (Req 4)
    // -----------------------------------------------------------------------

    function resetConnectionForm() {
      connectionForm.sourceId = '';
      connectionForm.targetId = '';
      connectionForm.reason = '';
      connectionFormErrors.source = '';
      connectionFormErrors.target = '';
      connectionFormErrors.sameContact = '';
    }

    async function submitConnectionForm() {
      connectionFormErrors.source = '';
      connectionFormErrors.target = '';
      connectionFormErrors.sameContact = '';

      const errors = validateConnectionFields(connectionForm);
      if (errors.source) { connectionFormErrors.source = errors.source; }
      if (errors.target) { connectionFormErrors.target = errors.target; }
      if (errors.sameContact) { connectionFormErrors.sameContact = errors.sameContact; }

      // Si hay cualquier error, no continuar
      if (errors.source || errors.target || errors.sameContact) return;

      try {
        const newId = await addConnection({
          sourceId: Number(connectionForm.sourceId),
          targetId: Number(connectionForm.targetId),
          reason: connectionForm.reason,
        });
        console.info('[NetworkMapLite] conexión añadida:', newId);
        resetConnectionForm();
        await loadAll();
        refreshGraph(); // (Req 4.3)
      } catch (err) {
        showNotification('Error al crear conexión: ' + err.message);
      }
    }

    // -----------------------------------------------------------------------
    // SECCIÓN 8: Filtros  (Req 5)
    // -----------------------------------------------------------------------

    function clearFilters() {
      state.filters.text = '';
      state.filters.interest = '';
      state.filters.company = '';
    }

    // Observar cambios en filtros para re-aplicar atenuación en el grafo (Req 5.6)
    watch(
      () => ({ ...state.filters }),
      () => { applyGraphFilters(); },
      { deep: true }
    );

    // -----------------------------------------------------------------------
    // SECCIÓN 9: Inicialización
    // -----------------------------------------------------------------------

    onMounted(async () => {
      await loadAll();

      // Inicializar Cytoscape (Req 6.2: solo si está disponible)
      if (cytoscapeAvailable) {
        cy = cytoscape({
          container: document.getElementById('cy'),
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
              selector: 'node.dimmed',  // nodos atenuados por filtro activo (Req 5.6)
              style: {
                'opacity': 0.2,
              },
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
          layout: { name: 'grid' },
          userZoomingEnabled: true,
          userPanningEnabled: true,
        });

        refreshGraph();
      } else {
        // Req 6.2: Cytoscape no disponible
        console.error('[NetworkMapLite] Cytoscape.js no está disponible. Modo lista activo.');
      }
    });

    // -----------------------------------------------------------------------
    // Exposición al template
    // -----------------------------------------------------------------------
    return {
      state,
      contactForm,
      contactFormErrors,
      connectionForm,
      connectionFormErrors,
      cytoscapeAvailable,
      filteredContacts,
      hasActiveFilters,
      clearFilters,
      clearNotification,
      submitContactForm,
      startEditContact,
      cancelEditContact,
      confirmDeleteContact,
      cancelDeleteContact,
      executeDeleteContact,
      submitConnectionForm,
    };
  },
}).mount('#app');
