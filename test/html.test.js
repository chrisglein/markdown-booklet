'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { loadBook } = require('../src/source');
const { buildPipeline } = require('../src/index');
const {
  renderPrintableHtml,
  renderReadingHtml,
  renderSingleHtml,
  bookletStyles,
  singleStyles,
} = require('../src/html');
const MANIFEST = path.join(__dirname, '..', 'examples', 'sample-book', 'book.yaml');

test('booklet HTML uses a landscape sheet sized at two pages wide', () => {
  const book = loadBook(MANIFEST);
  const { printable } = buildPipeline(book);
  const html = renderPrintableHtml(printable);

  assert.match(html, /@page \{ size: 11in 8\.5in/); // 5.5in * 2 = 11in
  assert.match(html, /class="sheet"/);
  assert.match(html, /data-side="front"/);
  assert.match(html, /data-side="back"/);
  assert.match(html, /<title>A Booklet About Booklets<\/title>/);
});

test('every sheet renders exactly two pages per side', () => {
  const book = loadBook(MANIFEST);
  const { printable } = buildPipeline(book);
  const html = renderPrintableHtml(printable);
  const sheetSides = (html.match(/class="sheet"/g) || []).length;
  // front + back per physical sheet.
  assert.equal(sheetSides, printable.sheets.length * 2);
});

test('reading HTML uses a portrait page and emits every logical page', () => {
  const book = loadBook(MANIFEST);
  const { logical } = buildPipeline(book);
  const html = renderReadingHtml(logical);

  assert.match(html, /@page \{ size: 5\.5in 8\.5in/);
  const pageDivs = (html.match(/class="page /g) || []).length;
  assert.equal(pageDivs, logical.pages.length);
});

test('the spread halves remain a consecutive verso/recto pair', () => {
  const book = loadBook(MANIFEST);
  const { logical } = buildPipeline(book);
  const left = logical.pages.find((p) => p.spreadRole === 'left');
  const right = logical.pages.find((p) => p.spreadRole === 'right');
  assert.ok(left && right);
  assert.equal(left.side, 'verso');
  assert.equal(right.side, 'recto');
  assert.equal(right.number, left.number + 1);
});

test('a custom stylesheet is appended after the built-in styles', () => {
  const config = {
    page: { width: '5.5in', height: '8.5in' },
    margins: { inner: '0.75in', outer: '0.5in', top: '0.6in', bottom: '0.6in' },
    pageNumber: { show: true, fontSize: '9pt' },
    customCss: '.song-title { font-family: "Primitive"; }',
  };
  const css = bookletStyles(config);
  assert.match(css, /\.song-title \{ font-family: "Primitive"; \}/);
  // Appears after the base rules it can override.
  assert.ok(css.indexOf('.page.blank') < css.indexOf('.song-title'));
});

test('single HTML is a reflowable document with no imposition', () => {
  const book = loadBook(MANIFEST);
  const { logical } = buildPipeline(book);
  const html = renderSingleHtml(logical);

  // No imposed landscape sheets.
  assert.doesNotMatch(html, /class="sheet"/);
  assert.doesNotMatch(html, /@page \{ size: 11in/);
  // A single, centered reflow column holds every section.
  assert.match(html, /<main class="book">/);
  assert.match(html, /<title>A Booklet About Booklets<\/title>/);
});

test('single HTML emits one section per non-blank page, merging spreads', () => {
  const book = loadBook(MANIFEST);
  const { logical } = buildPipeline(book);
  const html = renderSingleHtml(logical);

  // Expected sections: non-blank pages, with spread halves collapsed to one.
  const visible = logical.pages.filter((p) => p.type !== 'blank');
  const spreadIds = new Set();
  let expected = 0;
  for (const page of visible) {
    if (page.spreadId) {
      if (spreadIds.has(page.spreadId)) continue;
      spreadIds.add(page.spreadId);
    }
    expected += 1;
  }
  assert.ok(spreadIds.size > 0, 'sample book should contain a spread');

  const sections = (html.match(/class="page single"/g) || []).length;
  assert.equal(sections, expected);
});

test('single HTML drops blank pages and page numbers', () => {
  const book = loadBook(MANIFEST);
  const { logical } = buildPipeline(book);
  const html = renderSingleHtml(logical);

  // The sample inserts alignment blanks that must not surface in the ebook.
  assert.ok(logical.pages.some((p) => p.type === 'blank'));
  assert.doesNotMatch(html, /class="page-number"/);
  assert.doesNotMatch(html, /class="[^"]*\bblank\b[^"]*"/);
});

test('single mode appends a custom stylesheet after the built-in styles', () => {
  const config = {
    page: { width: '5.5in', height: '8.5in' },
    margins: { inner: '0.75in', outer: '0.5in', top: '0.6in', bottom: '0.6in' },
    pageNumber: { show: true, fontSize: '9pt' },
    customCss: '.song-title { font-family: "Primitive"; }',
  };
  const css = singleStyles(config);
  assert.match(css, /\.song-title \{ font-family: "Primitive"; \}/);
  // Appears after the base content rules it can override.
  assert.ok(css.indexOf('.page-content') < css.indexOf('.song-title'));
});
