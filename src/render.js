'use strict';

const MarkdownIt = require('markdown-it');

const { PageType, SPREAD_BREAK } = require('./types');
const song = require('./song');

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

/** Extract the inner body of an HTML document, or return it unchanged. */
function extractHtmlBody(html) {
  const match = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  return match ? match[1] : html;
}

/** Render markdown text to HTML. */
function renderMarkdown(text) {
  return md.render(text || '');
}

let spreadCounter = 0;

/**
 * Convert one SourceDocument into one or more RenderedPages.
 * Spreads expand into exactly two linked pages.
 */
function renderSource(source) {
  const meta = source.meta || {};
  const showPageNumber = meta.showPageNumber !== false;
  const startOn = meta.startOn;

  switch (source.type) {
    case PageType.BLANK:
      return [
        {
          type: PageType.BLANK,
          html: '',
          showPageNumber: false,
        },
      ];

    case PageType.HTML:
      return [
        {
          type: PageType.HTML,
          html: extractHtmlBody(source.content || ''),
          showPageNumber,
          startOn,
        },
      ];

    case PageType.SPREAD: {
      const id = `spread-${++spreadCounter}`;
      const parts = (source.content || '').split(SPREAD_BREAK);
      if (parts.length < 2) {
        throw new Error(
          `Spread "${source.file || meta.title || id}" must contain a ` +
            `"${SPREAD_BREAK}" marker separating its left and right pages.`,
        );
      }
      const [left, right] = [parts[0], parts.slice(1).join(SPREAD_BREAK)];
      return [
        {
          type: PageType.SPREAD,
          html: renderMarkdown(left),
          showPageNumber,
          spreadId: id,
          spreadRole: 'left',
        },
        {
          type: PageType.SPREAD,
          html: renderMarkdown(right),
          showPageNumber,
          spreadId: id,
          spreadRole: 'right',
        },
      ];
    }

    case PageType.SONG: {
      const id = `song-${++spreadCounter}`;
      const parts = song.splitPages(source.content || '');
      if (meta.spread === false) {
        // Single-page song: flows like a normal page (no forced spread).
        return [
          {
            type: PageType.SONG,
            html: song.parsePage(parts.join('\n---\n')),
            showPageNumber,
            startOn,
          },
        ];
      }
      if (parts.length < 2) {
        throw new Error(
          `Song "${source.file || meta.title || id}" must contain a "---" ` +
            `page break separating its two facing pages.`,
        );
      }
      return [
        {
          type: PageType.SONG,
          html: song.parsePage(parts[0]),
          showPageNumber,
          spreadId: id,
          spreadRole: 'left',
        },
        {
          type: PageType.SONG,
          html: song.parsePage(parts.slice(1).join('\n---\n')),
          showPageNumber,
          spreadId: id,
          spreadRole: 'right',
        },
      ];
    }

    case PageType.PAGE:
    default:
      return [
        {
          type: PageType.PAGE,
          html: renderMarkdown(source.content || ''),
          showPageNumber,
          startOn,
        },
      ];
  }
}

/**
 * Phase 1: render an ordered list of SourceDocuments into RenderedPages.
 * @param {import('./types').SourceDocument[]} sources
 * @returns {import('./types').RenderedPage[]}
 */
function renderPages(sources) {
  spreadCounter = 0;
  return sources.flatMap(renderSource);
}

module.exports = { renderPages, renderSource, renderMarkdown, extractHtmlBody };
