'use strict';

const { SheetSide } = require('./types');
const { makeBlankLogical } = require('./assemble');

/**
 * Impose a single signature (a flat list of pages whose length is a multiple
 * of 4) into physical sheets. Standard saddle-stitch order: outermost pair
 * first, working inward.
 *
 *   8 pages -> Sheet 0 front: 8|1  back: 2|7
 *              Sheet 1 front: 6|3  back: 4|5
 *
 * Left slot is always verso (even page), right slot always recto (odd page).
 */
function imposeSignature(pages, startSheetIndex) {
  const total = pages.length;
  if (total % 4 !== 0) {
    throw new Error('imposeSignature requires a page count divisible by 4.');
  }
  const sheets = [];
  for (let k = 0; k < total / 4; k += 1) {
    const at = (pos) => pages[pos - 1]; // 1-based position within signature
    sheets.push({
      index: startSheetIndex + k,
      front: {
        side: SheetSide.FRONT,
        verso: at(total - 2 * k),
        recto: at(1 + 2 * k),
      },
      back: {
        side: SheetSide.BACK,
        verso: at(2 + 2 * k),
        recto: at(total - 1 - 2 * k),
      },
    });
  }
  return sheets;
}

/**
 * Phase 2b: impose a logical book into a printable book of physical sheets.
 * Pads with blank pages so each signature is a multiple of 4.
 *
 * @param {import('./types').LogicalBook} logicalBook
 * @param {Object} [config] Defaults to logicalBook.config.
 * @returns {import('./types').PrintableBook}
 */
function impose(logicalBook, config = logicalBook.config || {}) {
  const signatureSize = config.signatureSize == null ? 'all' : config.signatureSize;
  const pages = [...logicalBook.pages];

  // Padding blanks continue the global numbering (they never display a number).
  let nextNumber = pages.length + 1;
  const addBlank = () => makeBlankLogical(nextNumber++);

  let signatures;
  if (signatureSize === 'all') {
    while (pages.length % 4 !== 0) pages.push(addBlank());
    signatures = [pages];
  } else {
    const size = Number(signatureSize);
    if (!Number.isFinite(size) || size % 4 !== 0) {
      throw new Error('signatureSize must be "all" or a multiple of 4.');
    }
    signatures = [];
    for (let i = 0; i < pages.length; i += size) {
      const chunk = pages.slice(i, i + size);
      while (chunk.length % 4 !== 0) chunk.push(addBlank());
      signatures.push(chunk);
    }
  }

  const sheets = [];
  let sheetIndex = 0;
  for (const signature of signatures) {
    for (const sheet of imposeSignature(signature, sheetIndex)) {
      sheets.push(sheet);
      sheetIndex += 1;
    }
  }

  const pageCount = signatures.reduce((sum, s) => sum + s.length, 0);
  return {
    title: logicalBook.title,
    config: logicalBook.config,
    sheets,
    pageCount,
  };
}

module.exports = { impose, imposeSignature };
