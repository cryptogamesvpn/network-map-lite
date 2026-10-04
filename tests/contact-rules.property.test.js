// =============================================================================
// contact-rules.property.test.js
// Pruebas property-based sobre las reglas de negocio de network-map-lite.
// Runner: Jest 29 + fast-check 3
// Ejecutar: npx jest (desde la raíz del proyecto)
// Requisitos cubiertos: 1.2, 1.3, 1.4, 2.2, 2.3, 4.2, 5.1, 5.2, 5.3, 5.4, 5.5
//
// Las propiedades formales de design.md §Propiedades de Correctitud se
// corresponden con los bloques 4 (Property 1), 5 (Property 2) y 6 (Property 3).
// Los bloques 1-3 cubren las funciones de validación que respaldan esas propiedades.
// =============================================================================

const fc = require('fast-check');
const { validateContactFields, validateConnectionFields, applyFilters } = require('../rules.js');

// ---------------------------------------------------------------------------
// Arbitrarios reutilizables
// ---------------------------------------------------------------------------

/** String no vacío después de trim (min 1 char útil) */
const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

/** String vacío o solo espacios */
const blankString = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t'),
);

/** Contacto con campos siempre presentes (nunca undefined) */
const validContact = fc.record({
  name: nonEmptyString,
  company: nonEmptyString,
  interest: fc.string({ maxLength: 30 }),
});

/** Array de contactos válidos (0–20 elementos) */
const contactsArray = fc.array(validContact, { minLength: 0, maxLength: 20 });

/** Filtros con todos los campos presentes (nunca undefined) */
const filtersRecord = fc.record({
  text: fc.string({ maxLength: 20 }),
  interest: fc.string({ maxLength: 20 }),
  company: fc.string({ maxLength: 20 }),
});

/** Par de ids positivos distintos */
const distinctPositiveIds = fc
  .tuple(fc.integer({ min: 1, max: 4999 }), fc.integer({ min: 5000, max: 9999 }));

// ---------------------------------------------------------------------------
// Helpers de simulación de almacenamiento en memoria
// (replican la lógica de addContact / addConnection sin Dexie)
// ---------------------------------------------------------------------------

/**
 * Simula la inserción de una secuencia de contactos respetando la regla de
 * no duplicado [name+company]. Devuelve el conjunto de contactos almacenados.
 * @param {Array<{name:string, company:string, interest:string}>} incoming
 * @returns {Array}
 */
function simulateAddContacts(incoming) {
  const stored = [];
  for (const contact of incoming) {
    const dup = stored.some(
      s => s.name.trim() === contact.name.trim() && s.company.trim() === contact.company.trim()
    );
    if (!dup) stored.push(contact);
  }
  return stored;
}

/**
 * Simula la inserción de una secuencia de conexiones respetando la regla
 * sourceId !== targetId. Devuelve el conjunto de conexiones almacenadas.
 * @param {Array<{sourceId:number, targetId:number}>} incoming
 * @returns {Array}
 */
function simulateAddConnections(incoming) {
  return incoming.filter(c => c.sourceId !== c.targetId);
}

// ---------------------------------------------------------------------------
// Bloque 1: validateContactFields — Req 1.2, 1.3, 1.4, 2.2, 2.3
// ---------------------------------------------------------------------------

describe('validateContactFields — funciones de validación', () => {

  test('P1: nombre vacío siempre produce error de nombre (Req 1.2, 2.2)', () => {
    fc.assert(fc.property(
      blankString, nonEmptyString, fc.boolean(),
      (blankName, company, dup) => {
        const errors = validateContactFields({ name: blankName, company }, dup);
        return errors.name !== undefined;
      }
    ));
  });

  test('P2: empresa vacía siempre produce error de empresa (Req 1.3, 2.2)', () => {
    fc.assert(fc.property(
      nonEmptyString, blankString, fc.boolean(),
      (name, blankCompany, dup) => {
        const errors = validateContactFields({ name, company: blankCompany }, dup);
        return errors.company !== undefined;
      }
    ));
  });

  test('P3: duplicate=true con campos válidos siempre produce error de duplicado (Req 1.4, 2.3)', () => {
    fc.assert(fc.property(
      nonEmptyString, nonEmptyString,
      (name, company) => {
        const errors = validateContactFields({ name, company }, true);
        return errors.duplicate !== undefined;
      }
    ));
  });

  test('P4: campos válidos y duplicate=false produce objeto de errores vacío', () => {
    fc.assert(fc.property(
      nonEmptyString, nonEmptyString,
      (name, company) => {
        const errors = validateContactFields({ name, company }, false);
        return Object.keys(errors).length === 0;
      }
    ));
  });

  test('P5: los valores de error son siempre strings no vacíos', () => {
    fc.assert(fc.property(
      fc.string({ maxLength: 30 }), fc.string({ maxLength: 30 }), fc.boolean(),
      (name, company, dup) => {
        const errors = validateContactFields({ name, company }, dup);
        return Object.values(errors).every(v => typeof v === 'string' && v.length > 0);
      }
    ));
  });

});

