# markdown-booklet

Render explicitly-paginated Markdown and HTML into a **booklet-imposed printable HTML** document for book-fold (saddle-stitch) printing.

This is **not** a layout engine: there is no auto-pagination, reflow, or widow/orphan control. You decide where every page begins; the tool handles imposition, page numbering, and blank padding. A **single-page mode** emits the same source as one continuous, reflowable document, so one set of files yields both a printed booklet and a digital ebook.

## Install

```sh
npm install
```

Dependencies: [`markdown-it`](https://github.com/markdown-it/markdown-it) (Markdown → HTML) and [`js-yaml`](https://github.com/nodeca/js-yaml) (manifest + frontmatter).

## Quick start

```sh
# Booklet-imposed printable HTML (landscape sheets, two pages per side)
node src/cli.js build examples/sample-book/book.yaml --out dist/sample.html

# Reading-order proof (one logical page per printed page, no imposition)
node src/cli.js build examples/sample-book/book.yaml --reading --out dist/proof.html

# Single-page ebook (one continuous, reflowable document)
node src/cli.js build examples/sample-book/book.yaml --single --out dist/ebook.html
```

Open the output in a Chromium-based browser and **Print** (or **Save as PDF**) — see [Printing](#printing).

## Authoring a book

A book is a `book.yaml` manifest plus the source files it references.

```yaml
title: "A Booklet About Booklets"

config:
  page: { width: 5.5in, height: 8.5in }
  margins: { inner: 0.75in, outer: 0.5in, top: 0.6in, bottom: 0.6in }
  signatureSize: all      # or a multiple of 4 to split into fixed signatures
  stylesheet: book.css    # optional: inlined after the built-in styles

pages:
  - { file: cover.html, showPageNumber: false }
  - { file: title.md, showPageNumber: false }
  - { file: chapter-1.md, startOn: recto }
  - { file: world-map.md, type: spread }
  - blank
```

Each `pages` entry is a **string** (a filename or the literal `blank`) or an **object** with a `file` plus overrides. Field precedence: **manifest entry > file frontmatter > extension default**.

### Content types

| Type | Source | Produces |
|---|---|---|
| `page` | Markdown (default for `.md`) | 1 logical page |
| `spread` | Markdown with a `<!-- spread-break -->` marker | 2 linked pages (verso + recto) |
| `song` | Song text with a `---` page break | 2 linked pages (verso + recto) |
| `html` | Raw HTML (default for `.html`) | 1 logical page (body extracted) |
| `blank` | none | 1 intentionally blank page |

Markdown uses standard `---` YAML frontmatter; HTML may use a leading `<!-- ... -->` comment as frontmatter.

### Page metadata

| Key | Effect |
|---|---|
| `type` | Override the content type |
| `showPageNumber: false` | Suppress the page number (covers, title pages) |
| `startOn: recto` | Begin on a right-hand (odd) page; inserts a blank if needed |

A **spread** is one file producing two facing pages, split by `<!-- spread-break -->`; the assembler lands the left half on a verso (even) page and the right on a recto (odd). Only the *centermost* facing pair shares a physical sheet, so gutter-spanning art belongs at the center of the signature.

The **song** type compiles a readable text format into a two-page spread styled by your stylesheet:

```
# Title              -> <h1 class="song-title">
*credit*             -> <p class="song-credit">
{chorus}             -> dashed chorus box (until a blank line)
[C]over [F]words     -> chords float above lyrics
plain lines          -> a <div class="verse"> of <p>
> response line      -> indented italic refrain
[Chorus]             -> a chorus repeat cue
---                  -> page break (left | right)
```

## Printing

1. Open the booklet HTML in a Chromium-based browser (Chrome).
2. Print with these settings:
   - **Paper:** Letter, **landscape** (the default half-letter page images onto landscape `11in × 8.5in` sheets).
   - **Margins:** None (margins are baked into the layout).
   - **Scale:** Actual Size — 100% (do not "fit to page").
   - **Two-sided:** Print on both sides — **flip on short edge**.
3. Fold the printed stack in half and staple along the spine.

To export a PDF, use the browser's **Save as PDF** destination with the same settings.

## Single-page (ebook) mode

`--single` produces a digital companion from the same `book.yaml`: one continuous, reflowable document instead of imposed sheets. It ignores the fold — content flows top to bottom in reading order inside a narrow, centered column that adapts to the screen. Blank padding is dropped, spreads and songs merge into single sections, and page numbers are omitted (meaningless once text reflows). Your `config.stylesheet` is still inlined, so song markup renders with your typography.

## Programmatic API

```js
const { buildBookFromManifest } = require('./src');

const { html, logical, printable } = buildBookFromManifest('examples/sample-book/book.yaml', {
  mode: 'booklet', // 'booklet' | 'reading' | 'single'
});
```

The individual stages — `renderPages`, `assemble`, `impose`, `renderPrintableHtml`, `renderReadingHtml`, `renderSingleHtml` — are also exported.

## Tests

```sh
npm test
```

Runs the built-in Node test runner (`node --test`) over imposition, blank insertion, page numbering, rendering, manifest loading, and HTML output for all three modes.

## Non-goals

Auto-pagination, footnotes, table splitting, widow/orphan control, content reflow across pages, creep compensation, and professional press imposition are out of scope. The author is assumed to have already made every page-layout decision.
