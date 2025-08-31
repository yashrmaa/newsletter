import { AIProvider } from './ai-provider.js';
import { FreeRuleBasedProvider } from './free-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { ClaudeProvider } from './claude-provider.js';
import { logger } from '../core/logger.js';

export type ProviderTier = 'free' | 'openai' | 'claude';

export interface ProviderConfig {
  tier: ProviderTier;
  apiKey?: string;
  monthlyBudget?: number;
  fallbackTier?: ProviderTier;
}

export class AIProviderFactory {
  static createProvider(config: ProviderConfig): AIProvider {
    logger.info(`🔧 Creating AI provider: ${config.tier}`);
    
    try {
      switch (config.tier) {
        case 'free':
          return new FreeRuleBasedProvider();
        
        case 'openai':
          if (!config.apiKey) {
            logger.warn('OpenAI API key not provided, falling back to free tier');
            return new FreeRuleBasedProvider();
          }
          return new OpenAIProvider(config.apiKey, config.monthlyBudget);
        
        case 'claude':
          if (!config.apiKey) {
            logger.warn('Claude API key not provided, falling back to free tier');
            return new FreeRuleBasedProvider();
          }
          return new ClaudeProvider(config.apiKey, config.monthlyBudget);
        
        default:
          logger.warn(`Unknown provider tier: ${config.tier}, defaulting to free`);
          return new FreeRuleBasedProvider();
      }
    } catch (error: any) {
      logger.error(`Failed to create ${config.tier} provider:`, error.message);
      logger.info('Falling back to free tier');
      return new FreeRuleBasedProvider();
    }
  }

  static createFromEnvironment(): AIProvider {
    const tier = (process.env.LLM_PROVIDER || 'free') as ProviderTier;
    const monthlyBudget = process.env.MONTHLY_BUDGET_LIMIT 
      ? parseFloat(process.env.MONTHLY_BUDGET_LIMIT) 
      : undefined;

    const config: ProviderConfig = {
      tier,
      monthlyBudget,
      apiKey: tier === 'openai' 
        ? process.env.OPENAI_API_KEY 
        : tier === 'claude' 
          ? process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
          : undefined
    };

    const provider = this.createProvider(config);
    
    logger.info(`✅ AI Provider initialized: ${provider.name} (${provider.costPerMonth})`);
    logger.info(`📊 Effectiveness: ${provider.effectiveness}`);
    logger.info(`🎯 Features: ${provider.features.join(', ')}`);
    
    return provider;
  }

  static getAvailableTiers(): Array<{
    tier: ProviderTier;
    name: string;
    cost: string;
    effectiveness: string;
    description: string;
  }> {
    return [
      {
        tier: 'free',
        name: 'Free Rule-Based',
        cost: '$0/month',
        effectiveness: '70%',
        description: 'Smart keyword matching, source scoring, and trending detection'
      },
      {
        tier: 'openai',
        name: 'OpenAI GPT-4o Mini',
        cost: '$3-7/month',
        effectiveness: '90%',
        description: 'AI reasoning, personalization, and content summaries'
      },
      {
        tier: 'claude',
        name: 'Claude 3 Haiku',
        cost: '$8-15/month',
        effectiveness: '100%',
        description: 'Superior reasoning, nuanced analysis, and best writing quality'
      }
    ];
  }

  static recommendTier(
    monthlyBudget: number,
    articlesPerDay: number = 15,
    daysPerMonth: number = 30
  ): ProviderTier {
    const monthlyArticles = articlesPerDay * daysPerMonth;
    
    if (monthlyBudget === 0) {
      return 'free';
    }
    
    // Rough cost estimates per article
    const openAIcostPerArticle = 0.02; // Estimated
    const claudeCostPerArticle = 0.04; // Estimated
    
    const estimatedOpenAICost = monthlyArticles * openAIcostPerArticle;
    const estimatedClaudeCost = monthlyArticles * claudeCostPerArticle;
    
    if (monthlyBudget >= estimatedClaudeCost && monthlyBudget >= 10) {
      return 'claude';
    } else if (monthlyBudget >= estimatedOpenAICost && monthlyBudget >= 5) {
      return 'openai';
    } else {
      return 'free';
    }
  }
}

// Helper function for easy provider creation
export function createAIProvider(
  tier: ProviderTier = 'free',
  apiKey?: string,
  monthlyBudget?: number
): AIProvider {
  return AIProviderFactory.createProvider({ tier, apiKey, monthlyBudget });
}

// Environment-based provider creation (for main application)
export function createProviderFromEnv(): AIProvider {
  return AIProviderFactory.createFromEnvironment();
}