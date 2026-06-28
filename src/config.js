'use strict';

/**
 * Default booklet configuration. Every value can be overridden by the
 * `config:` block in a book.yaml manifest. Dimensions are CSS length
 * strings so the print stylesheet can use them verbatim.
 *
 * The logical `page` is what the author lays out (portrait, half-letter by
 * default). The physical sheet is derived as two logical pages side by side
 * (landscape), so a 5.5in x 8.5in page yields an 11in x 8.5in sheet — a
 * Letter sheet folded once.
 */
const DEFAULT_CONFIG = {
  // Logical page dimensions (portrait).
  page: { width: '5.5in', height: '8.5in' },

  // Mirrored margins. `inner` is the binding/fold edge, `outer` the trimmed
  // edge. Recto/verso flips inner and outer horizontally.
  margins: {
    inner: '0.75in',
    outer: '0.5in',
    top: '0.6in',
    bottom: '0.6in',
  },

  // Page-number rendering.
  pageNumber: {
    show: true,
    fontSize: '9pt',
  },

  // 'all' = a single signature containing the whole book. A number (e.g. 16)
  // splits the book into fixed-size signatures.
  signatureSize: 'all',
};

/** Parse a CSS length like "5.5in" into { value, unit }. */
function parseLength(length) {
  const match = /^\s*(-?\d*\.?\d+)\s*([a-z%]+)\s*$/i.exec(String(length));
  if (!match) {
    throw new Error(`Invalid CSS length: ${length}`);
  }
  return { value: parseFloat(match[1]), unit: match[2] };
}

/** Multiply a CSS length by a scalar, preserving its unit. */
function scaleLength(length, factor) {
  const { value, unit } = parseLength(length);
  // Trim trailing zeros for clean output (11in not 11.0in).
  const scaled = parseFloat((value * factor).toFixed(4));
  return `${scaled}${unit}`;
}

/** Deep-merge a partial override object onto a base config (objects only). */
function mergeConfig(base, override) {
  if (!override || typeof override !== 'object') {
    return { ...base };
  }
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      base[key] &&
      typeof base[key] === 'object'
    ) {
      out[key] = mergeConfig(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Resolve the physical sheet dimensions for a logical page config.
 * The sheet is landscape: two logical pages wide, one page tall.
 */
function sheetDimensions(config) {
  return {
    width: scaleLength(config.page.width, 2),
    height: config.page.height,
  };
}

module.exports = {
  DEFAULT_CONFIG,
  parseLength,
  scaleLength,
  mergeConfig,
  sheetDimensions,
};
