#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const { buildBookFromManifest } = require('./index');

const USAGE = `markdown-booklet — booklet-imposed printable HTML from Markdown

Usage:
  markdown-booklet build <book.yaml> [options]

Options:
  --out <file>     Write HTML to <file> (default: stdout).
  --reading        Output reading-order proof instead of booklet imposition.
  -h, --help       Show this help.

Examples:
  markdown-booklet build examples/sample-book/book.yaml --out dist/sample.html
  markdown-booklet build examples/sample-book/book.yaml --reading --out proof.html
`;

function parseArgs(argv) {
  const args = { _: [], out: null, reading: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--out':
        args.out = argv[++i];
        break;
      case '--reading':
        args.reading = true;
        break;
      case '-h':
      case '--help':
        args.help = true;
        break;
      default:
        args._.push(arg);
    }
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  if (args.help || args._.length === 0) {
    process.stdout.write(USAGE);
    return 0;
  }

  const command = args._[0];
  if (command !== 'build') {
    process.stderr.write(`Unknown command: ${command}\n\n${USAGE}`);
    return 1;
  }

  const manifestPath = args._[1];
  if (!manifestPath) {
    process.stderr.write(`Missing book.yaml path.\n\n${USAGE}`);
    return 1;
  }

  const mode = args.reading ? 'reading' : 'booklet';
  const { html, logical, printable } = buildBookFromManifest(manifestPath, { mode });

  if (args.out) {
    const outPath = path.resolve(args.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, 'utf8');
    process.stderr.write(
      `Wrote ${mode} HTML to ${outPath}\n` +
        `  logical pages: ${logical.pageCount}\n` +
        `  sheets: ${printable.sheets.length} (${printable.pageCount} pages after padding)\n`,
    );
  } else {
    process.stdout.write(html);
  }
  return 0;
}

try {
  process.exit(main(process.argv.slice(2)));
} catch (err) {
  process.stderr.write(`Error: ${err.message}\n`);
  process.exit(1);
}
