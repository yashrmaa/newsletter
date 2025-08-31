import { readFileSync } from 'fs';
import { join } from 'path';
import { Article, ContentSource } from '../utils/types.js';
import { RSSAggregator } from './rss-aggregator.js';
import { logger } from '../core/logger.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ContentAggregator {
  private rssAggregator: RSSAggregator;
  private sources: ContentSource[];

  constructor() {
    this.rssAggregator = new RSSAggregator();
    this.sources = this.loadSources();
  }

  private loadSources(): ContentSource[] {
    try {
      const sourcesPath = join(__dirname, '../../config/sources/news-sources.json');
      const sourcesData = JSON.parse(readFileSync(sourcesPath, 'utf-8'));
      
      const allSources: ContentSource[] = [];
      
      // Load RSS sources
      if (sourcesData.rss_sources) {
        allSources.push(...sourcesData.rss_sources.map((source: any) => ({
          ...source,
          type: 'rss' as const,
          enabled: true,
          errorCount: 0,
        })));
      }
      
      // Load tech sources
      if (sourcesData.tech_sources) {
        allSources.push(...sourcesData.tech_sources.map((source: any) => ({
          ...source,
          type: 'rss' as const,
          enabled: true,
          errorCount: 0,
        })));
      }
      
      // Load business sources
      if (sourcesData.business_sources) {
        allSources.push(...sourcesData.business_sources.map((source: any) => ({
          ...source,
          type: 'rss' as const,
          enabled: true,
          errorCount: 0,
        })));
      }
      
      logger.info(`Loaded ${allSources.length} content sources`);
      return allSources;
      
    } catch (error) {
      logger.error('Error loading sources:', error);
      return [];
    }
  }

  async aggregateContent(): Promise<Article[]> {
    logger.info('Starting content aggregation');
    
    const startTime = Date.now();
    const articles: Article[] = [];
    
    // Fetch RSS articles
    const rssArticles = await this.rssAggregator.fetchFromSources(this.sources);
    articles.push(...rssArticles);
    
    // Filter articles by recency (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentArticles = articles.filter(article => article.publishedAt >= oneDayAgo);
    
    // Sort by priority (source priority) and publication date
    recentArticles.sort((a, b) => {
      const sourceA = this.sources.find(s => s.id === a.source.id);
      const sourceB = this.sources.find(s => s.id === b.source.id);
      
      const priorityA = sourceA?.priority || 0;
      const priorityB = sourceB?.priority || 0;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority first
      }
      
      return b.publishedAt.getTime() - a.publishedAt.getTime(); // Newer first
    });
    
    const endTime = Date.now();
    logger.info(`Content aggregation completed in ${endTime - startTime}ms`);
    logger.info(`Found ${recentArticles.length} recent articles from ${this.getUniqueSourceCount(recentArticles)} sources`);
    
    return recentArticles;
  }

  private getUniqueSourceCount(articles: Article[]): number {
    const uniqueSources = new Set(articles.map(article => article.source.id));
    return uniqueSources.size;
  }

  getSources(): ContentSource[] {
    return [...this.sources];
  }

  getSourceById(id: string): ContentSource | undefined {
    return this.sources.find(source => source.id === id);
  }

  updateSourceStatus(sourceId: string, lastFetched: Date, errorCount: number = 0) {
    const source = this.sources.find(s => s.id === sourceId);
    if (source) {
      source.lastFetched = lastFetched;
      source.errorCount = errorCount;
      source.enabled = errorCount < 5; // Disable source if too many errors
    }
  }
}