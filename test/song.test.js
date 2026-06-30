'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { parsePage, splitPages, chordHtml } = require('../src/song');
const { renderSource } = require('../src/render');

test('chords float above lyrics via segments', () => {
  const html = chordHtml("And it's [C]row me bully boys [F]hurry");
  assert.match(html, /<span class="seg">And it's <\/span>/);
  assert.match(html, /<span class="seg"><span class="chd">C<\/span>row me bully boys <\/span>/);
  assert.match(html, /<span class="chd">F<\/span>hurry/);
});

test('title, credit, chorus, cue, verse, and refrain compile to the songbook markup', () => {
  const html = parsePage(
    [
      '# Bully Boys',
      '*The Dreadnoughts*',
      '',
      '{chorus}',
      '[C]hurry boys',
      '> row me bully boys row',
      '',
      'And we sailed away,',
      '> row me bully boys row',
      '',
      '[Chorus]',
    ].join('\n'),
  );
  assert.match(html, /<h1 class="song-title">Bully Boys<\/h1>/);
  assert.match(html, /<p class="song-credit">The Dreadnoughts<\/p>/);
  assert.match(html, /<div class="chorus"><div class="label">Chorus<\/div>/);
  assert.match(html, /<p class="cl refrain">/); // chorus refrain
  assert.match(html, /<div class="verse">/);
  assert.match(html, /<p class="refrain">row me bully boys row<\/p>/); // verse refrain
  assert.match(html, /<div class="cue">Chorus<\/div>/);
});

test('a song splits into a verso/recto spread on ---', () => {
  const pages = renderSource({
    type: 'song',
    meta: {},
    content: '# A\n\nleft verse\n\n---\n\n[Chorus]\n\nright verse',
  });
  assert.equal(pages.length, 2);
  assert.equal(pages[0].spreadRole, 'left');
  assert.equal(pages[1].spreadRole, 'right');
  assert.match(pages[0].html, /left verse/);
  assert.match(pages[1].html, /right verse/);
});

test('songs without a page break are rejected', () => {
  assert.throws(
    () => renderSource({ type: 'song', meta: {}, content: '# A\n\nonly one page' }),
    /page break/,
  );
});

test('a song with spread:false renders a single page', () => {
  const pages = renderSource({
    type: 'song',
    meta: { spread: false },
    content: '# A\n\nonly one page',
  });
  assert.equal(pages.length, 1);
  assert.equal(pages[0].spreadRole, undefined);
  assert.match(pages[0].html, /only one page/);
});

test('text is escaped to keep output well-formed', () => {
  assert.equal(splitPages('a\n---\nb').length, 2);
  assert.match(parsePage('1 < 2 & 3'), /1 &lt; 2 &amp; 3/);
});
