import { readFileSync } from 'fs';
import { join } from 'path';
import { Article, ContentSource } from '../utils/types.js';
import { RSSAggregator } from './rss-aggregator.js';
import { ContentExtractor } from './content-extractor.js';
import { BlogDiscovery } from '../utils/blog-discovery.js';
import { logger } from '../core/logger.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ContentAggregator {
  private rssAggregator: RSSAggregator;
  private contentExtractor: ContentExtractor;
  private blogDiscovery: BlogDiscovery;
  private sources: ContentSource[];

  constructor() {
    this.rssAggregator = new RSSAggregator();
    this.contentExtractor = new ContentExtractor();
    this.blogDiscovery = new BlogDiscovery();
    this.sources = [];
  }

  /**
   * Initialize sources from ai_blogs.md file
   */
  private async initializeSources(): Promise<void> {
    if (this.sources.length === 0) {
      logger.info('🔧 Discovering blog sources from ai_blogs.md...');
      
      try {
        // First try to load from cache/fallback config
        this.sources = this.loadFallbackSources();
        
        // Then discover new sources from ai_blogs.md (async)
        const discoveredSources = await this.blogDiscovery.discoverBlogSources();
        
        if (discoveredSources.length > 0) {
          this.sources = discoveredSources;
          logger.info(`✅ Loaded ${this.sources.length} discovered blog sources`);
        } else {
          logger.warn('⚠️ Blog discovery failed, using fallback sources');
        }
        
      } catch (error: any) {
        logger.error('Error initializing sources:', error.message);
        this.sources = this.loadFallbackSources();
      }
    }
  }

  /**
   * Load fallback sources from JSON config as backup
   */
  private loadFallbackSources(): ContentSource[] {
    try {
      const sourcesPath = join(__dirname, '../../config/sources/ai-blog-sources.json');
      const sourcesData = JSON.parse(readFileSync(sourcesPath, 'utf-8'));
      
      const allSources: ContentSource[] = [];
      
      // Load all source categories
      const categories = [
        'ai_research_individuals',
        'company_ai_blogs', 
        'ai_publications',
        'ai_tools_platforms',
        'ai_commentary'
      ];
      
      for (const category of categories) {
        if (sourcesData[category]) {
          allSources.push(...sourcesData[category].map((source: any) => ({
            ...source,
            type: 'rss' as const,
            enabled: true,
            errorCount: 0,
          })));
        }
      }
      
      logger.info(`📋 Loaded ${allSources.length} fallback AI blog sources`);
      return allSources;
      
    } catch (error) {
      logger.error('Error loading fallback sources:', error);
      return [];
    }
  }

  async aggregateContent(extractFullContent: boolean = false): Promise<Article[]> {
    logger.info('Starting content aggregation');
    
    // Initialize sources from ai_blogs.md
    await this.initializeSources();
    
    const startTime = Date.now();
    const articles: Article[] = [];
    
    // Fetch RSS articles
    const rssArticles = await this.rssAggregator.fetchFromSources(this.sources);
    articles.push(...rssArticles);
    
    // Filter articles by recency (last 7 days for blog content)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentArticles = articles.filter(article => article.publishedAt >= sevenDaysAgo);
    
    // Extract full content if requested
    let finalArticles = recentArticles;
    if (extractFullContent && recentArticles.length > 0) {
      logger.info('🔍 Extracting full content for articles...');
      finalArticles = await this.contentExtractor.extractBatchContent(recentArticles, 3); // Limit to 3 concurrent requests
    }
    
    // Sort by priority (source priority) and publication date
    finalArticles.sort((a, b) => {
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
    logger.info(`Found ${finalArticles.length} recent articles from ${this.getUniqueSourceCount(finalArticles)} sources`);
    
    if (extractFullContent) {
      const withFullContent = finalArticles.filter(article => 
        article.content && article.content.length > 500
      ).length;
      logger.info(`📄 ${withFullContent}/${finalArticles.length} articles have full content extracted`);
    }
    
    return finalArticles;
  }

  private getUniqueSourceCount(articles: Article[]): number {
    const uniqueSources = new Set(articles.map(article => article.source.id));
    return uniqueSources.size;
  }

  getSources(): ContentSource[] {
    // Load fallback sources if no sources are initialized
    if (this.sources.length === 0) {
      this.sources = this.loadFallbackSources();
    }
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