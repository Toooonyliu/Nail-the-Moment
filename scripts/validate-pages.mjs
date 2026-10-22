import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adaptRootUrls, filesBelow, normalizeBasePath, rootUrlPattern, RUNTIME_TEXT_EXTENSIONS, sha256 } from './pages-paths.mjs';

export function validatePages({ root, base = normalizeBasePath(process.env.PAGES_BASE_PATH) } = {}) {
  root ??= path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const dist = path.join(root, 'dist');
  const publicSource = path.join(root, 'app', 'public');
  assert(existsSync(path.join(dist, '.nojekyll')), 'Missing .nojekyll');
  const files = filesBelow(dist);
  let referencesChecked = 0;
  let preservedAssets = 0;

  function checkReference(reference, from, { allowDirectory = false } = {}) {
    reference = reference.replaceAll('&amp;', '&').trim();
    if (!reference || /^(?:data:|blob:|https?:|mailto:|tel:|#|\/\/)/i.test(reference) || reference.includes('${')) return;
    const fromRelative = path.relative(dist, from).split(path.sep).join('/');
    const url = new URL(reference, `https://pages.invalid${base}${fromRelative}`);
    assert(url.pathname.startsWith(base), `Reference escaped project base: ${fromRelative}: ${reference}`);
    const relative = decodeURIComponent(url.pathname.slice(base.length));
    let target = path.resolve(dist, relative);
    assert(target === dist || target.startsWith(`${dist}${path.sep}`), `Reference escaped static directory: ${reference}`);
    assert(existsSync(target), `Missing target: ${fromRelative}: ${reference}`);
    if (statSync(target).isDirectory() && !allowDirectory) target = path.join(target, 'index.html');
    assert(existsSync(target), `Missing directory index: ${fromRelative}: ${reference}`);
    referencesChecked += 1;
  }

  for (const file of files) {
    const extension = path.extname(file);
    if (!RUNTIME_TEXT_EXTENSIONS.has(extension)) continue;
    const text = readFileSync(file, 'utf8');
    if (base !== '/') assert(!rootUrlPattern().test(text), `Unscoped app URL remains: ${path.relative(dist, file)}`);
    if (extension === '.html') {
      for (const match of text.matchAll(/\b(?:src|href|poster|data-src|data-poster|data-animated)\s*=\s*(["'])(.*?)\1/g)) {
        checkReference(match[2], file);
      }
    }
    if (extension === '.css') {
      for (const match of text.matchAll(/url\(\s*(["']?)(.*?)\1\s*\)/g)) checkReference(match[2], file);
    }
    if (extension === '.js' || extension === '.mjs') {
      for (const match of text.matchAll(/(["'`])([^"'`\r\n]+)\1/g)) {
        if (match[2].startsWith(base) && /\/(?:assets|ar)\//.test(match[2])) checkReference(match[2], file);
      }
    }
  }

  // Fonts, images, models, recordings, and WASM must stay byte-for-byte identical.
  for (const source of filesBelow(publicSource)) {
    const relative = path.relative(publicSource, source);
    const output = path.join(dist, relative);
    assert(existsSync(output), `Public asset omitted: ${relative}`);
    if (!RUNTIME_TEXT_EXTENSIONS.has(path.extname(source))) {
      assert.equal(sha256(readFileSync(output)), sha256(readFileSync(source)), `Asset changed: ${relative}`);
      preservedAssets += 1;
    } else if (!['manifest.webmanifest', path.join('presentation', 'VERSION.json')].includes(relative)) {
      assert.equal(readFileSync(output, 'utf8'), adaptRootUrls(readFileSync(source, 'utf8'), base), `Unexpected public file change: ${relative}`);
    }
  }

  const manifest = JSON.parse(readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.id, base);
  assert.equal(manifest.scope, base);
  assert.equal(manifest.start_url, `${base}?phone=1&demo=1&screen=studio`);
  for (const icon of manifest.icons) checkReference(icon.src, path.join(dist, 'manifest.webmanifest'));

  const presentationFile = path.join(dist, 'presentation', 'index.html');
  const presentation = readFileSync(presentationFile, 'utf8');
  const version = JSON.parse(readFileSync(path.join(dist, 'presentation', 'VERSION.json'), 'utf8'));
  const upstreamVersion = JSON.parse(readFileSync(path.join(publicSource, 'presentation', 'VERSION.json'), 'utf8'));
  assert.equal(version.source_html_sha256, sha256(readFileSync(presentationFile)));
  assert.equal(version.upstream_source_html_sha256, upstreamVersion.source_html_sha256);
  assert.equal(version.deployment_base_path, base);
  assert.equal((presentation.match(/aria-roledescription="slide"/g) ?? []).length, 11);
  assert(presentation.includes('assets/media/slide-08-phone.gif'), 'Slide 8 AR GIF missing');
  for (const screen of ['moments', 'studio', 'ar']) {
    assert(presentation.includes(`data-src="${base}?phone=1&amp;demo=1&amp;screen=${screen}"`), `Missing scoped live ${screen} embed`);
  }

  const mainScripts = files.filter(file => path.dirname(file) === path.join(dist, 'assets') && path.extname(file) === '.js');
  assert(mainScripts.length > 0, 'Missing app bundle');
  const bundle = mainScripts.map(file => readFileSync(file, 'utf8')).join('\n');
  for (const asset of ['assets/3d/generic-hand-left.glb', 'assets/iphone/Bezel.png', 'assets/android/Pixel10.png', 'assets/brand-nail.svg', 'ar/index.html']) {
    assert(bundle.includes(`${base}${asset}`), `Bundle did not scope ${asset}`);
    assert(existsSync(path.join(dist, asset)), `Missing essential asset ${asset}`);
  }

  // The AR modules resolve their bundled dependencies relative to their own URL.
  for (const file of files.filter(file => path.dirname(file) === path.join(dist, 'ar') && path.extname(file) === '.js')) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*|new URL\(\s*)(["'])(\.{1,2}\/[^"']+)\1/g)) {
      checkReference(match[2], file, { allowDirectory: true });
    }
  }
  for (const asset of ['ar/assets/hand_landmarker.task', 'ar/assets/wasm/vision_wasm_internal.wasm', 'ar/assets/wasm/vision_wasm_nosimd_internal.wasm']) {
    assert(existsSync(path.join(dist, asset)), `Missing AR runtime ${asset}`);
  }
  const result = { base_path: base, static_files: files.length, references_checked: referencesChecked, unchanged_public_binary_assets: preservedAssets, slides: 11, presentation_version: version.version };
  console.log('Pages validation passed:', JSON.stringify(result));
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) validatePages();
