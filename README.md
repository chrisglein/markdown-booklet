# markdown-booklet

Render explicitly-paginated Markdown and HTML pages into a **booklet-imposed printable HTML** document for book-fold (saddle-stitch) printing.

This is deliberately **not** a document layout engine. There is no automatic pagination, no widow/orphan control, no content reflow. You decide where every page begins; the tool handles page numbering, blank padding, and the arithmetic of the fold.

## Install

```sh
npm install
```

Dependencies are [`markdown-it`](https://github.com/markdown-it/markdown-it) (Markdown → HTML) and [`js-yaml`](https://github.com/nodeca/js-yaml) (manifest + frontmatter).

## Quick start

```sh
# Booklet-imposed printable HTML (landscape sheets, two pages per side)
node src/cli.js build examples/sample-book/book.yaml --out dist/sample.html

# Reading-order proof (one logical page per printed page, no imposition)
node src/cli.js build examples/sample-book/book.yaml --reading --out dist/proof.html
```

Open the HTML in a Chromium-based browser and use **Print** (or **Save as PDF**). See [Printing](#printing) below.

## The pipeline

Each stage is isolated and independently testable:

```text
SourceDocument[]  ──render──▶  RenderedPage[]
RenderedPage[]    ──assemble─▶  LogicalBook
LogicalBook       ──impose──▶  PrintableBook (ImposedSheet[])
PrintableBook     ──html────▶  printable HTML
```

| Stage | Module | Responsibility |
|---|---|---|
| Source | [src/source.js](src/source.js) | Read `book.yaml` + sources, parse frontmatter, infer types |
| Render (Phase 1) | [src/render.js](src/render.js) | Markdown → HTML, expand spreads, blanks, raw HTML |
| Assemble (Phase 2a) | [src/assemble.js](src/assemble.js) | Order, number pages, insert alignment blanks, validate spreads |
| Impose (Phase 2b) | [src/impose.js](src/impose.js) | Pad to multiples of 4, build signatures and sheets |
| HTML | [src/html.js](src/html.js) | Emit printable HTML with `@page` print CSS |

## Authoring a book

A book is a `book.yaml` manifest plus the source files it references.

```yaml
title: "A Booklet About Booklets"

config:
  page: { width: 5.5in, height: 8.5in }
  margins: { inner: 0.75in, outer: 0.5in, top: 0.6in, bottom: 0.6in }
  signatureSize: all
  stylesheet: book.css   # optional: appended after built-in styles

pages:
  - { file: cover.html, showPageNumber: false }
  - { file: title.md, showPageNumber: false }
  - { file: chapter-1.md, startOn: recto }
  - { file: world-map.md, type: spread }
  - blank
```

A `pages` entry is either a **string** (a filename, or the literal `blank`) or an **object** with a `file` plus overrides. Precedence for any field is: **manifest entry > file frontmatter > extension default**.

### Content types

| Type | Source | Produces |
|---|---|---|
| `page` | Markdown (default for `.md`) | 1 logical page |
| `spread` | Markdown with a `<!-- spread-break -->` marker | 2 linked pages (verso + recto) |
| `html` | Raw HTML (default for `.html`) | 1 logical page (body extracted) |
| `blank` | none | 1 intentionally blank page |

Markdown files use standard `---` YAML frontmatter. HTML files may use a leading `<!-- ... -->` comment as YAML frontmatter.

### Page metadata

| Key | Effect |
|---|---|
| `type` | Override the content type |
| `showPageNumber: false` | Suppress the printed page number (covers, title pages) |
| `startOn: recto` | Begin on a right-hand (odd) page; a blank is inserted if needed |

### Spreads

A spread is one source file producing two facing pages. Separate the left and right halves with a `<!-- spread-break -->` marker. The assembler guarantees the left half lands on a **verso** (even) page and the right on a **recto** (odd) page, inserting a blank beforehand if necessary.

Note: only the *centermost* facing pair shares a physical sheet. A picture meant to span the gutter should be placed at the center of the signature.

### Custom styles

Set `config.stylesheet` to a path (relative to `book.yaml`) and its CSS is inlined into the output `<head>` after the built-in styles, so it can override typography and layout. Because the CSS is inlined, any `url()` references (fonts, images) resolve relative to the **output HTML file**, not the stylesheet — build into the book's own folder so sibling `fonts/` and `img/` paths resolve.

## Imposition

For eight logical pages, a single signature imposes onto two sheets:

| Sheet | Front | Back |
|------:|:-----:|:----:|
| 1 | 8 · 1 | 2 · 7 |
| 2 | 6 · 3 | 4 · 5 |

The left slot of every sheet side is a verso (even page); the right slot is a recto (odd page). Page counts that are not a multiple of 4 are padded with blank pages. `signatureSize: all` uses one signature for the whole book; a numeric value (a multiple of 4) splits the book into fixed-size signatures.

## Printing

1. Open the booklet HTML in a Chromium-based browser.
2. Print with these settings:
   - **Paper:** Letter (the sheet CSS is landscape `11in × 8.5in` for the default half-letter page).
   - **Margins:** None / Default (margins are baked into the layout).
   - **Two-sided:** On — **flip on long edge**.
   - **Scale:** 100% (do not "fit to page").
3. Fold the printed stack in half and staple along the spine.

To export a PDF, use the browser's **Save as PDF** destination with the same settings.

## Programmatic API

```js
const { buildBookFromManifest } = require('./src');

const { html, logical, printable } = buildBookFromManifest('examples/sample-book/book.yaml', {
  mode: 'booklet', // or 'reading'
});
```

Individual stages (`renderPages`, `assemble`, `impose`, `renderPrintableHtml`) are also exported for composition and testing.

## Tests

```sh
npm test
```

Uses the built-in Node test runner (`node --test`). Coverage includes the canonical imposition example, blank insertion for `startOn`/spreads, page numbering, rendering, manifest loading, and HTML output.

## Non-goals

Automatic pagination, footnotes, table splitting, widow/orphan control, flowing content across pages, creep compensation, and professional press imposition are all explicitly out of scope. The author is assumed to have already made every page-layout decision.
