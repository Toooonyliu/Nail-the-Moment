import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_BASE_PATH = '/Nail-the-Moment/';
export const RUNTIME_TEXT_EXTENSIONS = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest']);

export function normalizeBasePath(value = DEFAULT_BASE_PATH) {
  const base = value === '/' ? '/' : `/${value.replace(/^\/+|\/+$/g, '')}/`;
  if (!/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(base) || base.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('PAGES_BASE_PATH must be a root-relative path such as /Nail-the-Moment/.');
  }
  return base;
}

// These are application URLs, not arbitrary slash-prefixed strings or vendor paths.
// Requiring an opening quote/backtick/parenthesis avoids double-prefixing Vite output.
export function rootUrlPattern() {
  return /(["'`(])\/(?=assets\/|ar\/|manifest\.webmanifest(?:["'`?#)\s]|$)|\?)/g;
}

export function adaptRootUrls(text, base) {
  return text.replace(rootUrlPattern(), (_, opener) => `${opener}${base}`);
}

export function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesBelow(file);
    if (!entry.isFile()) throw new Error(`Unexpected non-file in static build: ${file}`);
    return [file];
  }).sort();
}

export const sha256 = data => createHash('sha256').update(data).digest('hex');
