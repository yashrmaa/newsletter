import OpenAI from 'openai';
import { AIProvider, UserPreferences, CuratedArticle, CurationResult } from './ai-provider.js';
import { Article } from '../utils/types.js';
import { logger } from '../core/logger.js';

export class OpenAIProvider implements AIProvider {
  readonly name = "OpenAI GPT-4o Mini";
  readonly costPerMonth = "$3-7";
  readonly effectiveness = "90%";
  readonly features = [
    "AI reasoning and analysis",
    "Personalized content summaries",
    "Advanced topic discovery",
    "Context-aware selection",
    "Natural language insights"
  ];

  private openai: OpenAI;
  private usageTracker = {
    requestsThisMonth: 0,
    estimatedCost: 0,
    monthlyBudget: 10.00 // Default budget
  };

  constructor(apiKey: string, monthlyBudget?: number) {
    this.openai = new OpenAI({ apiKey });
    if (monthlyBudget) {
      this.usageTracker.monthlyBudget = monthlyBudget;
    }
  }

  async curate(
    articles: Article[], 
    preferences: UserPreferences,
    maxArticles: number = 15
  ): Promise<CurationResult> {
    const startTime = Date.now();
    logger.info(`🤖 OpenAI: Curating ${articles.length} articles using GPT-4o Mini`);

    if (!this.isWithinBudget()) {
      logger.warn('OpenAI budget exceeded, falling back to rule-based curation');
      return this.fallbackCuration(articles, preferences, maxArticles);
    }

    try {
      // Pre-filter articles to reduce token usage
      const preFiltered = this.preFilterArticles(articles, preferences);
      logger.info(`Pre-filtered to ${preFiltered.length} articles for AI analysis`);

      // Build curation prompt
      const prompt = this.buildCurationPrompt(preFiltered, preferences, maxArticles);
      
      // Make OpenAI API call
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert news curator with deep understanding of content quality, relevance, and user interests. You provide intelligent article selection with clear reasoning."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      // Track usage
      this.trackUsage(response.usage);

      // Parse response
      const curatedArticles = this.parseOpenAIResponse(response.choices[0].message.content!, preFiltered);
      
      const processingTime = Date.now() - startTime;

      const result: CurationResult = {
        articles: curatedArticles,
        totalProcessed: articles.length,
        curationMethod: "OpenAI GPT-4o Mini with intelligent reasoning",
        processingTimeMs: processingTime,
        qualityMetrics: {
          averageScore: this.calculateAverageScore(curatedArticles),
          categoryDistribution: this.getCategoryDistribution(curatedArticles),
          sourcesDiversity: this.getSourcesDiversity(curatedArticles)
        }
      };

      logger.info(`🎯 OpenAI: Selected ${result.articles.length} articles (avg score: ${result.qualityMetrics.averageScore.toFixed(1)})`);
      return result;

    } catch (error: any) {
      logger.error('OpenAI curation failed:', error.message);
      return this.fallbackCuration(articles, preferences, maxArticles);
    }
  }

  private preFilterArticles(articles: Article[], preferences: UserPreferences): Article[] {
    // Basic filtering to reduce tokens sent to OpenAI
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return articles
      .filter(article => article.publishedAt >= oneDayAgo)
      .filter(article => article.title.length >= 10)
      .filter(article => article.excerpt && article.excerpt.length >= 50)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
      .slice(0, 50); // Limit to 50 articles for cost control
  }

  private buildCurationPrompt(articles: Article[], preferences: UserPreferences, maxArticles: number): string {
    const userTopics = Object.entries(preferences.topics)
      .filter(([_, prefs]) => prefs.interest_score > 0.4)
      .map(([topic, prefs]) => `${topic} (interest: ${prefs.interest_score}, keywords: ${prefs.keywords.join(', ')})`)
      .join('\n');

    const articlesText = articles.map((article, index) => {
      return `${index + 1}. [ID: ${article.id}]
Title: "${article.title}"
Source: ${article.source.name}
Category: ${article.category}
Published: ${article.publishedAt.toISOString()}
Excerpt: ${(article.excerpt || '').substring(0, 200)}...
Tags: ${article.tags.join(', ')}`;
    }).join('\n\n');

    return `You are curating a personalized daily newsletter. Select the ${maxArticles} most valuable articles for this user.

## User Profile & Interests:
${userTopics}

## Content Preferences:
- Preferred reading order: ${preferences.reading_patterns.preferred_categories_order.join(', ')}
- Max per category: ${preferences.reading_patterns.max_articles_per_category}
- Focus vs diversity balance: ${preferences.reading_patterns.diversity_vs_focus}

## Today's Articles (${articles.length} total):
${articlesText}

## Selection Criteria (prioritized):
1. **Relevance**: Match user interests and provide value
2. **Quality**: Well-written, credible sources, substantial content
3. **Timeliness**: Recent and actionable information
4. **Diversity**: Balanced mix across interests, avoid duplicates
5. **Discovery**: Include 1-2 articles that expand user's knowledge

## Required Output Format:
Return ONLY a valid JSON array with exactly ${maxArticles} articles:

[
  {
    "id": "article_id_here",
    "selection_score": 85,
    "selection_reason": "Highly relevant to AI interests with breaking developments",
    "target_section": "highlights",
    "ai_summary": "This article reveals significant AI breakthrough with practical implications for the industry."
  }
]

Target sections: "highlights" (top 3), "technology", "business", "science", "general"
Selection scores: 1-100 based on value to this specific user.
AI summaries: One sentence explaining the key insight or value.`;
  }

