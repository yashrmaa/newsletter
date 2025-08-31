import Anthropic from '@anthropic-ai/sdk';
import { Article, CurationCriteria } from '../utils/types.js';
import { logger } from '../core/logger.js';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface UserPreferences {
  topics: { [key: string]: { interest_score: number; keywords: string[] } };
  content_preferences: {
    article_length: { short: number; medium: number; long: number };
    content_types: { [key: string]: number };
  };
  reading_patterns: {
    preferred_categories_order: string[];
    max_articles_per_category: number;
    diversity_vs_focus: number;
  };
}

interface CuratedArticle extends Article {
  selectionReason: string;
  selectionScore: number;
  targetSection: string;
  claudeSummary?: string;
}

export class ClaudeCurator {
  private anthropic: Anthropic;
  private userPreferences: UserPreferences;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
    this.userPreferences = this.loadUserPreferences();
  }

  private loadUserPreferences(): UserPreferences {
    try {
      const preferencesPath = join(__dirname, '../../data/preferences/user-preferences.json');
      return JSON.parse(readFileSync(preferencesPath, 'utf-8'));
    } catch (error) {
      logger.error('Error loading user preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      topics: {
        technology: { interest_score: 0.8, keywords: ['ai', 'tech', 'software'] },
        business: { interest_score: 0.6, keywords: ['business', 'startup', 'market'] },
        general: { interest_score: 0.5, keywords: ['news', 'world', 'breaking'] },
      },
      content_preferences: {
        article_length: { short: 0.3, medium: 0.6, long: 0.1 },
        content_types: { breaking_news: 0.4, deep_analysis: 0.5, opinion_pieces: 0.2 },
      },
      reading_patterns: {
        preferred_categories_order: ['technology', 'business', 'general'],
        max_articles_per_category: 5,
        diversity_vs_focus: 0.7,
      },
    };
  }

  async curateArticles(articles: Article[], criteria: CurationCriteria): Promise<CuratedArticle[]> {
    logger.info(`Starting curation of ${articles.length} articles`);
    
    if (articles.length === 0) {
      logger.warn('No articles to curate');
      return [];
    }

    // Pre-filter articles by basic quality and relevance
    const filteredArticles = this.preFilterArticles(articles);
    logger.info(`Pre-filtered to ${filteredArticles.length} articles`);

    // Use Claude to curate the articles
    const curatedArticles = await this.claudeCuration(filteredArticles, criteria);
    
    // Sort by selection score
    curatedArticles.sort((a, b) => b.selectionScore - a.selectionScore);
    
    // Limit to max articles
    const finalSelection = curatedArticles.slice(0, criteria.maxArticles);
    
    logger.info(`Curated ${finalSelection.length} articles from ${articles.length} candidates`);
    
    return finalSelection;
  }

  private preFilterArticles(articles: Article[]): Article[] {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    
    return articles.filter(article => {
      // Filter out very old articles
      if (article.publishedAt < sixHoursAgo) return false;
      
      // Filter out articles without meaningful content
      if (!article.title || article.title.length < 10) return false;
      if (!article.excerpt || article.excerpt.length < 50) return false;
      
      // Filter by user topic interests
      const articleContent = (article.title + ' ' + (article.excerpt || '')).toLowerCase();
      const hasInterestingTopic = Object.entries(this.userPreferences.topics).some(([topic, prefs]) => {
        if (prefs.interest_score < 0.3) return false;
        return prefs.keywords.some(keyword => articleContent.includes(keyword.toLowerCase()));
      });
      
      return hasInterestingTopic;
    });
  }

  private async claudeCuration(articles: Article[], criteria: CurationCriteria): Promise<CuratedArticle[]> {
    const userTopics = Object.entries(this.userPreferences.topics)
      .filter(([_, prefs]) => prefs.interest_score > 0.5)
      .map(([topic, prefs]) => `${topic} (${prefs.interest_score})`)
      .join(', ');

    const trustedSources = Array.from(new Set(articles.map(a => a.source.name))).join(', ');
    
    const prompt = this.buildCurationPrompt(articles, userTopics, trustedSources, criteria.maxArticles);
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      return this.parseCurationResponse(responseText, articles);
      
    } catch (error) {
      logger.error('Error in Claude curation:', error);
      // Fallback to simple scoring
      return this.fallbackCuration(articles, criteria.maxArticles);
    }
  }

  private buildCurationPrompt(articles: Article[], userTopics: string, trustedSources: string, maxArticles: number): string {
    const articleSummaries = articles.slice(0, 50).map((article, index) => {
      return `${index + 1}. [ID: ${article.id}] "${article.title}" 
   Source: ${article.source.name} | Category: ${article.category} | Published: ${article.publishedAt.toISOString()}
   Excerpt: ${(article.excerpt || '').substring(0, 150)}...
   Tags: ${article.tags.join(', ')}`;
    }).join('\n\n');

    return `You are an expert newsletter curator with deep understanding of journalism and content quality. Your role is to select the most valuable and interesting articles for a personalized daily newsletter.

## Your User's Profile:
- Primary interests: ${userTopics}
- Available sources: ${trustedSources}
- Preferred reading style: Mix of breaking news, analysis, and discovery content

## Today's Content Pool:
You have ${articles.length} articles from various sources to choose from:

${articleSummaries}

## Curation Criteria (in order of importance):
1. **Relevance**: Does this align with user interests and current events?
2. **Quality**: Is this well-written, well-sourced, and informative?
3. **Uniqueness**: Does this provide new information or unique perspective?
4. **Timeliness**: Is this timely and actionable for today?
5. **Diversity**: Does this contribute to a well-rounded newsletter?

## Selection Guidelines:
- Choose exactly ${maxArticles} articles maximum
- Aim for 60% user interests, 40% exploration/discovery
- Include mix of breaking news (30%), analysis (50%), and discovery (20%)
- Prioritize articles that would spark thoughtful discussion
- Avoid duplicate stories unless they offer significantly different angles

## Required Output Format:
For each selected article, provide this exact JSON structure:

{
  "id": "article_id_here",
  "selection_score": 8.5,
  "selection_reason": "Brief reason for selection",
  "target_section": "highlights|technology|business|general|discovery",
  "claude_summary": "One sentence explaining why this is valuable"
}

Return ONLY a valid JSON array of selected articles, nothing else. No additional text or explanation.`;
  }

  private parseCurationResponse(response: string, articles: Article[]): CuratedArticle[] {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.warn('No JSON found in Claude response');
        return this.fallbackCuration(articles, 10);
      }

      const selections = JSON.parse(jsonMatch[0]);
      const curatedArticles: CuratedArticle[] = [];

      for (const selection of selections) {
        const article = articles.find(a => a.id === selection.id);
        if (article) {
          curatedArticles.push({
            ...article,
            selectionReason: selection.selection_reason || 'Selected by Claude',
            selectionScore: selection.selection_score || 5.0,
            targetSection: selection.target_section || 'general',
            claudeSummary: selection.claude_summary,
          });
        }
      }

      return curatedArticles;
      
    } catch (error) {
      logger.error('Error parsing Claude response:', error);
      return this.fallbackCuration(articles, 10);
    }
  }

  private fallbackCuration(articles: Article[], maxArticles: number): CuratedArticle[] {
    logger.info('Using fallback curation method');
    
    // Simple scoring based on user preferences
    const scoredArticles = articles.map(article => {
      let score = 0;
      
      // Topic relevance
      const content = (article.title + ' ' + (article.excerpt || '')).toLowerCase();
      for (const [topic, prefs] of Object.entries(this.userPreferences.topics)) {
        const topicMatch = prefs.keywords.some(keyword => content.includes(keyword.toLowerCase()));
        if (topicMatch) {
          score += prefs.interest_score * 3;
        }
      }
      
      // Recency bonus
      const hoursOld = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
      if (hoursOld < 2) score += 2;
      else if (hoursOld < 6) score += 1;
      
      // Source priority
      score += (article.source.name.includes('Reuters') || article.source.name.includes('BBC')) ? 1 : 0;
      
      return {
        ...article,
        selectionReason: 'Algorithmically selected based on preferences',
        selectionScore: score,
        targetSection: article.category === 'technology' ? 'technology' : 
                      article.category === 'business' ? 'business' : 'general',
      };
    });
    
    return scoredArticles
      .sort((a, b) => b.selectionScore - a.selectionScore)
      .slice(0, maxArticles);
  }
}