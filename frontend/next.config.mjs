import nextEnv from '@next/env';
import fs from 'node:fs';
import path from 'node:path';

const { loadEnvConfig } = nextEnv;
const isDevCommand = process.argv.some((arg) => arg.includes('dev'));
const isMobileBuild = process.env.APP_TARGET === 'mobile';

loadEnvConfig(process.cwd(), isDevCommand);

if (isMobileBuild) {
  const productionEnvPath = path.join(process.cwd(), '.env.production');

  if (fs.existsSync(productionEnvPath)) {
    const envLines = fs.readFileSync(productionEnvPath, 'utf8').split(/\r?\n/);

    for (const line of envLines) {
      const trimmedLine = line.trim();

      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      const separatorIndex = trimmedLine.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmedLine.slice(0, separatorIndex).trim();
      const value = trimmedLine.slice(separatorIndex + 1).trim();

      process.env[key] = value;
    }
  }
}

const mobileApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const isInvalidMobileApiUrl =
  !mobileApiUrl ||
  !mobileApiUrl.startsWith('https://') ||
  mobileApiUrl.includes('localhost') ||
  mobileApiUrl.includes('127.0.0.1');

if (isMobileBuild && isInvalidMobileApiUrl) {
  throw new Error(
    'APP_TARGET=mobile build requires NEXT_PUBLIC_API_URL to point to your production HTTPS backend domain.'
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};


export default nextConfig;
