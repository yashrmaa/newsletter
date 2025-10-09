import { promises as fs } from 'fs';
import path from 'path';
import { Article } from '../utils/types.js';
import { logger } from './logger.js';

export interface FeedbackData {
  articles: {
    [articleId: string]: {
      rating: 'like' | 'dislike';
      timestamp: string;
      source: string;
      title: string;
      tags?: string[];
    };
  };
  sources: {
    [sourceId: string]: number; // Accumulated score (+1 for like, -1 for dislike)
  };
  topics: {
    [topic: string]: number;
  };
  stats: {
    totalLikes: number;
    totalDislikes: number;
    lastUpdated: string;
  };
  preferences: {
    excludedSources: string[];
    prioritizedSources: string[];
  };
}

export class FeedbackSystem {
  private dataPath: string;
  private feedbackData: FeedbackData;

  constructor() {
    this.dataPath = path.resolve('./data/feedback.json');
    this.feedbackData = this.getEmptyFeedbackData();
  }

  private getEmptyFeedbackData(): FeedbackData {
    return {
      articles: {},
      sources: {},
      topics: {},
      stats: {
        totalLikes: 0,
        totalDislikes: 0,
        lastUpdated: new Date().toISOString(),
      },
      preferences: {
        excludedSources: [],
        prioritizedSources: [],
      },
    };
  }

  async loadFeedback(): Promise<void> {
    try {
      const data = await fs.readFile(this.dataPath, 'utf-8');
      this.feedbackData = JSON.parse(data);
      
      // Ensure all required fields exist (for backward compatibility)
      if (!this.feedbackData.preferences) {
        this.feedbackData.preferences = { excludedSources: [], prioritizedSources: [] };
      }
      if (!this.feedbackData.topics) {
        this.feedbackData.topics = {};
      }
      
      logger.info(`📊 Feedback loaded: ${this.feedbackData.stats.totalLikes} likes, ${this.feedbackData.stats.totalDislikes} dislikes`);
      logger.info(`🚫 Excluded sources: ${this.feedbackData.preferences.excludedSources.length}`);
      logger.info(`⭐ Prioritized sources: ${this.feedbackData.preferences.prioritizedSources.length}`);
    } catch (error) {
      logger.info('📝 No existing feedback found, starting fresh');
      this.feedbackData = this.getEmptyFeedbackData();
    }
  }

  async saveFeedback(): Promise<void> {
    try {
      this.feedbackData.stats.lastUpdated = new Date().toISOString();
      await fs.mkdir(path.dirname(this.dataPath), { recursive: true });
      await fs.writeFile(this.dataPath, JSON.stringify(this.feedbackData, null, 2));
      logger.info('💾 Feedback data saved successfully');
    } catch (error) {
      logger.error('Failed to save feedback data:', error);
    }
  }

  async recordFeedback(articleId: string, rating: 'like' | 'dislike', article: Article): Promise<void> {
    const sourceId = this.normalizeSourceId(article.source.name);
    
    // Record individual article feedback
    this.feedbackData.articles[articleId] = {
      rating,
      timestamp: new Date().toISOString(),
      source: sourceId,
      title: article.title,
      tags: article.tags || [],
    };

    // Update source score
    if (!this.feedbackData.sources[sourceId]) {
      this.feedbackData.sources[sourceId] = 0;
    }
    
    const scoreChange = rating === 'like' ? 1 : -1;
    this.feedbackData.sources[sourceId] += scoreChange;
    
    // Update stats
    if (rating === 'like') {
      this.feedbackData.stats.totalLikes += 1;
    } else {
      this.feedbackData.stats.totalDislikes += 1;
    }

    // Update topic scores if available
    if (article.tags && article.tags.length > 0) {
      article.tags.forEach(tag => {
        if (!this.feedbackData.topics[tag]) {
          this.feedbackData.topics[tag] = 0;
        }
        this.feedbackData.topics[tag] += scoreChange;
      });
    }

    // Update source preferences
    this.updateSourcePreferences(sourceId);
    
    await this.saveFeedback();
    
    const newScore = this.feedbackData.sources[sourceId];
    logger.info(`📝 Recorded ${rating} for "${article.title}" from ${sourceId} (score: ${newScore})`);
  }

  private updateSourcePreferences(sourceId: string): void {
    const score = this.feedbackData.sources[sourceId];
    
    // Remove from both lists first
    this.feedbackData.preferences.excludedSources = 
      this.feedbackData.preferences.excludedSources.filter(s => s !== sourceId);
    this.feedbackData.preferences.prioritizedSources = 
      this.feedbackData.preferences.prioritizedSources.filter(s => s !== sourceId);
    
    // Add to appropriate list based on score
    if (score <= -3) {
      this.feedbackData.preferences.excludedSources.push(sourceId);
      logger.info(`🚫 Source "${sourceId}" excluded (score: ${score})`);
    } else if (score >= 3) {
      this.feedbackData.preferences.prioritizedSources.push(sourceId);
      logger.info(`⭐ Source "${sourceId}" prioritized (score: ${score})`);
    }
  }

