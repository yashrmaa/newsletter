import { promises as fs } from 'fs';
import path from 'path';
import { Article } from '../utils/types.js';
import { logger } from './logger.js';

export interface FeedbackData {
  articleFeedback: {
    [articleId: string]: {
      rating: 'like' | 'dislike';
      timestamp: string;
      source: string;
      tags?: string[];
    };
  };
  sourceScores: {
    [sourceId: string]: number;
  };
  topicScores: {
    [topic: string]: number;
  };
  excludedSources: string[];
  stats: {
    totalLikes: number;
    totalDislikes: number;
    lastUpdated: string;
  };
}

export class FeedbackManager {
  private feedbackPath: string;
  private feedbackData: FeedbackData;

  constructor() {
    this.feedbackPath = path.resolve('./data/feedback-data.json');
    this.feedbackData = this.getEmptyFeedbackData();
  }

  private getEmptyFeedbackData(): FeedbackData {
    return {
      articleFeedback: {},
      sourceScores: {},
      topicScores: {},
      excludedSources: [],
      stats: {
        totalLikes: 0,
        totalDislikes: 0,
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  async loadFeedback(): Promise<void> {
    try {
      const data = await fs.readFile(this.feedbackPath, 'utf-8');
      this.feedbackData = JSON.parse(data);
      logger.info(`📊 Loaded feedback data: ${this.feedbackData.stats.totalLikes} likes, ${this.feedbackData.stats.totalDislikes} dislikes`);
    } catch (error) {
      logger.info('📝 No existing feedback data found, starting fresh');
      this.feedbackData = this.getEmptyFeedbackData();
    }
  }

  async saveFeedback(): Promise<void> {
    try {
      this.feedbackData.stats.lastUpdated = new Date().toISOString();
      await fs.mkdir(path.dirname(this.feedbackPath), { recursive: true });
      await fs.writeFile(this.feedbackPath, JSON.stringify(this.feedbackData, null, 2));
      logger.info('💾 Feedback data saved');
    } catch (error) {
      logger.error('Failed to save feedback data:', error);
    }
  }

  async recordFeedback(articleId: string, rating: 'like' | 'dislike', article: Article): Promise<void> {
    // Record the individual feedback
    this.feedbackData.articleFeedback[articleId] = {
      rating,
      timestamp: new Date().toISOString(),
      source: article.source.id,
      tags: article.tags,
    };

    // Update source score
    const sourceId = article.source.id;
    if (!this.feedbackData.sourceScores[sourceId]) {
      this.feedbackData.sourceScores[sourceId] = 0;
    }
    
    if (rating === 'like') {
      this.feedbackData.sourceScores[sourceId] += 1;
      this.feedbackData.stats.totalLikes += 1;
      
      // Remove from excluded if it gets enough likes
      if (this.feedbackData.sourceScores[sourceId] >= 3) {
        this.feedbackData.excludedSources = this.feedbackData.excludedSources.filter(s => s !== sourceId);
      }
    } else {
      this.feedbackData.sourceScores[sourceId] -= 1;
      this.feedbackData.stats.totalDislikes += 1;
      
      // Add to excluded if too many dislikes
      if (this.feedbackData.sourceScores[sourceId] <= -3 && !this.feedbackData.excludedSources.includes(sourceId)) {
        this.feedbackData.excludedSources.push(sourceId);
        logger.info(`🚫 Source "${article.source.name}" excluded due to negative feedback`);
      }
    }

    // Update topic scores
    if (article.tags && article.tags.length > 0) {
      article.tags.forEach(tag => {
        if (!this.feedbackData.topicScores[tag]) {
          this.feedbackData.topicScores[tag] = 0;
        }
        this.feedbackData.topicScores[tag] += rating === 'like' ? 1 : -1;
      });
    }

    await this.saveFeedback();
    logger.info(`📝 Recorded ${rating} for article from ${article.source.name}`);
  }

  getSourceScore(sourceId: string): number {
    return this.feedbackData.sourceScores[sourceId] || 0;
  }

  getTopicScore(topic: string): number {
    return this.feedbackData.topicScores[topic] || 0;
  }

  isSourceExcluded(sourceId: string): boolean {
    return this.feedbackData.excludedSources.includes(sourceId);
  }

  getExcludedSources(): string[] {
    return this.feedbackData.excludedSources;
  }

  getFeedbackStats() {
    return {
      ...this.feedbackData.stats,
      excludedSourcesCount: this.feedbackData.excludedSources.length,
      topLikedSources: this.getTopSources(true),
      topDislikedSources: this.getTopSources(false),
    };
  }

  private getTopSources(liked: boolean): Array<{ source: string; score: number }> {
    return Object.entries(this.feedbackData.sourceScores)
      .filter(([_, score]) => liked ? score > 0 : score < 0)
      .sort(([_, a], [__, b]) => liked ? b - a : a - b)
      .slice(0, 3)
      .map(([source, score]) => ({ source, score }));
  }

  // Calculate article score based on feedback history
  calculateArticleScore(article: Article, baseScore: number): number {
    let score = baseScore;

    // Apply source preference (strong weight)
    const sourceScore = this.getSourceScore(article.source.id);
    score += sourceScore * 2;

    // Apply topic preferences (moderate weight)
    if (article.tags && article.tags.length > 0) {
      const topicBonus = article.tags.reduce((sum, tag) => {
        return sum + (this.getTopicScore(tag) * 0.5);
      }, 0);
      score += topicBonus / article.tags.length;
    }

    // Penalize heavily if source is excluded
    if (this.isSourceExcluded(article.source.id)) {
      score -= 100;
    }

    return score;
  }

  // Get personalization message for an article
  getPersonalizationMessage(article: Article): string | null {
    const sourceScore = this.getSourceScore(article.source.id);
    
    if (sourceScore >= 3) {
      return `⭐ From a source you frequently like`;
    } else if (sourceScore <= -2) {
      return `⚠️ From a source you've disliked`;
    }
    
    if (article.tags && article.tags.length > 0) {
      const topicScores = article.tags.map(tag => this.getTopicScore(tag));
      const avgTopicScore = topicScores.reduce((a, b) => a + b, 0) / topicScores.length;
      
      if (avgTopicScore >= 2) {
        return `✨ Contains topics you enjoy`;
      }
    }
    
    return null;
  }
}