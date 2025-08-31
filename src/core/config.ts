import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '../../.env') });

export interface NewsletterConfig {
  ai: {
    provider: 'free' | 'openai' | 'claude';
    anthropicApiKey?: string;
    openaiApiKey?: string;
    monthlyBudget: number;
  };
  github: {
    token?: string;
    repo?: string;
    branch: string;
    username?: string;
  };
  newsApi: {
    key: string;
  };
  newsletter: {
    time: string;
    timezone: string;
    maxArticles: number;
  };
  local: {
    cacheDir: string;
    logLevel: string;
    debugMode: boolean;
    databasePath: string;
  };
  feedback: {
    secret: string;
  };
}

// Determine required environment variables based on AI provider
const aiProvider = (process.env.LLM_PROVIDER || 'free') as 'free' | 'openai' | 'claude';

// No required env vars for local mode - GitHub publishing is optional
const baseRequiredEnvVars: string[] = [];

// Add AI-specific requirements
const requiredEnvVars = [...baseRequiredEnvVars];
if (aiProvider === 'openai') {
  requiredEnvVars.push('OPENAI_API_KEY');
} else if (aiProvider === 'claude') {
  requiredEnvVars.push('ANTHROPIC_API_KEY');
}

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && !process.env.CI) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  console.error(`Current AI provider: ${aiProvider}`);
  console.error('Please copy .env.example to .env and fill in the required values');
  console.error('Or set LLM_PROVIDER=free to use the free tier');
  process.exit(1);
}

export const newsletterConfig: NewsletterConfig = {
  ai: {
    provider: aiProvider,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    monthlyBudget: parseFloat(process.env.MONTHLY_BUDGET_LIMIT || '0'),
  },
  github: {
    token: process.env.GITHUB_TOKEN,
    repo: process.env.GITHUB_REPO,
    branch: process.env.GITHUB_BRANCH || 'main',
    username: process.env.GITHUB_USERNAME,
  },
  newsApi: {
    key: process.env.NEWS_API_KEY || '',
  },
  newsletter: {
    time: process.env.NEWSLETTER_TIME || '07:00',
    timezone: process.env.TIMEZONE || 'America/Los_Angeles',
    maxArticles: parseInt(process.env.MAX_ARTICLES || '15'),
  },
  local: {
    cacheDir: process.env.CACHE_DIR || './tmp/cache',
    logLevel: process.env.LOG_LEVEL || 'info',
    debugMode: process.env.DEBUG_MODE === 'true',
    databasePath: process.env.DATABASE_PATH || './data/newsletter.db',
  },
  feedback: {
    secret: process.env.FEEDBACK_SECRET || 'default-secret-change-this',
  },
};

export default newsletterConfig;