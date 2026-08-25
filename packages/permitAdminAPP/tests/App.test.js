import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPermitApplication, buildPermitQueryParams, formatDate, getPageNumbers, toggleSort } from '../src/App.tsx';

test('formatDate handles empty, invalid, and valid dates', () => {
  assert.equal(formatDate(null), '—');
  assert.equal(formatDate('not-a-date'), 'not-a-date');
  assert.equal(formatDate('2024-01-02'), new Date('2024-01-02').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }));
});

test('buildPermitQueryParams serializes the current table state', () => {
  assert.equal(buildPermitQueryParams(2, 50, 'Applicant', 'asc').toString(), 'page=2&pageSize=50&sortField=Applicant&sortDirection=asc');
});

test('getPageNumbers handles empty and multi-page results', () => {
  assert.deepEqual(getPageNumbers(0), []);
  assert.deepEqual(getPageNumbers(3), [1, 2, 3]);
});

test('toggleSort flips the current column and resets a new column to ascending', () => {
  assert.deepEqual(toggleSort('Applicant', 'asc', 'Applicant'), { field: 'Applicant', direction: 'desc' });
  assert.deepEqual(toggleSort('Applicant', 'desc', 'PermitDate'), { field: 'PermitDate', direction: 'asc' });
});

test('buildPermitApplication creates the open-burn request payload', () => {
  assert.deepEqual(buildPermitApplication({
    permitType: 'open-burn',
    permitPeriod: '14',
    streetNumber: ' 1234 ',
    streetName: ' Main St ',
    firstName: ' Ted ',
    lastName: ' Corpus ',
    phoneNumber: '123-123-1234',
    email: 'ted@example.com',
    requestedDate: '2026-08-25',
    permitStartTime: '21',
    permitEndTime: '22',
  }), {
    permitType: 'open-burn',
    permitPeriod: 14,
    streetNumber: '1234',
    streetName: 'Main St',
    firstName: 'Ted',
    lastName: 'Corpus',
    phoneNumber: '123-123-1234',
    email: 'ted@example.com',
    requestedDate: '2026-08-25',
  });
});

test('buildPermitApplication includes times for campfire applications', () => {
  const application = buildPermitApplication({
    permitType: 'campfire',
    permitPeriod: '14',
    streetNumber: '1234',
    streetName: 'Main St',
    firstName: 'Ted',
    lastName: 'Corpus',
    phoneNumber: '123-123-1234',
    email: 'ted@example.com',
    requestedDate: '2026-08-25',
    permitStartTime: '21',
    permitEndTime: '22',
  });

  assert.equal(application.permitStartTime, 21);
  assert.equal(application.permitEndTime, 22);
});
