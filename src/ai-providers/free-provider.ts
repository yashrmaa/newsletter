import { AIProvider, UserPreferences, CuratedArticle, CurationResult } from './ai-provider.js';
import { Article } from '../utils/types.js';
import { logger } from '../core/logger.js';

export class FreeRuleBasedProvider implements AIProvider {
  readonly name = "Rule-Based Curation";
  readonly costPerMonth = "$0";
  readonly effectiveness = "70%";
  readonly features = [
    "Smart keyword matching",
    "Source credibility scoring", 
    "Trending detection",
    "Content quality assessment",
    "Category balancing"
  ];

  async curate(
    articles: Article[], 
    preferences: UserPreferences,
    maxArticles: number = 15
  ): Promise<CurationResult> {
    const startTime = Date.now();
    logger.info(`🆓 Free Tier: Curating ${articles.length} articles using rule-based algorithm`);

    // Step 1: Score all articles
    const scoredArticles = articles.map(article => this.scoreArticle(article, preferences));

    // Step 2: Apply quality filters
    const qualityFiltered = scoredArticles.filter(article => 
      article.selectionScore >= this.getQualityThreshold(preferences)
    );

    // Step 3: Ensure category diversity
    const diversified = this.ensureCategoryDiversity(qualityFiltered, preferences);

    // Step 4: Apply recency bonus
    const recentlyBoosted = this.applyRecencyBoost(diversified);

    // Step 5: Final selection and sorting
    const finalSelection = recentlyBoosted
      .sort((a, b) => b.selectionScore - a.selectionScore)
      .slice(0, maxArticles);

    // Step 6: Assign target sections
    const withSections = this.assignTargetSections(finalSelection, preferences);

    const processingTime = Date.now() - startTime;

    const result: CurationResult = {
      articles: withSections,
      totalProcessed: articles.length,
      curationMethod: "Rule-based algorithm with trend analysis",
      processingTimeMs: processingTime,
      qualityMetrics: {
        averageScore: this.calculateAverageScore(withSections),
        categoryDistribution: this.getCategoryDistribution(withSections),
        sourcesDiversity: this.getSourcesDiversity(withSections)
      }
    };

    logger.info(`🎯 Free Tier: Selected ${result.articles.length} articles (avg score: ${result.qualityMetrics.averageScore.toFixed(1)})`);
    return result;
  }

  private scoreArticle(article: Article, preferences: UserPreferences): CuratedArticle {
    let score = 0;
    const factors: string[] = [];

    // Topic relevance scoring (0-40 points)
    const topicScore = this.calculateTopicRelevance(article, preferences);
    score += topicScore;
    if (topicScore > 0) factors.push(`topic(+${topicScore.toFixed(1)})`);

    // Source credibility scoring (0-15 points)
    const credibilityScore = this.calculateSourceCredibility(article);
    score += credibilityScore;
    factors.push(`source(+${credibilityScore.toFixed(1)})`);

    // Content quality scoring (0-20 points)
    const qualityScore = this.calculateContentQuality(article);
    score += qualityScore;
    factors.push(`quality(+${qualityScore.toFixed(1)})`);

    // Trending bonus (0-10 points)
    const trendingScore = this.calculateTrendingBonus(article);
    score += trendingScore;
    if (trendingScore > 0) factors.push(`trending(+${trendingScore.toFixed(1)})`);

    // Freshness scoring (0-10 points)
    const freshnessScore = this.calculateFreshnessScore(article);
    score += freshnessScore;
    if (freshnessScore > 0) factors.push(`fresh(+${freshnessScore.toFixed(1)})`);

    // Diversity bonus (0-5 points) - applied later
    const diversityScore = this.calculateDiversityScore(article);
    score += diversityScore;
    if (diversityScore > 0) factors.push(`diverse(+${diversityScore.toFixed(1)})`);

    return {
      ...article,
      selectionScore: Math.min(score, 100), // Cap at 100
      selectionReason: `Rule-based: ${factors.join(', ')}`,
      targetSection: 'general', // Will be updated later
      confidenceScore: this.calculateConfidence(score, factors.length)
    };
  }

  private calculateTopicRelevance(article: Article, preferences: UserPreferences): number {
    // Safely handle tags array - filter out non-strings
    let tags = '';
    if (Array.isArray(article.tags)) {
      const stringTags = article.tags.filter(tag => typeof tag === 'string');
      tags = stringTags.join(' ');
    }
    
    const content = (
      (article.title || '') + ' ' + 
      (article.excerpt || '') + ' ' + 
      tags + ' ' +
      (article.category || '')
    ).toLowerCase();
    let maxRelevance = 0;
    let bestTopic = '';

    for (const [topic, topicPrefs] of Object.entries(preferences.topics)) {
      let topicRelevance = 0;
      
      // Keyword matching with weighted scoring
      for (const keyword of topicPrefs.keywords) {
        if (content.includes(keyword.toLowerCase())) {
          topicRelevance += topicPrefs.interest_score * 10; // Base score
          
          // Bonus for title matches
          if (article.title.toLowerCase().includes(keyword.toLowerCase())) {
            topicRelevance += 5;
          }
          
          // Bonus for tag matches
          if (article.tags.some(tag => tag.toLowerCase().includes(keyword.toLowerCase()))) {
            topicRelevance += 3;
          }
        }
      }
      
      // Category direct match bonus
      if (article.category === topic || article.tags.includes(topic)) {
        topicRelevance += topicPrefs.interest_score * 15;
      }

      if (topicRelevance > maxRelevance) {
        maxRelevance = topicRelevance;
        bestTopic = topic;
      }
    }

    return Math.min(maxRelevance, 40);
  }

