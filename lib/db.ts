import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

function resolveDatabaseUrl(): string {
  const rawUrl = process.env.DATABASE_URL || '';
  const previewUrl = process.env.PREVIEW_DATABASE_URL || '';
  const vercelEnv = (process.env.VERCEL_ENV || '').toLowerCase();
  const gitRef = (process.env.VERCEL_GIT_COMMIT_REF || '').toLowerCase();

  let isPreview = vercelEnv === 'preview' || (gitRef !== '' && gitRef !== 'main' && gitRef !== 'master');
  if (!isPreview) {
    try {
      const envJsonPath = path.join(process.cwd(), 'config', 'environment.json');
      if (fs.existsSync(envJsonPath)) {
        const envData = JSON.parse(fs.readFileSync(envJsonPath, 'utf8'));
        if (envData.is_preview === true || envData.environment === 'preview') {
          isPreview = true;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!isPreview && !vercelEnv) {
    try {
      const headPath = path.join(process.cwd(), '.git', 'HEAD');
      if (fs.existsSync(headPath)) {
        const headRef = fs.readFileSync(headPath, 'utf8').trim();
        if (headRef.includes('refs/heads/') && !headRef.endsWith('/main') && !headRef.endsWith('/master')) {
          isPreview = true;
        }
      }
    } catch {
      // ignore fs check errors
    }
  }

  if (isPreview) {
    if (previewUrl) return previewUrl;
    if (rawUrl && rawUrl.includes('/neondb') && !rawUrl.includes('/neondb_preview')) {
      return rawUrl.replace(/\/neondb(\?|$)/, '/neondb_preview$1');
    }
  }
  return rawUrl;
}

const resolvedUrl = resolveDatabaseUrl();

if (!resolvedUrl) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const sql = postgres(resolvedUrl, {
  ssl: 'require',
  max: 1, // Keep connections low in serverless environment
  idle_timeout: 20,
  connect_timeout: 30,
});

export default sql;
