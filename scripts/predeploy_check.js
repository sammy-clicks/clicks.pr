#!/usr/bin/env node

// Pre-deploy check: validate required environment variables are present.
// To skip this check locally set SKIP_PREDEPLOY=true

const required = [
  'DATABASE_URL',
  'NEXTAUTH_SECRET'
];

const optional = ['JWT_SECRET', 'STRIPE_SECRET_KEY'];

if (process.env.SKIP_PREDEPLOY === 'true') {
  console.log('SKIP_PREDEPLOY=true, skipping pre-deploy checks.');
  process.exit(0);
}

const missing = required.filter((k) => !process.env[k]);
const missingOptional = optional.filter((k) => !process.env[k]);

if (missing.length > 0) {
  console.error('Pre-deploy check failed. Missing required environment variables:', missing.join(', '));
  console.error('Set these in Render environment settings or GitHub Secrets and retry the build.');
  process.exit(1);
}

if (missingOptional.length > 0) {
  console.warn('Pre-deploy warning — optional env vars not set:', missingOptional.join(', '));
}

console.log('Pre-deploy check passed. Required environment variables are set.');
process.exit(0);
