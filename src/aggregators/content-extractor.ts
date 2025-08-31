import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../core/logger.js';
import { Article } from '../utils/types.js';

export class ContentExtractor {
  private timeout = 15000; // 15 second timeout
  
  async extractFullContent(article: Article): Promise<Article> {
    // If the article already has substantial content, return it
    if (article.content && article.content.length > 500) {
      return article;
    }

    try {
      logger.debug(`Extracting full content from: ${article.url}`);
      
      const response = await axios.get(article.url, {
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        maxRedirects: 5,
      });

      const $ = cheerio.load(response.data);
      
      // Extract article content using multiple strategies
      const extractedContent = this.extractArticleContent($);
      const cleanedContent = this.cleanContent(extractedContent);
      
      if (cleanedContent.length > 200) {
        logger.debug(`Successfully extracted ${cleanedContent.length} characters from ${article.source.name}`);
        
        return {
          ...article,
          content: cleanedContent,
          readTime: this.estimateReadTime(cleanedContent),
          excerpt: this.generateExcerpt(cleanedContent)
        };
      } else {
        logger.warn(`Insufficient content extracted from ${article.url} (${cleanedContent.length} chars)`);
        return article; // Return original if extraction failed
      }
      
    } catch (error: any) {
      logger.warn(`Failed to extract content from ${article.url}: ${error.message}`);
      return article; // Return original article if extraction fails
    }
  }

  private extractArticleContent($: cheerio.CheerioAPI): string {
    // Try different content selectors in order of preference
    const contentSelectors = [
      // Common article content selectors
      'article [data-testid="article-body"]',
      'article .article-body',
      'article .content',
      'article .entry-content',
      'article .post-content',
      '.article-content',
      '.story-body',
      '.entry-content',
      '.post-content',
      '.content-body',
      '.article-text',
      '[data-testid="article-content"]',
      '.ArticleBody-articleBody',
      '.RichTextBody',
      '.story-content',
      
      // Site-specific selectors
      '.StoryBodyCompanionColumn', // New York Times
      '.entry-content', // WordPress sites
      '.field-item', // Some news sites
      '.pane-content', // Some news sites
      '.articleBody', // Some news sites
      
      // Generic fallbacks
      'article p',
      '.content p',
      'main p',
      
      // Last resort
      'p'
    ];

    for (const selector of contentSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        let content = '';
        
        elements.each((i, elem) => {
          const text = $(elem).text().trim();
          if (text.length > 50) { // Only include substantial paragraphs
            content += text + '\n\n';
          }
        });

        if (content.length > 500) { // If we got substantial content
          return content;
        }
      }
    }

    // Final fallback - get all text from the main content area
    const mainContent = $('main').text() || $('article').text() || $('.content').text() || $('body').text();
    return mainContent.substring(0, 5000); // Limit to prevent huge content
  }

  private cleanContent(content: string): string {
    return content
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      // Remove common unwanted phrases
      .replace(/subscribe to our newsletter/gi, '')
      .replace(/sign up for our newsletter/gi, '')
      .replace(/follow us on/gi, '')
      .replace(/share this article/gi, '')
      .replace(/advertisement/gi, '')
      .replace(/sponsored content/gi, '')
      // Remove email addresses and social media handles
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '')
      .replace(/@\w+/g, '')
      // Clean up
      .trim();
  }

  private generateExcerpt(content: string, length: number = 200): string {
    const sentences = content.match(/[^\.!?]+[\.!?]+/g);
    if (!sentences) return content.substring(0, length) + '...';
    
    let excerpt = '';
    for (const sentence of sentences) {
      if (excerpt.length + sentence.length <= length) {
        excerpt += sentence;
      } else {
        break;
      }
    }
    
    return excerpt || content.substring(0, length) + '...';
  }

  private estimateReadTime(content: string): number {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  async extractBatchContent(articles: Article[], maxConcurrent: number = 5): Promise<Article[]> {
    logger.info(`🔍 Extracting full content for ${articles.length} articles...`);
    
    const results: Article[] = [];
    
    // Process articles in batches to avoid overwhelming servers
    for (let i = 0; i < articles.length; i += maxConcurrent) {
      const batch = articles.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(article => 
        this.extractFullContent(article)
          .catch(error => {
            logger.warn(`Failed to extract content for ${article.title}: ${error.message}`);
            return article; // Return original if extraction fails
          })
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches to be respectful to servers
      if (i + maxConcurrent < articles.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      logger.info(`📄 Processed batch ${Math.floor(i/maxConcurrent) + 1}/${Math.ceil(articles.length/maxConcurrent)}`);
    }
    
    const successfulExtractions = results.filter(article => 
      article.content && article.content.length > 500
    ).length;
    
    logger.info(`✅ Successfully extracted full content for ${successfulExtractions}/${articles.length} articles`);
    
    return results;
  }
}