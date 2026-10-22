import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { adaptRootUrls, filesBelow, normalizeBasePath, RUNTIME_TEXT_EXTENSIONS, sha256 } from './pages-paths.mjs';
import { validatePages } from './validate-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(root, 'app');
const dist = path.join(root, 'dist');
const base = normalizeBasePath(process.env.PAGES_BASE_PATH);

const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build', '--', '--base', base], {
  cwd: app,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const built = path.join(app, 'dist', 'client');
if (!existsSync(path.join(built, 'index.html'))) throw new Error('The app build did not produce index.html.');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(built, dist, { recursive: true });

let adaptedFiles = 0;
for (const file of filesBelow(dist)) {
  if (!RUNTIME_TEXT_EXTENSIONS.has(path.extname(file))) continue;
  const original = readFileSync(file, 'utf8');
  const adapted = adaptRootUrls(original, base);
  if (adapted !== original) {
    writeFileSync(file, adapted);
    adaptedFiles += 1;
  }
}

const manifestFile = path.join(dist, 'manifest.webmanifest');
const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const prefix = value => value.startsWith(base) ? value : `${base}${value.replace(/^\//, '')}`;
manifest.id = base;
manifest.scope = base;
manifest.start_url = prefix(manifest.start_url);
manifest.icons = manifest.icons.map(icon => ({ ...icon, src: prefix(icon.src) }));
writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

const versionFile = path.join(dist, 'presentation', 'VERSION.json');
const version = JSON.parse(readFileSync(versionFile, 'utf8'));
version.upstream_source_html_sha256 = version.source_html_sha256;
version.source_html_sha256 = sha256(readFileSync(path.join(dist, 'presentation', 'index.html')));
version.deployment_base_path = base;
version.app_dependency = `same-origin ${base}?phone=1&demo=1`;
writeFileSync(versionFile, `${JSON.stringify(version, null, 2)}\n`);
writeFileSync(path.join(dist, '.nojekyll'), '');

console.log(`Prepared independent Pages site at ${base}; adapted ${adaptedFiles} generated text files.`);
validatePages({ root, base });
