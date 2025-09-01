import { Article } from '../utils/types.js';

export interface UserPreferences {
  topics: {
    [key: string]: {
      interest_score: number;
      keywords: string[];
      subtopics?: { [key: string]: number };
    };
  };
  content_preferences: {
    article_length: { short: number; medium: number; long: number };
    content_types: { [key: string]: number };
  };
  reading_patterns: {
    preferred_categories_order: string[];
    max_articles_per_category: number;
    diversity_vs_focus: number;
  };
  authors: {
    [key: string]: {
      score: number;
    };
  };
}

export interface CuratedArticle extends Article {
  selectionReason: string;
  selectionScore: number;
  targetSection: string;
  aiSummary?: string;
  confidenceScore?: number;
}

export interface CurationResult {
  articles: CuratedArticle[];
  totalProcessed: number;
  curationMethod: string;
  processingTimeMs: number;
  qualityMetrics: {
    averageScore: number;
    categoryDistribution: { [key: string]: number };
    sourcesDiversity: number;
  };
}

export interface AIProvider {
  readonly name: string;
  readonly costPerMonth: string;
  readonly effectiveness: string;
  readonly features: string[];
  
  curate(
    articles: Article[], 
    preferences: UserPreferences,
    maxArticles?: number
  ): Promise<CurationResult>;
  
  getUsageStats(): {
    requestsThisMonth: number;
    estimatedCost: number;
    remainingBudget: number;
  };
  
  isWithinBudget(): boolean;
}