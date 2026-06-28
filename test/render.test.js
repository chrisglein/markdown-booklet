'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { renderPages, renderSource, extractHtmlBody } = require('../src/render');

test('renders a markdown page to HTML', () => {
  const pages = renderSource({ type: 'page', meta: {}, content: '# Hello\n\nWorld.' });
  assert.equal(pages.length, 1);
  assert.match(pages[0].html, /<h1>Hello<\/h1>/);
  assert.match(pages[0].html, /World/);
});

test('expands a spread into two linked pages split on the marker', () => {
  const content = 'Left side.\n<!-- spread-break -->\nRight side.';
  const pages = renderSource({ type: 'spread', meta: {}, content });
  assert.equal(pages.length, 2);
  assert.equal(pages[0].spreadRole, 'left');
  assert.equal(pages[1].spreadRole, 'right');
  assert.equal(pages[0].spreadId, pages[1].spreadId);
  assert.match(pages[0].html, /Left side/);
  assert.match(pages[1].html, /Right side/);
});

test('throws when a spread lacks its break marker', () => {
  assert.throws(
    () => renderSource({ type: 'spread', meta: {}, content: 'no marker here' }),
    /spread-break/,
  );
});

test('blank source renders an empty, unnumbered page', () => {
  const pages = renderSource({ type: 'blank', meta: {}, content: '' });
  assert.equal(pages[0].type, 'blank');
  assert.equal(pages[0].html, '');
  assert.equal(pages[0].showPageNumber, false);
});

test('html source passes through the body only', () => {
  const html = '<html><body><p>Cover</p></body></html>';
  assert.equal(extractHtmlBody(html).trim(), '<p>Cover</p>');
  const pages = renderSource({ type: 'html', meta: {}, content: html });
  assert.match(pages[0].html, /<p>Cover<\/p>/);
});

test('showPageNumber: false is honored', () => {
  const pages = renderSource({ type: 'page', meta: { showPageNumber: false }, content: 'x' });
  assert.equal(pages[0].showPageNumber, false);
});

test('renderPages flattens an ordered source list', () => {
  const pages = renderPages([
    { type: 'page', meta: {}, content: 'one' },
    { type: 'spread', meta: {}, content: 'a\n<!-- spread-break -->\nb' },
  ]);
  assert.equal(pages.length, 3);
});
