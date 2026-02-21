#!/usr/bin/env node

// Pre-deploy check: validate required environment variables are present.
// To skip this check locally set SKIP_PREDEPLOY=true

const required = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY'
];

if (process.env.SKIP_PREDEPLOY === 'true') {
  // eslint-disable-next-line no-console
  console.log('SKIP_PREDEPLOY=true, skipping pre-deploy checks.');
  process.exit(0);
}

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  // eslint-disable-next-line no-console
  console.error('Pre-deploy check failed. Missing environment variables:', missing.join(', '));
  // Explain briefly
  // eslint-disable-next-line no-console
  console.error('Set these in Render environment settings or GitHub Secrets and retry the build.');
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log('Pre-deploy check passed. All required environment variables are set.');
process.exit(0);
