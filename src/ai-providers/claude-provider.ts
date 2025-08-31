import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, UserPreferences, CuratedArticle, CurationResult } from './ai-provider.js';
import { Article } from '../utils/types.js';
import { logger } from '../core/logger.js';

export class ClaudeProvider implements AIProvider {
  readonly name = "Claude 3 Haiku";
  readonly costPerMonth = "$8-15";
  readonly effectiveness = "100%";
  readonly features = [
    "Superior reasoning and analysis",
    "Nuanced content understanding",
    "Exceptional personalization",
    "Complex preference integration",
    "Best-in-class writing quality"
  ];

  private anthropic: Anthropic;
  private usageTracker = {
    requestsThisMonth: 0,
    estimatedCost: 0,
    monthlyBudget: 15.00 // Default budget
  };

  constructor(apiKey: string, monthlyBudget?: number) {
    this.anthropic = new Anthropic({ apiKey });
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
    logger.info(`🎓 Claude: Curating ${articles.length} articles using advanced reasoning`);

    if (!this.isWithinBudget()) {
      logger.warn('Claude budget exceeded, falling back to rule-based curation');
      return this.fallbackCuration(articles, preferences, maxArticles);
    }

    try {
      // Pre-filter articles intelligently
      const preFiltered = this.intelligentPreFilter(articles, preferences);
      logger.info(`Intelligently filtered to ${preFiltered.length} articles for Claude analysis`);

      // Build advanced curation prompt
      const prompt = this.buildAdvancedCurationPrompt(preFiltered, preferences, maxArticles);
      
      // Make Claude API call
      const response = await this.anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 4096,
        temperature: 0.2, // Lower temperature for more consistent reasoning
        messages: [{
          role: "user",
          content: prompt
        }]
      });

      // Track usage
      this.trackUsage(response.usage);

      // Parse response
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      const curatedArticles = this.parseClaudeResponse(responseText, preFiltered);
      
      const processingTime = Date.now() - startTime;

      const result: CurationResult = {
        articles: curatedArticles,
        totalProcessed: articles.length,
        curationMethod: "Claude 3 Haiku with advanced reasoning and personalization",
        processingTimeMs: processingTime,
        qualityMetrics: {
          averageScore: this.calculateAverageScore(curatedArticles),
          categoryDistribution: this.getCategoryDistribution(curatedArticles),
          sourcesDiversity: this.getSourcesDiversity(curatedArticles)
        }
      };