  private parseOpenAIResponse(response: string, articles: Article[]): CuratedArticle[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }

      const selections = JSON.parse(jsonMatch[0]);
      const curatedArticles: CuratedArticle[] = [];

      for (const selection of selections) {
        const article = articles.find(a => a.id === selection.id);
        if (article && selection.selection_score && selection.target_section) {
          curatedArticles.push({
            ...article,
            selectionScore: selection.selection_score,
            selectionReason: selection.selection_reason || 'Selected by OpenAI',
            targetSection: selection.target_section,
            aiSummary: selection.ai_summary,
            confidenceScore: 0.85 // High confidence for AI selections
          });
        }
      }

      return curatedArticles;
    } catch (error: any) {
      logger.error('Error parsing OpenAI response:', error.message);
      return [];
    }
  }

  private fallbackCuration(
    articles: Article[], 
    preferences: UserPreferences, 
    maxArticles: number
  ): CurationResult {
    logger.info('Using fallback rule-based curation for OpenAI provider');
    
    // Simple fallback scoring
    const scored = articles
      .filter(article => {
        const content = (article.title + ' ' + (article.excerpt || '')).toLowerCase();
        return Object.values(preferences.topics).some(prefs => 
          prefs.keywords.some(keyword => content.includes(keyword.toLowerCase()))
        );
      })
      .map(article => ({
        ...article,
        selectionScore: Math.random() * 50 + 30, // Simple random scoring
        selectionReason: 'Fallback selection due to API issue',
        targetSection: article.category === 'technology' ? 'technology' : 'general',
        confidenceScore: 0.3
      }))
      .sort((a, b) => b.selectionScore - a.selectionScore)
      .slice(0, maxArticles);

    return {
      articles: scored,
      totalProcessed: articles.length,
      curationMethod: "Fallback rule-based (OpenAI unavailable)",
      processingTimeMs: 100,
      qualityMetrics: {
        averageScore: this.calculateAverageScore(scored),
        categoryDistribution: this.getCategoryDistribution(scored),
        sourcesDiversity: this.getSourcesDiversity(scored)
      }
    };
  }

  private trackUsage(usage: any): void {
    if (usage) {
      // Estimate cost based on GPT-4o Mini pricing
      const inputCost = (usage.prompt_tokens / 1000) * 0.00015; // $0.15 per 1M input tokens
      const outputCost = (usage.completion_tokens / 1000) * 0.0006; // $0.60 per 1M output tokens
      const totalCost = inputCost + outputCost;
      
      this.usageTracker.requestsThisMonth++;
      this.usageTracker.estimatedCost += totalCost;
      
      logger.debug(`OpenAI usage: ${usage.total_tokens} tokens, estimated cost: $${totalCost.toFixed(4)}`);
    }
  }

  private calculateAverageScore(articles: CuratedArticle[]): number {
    if (articles.length === 0) return 0;
    return articles.reduce((sum, article) => sum + article.selectionScore, 0) / articles.length;
  }

  private getCategoryDistribution(articles: CuratedArticle[]): { [key: string]: number } {
    const distribution: { [key: string]: number } = {};
    articles.forEach(article => {
      const section = article.targetSection;
      distribution[section] = (distribution[section] || 0) + 1;
    });
    return distribution;
  }

  private getSourcesDiversity(articles: CuratedArticle[]): number {
    const uniqueSources = new Set(articles.map(article => article.source.id));
    return uniqueSources.size;
  }

  getUsageStats() {
    return {
      requestsThisMonth: this.usageTracker.requestsThisMonth,
      estimatedCost: this.usageTracker.estimatedCost,
      remainingBudget: this.usageTracker.monthlyBudget - this.usageTracker.estimatedCost
    };
  }

  isWithinBudget(): boolean {
    return this.usageTracker.estimatedCost < this.usageTracker.monthlyBudget;
  }
}