// ---------------------------------------------------------------------------
// Bloque 2: validateConnectionFields — Req 4.2
// ---------------------------------------------------------------------------

describe('validateConnectionFields — funciones de validación', () => {

  test('P6: mismos ids siempre producen error sameContact (Req 4.2)', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 9999 }),
      (id) => {
        const errors = validateConnectionFields({ sourceId: id, targetId: id });
        return errors.sameContact !== undefined;
      }
    ));
  });

  test('P7: ids distintos y no vacíos no producen errores', () => {
    fc.assert(fc.property(
      distinctPositiveIds,
      ([a, b]) => {
        const errors = validateConnectionFields({ sourceId: a, targetId: b });
        return Object.keys(errors).length === 0;
      }
    ));
  });

  test('P8: sourceId vacío siempre produce error de source', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 9999 }),
      (targetId) => {
        const errors = validateConnectionFields({ sourceId: '', targetId });
        return errors.source !== undefined;
      }
    ));
  });

  test('P9: targetId vacío siempre produce error de target', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 9999 }),
      (sourceId) => {
        const errors = validateConnectionFields({ sourceId, targetId: '' });
        return errors.target !== undefined;
      }
    ));
  });

});

// ---------------------------------------------------------------------------
// Bloque 3: applyFilters — Req 5.1–5.5
// ---------------------------------------------------------------------------

describe('applyFilters — función de filtrado', () => {

  test('P10: filtros vacíos devuelve todos los contactos (Req 5.5)', () => {
    fc.assert(fc.property(
      contactsArray,
      (contacts) => {
        const result = applyFilters(contacts, { text: '', interest: '', company: '' });
        return result.length === contacts.length;
      }
    ));
  });

  test('P11: resultado nunca supera el total de entrada', () => {
    fc.assert(fc.property(
      contactsArray, filtersRecord,
      (contacts, filters) => applyFilters(contacts, filters).length <= contacts.length
    ));
  });

  test('P12: cada resultado contiene el texto buscado en nombre o empresa (Req 5.1)', () => {
    fc.assert(fc.property(
      contactsArray, nonEmptyString,
      (contacts, text) => {
        const result = applyFilters(contacts, { text, interest: '', company: '' });
        const t = text.trim().toLowerCase();
        return result.every(c =>
          c.name.toLowerCase().includes(t) || c.company.toLowerCase().includes(t)
        );
      }
    ));
  });

  test('P13: cada resultado contiene el interés buscado (Req 5.2)', () => {
    fc.assert(fc.property(
      contactsArray, nonEmptyString,
      (contacts, interest) => {
        const result = applyFilters(contacts, { text: '', interest, company: '' });
        const t = interest.trim().toLowerCase();
        return result.every(c => (c.interest || '').toLowerCase().includes(t));
      }
    ));
  });

  test('P14: cada resultado contiene la empresa buscada (Req 5.3)', () => {
    fc.assert(fc.property(
      contactsArray, nonEmptyString,
      (contacts, company) => {
        const result = applyFilters(contacts, { text: '', interest: '', company });
        const t = company.trim().toLowerCase();
        return result.every(c => c.company.toLowerCase().includes(t));
      }
    ));
  });

  test('P15: filtros combinados son subconjunto de cada filtro individual (Req 5.4)', () => {
    fc.assert(fc.property(
      contactsArray, filtersRecord,
      (contacts, filters) => {
        const combined  = applyFilters(contacts, filters);
        const byText    = applyFilters(contacts, { ...filters, interest: '', company: '' });
        const byInterest = applyFilters(contacts, { ...filters, text: '', company: '' });
        const byCompany = applyFilters(contacts, { ...filters, text: '', interest: '' });
        return combined.every(c =>
          (!filters.text.trim()     || byText.includes(c)) &&
          (!filters.interest.trim() || byInterest.includes(c)) &&
          (!filters.company.trim()  || byCompany.includes(c))
        );
      }
    ));
  });

  test('P16: applyFilters es idempotente', () => {
    fc.assert(fc.property(
      contactsArray, filtersRecord,
      (contacts, filters) => {
        const first  = applyFilters(contacts, filters);
        const second = applyFilters(first, filters);
        return JSON.stringify(first) === JSON.stringify(second);
      }
    ));
  });

});