  private calculateSourceCredibility(article: Article): number {
    // High-credibility sources get higher scores
    const highCredibilitySources = [
      'reuters', 'ap', 'bbc', 'npr', 'pbs', 'wsj', 'ft', 'economist'
    ];
    
    const mediumCredibilitySources = [
      'cnn', 'nytimes', 'washingtonpost', 'guardian', 'bloomberg', 'axios'
    ];

    const sourceId = article.source.id.toLowerCase();
    const sourceName = article.source.name.toLowerCase();

    if (highCredibilitySources.some(s => sourceId.includes(s) || sourceName.includes(s))) {
      return 15;
    } else if (mediumCredibilitySources.some(s => sourceId.includes(s) || sourceName.includes(s))) {
      return 10;
    } else if (article.source.name.includes('.edu') || article.source.name.includes('.gov')) {
      return 12;
    } else {
      return 5; // Default score for other sources
    }
  }

  private calculateContentQuality(article: Article): number {
    let score = 0;

    // Title quality
    if (article.title.length >= 30 && article.title.length <= 100) {
      score += 5;
    }

    // Excerpt quality
    if (article.excerpt && article.excerpt.length >= 100 && article.excerpt.length <= 300) {
      score += 5;
    }

    // Has meaningful tags
    if (article.tags && article.tags.length >= 2) {
      score += 3;
    }

    // Has author
    if (article.author && article.author.trim() !== '') {
      score += 2;
    }

    // Read time suggests substantial content
    if (article.readTime && article.readTime >= 2 && article.readTime <= 10) {
      score += 5;
    }

    return score;
  }

  private calculateTrendingBonus(article: Article): number {
    // Simple trending detection based on keywords
    const trendingKeywords = [
      'breaking', 'urgent', 'developing', 'update', 'exclusive',
      'major', 'significant', 'important', 'critical', 'emergency'
    ];
    
    const content = (article.title + ' ' + (article.excerpt || '')).toLowerCase();
    let trendingScore = 0;

    for (const keyword of trendingKeywords) {
      if (content.includes(keyword)) {
        trendingScore += 2;
      }
    }

    // Bonus for very recent articles (last 2 hours)
    const hoursOld = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 2) {
      trendingScore += 5;
    } else if (hoursOld < 6) {
      trendingScore += 2;
    }

    return Math.min(trendingScore, 10);
  }

  private calculateFreshnessScore(article: Article): number {
    const hoursOld = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
    
    if (hoursOld < 1) return 10;
    if (hoursOld < 3) return 8;
    if (hoursOld < 6) return 6;
    if (hoursOld < 12) return 4;
    if (hoursOld < 24) return 2;
    return 0;
  }

  private calculateDiversityScore(article: Article): number {
    // This is calculated relative to other selected articles later
    // For now, return base diversity score
    return article.tags.length > 3 ? 2 : 0;
  }

  private calculateConfidence(score: number, factorCount: number): number {
    // Higher scores and more factors = higher confidence
    const scoreConfidence = Math.min(score / 80, 1); // Normalize to 0-1
    const factorConfidence = Math.min(factorCount / 5, 1); // More factors = higher confidence
    return (scoreConfidence + factorConfidence) / 2;
  }

  private getQualityThreshold(preferences: UserPreferences): number {
    // Dynamic threshold based on preference focus
    return preferences.reading_patterns.diversity_vs_focus > 0.7 ? 25 : 20;
  }

  private ensureCategoryDiversity(
    articles: CuratedArticle[], 
    preferences: UserPreferences
  ): CuratedArticle[] {
    const maxPerCategory = preferences.reading_patterns.max_articles_per_category;
    const categoryGroups = new Map<string, CuratedArticle[]>();
    
    // Group by category
    articles.forEach(article => {
      const category = article.category || 'general';
      if (!categoryGroups.has(category)) {
        categoryGroups.set(category, []);
      }
      categoryGroups.get(category)!.push(article);
    });
    
    // Sort each category by score and limit
    const diversified: CuratedArticle[] = [];
    for (const [category, categoryArticles] of categoryGroups) {
      const sorted = categoryArticles.sort((a, b) => b.selectionScore - a.selectionScore);
      const limited = sorted.slice(0, maxPerCategory);
      diversified.push(...limited);
    }
    
    return diversified;
  }

  private applyRecencyBoost(articles: CuratedArticle[]): CuratedArticle[] {
    return articles.map(article => {
      const hoursOld = (Date.now() - article.publishedAt.getTime()) / (1000 * 60 * 60);
      let recencyBoost = 0;
      
      if (hoursOld < 1) recencyBoost = 5;
      else if (hoursOld < 3) recencyBoost = 3;
      else if (hoursOld < 6) recencyBoost = 1;
      
      return {
        ...article,
        selectionScore: article.selectionScore + recencyBoost
      };
    });
  }

  private assignTargetSections(
    articles: CuratedArticle[], 
    preferences: UserPreferences
  ): CuratedArticle[] {
    // Top 3 highest scoring articles go to highlights
    const sorted = [...articles].sort((a, b) => b.selectionScore - a.selectionScore);
    
    return sorted.map((article, index) => {
      if (index < 3 && article.selectionScore > 60) {
        return { ...article, targetSection: 'highlights' };
      } else if (article.category === 'technology') {
        return { ...article, targetSection: 'technology' };
      } else if (article.category === 'business') {
        return { ...article, targetSection: 'business' };
      } else if (article.category === 'science') {
        return { ...article, targetSection: 'science' };
      } else {
        return { ...article, targetSection: 'general' };
      }
    });
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
      requestsThisMonth: 0,
      estimatedCost: 0,
      remainingBudget: Infinity
    };
  }

  isWithinBudget(): boolean {
    return true; // Free tier never exceeds budget
  }
}