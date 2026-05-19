import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

export function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

/** แพ็ก connector + node_modules สำหรับ portable / Electron */
export function stageConnectorApp(stageDir) {
  const connectorPkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'apps/connector/package.json'), 'utf8')
  );
  const sharedPkg = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'packages/shared/package.json'), 'utf8')
  );

  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.mkdirSync(stageDir, { recursive: true });

  copyDir(path.join(ROOT, 'apps/connector/dist'), path.join(stageDir, 'dist'));

  const vendorShared = path.join(stageDir, 'vendor', 'shared');
  fs.mkdirSync(vendorShared, { recursive: true });
  fs.writeFileSync(
    path.join(vendorShared, 'package.json'),
    JSON.stringify(
      {
        name: '@thesteamerzone/shared',
        version: sharedPkg.version,
        type: 'module',
        main: './dist/index.js',
        exports: { '.': { import: './dist/index.js' } },
      },
      null,
      2
    )
  );
  copyDir(path.join(ROOT, 'packages/shared/dist'), path.join(vendorShared, 'dist'));

  fs.copyFileSync(
    path.join(ROOT, 'apps/connector/entry.mjs'),
    path.join(stageDir, 'entry.mjs')
  );

  const stagePkg = {
    name: 'thesteamerzone-connector-portable',
    private: true,
    type: 'module',
    dependencies: {
      ...connectorPkg.dependencies,
      '@thesteamerzone/shared': 'file:./vendor/shared',
    },
  };
  fs.writeFileSync(path.join(stageDir, 'package.json'), JSON.stringify(stagePkg, null, 2));

  execSync('npm install --omit=dev --no-audit --no-fund', {
    cwd: stageDir,
    stdio: 'inherit',
    env: { ...process.env, npm_config_legacy_peer_deps: 'true' },
  });
}
