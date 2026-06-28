'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { impose, imposeSignature } = require('../src/impose');

function logicalPages(count) {
  return Array.from({ length: count }, (_, i) => ({
    type: 'page',
    html: `p${i + 1}`,
    showPageNumber: true,
    number: i + 1,
    side: (i + 1) % 2 === 1 ? 'recto' : 'verso',
  }));
}

test('imposes the canonical 8-page booklet exactly', () => {
  const book = { title: 't', config: { signatureSize: 'all' }, pages: logicalPages(8), pageCount: 8 };
  const printable = impose(book);

  assert.equal(printable.sheets.length, 2);
  assert.equal(printable.pageCount, 8);

  const [s0, s1] = printable.sheets;
  assert.deepEqual(
    [s0.front.verso.number, s0.front.recto.number, s0.back.verso.number, s0.back.recto.number],
    [8, 1, 2, 7],
  );
  assert.deepEqual(
    [s1.front.verso.number, s1.front.recto.number, s1.back.verso.number, s1.back.recto.number],
    [6, 3, 4, 5],
  );
});

test('left slot is always verso (even), right slot always recto (odd)', () => {
  const book = { title: 't', config: { signatureSize: 'all' }, pages: logicalPages(12), pageCount: 12 };
  const printable = impose(book);
  for (const sheet of printable.sheets) {
    for (const side of [sheet.front, sheet.back]) {
      assert.equal(side.verso.number % 2, 0, 'verso must be even');
      assert.equal(side.recto.number % 2, 1, 'recto must be odd');
    }
  }
});

test('pads to a multiple of 4 with blank pages', () => {
  const book = { title: 't', config: { signatureSize: 'all' }, pages: logicalPages(6), pageCount: 6 };
  const printable = impose(book);
  assert.equal(printable.pageCount, 8);
  assert.equal(printable.sheets.length, 2);

  const allPages = printable.sheets.flatMap((s) => [
    s.front.verso, s.front.recto, s.back.verso, s.back.recto,
  ]);
  const blanks = allPages.filter((p) => p.type === 'blank');
  assert.equal(blanks.length, 2);
});

test('numeric signatureSize splits into multiple signatures', () => {
  const book = { title: 't', config: { signatureSize: 8 }, pages: logicalPages(16), pageCount: 16 };
  const printable = impose(book, book.config);
  // 16 pages / 8 per signature = 2 signatures x 2 sheets = 4 sheets.
  assert.equal(printable.sheets.length, 4);
  // Sheet indices are continuous across signatures.
  assert.deepEqual(printable.sheets.map((s) => s.index), [0, 1, 2, 3]);
});

test('imposeSignature rejects non-multiples of 4', () => {
  assert.throws(() => imposeSignature(logicalPages(6), 0), /divisible by 4/);
});
