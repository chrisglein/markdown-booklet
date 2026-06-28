'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { assemble } = require('../src/assemble');

const cfg = { signatureSize: 'all' };

test('assigns sequential page numbers and recto/verso sides', () => {
  const rendered = [
    { type: 'page', html: 'a', showPageNumber: true },
    { type: 'page', html: 'b', showPageNumber: true },
    { type: 'page', html: 'c', showPageNumber: true },
  ];
  const book = assemble(rendered, { title: 't', config: cfg });
  assert.deepEqual(book.pages.map((p) => p.number), [1, 2, 3]);
  assert.deepEqual(book.pages.map((p) => p.side), ['recto', 'verso', 'recto']);
});

test('inserts a blank to honor startOn: recto', () => {
  const rendered = [
    { type: 'page', html: 'a', showPageNumber: true }, // page 1 (recto)
    { type: 'page', html: 'b', showPageNumber: true, startOn: 'recto' },
  ];
  const book = assemble(rendered, { title: 't', config: cfg });
  // next would be 2 (verso); a blank is inserted so chapter starts on 3 (recto).
  assert.equal(book.pages.length, 3);
  assert.equal(book.pages[1].type, 'blank');
  assert.equal(book.pages[1].showPageNumber, false);
  assert.equal(book.pages[2].number, 3);
  assert.equal(book.pages[2].side, 'recto');
});

test('aligns a spread so left is verso and right is recto', () => {
  const rendered = [
    { type: 'page', html: 'intro', showPageNumber: true }, // page 1 recto
    { type: 'spread', html: 'L', showPageNumber: true, spreadId: 's1', spreadRole: 'left' },
    { type: 'spread', html: 'R', showPageNumber: true, spreadId: 's1', spreadRole: 'right' },
  ];
  const book = assemble(rendered, { title: 't', config: cfg });
  const left = book.pages.find((p) => p.spreadRole === 'left');
  const right = book.pages.find((p) => p.spreadRole === 'right');
  assert.equal(left.side, 'verso');
  assert.equal(right.side, 'recto');
  assert.equal(right.number, left.number + 1);
});

test('inserts a blank when a spread would otherwise start on a recto', () => {
  const rendered = [
    { type: 'spread', html: 'L', showPageNumber: true, spreadId: 's1', spreadRole: 'left' },
    { type: 'spread', html: 'R', showPageNumber: true, spreadId: 's1', spreadRole: 'right' },
  ];
  const book = assemble(rendered, { title: 't', config: cfg });
  assert.equal(book.pages[0].type, 'blank'); // bumped off page 1 (recto)
  assert.equal(book.pages[1].spreadRole, 'left');
  assert.equal(book.pages[1].side, 'verso');
});
