const { execSync } = require('child_process');
const { existsSync } = require('fs');

// Only run prisma generate if node_modules exists (i.e. after a real install)
if (!existsSync('./node_modules')) {
  console.log('postinstall: node_modules not found — skipping prisma generate');
  process.exit(0);
}

try {
  console.log('postinstall: running prisma generate (v5.22.0)');
  execSync('npx prisma@5.22.0 generate', { stdio: 'inherit' });
  process.exit(0);
} catch (err) {
  console.error('postinstall: prisma generate failed', err);
  process.exit(1);
}
