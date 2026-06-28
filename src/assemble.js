'use strict';

const { PageType, Side } = require('./types');

/** Recto = odd page number, Verso = even. */
function sideForNumber(number) {
  return number % 2 === 1 ? Side.RECTO : Side.VERSO;
}

/**
 * Determine the required starting parity for a rendered page, if any.
 *   - explicit `startOn: recto|verso`
 *   - the left half of a spread must land on a verso (even) page so the two
 *     halves form a true facing pair (verso n, recto n+1).
 * @returns {'odd'|'even'|null}
 */
function requiredParity(page) {
  if (page.startOn === Side.RECTO) return 'odd';
  if (page.startOn === Side.VERSO) return 'even';
  if (page.spreadRole === 'left') return 'even';
  return null;
}

function parityOf(number) {
  return number % 2 === 1 ? 'odd' : 'even';
}

function makeBlankLogical(number) {
  return {
    type: PageType.BLANK,
    html: '',
    showPageNumber: false,
    number,
    side: sideForNumber(number),
  };
}

/**
 * Phase 2a: assemble rendered pages into a page-numbered logical book.
 * Inserts blank pages where alignment constraints (startOn / spreads) demand.
 *
 * @param {import('./types').RenderedPage[]} renderedPages
 * @param {{ title?:string, config:Object }} options
 * @returns {import('./types').LogicalBook}
 */
function assemble(renderedPages, { title = 'Untitled', config } = {}) {
  const pages = [];
  let next = 1;

  for (const rendered of renderedPages) {
    const needed = requiredParity(rendered);
    if (needed && parityOf(next) !== needed) {
      pages.push(makeBlankLogical(next));
      next += 1;
    }
    pages.push({
      ...rendered,
      number: next,
      side: sideForNumber(next),
    });
    next += 1;
  }

  validateSpreads(pages);

  return { title, config, pages, pageCount: pages.length };
}

/** Ensure each spread's halves are consecutive and correctly verso/recto. */
function validateSpreads(pages) {
  const byId = new Map();
  pages.forEach((p) => {
    if (!p.spreadId) return;
    if (!byId.has(p.spreadId)) byId.set(p.spreadId, {});
    byId.get(p.spreadId)[p.spreadRole] = p;
  });
  for (const [id, halves] of byId) {
    const { left, right } = halves;
    if (!left || !right) {
      throw new Error(`Spread ${id} is missing a half.`);
    }
    if (right.number !== left.number + 1) {
      throw new Error(
        `Spread ${id} halves are not consecutive (left ${left.number}, right ${right.number}).`,
      );
    }
    if (left.side !== Side.VERSO || right.side !== Side.RECTO) {
      throw new Error(
        `Spread ${id} is misaligned (left must be verso, right must be recto).`,
      );
    }
  }
}

module.exports = {
  assemble,
  sideForNumber,
  requiredParity,
  parityOf,
  makeBlankLogical,
};
