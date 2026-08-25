import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildPermitQueryParams, formatDate, getPageNumbers, toggleSort } from '../src/App.tsx';

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
