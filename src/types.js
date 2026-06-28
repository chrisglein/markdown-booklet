'use strict';

/**
 * Shared constants and type documentation for the booklet pipeline.
 *
 * Pipeline (each stage is isolated and independently testable):
 *
 *   SourceDocument[]  --render-->  RenderedPage[]
 *   RenderedPage[]    --assemble--> LogicalBook
 *   LogicalBook       --impose-->   PrintableBook (ImposedSheet[])
 *   PrintableBook     --html-->     printable HTML string
 */

/** Logical content types declared by a source. */
const PageType = Object.freeze({
  PAGE: 'page',
  SPREAD: 'spread',
  HTML: 'html',
  BLANK: 'blank',
});

/** Book-facing side. Recto = right-hand (odd). Verso = left-hand (even). */
const Side = Object.freeze({
  RECTO: 'recto',
  VERSO: 'verso',
});

/** Physical sheet side. */
const SheetSide = Object.freeze({
  FRONT: 'front',
  BACK: 'back',
});

/** Marker used to split a spread source into its left and right pages. */
const SPREAD_BREAK = '<!-- spread-break -->';

/**
 * @typedef {Object} SourceDocument
 * @property {string} type      One of PageType.
 * @property {Object} meta       Parsed metadata (frontmatter + manifest overrides).
 * @property {string} [content]  Raw source body (markdown or html).
 * @property {string} [file]     Absolute path the source was read from.
 *
 * @typedef {Object} RenderedPage
 * @property {string} type            One of PageType (BLANK for padding/explicit blanks).
 * @property {string} html            Rendered inner HTML for the page body ('' for blank).
 * @property {boolean} showPageNumber Whether to print a page number.
 * @property {string} [startOn]       'recto' | 'verso' alignment constraint.
 * @property {string} [spreadId]      Links the two halves of a spread.
 * @property {string} [spreadRole]    'left' | 'right' within a spread.
 *
 * @typedef {RenderedPage & { number:number, side:string }} LogicalPage
 *
 * @typedef {Object} LogicalBook
 * @property {string} title
 * @property {Object} config
 * @property {LogicalPage[]} pages   Ordered, page-numbered, blanks inserted.
 * @property {number} pageCount
 *
 * @typedef {Object} ImposedSheetSide
 * @property {string} side            One of SheetSide.
 * @property {?LogicalPage} verso     Left page on the physical sheet (or null).
 * @property {?LogicalPage} recto     Right page on the physical sheet (or null).
 *
 * @typedef {Object} ImposedSheet
 * @property {number} index
 * @property {ImposedSheetSide} front
 * @property {ImposedSheetSide} back
 *
 * @typedef {Object} PrintableBook
 * @property {string} title
 * @property {Object} config
 * @property {ImposedSheet[]} sheets
 * @property {number} pageCount       Page count after blank padding.
 */

module.exports = { PageType, Side, SheetSide, SPREAD_BREAK };
