'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadBook } = require('../src/source');

const MANIFEST = path.join(__dirname, '..', 'examples', 'sample-book', 'book.yaml');

test('loads the sample manifest with merged config', () => {
  const book = loadBook(MANIFEST);
  assert.equal(book.title, 'A Booklet About Booklets');
  assert.equal(book.config.page.width, '5.5in');
  assert.equal(book.config.margins.inner, '0.75in');
  // Default merged in even though manifest did not set it.
  assert.equal(book.config.pageNumber.show, true);
});

test('resolves source types from extension, frontmatter, and overrides', () => {
  const book = loadBook(MANIFEST);
  assert.equal(book.sources.length, 7);
  assert.equal(book.sources[0].type, 'html'); // cover.html
  assert.equal(book.sources[1].type, 'page'); // title.md
  assert.equal(book.sources[5].type, 'spread'); // world-map.md via manifest override
  assert.equal(book.sources[0].meta.showPageNumber, false);
});