      logger.info(`🎯 Claude: Selected ${result.articles.length} articles (avg score: ${result.qualityMetrics.averageScore.toFixed(1)})`);
      return result;

    } catch (error: any) {
      logger.error('Claude curation failed:', error.message);
      return this.fallbackCuration(articles, preferences, maxArticles);
    }
  }

  private intelligentPreFilter(articles: Article[], preferences: UserPreferences): Article[] {
    // More sophisticated filtering for premium tier
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    
    // Score articles for initial filtering
    const scored = articles
      .filter(article => article.publishedAt >= twoDaysAgo)
      .filter(article => article.title.length >= 15)
      .filter(article => article.excerpt && article.excerpt.length >= 80)
      .map(article => {
        let score = 0;
        const content = (article.title + ' ' + (article.excerpt || '')).toLowerCase();
        
        // Topic relevance
        for (const [topic, prefs] of Object.entries(preferences.topics)) {
          if (prefs.interest_score < 0.3) continue;
          const hasKeyword = prefs.keywords.some(keyword => 
            content.includes(keyword.toLowerCase())
          );
          if (hasKeyword) {
            score += prefs.interest_score * 100;
          }
        }
        
        // Source quality bonus
        const highQualitySources = ['reuters', 'ap', 'bbc', 'wsj', 'ft', 'npr'];
        if (highQualitySources.some(s => article.source.name.toLowerCase().includes(s))) {
          score += 20;
        }
        
        // Recency bonus
        const hoursOld = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
        if (hoursOld < 6) score += 15;
        else if (hoursOld < 12) score += 10;
        else if (hoursOld < 24) score += 5;
        
        return { article, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 40) // Keep top 40 for detailed analysis
      .map(item => item.article);
    
    return scored;
  }

  private buildAdvancedCurationPrompt(articles: Article[], preferences: UserPreferences, maxArticles: number): string {
    // Build detailed user profile
    const detailedProfile = this.buildDetailedUserProfile(preferences);
    
    // Create rich article descriptions
    const articlesText = articles.map((article, index) => {
      return `${index + 1}. [ID: ${article.id}]
Title: "${article.title}"
Source: ${article.source.name} (Published: ${article.publishedAt.toISOString()})
Category: ${article.category} | Tags: ${article.tags.join(', ')}
Read Time: ${article.readTime || 'Unknown'} minutes
Excerpt: ${(article.excerpt || '').substring(0, 300)}${(article.excerpt?.length || 0) > 300 ? '...' : ''}
${article.author ? `Author: ${article.author}` : ''}`;
    }).join('\n\n');

    return `You are an expert newsletter curator with exceptional judgment and deep understanding of information value. Your task is to select exactly ${maxArticles} articles that will provide maximum value to this specific user.

## Detailed User Profile:
${detailedProfile}

## Today's Content Pool:
I have ${articles.length} high-quality articles from trusted sources:

${articlesText}

## Curation Philosophy:
You have access to premium reasoning capabilities. Use advanced analysis to consider:

1. **Deep Relevance**: How does this content align with the user's nuanced interests and current context?
2. **Information Value**: What unique insights, implications, or actionable information does this provide?
3. **Intellectual Growth**: How does this expand the user's understanding or challenge their thinking?
4. **Timeliness & Impact**: What's the significance and timing of this information?
5. **Complementary Selection**: How do the selected articles work together as a cohesive information diet?

## Advanced Selection Criteria:
- Prioritize articles with depth and substance over surface-level news
- Include strategic mix: breaking developments (30%), deep analysis (50%), discovery content (20%)
- Ensure intellectual coherence across the selection
- Consider second and third-order implications of news
- Balance confirmation of user interests with valuable expansion of knowledge

## Required Output Format:
Provide exactly ${maxArticles} selections as a JSON array:

[
  {
    "id": "article_id_here",
    "selection_score": 92,
    "selection_reason": "Exceptional analysis of AI governance with direct implications for tech policy - perfectly aligned with user's deep technology interests and policy awareness needs",
    "target_section": "highlights",
    "ai_summary": "This piece provides crucial insights into emerging AI regulatory frameworks that will fundamentally reshape how technology companies operate, offering both immediate relevance and strategic foresight.",
    "intellectual_value": "High - challenges conventional thinking about AI regulation",
    "confidence_level": 0.95
  }
]

Available sections: "highlights" (top 3-4 exceptional pieces), "technology", "business", "science", "general", "discovery"

Focus on selections that will make the user think "I'm glad I read this" and "I wouldn't have found this elsewhere."`;
  }

  private buildDetailedUserProfile(preferences: UserPreferences): string {
    const topicAnalysis = Object.entries(preferences.topics)
      .filter(([_, prefs]) => prefs.interest_score > 0.3)
      .map(([topic, prefs]) => {
        const subtopicsText = prefs.subtopics ? 
          Object.entries(prefs.subtopics)
            .map(([sub, score]) => `${sub} (${score})`)
            .join(', ') : 'Not specified';
        
        return `- **${topic}** (Interest: ${prefs.interest_score})
  Keywords: ${prefs.keywords.join(', ')}
  Subtopics: ${subtopicsText}`;
      }).join('\n');

    const readingPatterns = `
- Preferred category order: ${preferences.reading_patterns.preferred_categories_order.join(' → ')}
- Articles per category: ${preferences.reading_patterns.max_articles_per_category}
- Focus vs Discovery balance: ${preferences.reading_patterns.diversity_vs_focus} (${preferences.reading_patterns.diversity_vs_focus > 0.7 ? 'Focus-oriented' : preferences.reading_patterns.diversity_vs_focus < 0.3 ? 'Discovery-oriented' : 'Balanced'})`;

    const contentPrefs = Object.entries(preferences.content_preferences.content_types)
      .map(([type, preference]) => `${type}: ${preference}`)
      .join(', ');

    return `### Interest Areas:
${topicAnalysis}

### Reading Patterns:
${readingPatterns}

### Content Type Preferences:
${contentPrefs}

### Length Preferences:
- Short articles (${preferences.content_preferences.article_length.short}), Medium articles (${preferences.content_preferences.article_length.medium}), Long articles (${preferences.content_preferences.article_length.long})

This user values intellectual depth, strategic insights, and information that connects to broader patterns and implications.`;
  }

  private parseClaudeResponse(response: string, articles: Article[]): CuratedArticle[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Claude response');
      }

      const selections = JSON.parse(jsonMatch[0]);
      const curatedArticles: CuratedArticle[] = [];

      for (const selection of selections) {
        const article = articles.find(a => a.id === selection.id);
        if (article && selection.selection_score && selection.target_section) {
          curatedArticles.push({
            ...article,
            selectionScore: selection.selection_score,
            selectionReason: selection.selection_reason || 'Selected by Claude',
            targetSection: selection.target_section,
            aiSummary: selection.ai_summary,
            confidenceScore: selection.confidence_level || 0.9 // High confidence for Claude
          });
        }
      }

      return curatedArticles;
    } catch (error: any) {
      logger.error('Error parsing Claude response:', error.message);
      return [];
    }
  }

  private fallbackCuration(
    articles: Article[], 
    preferences: UserPreferences, 
    maxArticles: number
  ): CurationResult {
    logger.info('Using fallback rule-based curation for Claude provider');
    
    // Intelligent fallback that mimics some Claude reasoning
    const scored = articles
      .map(article => {
        let score = 0;
        const content = (article.title + ' ' + (article.excerpt || '')).toLowerCase();
        
        // Topic matching with sophistication
        for (const [topic, prefs] of Object.entries(preferences.topics)) {
          let topicRelevance = 0;
          for (const keyword of prefs.keywords) {
            if (content.includes(keyword.toLowerCase())) {
              topicRelevance += prefs.interest_score * 20;
              if (article.title.toLowerCase().includes(keyword.toLowerCase())) {
                topicRelevance += 10; // Title bonus
              }
            }
          }
          score += topicRelevance;
        }
        
        // Quality indicators
        if (article.readTime && article.readTime >= 3 && article.readTime <= 8) score += 15;
        if (article.excerpt && article.excerpt.length > 200) score += 10;
        if (article.author) score += 5;
        
        // Source credibility
        const premiumSources = ['reuters', 'wsj', 'ft', 'economist', 'atlantic'];
        if (premiumSources.some(s => article.source.name.toLowerCase().includes(s))) {
          score += 20;
        }
        
        return {
          ...article,
          selectionScore: Math.min(score, 100),
          selectionReason: 'Sophisticated fallback selection with quality assessment',
          targetSection: this.determineSection(article, score),
          confidenceScore: 0.6
        };
      })
      .sort((a, b) => b.selectionScore - a.selectionScore)
      .slice(0, maxArticles);

    return {
      articles: scored,
      totalProcessed: articles.length,
      curationMethod: "Advanced fallback curation (Claude unavailable)",
      processingTimeMs: 200,
      qualityMetrics: {
        averageScore: this.calculateAverageScore(scored),
        categoryDistribution: this.getCategoryDistribution(scored),
        sourcesDiversity: this.getSourcesDiversity(scored)
      }
    };
  }

  private determineSection(article: Article, score: number): string {
    if (score > 80) return 'highlights';
    if (article.category === 'technology') return 'technology';
    if (article.category === 'business') return 'business';
    if (article.category === 'science') return 'science';
    return 'general';
  }

  private trackUsage(usage: any): void {
    if (usage) {
      // Estimate cost based on Claude pricing
      const inputCost = (usage.input_tokens / 1000) * 0.00025; // $0.25 per 1K input tokens
      const outputCost = (usage.output_tokens / 1000) * 0.00125; // $1.25 per 1K output tokens
      const totalCost = inputCost + outputCost;
      
      this.usageTracker.requestsThisMonth++;
      this.usageTracker.estimatedCost += totalCost;
      
      logger.debug(`Claude usage: ${usage.input_tokens + usage.output_tokens} tokens, estimated cost: $${totalCost.toFixed(4)}`);
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