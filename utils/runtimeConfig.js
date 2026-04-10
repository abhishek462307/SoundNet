const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const runtimeDir = path.join(__dirname, '..', 'data');
const runtimeSecretsFile = path.join(runtimeDir, 'runtime-secrets.json');

let runtimeConfigPromise;

async function getRuntimeConfig(config = {}) {
  if (!runtimeConfigPromise) {
    runtimeConfigPromise = loadRuntimeConfig(config);
  }
  return runtimeConfigPromise;
}

async function loadRuntimeConfig(config) {
  const nodeEnv = config.nodeEnv || process.env.NODE_ENV || 'development';
  const appBaseUrl = resolveAppBaseUrl(config);
  const secrets = await resolveSecrets(config, nodeEnv);

  return {
    appBaseUrl,
    apiKey: secrets.apiKey,
    adminApiKey: secrets.adminApiKey,
    generatedSecrets: secrets.generatedSecrets,
    secretsPersisted: secrets.persisted
  };
}

function resolveAppBaseUrl(config) {
  const explicit = config.appBaseUrl || process.env.APP_BASE_URL;
  if (explicit) {
    return explicit;
  }

  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    return renderUrl;
  }

  const railwayUrl = process.env.RAILWAY_STATIC_URL;
  if (railwayUrl) {
    return railwayUrl.startsWith('http') ? railwayUrl : `https://${railwayUrl}`;
  }

  const flyApp = process.env.FLY_APP_NAME;
  if (flyApp) {
    return `https://${flyApp}.fly.dev`;
  }

  return '';
}

async function resolveSecrets(config, nodeEnv) {
  const envApiKey = config.apiKey || process.env.API_KEY || '';
  const envAdminKey = config.adminApiKey || process.env.ADMIN_API_KEY || '';

  if (envApiKey && envAdminKey) {
    return {
      apiKey: envApiKey,
      adminApiKey: envAdminKey,
      generatedSecrets: false,
      persisted: false
    };
  }

  if (nodeEnv !== 'production') {
    return {
      apiKey: envApiKey,
      adminApiKey: envAdminKey,
      generatedSecrets: false,
      persisted: false
    };
  }

  await fs.promises.mkdir(runtimeDir, { recursive: true });
  const existing = await readRuntimeSecrets();
  if (existing.apiKey && existing.adminApiKey) {
    return {
      apiKey: envApiKey || existing.apiKey,
      adminApiKey: envAdminKey || existing.adminApiKey,
      generatedSecrets: false,
      persisted: true
    };
  }

  const next = {
    apiKey: envApiKey || generateSecret('sn_api'),
    adminApiKey: envAdminKey || generateSecret('sn_admin')
  };

  await fs.promises.writeFile(runtimeSecretsFile, `${JSON.stringify(next, null, 2)}
`);

  return {
    apiKey: next.apiKey,
    adminApiKey: next.adminApiKey,
    generatedSecrets: !envApiKey || !envAdminKey,
    persisted: true
  };
}

async function readRuntimeSecrets() {
  try {
    const raw = await fs.promises.readFile(runtimeSecretsFile, 'utf8');
    const parsed = JSON.parse(String(raw || '{}'));
    return {
      apiKey: parsed.apiKey || '',
      adminApiKey: parsed.adminApiKey || ''
    };
  } catch {
    return { apiKey: '', adminApiKey: '' };
  }
}

function generateSecret(prefix) {
  return `${prefix}_${crypto.randomBytes(24).toString('hex')}`;
}

module.exports = { getRuntimeConfig };
