'use strict';

/**
 * Lightweight song format. Lets song pages be authored as readable text
 * instead of HTML; compiles to the markup the songbook stylesheet expects.
 *
 *   # Title            -> <h1 class="song-title">
 *   *credit*           -> <p class="song-credit">
 *   {chorus} ... blank -> <div class="chorus"><div class="label">Chorus</div>…
 *   [Chorus]           -> <div class="cue">Chorus</div>
 *   > line             -> refrain (indented italic); inside chorus: chorded cl
 *   [C]word            -> chord floats above word
 *   ---                -> page break (splits a song into its two-page spread)
 *
 * Plain consecutive lines become a <div class="verse"> of <p> lines.
 */

const PAGE_BREAK = /\r?\n-{3,}\r?\n/;

function esc(text) {
  return text
    .replace(/&(?![a-zA-Z#0-9]+;)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Convert inline [C] markers into chord-over-lyric segments. */
function chordHtml(text) {
  if (!text.includes('[')) return esc(text);
  const tokens = text.split(/(\[[^\]]+\])/);
  let html = '';
  let chord = null;
  let buffer = '';
  const flush = () => {
    if (chord === null) {
      if (buffer) html += `<span class="seg">${esc(buffer)}</span>`;
    } else {
      html += `<span class="seg"><span class="chd">${esc(chord)}</span>${esc(buffer)}</span>`;
    }
    buffer = '';
  };
  for (const token of tokens) {
    const m = /^\[([^\]]+)\]$/.exec(token);
    if (m) {
      flush();
      chord = m[1];
    } else {
      buffer += token;
    }
  }
  flush();
  return html;
}

/** Render one lyric line. Chorus lines are always `cl`; refrains are italic. */
function lyricLine(line, inChorus) {
  const refrain = line.startsWith('>');
  const text = (refrain ? line.replace(/^>\s?/, '') : line).trim();
  const chorded = text.includes('[');
  const classes = [];
  if (inChorus || chorded) classes.push('cl');
  if (refrain) classes.push('refrain');
  const body = chorded || inChorus ? chordHtml(text) : esc(text);
  const cls = classes.length ? ` class="${classes.join(' ')}"` : '';
  return `<p${cls}>${body}</p>`;
}

/** Parse one page of song text into HTML blocks. */
function parsePage(text) {
  const lines = text.replace(/\s+$/, '').split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i += 1; continue; }

    if (line.startsWith('# ')) {
      blocks.push(`<h1 class="song-title">${esc(line.slice(2).trim())}</h1>`);
      i += 1;
    } else if (/^\*.+\*$/.test(line)) {
      blocks.push(`<p class="song-credit">${esc(line.slice(1, -1).trim())}</p>`);
      i += 1;
    } else if (/^\[[^\]]+\]$/.test(line)) {
      blocks.push(`<div class="cue">${esc(line.slice(1, -1).trim())}</div>`);
      i += 1;
    } else if (line.toLowerCase() === '{chorus}') {
      i += 1;
      const rows = [];
      while (i < lines.length && lines[i].trim()) {
        rows.push(lyricLine(lines[i].trim(), true));
        i += 1;
      }
      blocks.push(`<div class="chorus"><div class="label">Chorus</div>${rows.join('')}</div>`);
    } else {
      const rows = [];
      while (i < lines.length && lines[i].trim() && !/^\{chorus\}$/i.test(lines[i].trim())) {
        rows.push(lyricLine(lines[i].trim(), false));
        i += 1;
      }
      blocks.push(`<div class="verse">${rows.join('')}</div>`);
    }
  }
  return blocks.join('\n');
}

/** Split a song into its (left, right) pages on the `---` page break. */
function splitPages(text) {
  return text.split(PAGE_BREAK);
}

module.exports = { parsePage, splitPages, chordHtml, PAGE_BREAK };
