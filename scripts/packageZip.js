import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const zipOutputPath = path.resolve(rootDir, 'sankar-salesbot-ai-src.zip');
const tempStagingDir = path.resolve(rootDir, '.staging_package');

console.log('📦 Creating clean production source archive (excluding node_modules, dist, and local secrets)...');

// 1. Clean previous staging and zip
if (fs.existsSync(tempStagingDir)) {
  fs.rmSync(tempStagingDir, { recursive: true, force: true });
}
if (fs.existsSync(zipOutputPath)) {
  fs.rmSync(zipOutputPath, { force: true });
}

fs.mkdirSync(tempStagingDir, { recursive: true });

// 2. Define whitelist of items to copy
const copyList = [
  '.env.example',
  '.gitignore',
  '.oxlintrc.json',
  'README.md',
  'index.html',
  'package.json',
  'package-lock.json',
  'public',
  'src',
  'test',
  'vercel.json',
  'vite.config.js'
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      if (item === 'node_modules' || item === 'dist' || item === '.env' || item.endsWith('.log')) {
        continue;
      }
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy root items
for (const item of copyList) {
  const srcPath = path.join(rootDir, item);
  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, path.join(tempStagingDir, item));
  }
}

// Copy server folder specifically excluding node_modules and .env
const serverSrc = path.join(rootDir, 'server');
const serverDest = path.join(tempStagingDir, 'server');
fs.mkdirSync(serverDest, { recursive: true });

for (const file of fs.readdirSync(serverSrc)) {
  if (file === 'node_modules' || file === '.env' || file.endsWith('.log')) {
    continue;
  }
  copyRecursive(path.join(serverSrc, file), path.join(serverDest, file));
}

// 3. Compress using PowerShell Compress-Archive
try {
  const psCommand = `powershell -NoProfile -Command "Compress-Archive -Path '${tempStagingDir}\\*' -DestinationPath '${zipOutputPath}' -Force"`;
  execSync(psCommand, { stdio: 'inherit' });
  
  const stats = fs.statSync(zipOutputPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Clean source package created successfully!`);
  console.log(`   Path: ${zipOutputPath}`);
  console.log(`   Size: ${sizeMb} MB (Free of platform-specific node_modules and dist artifacts)`);
} catch (err) {
  console.error('Failed to create zip archive:', err.message);
  process.exitCode = 1;
} finally {
  // Clean up temporary staging folder
  if (fs.existsSync(tempStagingDir)) {
    fs.rmSync(tempStagingDir, { recursive: true, force: true });
  }
}
