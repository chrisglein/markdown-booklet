'use strict';

const { loadBook } = require('./source');
const { renderPages } = require('./render');
const { assemble } = require('./assemble');
const { impose } = require('./impose');
const { renderPrintableHtml, renderReadingHtml, renderSingleHtml } = require('./html');
const config = require('./config');
const types = require('./types');

/**
 * Run the full pipeline for a loaded book and return every intermediate stage.
 *
 * @param {{ title:string, config:Object, sources:Array }} book
 * @returns {{ rendered:Array, logical:Object, printable:Object }}
 */
function buildPipeline(book) {
  const rendered = renderPages(book.sources);
  const logical = assemble(rendered, { title: book.title, config: book.config });
  const printable = impose(logical, book.config);
  return { rendered, logical, printable };
}

/**
 * Load a book.yaml manifest and produce HTML in the requested mode.
 *
 *   - 'booklet' (default): booklet-imposed landscape sheets for book-fold print.
 *   - 'reading': one logical page per printed page (a print proof).
 *   - 'single': a continuous, reflowable single-page document for phones/e-readers.
 *
 * @param {string} manifestPath
 * @param {{ mode?: 'booklet'|'reading'|'single' }} [options]
 * @returns {{ html:string, logical:Object, printable:Object }}
 */
function buildBookFromManifest(manifestPath, { mode = 'booklet' } = {}) {
  const book = loadBook(manifestPath);
  const { logical, printable } = buildPipeline(book);
  let html;
  if (mode === 'reading') {
    html = renderReadingHtml(logical);
  } else if (mode === 'single') {
    html = renderSingleHtml(logical);
  } else {
    html = renderPrintableHtml(printable);
  }
  return { html, logical, printable };
}

module.exports = {
  // High-level
  loadBook,
  buildPipeline,
  buildBookFromManifest,
  // Stages
  renderPages,
  assemble,
  impose,
  renderPrintableHtml,
  renderReadingHtml,
  renderSingleHtml,
  // Utilities
  config,
  types,
};