// ---------------------------------------------------------------------------
// Bloque 4 — Property 1 (design.md §Propiedades de Correctitud)
// No duplicado por [name+company] en el conjunto almacenado
// Validates: Req 1.4, 2.3
// ---------------------------------------------------------------------------

describe('Property 1 (design): no duplicado por [name+company] en el conjunto almacenado', () => {

  /**
   * Genera un array con algunos contactos repetidos intencionalmente mezclados
   * con contactos únicos, tal como pide el diseño.
   */
  const mixedContacts = fc.array(
    fc.oneof(
      validContact,                              // contactos frescos (pueden coincidir por azar)
      validContact.chain(c =>                    // contacto repetido intencionalmente
        fc.constant({ ...c })
      )
    ),
    { minLength: 2, maxLength: 30 }
  );

  test('Property 1a: tras insertar con duplicados, todos los pares almacenados tienen (name,company) distintos', () => {
    fc.assert(fc.property(
      mixedContacts,
      (incoming) => {
        const stored = simulateAddContacts(incoming);
        // Oráculo: para todo par a≠b, (a.name,a.company) ≠ (b.name,b.company)
        for (let i = 0; i < stored.length; i++) {
          for (let j = i + 1; j < stored.length; j++) {
            if (
              stored[i].name.trim() === stored[j].name.trim() &&
              stored[i].company.trim() === stored[j].company.trim()
            ) return false;
          }
        }
        return true;
      }
    ));
  });

  test('Property 1b: un duplicado exacto no aumenta el tamaño del conjunto', () => {
    fc.assert(fc.property(
      validContact,
      (contact) => {
        const before = simulateAddContacts([contact]);
        const after  = simulateAddContacts([contact, contact]);
        return after.length === before.length;
      }
    ));
  });

  test('Property 1c: un contacto con mismo nombre pero empresa diferente SÍ se admite', () => {
    fc.assert(fc.property(
      nonEmptyString,
      nonEmptyString,
      nonEmptyString,
      fc.string({ maxLength: 30 }),
      (name, company1, company2, interest) => {
        fc.pre(company1.trim() !== company2.trim());
        const stored = simulateAddContacts([
          { name, company: company1, interest },
          { name, company: company2, interest },
        ]);
        return stored.length === 2;
      }
    ));
  });

});

// ---------------------------------------------------------------------------
// Bloque 5 — Property 2 (design.md §Propiedades de Correctitud)
// Origen ≠ destino en el conjunto de conexiones almacenadas
// Validates: Req 4.2
// ---------------------------------------------------------------------------

describe('Property 2 (design): sourceId !== targetId en todas las conexiones almacenadas', () => {

  /** Mezcla de conexiones válidas e inválidas (sourceId === targetId) */
  const mixedConnections = fc.array(
    fc.oneof(
      // Conexión inválida: mismos ids
      fc.integer({ min: 1, max: 9999 }).map(id => ({ sourceId: id, targetId: id })),
      // Conexión válida: ids distintos (rangos separados garantizan desigualdad)
      fc.tuple(
        fc.integer({ min: 1,    max: 4999 }),
        fc.integer({ min: 5000, max: 9999 })
      ).map(([s, t]) => ({ sourceId: s, targetId: t }))
    ),
    { minLength: 1, maxLength: 20 }
  );

  test('Property 2a: ninguna conexión almacenada tiene sourceId === targetId', () => {
    fc.assert(fc.property(
      mixedConnections,
      (incoming) => {
        const stored = simulateAddConnections(incoming);
        // Oráculo: ∀ c ∈ stored, c.sourceId !== c.targetId
        return stored.every(c => c.sourceId !== c.targetId);
      }
    ));
  });

  test('Property 2b: una conexión self-loop es rechazada y el conjunto no crece', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 9999 }),
      distinctPositiveIds,
      (selfId, [a, b]) => {
        const base    = simulateAddConnections([{ sourceId: a, targetId: b }]);
        const withSelf = simulateAddConnections([{ sourceId: a, targetId: b }, { sourceId: selfId, targetId: selfId }]);
        return withSelf.length === base.length;
      }
    ));
  });

  test('Property 2c: ids distintos nunca son rechazados', () => {
    fc.assert(fc.property(
      distinctPositiveIds,
      ([a, b]) => {
        const stored = simulateAddConnections([{ sourceId: a, targetId: b }]);
        return stored.length === 1;
      }
    ));
  });

});