  private normalizeSourceId(sourceName: string): string {
    return sourceName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Calculate preference-influenced score for article ranking
  calculateArticleScore(article: Article, baseScore: number): number {
    const sourceId = this.normalizeSourceId(article.source.name);
    let score = baseScore;

    // Apply source preference (strong influence)
    const sourceScore = this.feedbackData.sources[sourceId] || 0;
    score += sourceScore * 2; // Each like/dislike point adds/subtracts 2 to base score

    // Apply topic preferences (moderate influence)
    if (article.tags && article.tags.length > 0) {
      let topicBonus = 0;
      article.tags.forEach(tag => {
        const topicScore = this.feedbackData.topics[tag] || 0;
        topicBonus += topicScore;
      });
      score += (topicBonus / article.tags.length) * 0.5; // Average topic bonus, weighted
    }

    // Heavy penalty for excluded sources
    if (this.feedbackData.preferences.excludedSources.includes(sourceId)) {
      score -= 1000; // Essentially removes from consideration
    }

    // Bonus for prioritized sources  
    if (this.feedbackData.preferences.prioritizedSources.includes(sourceId)) {
      score += 10;
    }

    return score;
  }

  // Filter articles based on preferences
  filterArticles(articles: Article[]): Article[] {
    const excludedSources = new Set(this.feedbackData.preferences.excludedSources);
    
    const filtered = articles.filter(article => {
      const sourceId = this.normalizeSourceId(article.source.name);
      return !excludedSources.has(sourceId);
    });

    const filteredCount = articles.length - filtered.length;
    if (filteredCount > 0) {
      logger.info(`🚫 Filtered out ${filteredCount} articles from excluded sources`);
    }

    return filtered;
  }

  // Rank articles with preference-influenced scoring
  rankArticles(articles: Article[], baseScoreFunction?: (article: Article) => number): Article[] {
    return articles
      .map(article => ({
        ...article,
        preferenceScore: this.calculateArticleScore(
          article, 
          baseScoreFunction ? baseScoreFunction(article) : 50 // Default base score
        ),
      }))
      .sort((a, b) => b.preferenceScore - a.preferenceScore)
      .map(({ preferenceScore, ...article }) => article); // Remove the added score field
  }

  // Get feedback statistics for display
  getFeedbackStats() {
    return {
      ...this.feedbackData.stats,
      excludedSourcesCount: this.feedbackData.preferences.excludedSources.length,
      prioritizedSourcesCount: this.feedbackData.preferences.prioritizedSources.length,
      excludedSources: this.feedbackData.preferences.excludedSources,
      prioritizedSources: this.feedbackData.preferences.prioritizedSources,
      topSources: this.getTopSources(),
    };
  }

  private getTopSources(): { liked: Array<{ source: string; score: number }>; disliked: Array<{ source: string; score: number }> } {
    const sources = Object.entries(this.feedbackData.sources);
    
    return {
      liked: sources
        .filter(([_, score]) => score > 0)
        .sort(([_, a], [__, b]) => b - a)
        .slice(0, 5)
        .map(([source, score]) => ({ source, score })),
      disliked: sources
        .filter(([_, score]) => score < 0)
        .sort(([_, a], [__, b]) => a - b)
        .slice(0, 5)
        .map(([source, score]) => ({ source, score })),
    };
  }

  // Get personalization message for article display
  getPersonalizationMessage(article: Article): string | null {
    const sourceId = this.normalizeSourceId(article.source.name);
    const sourceScore = this.feedbackData.sources[sourceId] || 0;
    
    if (this.feedbackData.preferences.prioritizedSources.includes(sourceId)) {
      return '⭐ From a source you love';
    } else if (sourceScore >= 2) {
      return '👍 From a source you frequently like';
    } else if (sourceScore <= -2) {
      return '⚠️ From a source you\'ve disliked before';
    }
    
    // Check topic preferences
    if (article.tags && article.tags.length > 0) {
      const avgTopicScore = article.tags.reduce((sum, tag) => {
        return sum + (this.feedbackData.topics[tag] || 0);
      }, 0) / article.tags.length;
      
      if (avgTopicScore >= 2) {
        return '✨ Contains topics you enjoy';
      } else if (avgTopicScore <= -2) {
        return '⚠️ Contains topics you\'ve disliked';
      }
    }
    
    return null;
  }

  // Export data for debugging/analysis
  exportData(): FeedbackData {
    return { ...this.feedbackData };
  }

  // Reset all feedback data
  async resetFeedback(): Promise<void> {
    this.feedbackData = this.getEmptyFeedbackData();
    await this.saveFeedback();
    logger.info('🗑️ All feedback data has been reset');
  }
}