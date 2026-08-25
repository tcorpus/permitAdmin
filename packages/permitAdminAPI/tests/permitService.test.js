import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applySorting,
  getPermits,
  normalizeSort,
  parseOptionalDate,
  parseOptionalInt,
  submitPermit,
} from '../services/permitService.js';

const rows = [
  { PermitID: 1, PermitDate: '2024-01-02', PermitNumber: 'B-2', Applicant: 'Beta', PermitAddress: null, PermitType: 'Burn', PermitStatus: 'Open' },
  { PermitID: 2, PermitDate: '2024-01-01', PermitNumber: 'A-1', Applicant: 'Alpha', PermitAddress: null, PermitType: 'Burn', PermitStatus: 'Closed' },
];

test('parseOptionalInt handles missing, numeric, and invalid values', () => {
  assert.equal(parseOptionalInt(undefined, 7), 7);
  assert.equal(parseOptionalInt('42', 7), 42);
  assert.equal(parseOptionalInt('nope', 7), 7);
});

test('parseOptionalDate normalizes valid dates and rejects invalid dates', () => {
  assert.equal(parseOptionalDate('2024-05-06'), '2024-05-06');
  assert.equal(parseOptionalDate(''), undefined);
  assert.equal(parseOptionalDate('not-a-date'), undefined);
});

test('normalizeSort allows known fields and defaults unsafe values', () => {
  assert.deepEqual(normalizeSort('Applicant', 'asc'), { safeField: 'Applicant', normalizedDirection: 'asc' });
  assert.deepEqual(normalizeSort('DROP TABLE', 'sideways'), { safeField: 'PermitDate', normalizedDirection: 'desc' });
});

test('applySorting returns a new array in both directions', () => {
  assert.deepEqual(applySorting(rows, 'PermitNumber', 'asc').map((row) => row.PermitNumber), ['A-1', 'B-2']);
  assert.deepEqual(applySorting(rows, 'PermitDate', 'desc').map((row) => row.PermitDate), ['2024-01-02', '2024-01-01']);
  assert.notEqual(applySorting(rows), rows);
});

test('getPermits binds filters, maps rows, and paginates results', async () => {
  const inputs = new Map();
  const poolFactory = async () => ({
    request() {
      return {
        input(name, _type, value) {
          inputs.set(name, value);
          return this;
        },
        async execute() {
          return { recordset: rows };
        },
      };
    },
  });

  const result = await getPermits({ systemId: '12', startDate: '2024-01-01', page: 99, pageSize: 20, sortField: 'PermitNumber', sortDirection: 'asc' }, poolFactory);
  assert.equal(inputs.get('systemId'), 12);
  assert.equal(inputs.get('startDate'), '2024-01-01');
  assert.equal(result.pagination.page, 1);
  assert.equal(result.pagination.total, 2);
  assert.deepEqual(result.data.map((row) => row.PermitNumber), ['A-1', 'B-2']);
});

test('submitPermit binds open-burn fields and returns procedure result sets', async () => {
  const inputs = new Map();
  let procedureName = '';
  const poolFactory = async () => ({
    request() {
      return {
        input(name, _type, value) {
          inputs.set(name, value);
        },
        async execute(name) {
          procedureName = name;
          return { recordsets: [[{ isEligible: 1, responseMessage: '' }], [{ permitNumber: 'BRN-1' }]] };
        },
      };
    },
  });

  const result = await submitPermit({
    permitType: 'open-burn',
    permitPeriod: 14,
    streetNumber: '1234',
    streetName: 'Main St',
    firstName: 'Ted',
    lastName: 'Corpus',
    phoneNumber: '123-123-1234',
    email: 'ted@example.com',
    requestedDate: '2026-08-25',
  }, poolFactory);

  assert.equal(procedureName, 'dbo.colsp_SubmitOpenBurnPermitApplication');
  assert.equal(inputs.get('permitPeriod'), 14);
  assert.equal(inputs.get('streetName'), 'Main St');
  assert.equal(result.permit?.permitNumber, 'BRN-1');
});

test('submitPermit binds campfire time fields and selects the campfire procedure', async () => {
  const inputs = new Map();
  let procedureName = '';
  const poolFactory = async () => ({
    request() {
      return {
        input(name, _type, value) {
          inputs.set(name, value);
        },
        async execute(name) {
          procedureName = name;
          return { recordsets: [[{ isEligible: 1 }], [{ permitNumber: 'BRN-2' }]] };
        },
      };
    },
  });

  await submitPermit({
    permitType: 'campfire',
    permitPeriod: 14,
    streetNumber: '1234',
    streetName: 'Main St',
    firstName: 'Ted',
    lastName: 'Corpus',
    phoneNumber: '123-123-1234',
    email: 'ted@example.com',
    requestedDate: '2026-08-25',
    permitStartTime: 21,
    permitEndTime: 22,
  }, poolFactory);

  assert.equal(procedureName, 'dbo.colsp_SubmitCampfirePermitApplication');
  assert.equal(inputs.get('permitStartTime'), 21);
  assert.equal(inputs.get('permitEndTime'), 22);
});
