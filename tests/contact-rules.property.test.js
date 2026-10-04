// =============================================================================
// contact-rules.property.test.js
// Pruebas property-based sobre las reglas de negocio de network-map-lite.
// Runner: Jest 29 + fast-check 3
// Ejecutar: npx jest (desde la raíz del proyecto)
// Requisitos cubiertos: 1.4, 2.3, 4.2, 5.4
// =============================================================================

const fc = require('fast-check');
const { validateContactFields, validateConnectionFields, applyFilters } = require('../rules.js');

// ---------------------------------------------------------------------------
// Arbitrarios reutilizables
// ---------------------------------------------------------------------------

/** String no vacío (min 1 char, sin espacios sueltos al inicio/fin relevantes) */
const nonEmptyString = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

/** String que puede ser vacío o solo espacios */
const blankString = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t'),
);

/** Contacto válido */
const validContact = fc.record({
  name: nonEmptyString,
  company: nonEmptyString,
  interest: fc.string({ maxLength: 30 }),
});

/** Array de contactos válidos (0-20 elementos) */
const contactsArray = fc.array(validContact, { minLength: 0, maxLength: 20 });

/** Filtros con campos opcionales */
const filtersRecord = fc.record({
  text: fc.string({ maxLength: 20 }),
  interest: fc.string({ maxLength: 20 }),
  company: fc.string({ maxLength: 20 }),
});

// ---------------------------------------------------------------------------
// Bloque 1: validateContactFields — Req 1.2, 1.3, 1.4, 2.2, 2.3
// ---------------------------------------------------------------------------

describe('validateContactFields', () => {

  test('P1: nombre vacío siempre produce error de nombre', () => {
    fc.assert(fc.property(
      blankString,
      nonEmptyString,
      fc.boolean(),
      (blankName, company, dup) => {
        const errors = validateContactFields({ name: blankName, company }, dup);
        return errors.name !== undefined;
      }
    ));
  });

  test('P2: empresa vacía siempre produce error de empresa', () => {
    fc.assert(fc.property(
      nonEmptyString,
      blankString,
      fc.boolean(),
      (name, blankCompany, dup) => {
        const errors = validateContactFields({ name, company: blankCompany }, dup);
        return errors.company !== undefined;
      }
    ));
  });

  test('P3: duplicate=true con campos válidos siempre produce error de duplicado', () => {
    fc.assert(fc.property(
      nonEmptyString,
      nonEmptyString,
      (name, company) => {
        const errors = validateContactFields({ name, company }, true);
        return errors.duplicate !== undefined;
      }
    ));
  });

  test('P4: campos válidos y duplicate=false produce objeto de errores vacío', () => {
    fc.assert(fc.property(
      nonEmptyString,
      nonEmptyString,
      (name, company) => {
        const errors = validateContactFields({ name, company }, false);
        return Object.keys(errors).length === 0;
      }
    ));
  });

  test('P5: los errores devueltos son siempre strings (nunca undefined de valor falsy extraño)', () => {
    fc.assert(fc.property(
      fc.string({ maxLength: 30 }),
      fc.string({ maxLength: 30 }),
      fc.boolean(),
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

describe('validateConnectionFields', () => {

  test('P6: mismos ids siempre producen error sameContact (Req 4.2)', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 9999 }),
      (id) => {
        const errors = validateConnectionFields({ sourceId: id, targetId: id });
        return errors.sameContact !== undefined;
      }
    ));
  });

  test('P7: ids distintos y no vacíos nunca producen errores', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 4999 }),
      fc.integer({ min: 5000, max: 9999 }),
      (a, b) => {
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
// Bloque 3: applyFilters — Req 5.1–5.4
// ---------------------------------------------------------------------------

describe('applyFilters', () => {

  test('P10: filtros todos vacíos devuelve todos los contactos (Req 5.5)', () => {
    fc.assert(fc.property(
      contactsArray,
      (contacts) => {
        const result = applyFilters(contacts, { text: '', interest: '', company: '' });
        return result.length === contacts.length;
      }
    ));
  });

  test('P11: resultado nunca supera el total de contactos de entrada', () => {
    fc.assert(fc.property(
      contactsArray,
      filtersRecord,
      (contacts, filters) => {
        const result = applyFilters(contacts, filters);
        return result.length <= contacts.length;
      }
    ));
  });

  test('P12: todos los contactos del resultado contienen el texto del filtro (Req 5.1)', () => {
    fc.assert(fc.property(
      contactsArray,
      nonEmptyString,
      (contacts, text) => {
        const result = applyFilters(contacts, { text, interest: '', company: '' });
        return result.every(c =>
          c.name.toLowerCase().includes(text.trim().toLowerCase()) ||
          c.company.toLowerCase().includes(text.trim().toLowerCase())
        );
      }
    ));
  });

  test('P13: todos los contactos del resultado contienen el interés del filtro (Req 5.2)', () => {
    fc.assert(fc.property(
      contactsArray,
      nonEmptyString,
      (contacts, interest) => {
        const result = applyFilters(contacts, { text: '', interest, company: '' });
        return result.every(c =>
          (c.interest || '').toLowerCase().includes(interest.trim().toLowerCase())
        );
      }
    ));
  });

  test('P14: todos los contactos del resultado contienen la empresa del filtro (Req 5.3)', () => {
    fc.assert(fc.property(
      contactsArray,
      nonEmptyString,
      (contacts, company) => {
        const result = applyFilters(contacts, { text: '', interest: '', company });
        return result.every(c =>
          c.company.toLowerCase().includes(company.trim().toLowerCase())
        );
      }
    ));
  });

  test('P15: filtros combinados (AND) — resultado es subconjunto de cada filtro individual (Req 5.4)', () => {
    fc.assert(fc.property(
      contactsArray,
      filtersRecord,
      (contacts, filters) => {
        const combined = applyFilters(contacts, filters);
        const byText = applyFilters(contacts, { ...filters, interest: '', company: '' });
        const byInterest = applyFilters(contacts, { ...filters, text: '', company: '' });
        const byCompany = applyFilters(contacts, { ...filters, text: '', interest: '' });

        // Cada elemento del resultado combinado debe estar en cada resultado individual
        return combined.every(c =>
          (!filters.text.trim() || byText.includes(c)) &&
          (!filters.interest.trim() || byInterest.includes(c)) &&
          (!filters.company.trim() || byCompany.includes(c))
        );
      }
    ));
  });

  test('P16: applyFilters es idempotente — aplicar dos veces el mismo filtro da el mismo resultado', () => {
    fc.assert(fc.property(
      contactsArray,
      filtersRecord,
      (contacts, filters) => {
        const first = applyFilters(contacts, filters);
        const second = applyFilters(first, filters);
        return JSON.stringify(first) === JSON.stringify(second);
      }
    ));
  });

});
