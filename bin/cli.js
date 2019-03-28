#!/usr/bin/env node

// @todo find some cool branding name
const extensions = require('../');

const argv = process.argv.slice(2);
const url = argv[0];
const flags = {};

argv
  .filter(f => f.startsWith('-'))
  .forEach(f => {
    var keyValue = f.split('=');
    const flagKey = keyValue[0].replace(/-*/, '');
    flags[flagKey] = keyValue[1] || true;
  });


argv.filter(f => !f.startsWith('-')).shift();

if (!url || flags.help) {
  console.error('Usage:');
  console.error('    extensions http://example.com/');
  console.error('    extensions http://example.com/ --json');
  console.error('    extensions http://example.com/ --browserType');

  return;
}

extensions(url, flags)
  .catch(e => console.error(e) && process.exit(1))
  .then(() => process.exit())
