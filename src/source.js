'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const { DEFAULT_CONFIG, mergeConfig } = require('./config');
const { PageType } = require('./types');

/**
 * Split a YAML frontmatter block from a markdown source.
 * Returns { meta, body }. Supports a leading `---\n...\n---` fence.
 */
function parseMarkdownFrontmatter(raw) {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) {
    return { meta: {}, body: raw };
  }
  const meta = yaml.load(match[1]) || {};
  return { meta, body: match[2] };
}

/**
 * Split a YAML metadata block from an HTML source. Supports a leading
 * HTML comment `<!--\n...\n-->` whose contents parse as YAML.
 */
function parseHtmlFrontmatter(raw) {
  const match = /^\uFEFF?\s*<!--\s*\r?\n([\s\S]*?)\r?\n\s*-->\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) {
    return { meta: {}, body: raw };
  }
  let meta = {};
  try {
    meta = yaml.load(match[1]) || {};
  } catch {
    // Not a YAML comment — treat the whole file as body.
    return { meta: {}, body: raw };
  }
  // Only treat it as frontmatter if it actually yielded key/value metadata.
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    return { meta, body: match[2] };
  }
  return { meta: {}, body: raw };
}

/** Infer a content type from a file extension. */
function typeFromExtension(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html' || ext === '.htm') return PageType.HTML;
  return PageType.PAGE;
}

/** Normalize a manifest entry into { file?, overrides }. */
function normalizeEntry(entry) {
  if (typeof entry === 'string') {
    if (entry.trim().toLowerCase() === 'blank') {
      return { file: null, overrides: { type: PageType.BLANK } };
    }
    return { file: entry, overrides: {} };
  }
  if (entry && typeof entry === 'object') {
    const { file, ...overrides } = entry;
    return { file: file || null, overrides };
  }
  throw new Error(`Invalid manifest page entry: ${JSON.stringify(entry)}`);
}

/**
 * Load a book manifest and all of its source documents.
 *
 * @param {string} manifestPath Path to a book.yaml file.
 * @returns {{ title:string, config:Object, sources:import('./types').SourceDocument[] }}
 */
function loadBook(manifestPath) {
  const absManifest = path.resolve(manifestPath);
  const baseDir = path.dirname(absManifest);
  const manifest = yaml.load(fs.readFileSync(absManifest, 'utf8')) || {};

  const title = manifest.title || 'Untitled';
  const config = mergeConfig(DEFAULT_CONFIG, manifest.config || {});

  if (!Array.isArray(manifest.pages)) {
    throw new Error('book.yaml must define a `pages:` list.');
  }

  const sources = manifest.pages.map((entry, index) => {
    const { file, overrides } = normalizeEntry(entry);

    // Explicit / inferred blank page — no file to read.
    if (!file || overrides.type === PageType.BLANK) {
      return {
        type: PageType.BLANK,
        meta: { showPageNumber: false, ...overrides, type: PageType.BLANK },
        content: '',
        file: null,
      };
    }

    const absFile = path.resolve(baseDir, file);
    if (!fs.existsSync(absFile)) {
      throw new Error(`Source file not found for page ${index + 1}: ${file}`);
    }
    const raw = fs.readFileSync(absFile, 'utf8');
    const extType = typeFromExtension(absFile);
    const { meta: frontmatter, body } =
      extType === PageType.HTML
        ? parseHtmlFrontmatter(raw)
        : parseMarkdownFrontmatter(raw);

    // Precedence: manifest overrides > frontmatter > extension default.
    const meta = { ...frontmatter, ...overrides };
    const type = meta.type || frontmatter.type || extType;

    return { type, meta: { ...meta, type }, content: body, file: absFile };
  });

  return { title, config, sources };
}

module.exports = {
  loadBook,
  parseMarkdownFrontmatter,
  parseHtmlFrontmatter,
  typeFromExtension,
  normalizeEntry,
};