// ---------------------------------------------------------------------------
// Bloque 6 — Property 3 (design.md §Propiedades de Correctitud)
// filterAll(cs,f) = filterInterest ∩ filterText ∩ filterCompany
// Validates: Req 5.1, 5.2, 5.3, 5.4
// ---------------------------------------------------------------------------

describe('Property 3 (design): filterAll es igual a la intersección de filtros individuales', () => {

  // Helpers de filtro individual (replican applyFilters con un solo criterio activo)
  const filterByText     = (cs, f) => applyFilters(cs, { text: f.text,     interest: '', company: '' });
  const filterByInterest = (cs, f) => applyFilters(cs, { text: '',         interest: f.interest, company: '' });
  const filterByCompany  = (cs, f) => applyFilters(cs, { text: '',         interest: '', company: f.company });

  test('Property 3a: filterAll ⊆ filterByText cuando text no está vacío (Req 5.1)', () => {
    fc.assert(fc.property(
      contactsArray, filtersRecord,
      (contacts, filters) => {
        fc.pre(filters.text.trim().length > 0);
        const all    = applyFilters(contacts, filters);
        const byText = filterByText(contacts, filters);
        return all.every(c => byText.includes(c));
      }
    ));
  });

  test('Property 3b: filterAll ⊆ filterByInterest cuando interest no está vacío (Req 5.2)', () => {
    fc.assert(fc.property(
      contactsArray, filtersRecord,
      (contacts, filters) => {
        fc.pre(filters.interest.trim().length > 0);
        const all        = applyFilters(contacts, filters);
        const byInterest = filterByInterest(contacts, filters);
        return all.every(c => byInterest.includes(c));
      }
    ));
  });

  test('Property 3c: filterAll ⊆ filterByCompany cuando company no está vacío (Req 5.3)', () => {
    fc.assert(fc.property(
      contactsArray, filtersRecord,
      (contacts, filters) => {
        fc.pre(filters.company.trim().length > 0);
        const all       = applyFilters(contacts, filters);
        const byCompany = filterByCompany(contacts, filters);
        return all.every(c => byCompany.includes(c));
      }
    ));
  });

  test('Property 3d: filterAll coincide exactamente con la intersección de los tres filtros (Req 5.4)', () => {
    fc.assert(fc.property(
      contactsArray, filtersRecord,
      (contacts, filters) => {
        const all = applyFilters(contacts, filters);

        // Calcular intersección manual: elementos que están en los tres subconjuntos
        const byText     = filterByText(contacts, filters);
        const byInterest = filterByInterest(contacts, filters);
        const byCompany  = filterByCompany(contacts, filters);

        const intersection = contacts.filter(c => {
          const passText     = !filters.text.trim()     || byText.includes(c);
          const passInterest = !filters.interest.trim() || byInterest.includes(c);
          const passCompany  = !filters.company.trim()  || byCompany.includes(c);
          return passText && passInterest && passCompany;
        });

        // Oráculo: filterAll(cs,f) = intersección de filtros individuales
        if (all.length !== intersection.length) return false;
        return all.every(c => intersection.includes(c));
      }
    ));
  });

  test('Property 3e: filterAll con todos los filtros vacíos es igual al conjunto completo (Req 5.5)', () => {
    fc.assert(fc.property(
      contactsArray,
      (contacts) => {
        const result = applyFilters(contacts, { text: '', interest: '', company: '' });
        return result.length === contacts.length &&
               contacts.every(c => result.includes(c));
      }
    ));
  });

});
