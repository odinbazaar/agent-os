import { config as dotenvConfig } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: join(__dirname, '..', '..', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  dataforseo: {
    login: process.env.DATAFORSEO_LOGIN || '',
    password: process.env.DATAFORSEO_PASSWORD || '',
    get hasCredentials() {
      return this.login && this.password && this.login !== 'your_login';
    },
  },
  tailscale: {
    apiKey: process.env.TAILSCALE_API_KEY || '',
    tailnet: process.env.TAILSCALE_TAILNET || '',
    get hasCredentials() {
      return this.apiKey && this.apiKey !== 'your_tailscale_api_key';
    },
  },
};
