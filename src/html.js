'use strict';

const { sheetDimensions } = require('./config');

/** Escape text for safe inclusion in HTML. */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Content typography + structural CSS shared by both output modes. */
function baseStyles(config) {
  const margins = config.margins || {};
  const page = config.page || {};
  const pageNumber = config.pageNumber || {};
  return `
:root {
  --page-w: ${page.width};
  --page-h: ${page.height};
  --m-inner: ${margins.inner};
  --m-outer: ${margins.outer};
  --m-top: ${margins.top};
  --m-bottom: ${margins.bottom};
  --pn-size: ${pageNumber.fontSize || '9pt'};
}
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #f0f0f0; }
.page {
  position: relative;
  width: var(--page-w);
  height: var(--page-h);
  overflow: hidden;
  background: #fff;
}
.page-content {
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 1.4;
  color: #111;
}
.page.verso .page-content { padding: var(--m-top) var(--m-inner) var(--m-bottom) var(--m-outer); }
.page.recto .page-content { padding: var(--m-top) var(--m-outer) var(--m-bottom) var(--m-inner); }
.page-content :first-child { margin-top: 0; }
.page-content h1, .page-content h2, .page-content h3 {
  font-family: 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.2;
}
.page-content img { max-width: 100%; }
.page-number {
  position: absolute;
  bottom: calc(var(--m-bottom) / 2);
  font-size: var(--pn-size);
  color: #555;
}
.page.verso .page-number { left: var(--m-outer); }
.page.recto .page-number { right: var(--m-outer); }
.page.blank .page-content { visibility: hidden; }
${config.customCss || ''}
`;
}

/** Print CSS for booklet (imposed landscape sheets). */
function bookletStyles(config) {
  const sheet = sheetDimensions(config);
  return `${baseStyles(config)}
@page { size: ${sheet.width} ${sheet.height}; margin: 0; }
.sheet {
  display: flex;
  flex-direction: row;
  width: ${sheet.width};
  height: ${sheet.height};
  margin: 0 auto 0.25in;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  page-break-after: always;
  break-after: page;
}
.sheet:last-child { page-break-after: auto; break-after: auto; }
@media print {
  body { background: #fff; }
  .sheet { margin: 0; box-shadow: none; }
}
`;
}

/** Print CSS for reading-order proof (one logical page per printed page). */
function readingStyles(config) {
  const page = config.page || {};
  return `${baseStyles(config)}
@page { size: ${page.width} ${page.height}; margin: 0; }
.page {
  margin: 0 auto 0.25in;
  box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  page-break-after: always;
  break-after: page;
}
.page:last-child { page-break-after: auto; break-after: auto; }
@media print {
  body { background: #fff; }
  .page { margin: 0; box-shadow: none; }
}
`;
}

/** Render one page into a positioned div for the given facing side. */
function renderPageDiv(page, sideClass, config) {
  if (!page) {
    return `<div class="page ${sideClass} blank"><div class="page-content"></div></div>`;
  }
  const showNumber =
    page.showPageNumber !== false && (config.pageNumber ? config.pageNumber.show !== false : true);
  const number = showNumber ? `<span class="page-number">${page.number}</span>` : '';
  const blankClass = page.type === 'blank' ? ' blank' : '';
  return (
    `<div class="page ${sideClass}${blankClass}" data-page="${page.number}">` +
    `<div class="page-content">${page.html || ''}</div>${number}</div>`
  );
}

function documentShell(title, styles, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${styles}</style>
</head>
<body>
${body}
</body>
</html>
`;
}

/**
 * Render an imposed PrintableBook to a printable HTML string.
 * Sheets are emitted front-then-back so duplex printing pairs them correctly.
 */
function renderPrintableHtml(printableBook) {
  const { config } = printableBook;
  const sheetsHtml = printableBook.sheets
    .flatMap((sheet) => [
      `<div class="sheet" data-sheet="${sheet.index}" data-side="front">` +
        renderPageDiv(sheet.front.verso, 'verso', config) +
        renderPageDiv(sheet.front.recto, 'recto', config) +
        `</div>`,
      `<div class="sheet" data-sheet="${sheet.index}" data-side="back">` +
        renderPageDiv(sheet.back.verso, 'verso', config) +
        renderPageDiv(sheet.back.recto, 'recto', config) +
        `</div>`,
    ])
    .join('\n');
  return documentShell(printableBook.title, bookletStyles(config), sheetsHtml);
}

/**
 * Render a LogicalBook to a reading-order proof HTML string (not imposed).
 */
function renderReadingHtml(logicalBook) {
  const { config } = logicalBook;
  const pagesHtml = logicalBook.pages
    .map((page) => renderPageDiv(page, page.side, config))
    .join('\n');
  return documentShell(logicalBook.title, readingStyles(config), pagesHtml);
}

module.exports = {
  renderPrintableHtml,
  renderReadingHtml,
  escapeHtml,
  bookletStyles,
  readingStyles,
};
