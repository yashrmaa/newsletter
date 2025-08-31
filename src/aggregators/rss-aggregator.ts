import Parser from 'rss-parser';
import { Article, ContentSource } from '../utils/types.js';
import { logger } from '../core/logger.js';
import crypto from 'crypto';

export class RSSAggregator {
  private parser: Parser;
  
  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Newsletter-Agent/1.0'
      }
    });
  }

  async fetchFromSource(source: ContentSource): Promise<Article[]> {
    try {
      logger.debug(`Fetching RSS from ${source.name}: ${source.url}`);
      
      const feed = await this.parser.parseURL(source.url);
      const articles: Article[] = [];
      
      for (const item of feed.items.slice(0, 20)) { // Limit to 20 recent items
        if (!item.title || !item.link) continue;
        
        const article: Article = {
          id: this.generateArticleId(item.link, item.title),
          title: item.title,
          url: item.link,
          excerpt: item.contentSnippet || item.content?.substring(0, 200),
          content: item.content,
          author: item.creator || item['dc:creator'] as string,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          source: {
            id: source.id,
            name: source.name,
            url: source.url
          },
          category: source.category,
          tags: this.extractTags(item),
          readTime: this.estimateReadTime(item.content || item.contentSnippet || ''),
        };
        
        articles.push(article);
      }
      
      logger.info(`Fetched ${articles.length} articles from ${source.name}`);
      return articles;
      
    } catch (error) {
      logger.error(`Error fetching RSS from ${source.name}:`, error);
      return [];
    }
  }

  async fetchFromSources(sources: ContentSource[]): Promise<Article[]> {
    logger.info(`Fetching from ${sources.length} RSS sources`);
    
    const promises = sources
      .filter(source => source.type === 'rss' && source.enabled !== false)
      .map(source => this.fetchFromSource(source));
    
    const results = await Promise.allSettled(promises);
    
    const allArticles = results
      .filter((result): result is PromiseFulfilledResult<Article[]> => result.status === 'fulfilled')
      .flatMap(result => result.value);
    
    logger.info(`Total articles fetched: ${allArticles.length}`);
    
    return this.deduplicateArticles(allArticles);
  }

  private generateArticleId(url: string, title: string): string {
    return crypto.createHash('md5').update(url + title).digest('hex');
  }

  private extractTags(item: any): string[] {
    const tags: string[] = [];
    
    if (item.categories) {
      if (Array.isArray(item.categories)) {
        tags.push(...item.categories);
      } else if (typeof item.categories === 'string') {
        tags.push(item.categories);
      }
    }
    
    // Extract tags from content
    const content = (item.content || item.contentSnippet || '').toLowerCase();
    const commonTags = ['ai', 'technology', 'startup', 'business', 'science', 'politics', 'climate', 'security'];
    
    for (const tag of commonTags) {
      if (content.includes(tag)) {
        tags.push(tag);
      }
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  private estimateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
  }

  private deduplicateArticles(articles: Article[]): Article[] {
    const seen = new Set<string>();
    const deduplicated: Article[] = [];
    
    // Sort by publication date (newest first)
    articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
    
    for (const article of articles) {
      const key = this.getDeduplicationKey(article);
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(article);
      }
    }
    
    logger.info(`Deduplicated ${articles.length} articles to ${deduplicated.length}`);
    return deduplicated;
  }

  private getDeduplicationKey(article: Article): string {
    // Use title similarity for deduplication
    const normalizedTitle = article.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    return normalizedTitle.substring(0, 50); // First 50 chars of normalized title
  }
}