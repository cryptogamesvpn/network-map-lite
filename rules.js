// =============================================================================
// rules.js — Reglas de negocio puras (sin side effects, sin DOM, sin Dexie)
// Importadas por app.js (browser) y por los tests (Node).
// =============================================================================

/**
 * Valida los campos del formulario de contacto.
 * @param {{ name: string, company: string }} fields
 * @param {boolean} duplicate  — true si ya existe [name+company] en la BD
 * @returns {{ name?: string, company?: string, duplicate?: string }}
 */
function validateContactFields({ name, company }, duplicate) {
  const errors = {};
  if (!name || !name.trim()) errors.name = 'El nombre es obligatorio.';
  if (!company || !company.trim()) errors.company = 'La empresa es obligatoria.';
  if (duplicate) errors.duplicate = 'Ya existe un contacto con ese nombre y empresa.';
  return errors;
}

/**
 * Valida los campos del formulario de conexión.
 * @param {{ sourceId: number|string, targetId: number|string }} fields
 * @returns {{ source?: string, target?: string, sameContact?: string }}
 */
function validateConnectionFields({ sourceId, targetId }) {
  const errors = {};
  if (!sourceId) errors.source = 'Selecciona el contacto de origen.';
  if (!targetId) errors.target = 'Selecciona el contacto de destino.';
  if (sourceId && targetId && Number(sourceId) === Number(targetId)) {
    errors.sameContact = 'El origen y el destino no pueden ser el mismo contacto.';
  }
  return errors;
}

/**
 * Aplica filtros AND sobre un array de contactos. (Req 5.1–5.4)
 * @param {Array<{ name: string, company: string, interest: string }>} contacts
 * @param {{ text: string, interest: string, company: string }} filters
 * @returns {Array}
 */
function applyFilters(contacts, filters) {
  const text = (filters.text || '').trim().toLowerCase();
  const interest = (filters.interest || '').trim().toLowerCase();
  const company = (filters.company || '').trim().toLowerCase();

  return contacts.filter((c) => {
    if (text && !c.name.toLowerCase().includes(text) && !c.company.toLowerCase().includes(text)) return false;
    if (interest && !(c.interest || '').toLowerCase().includes(interest)) return false;
    if (company && !c.company.toLowerCase().includes(company)) return false;
    return true;
  });
}

// Exportación dual: CommonJS (Node/Jest) y global (browser vía <script>)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateContactFields, validateConnectionFields, applyFilters };
}
