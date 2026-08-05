/**
 * build-electron.js
 * Script de preparação do build Electron para o NETIFLOW.
 * 
 * O que faz:
 * 1. Copia .next/static → .next/standalone/.next/static
 * 2. Copia public/ → .next/standalone/public
 * 3. Resolve symlinks em node_modules dentro do standalone (sem sobrescrever package.json)
 * 4. Garante que o package.json do standalone correto seja mantido ({"type":"module"})
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();

// 1. Copy static assets
const staticSrc = path.join(root, '.next', 'static');
const staticDest = path.join(root, '.next', 'standalone', '.next', 'static');
if (fs.existsSync(staticSrc)) {
  console.log('📦 Copying .next/static → standalone/.next/static ...');
  fs.rmSync(staticDest, { recursive: true, force: true });
  fs.cpSync(staticSrc, staticDest, { recursive: true });
  console.log('   ✅ Done.');
} else {
  console.warn('   ⚠️  .next/static not found, skipping.');
}

// 2. Copy public folder
const publicSrc = path.join(root, 'public');
const publicDest = path.join(root, '.next', 'standalone', 'public');
if (fs.existsSync(publicSrc)) {
  console.log('🖼️  Copying public/ → standalone/public ...');
  fs.rmSync(publicDest, { recursive: true, force: true });
  fs.cpSync(publicSrc, publicDest, { recursive: true });
  console.log('   ✅ Done.');
}

// 3. Resolve symlinks in standalone/node_modules (but skip package.json files!)
const standaloneRoot = path.join(root, '.next', 'standalone');
console.log('🔗 Resolving symlinks in standalone/node_modules ...');

function resolveSymlinks(dir) {
  if (!fs.existsSync(dir)) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) {
      let target;
      try {
        target = fs.readlinkSync(full);
      } catch (_) {
        continue;
      }
      const targetPath = path.resolve(path.dirname(full), target);
      if (fs.existsSync(targetPath)) {
        try {
          fs.rmSync(full, { force: true });
          fs.cpSync(targetPath, full, { recursive: true });
        } catch (err) {
          console.warn(`   ⚠️  Could not resolve symlink ${full}: ${err.message}`);
        }
      }
    } else if (entry.isDirectory()) {
      resolveSymlinks(full);
    }
  }
}

// Only resolve symlinks inside node_modules to avoid touching server.js, package.json etc.
const nmDir = path.join(standaloneRoot, 'node_modules');
resolveSymlinks(nmDir);
const nmDirNext = path.join(standaloneRoot, '.next', 'node_modules');
resolveSymlinks(nmDirNext);

console.log('   ✅ Done.');

// 4. Ensure standalone package.json is correct (Next.js needs {"type":"module"} or just {})
const standalonePkg = path.join(standaloneRoot, 'package.json');
const expectedPkg = JSON.stringify({ type: "commonjs" }, null, 2);
const currentPkg = fs.existsSync(standalonePkg) ? fs.readFileSync(standalonePkg, 'utf-8').trim() : '';
const currentObj = (() => { try { return JSON.parse(currentPkg); } catch (_) { return {}; } })();

// Only overwrite if it has more than "type" and "name" fields (i.e., the full dev package.json was accidentally copied)
if (Object.keys(currentObj).length > 4) {
  console.log('🔧 Restoring standalone/package.json (was overwritten by full dev package.json) ...');
  fs.writeFileSync(standalonePkg, expectedPkg, 'utf-8');
  console.log('   ✅ Done.');
} else {
  console.log('✅ standalone/package.json looks correct, skipping.');
}

console.log('\n🎉 Build preparation complete! Running electron-builder...\n');
