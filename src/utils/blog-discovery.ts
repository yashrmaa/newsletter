import { readFileSync } from 'fs';
import { join } from 'path';
import { ContentSource } from './types.js';
import { logger } from '../core/logger.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class BlogDiscovery {
  private blogMdPath: string;

  constructor() {
    this.blogMdPath = join(__dirname, '../../ai_blogs.md');
  }

  /**
   * Parse the ai_blogs.md file and discover RSS feeds for all listed blogs
   */
  async discoverBlogSources(): Promise<ContentSource[]> {
    try {
      logger.info('🔍 Discovering blog sources from ai_blogs.md...');
      
      const markdownContent = readFileSync(this.blogMdPath, 'utf-8');
      const blogUrls = this.extractBlogUrls(markdownContent);
      
      logger.info(`📋 Found ${blogUrls.length} blog URLs to process`);
      
      // Convert URLs to RSS feed sources
      const sources: ContentSource[] = [];
      
      for (const blogUrl of blogUrls) {
        const rssFeeds = await this.discoverRssFeeds(blogUrl);
        sources.push(...rssFeeds);
      }
      
      logger.info(`✅ Successfully discovered ${sources.length} RSS feeds`);
      return sources;
      
    } catch (error: any) {
      logger.error('Error discovering blog sources:', error.message);
      return [];
    }
  }

  /**
   * Extract all blog URLs from the markdown content
   */
  private extractBlogUrls(markdown: string): string[] {
    const urls: string[] = [];
    
    // Match markdown links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    
    while ((match = linkRegex.exec(markdown)) !== null) {
      const url = match[2];
      
      // Filter out non-blog URLs (social media, etc.)
      if (this.isBlogUrl(url)) {
        urls.push(url);
      }
    }
    
    // Remove duplicates
    return Array.from(new Set(urls));
  }

  /**
   * Check if a URL is likely a blog URL (not social media, etc.)
   */
  private isBlogUrl(url: string): boolean {
    const blogDomains = [
      'github.io',
      'blog.',
      'dev.to',
      '.ai/',
      '.com/blog',
      '.org/blog',
      'medium.com',
      'substack.com',
      'wordpress.com',
      'blogspot.com',
      'research.',
      'news.',
      'huggingface.co',
      'openai.com',
      'anthropic.com',
      'deepmind.com',
      'ai.googleblog.com',
      'blog.langchain',
      'pinecone.io',
      'wandb.ai',
      'thegradient.pub',
      'distill.pub',
      'alignmentforum.org',
      'lesswrong.com',
      'ruder.io',
      'eugeneyan.com',
      'huyenchip.com',
      'vickiboykis.com'
    ];
    
    // Exclude common non-blog domains
    const excludeDomains = [
      'twitter.com',
      'linkedin.com',
      'facebook.com',
      'youtube.com',
      'github.com' // Direct GitHub repos, not GitHub pages
    ];
    
    const urlLower = url.toLowerCase();
    
    // Exclude non-blog domains
    if (excludeDomains.some(domain => urlLower.includes(domain))) {
      return false;
    }
    
    // Include known blog domains
    return blogDomains.some(domain => urlLower.includes(domain));
  }

  /**
   * Discover RSS feeds for a given blog URL
   */
  private async discoverRssFeeds(blogUrl: string): Promise<ContentSource[]> {
    const sources: ContentSource[] = [];
    
    try {
      // Common RSS feed patterns
      const rssPatterns = [
        '/rss.xml',
        '/feed.xml',
        '/feed/',
        '/rss/',
        '/atom.xml',
        '/feeds/posts/default',
        '/feed.rss',
        '/index.xml',
        '/rss/feed.xml',
        '/blog/feed.xml',
        '/blog/rss.xml'
      ];
      
      const baseUrl = this.normalizeUrl(blogUrl);
      const blogName = this.extractBlogName(blogUrl);
      
      // Try each RSS pattern
      for (const pattern of rssPatterns) {
        const rssUrl = baseUrl + pattern;
        
        try {
          // Test if RSS feed is accessible
          const isValid = await this.validateRssUrl(rssUrl);
          
          if (isValid) {
            const source: ContentSource = {
              id: this.generateSourceId(blogName, rssUrl),
              name: blogName,
              url: rssUrl,
              category: this.categorizeBlog(blogUrl),
              priority: this.assignPriority(blogUrl),
              // description: `RSS feed for ${blogName}`,
              type: 'rss',
              enabled: true,
              errorCount: 0
            };
            
            sources.push(source);
            logger.debug(`✅ Found RSS feed: ${rssUrl}`);
            break; // Use first working RSS feed for this blog
          }
        } catch (error) {
          // Continue trying other patterns
        }
      }
      
      if (sources.length === 0) {
        logger.warn(`❌ No RSS feed found for ${blogUrl}`);
      }
      
    } catch (error: any) {
      logger.warn(`Failed to discover RSS for ${blogUrl}: ${error.message}`);
    }
    
    return sources;
  }

  /**
   * Validate that an RSS URL is accessible and contains valid RSS content
   */
  private async validateRssUrl(rssUrl: string): Promise<boolean> {
    try {
      const axios = await import('axios');
      
      const response = await axios.default.get(rssUrl, {
        timeout: 5000,
        maxRedirects: 3,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsletterBot/1.0)'
        }
      });
      
      const content = response.data;
      
      // Check if content contains RSS/XML indicators
      return typeof content === 'string' && (
        content.includes('<rss') ||
        content.includes('<feed') ||
        content.includes('<channel') ||
        content.includes('<?xml')
      );
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Normalize URL to base domain
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch (error) {
      // If URL parsing fails, try to clean it up
      return url.replace(/\/$/, ''); // Remove trailing slash
    }
  }

  /**
   * Extract blog name from URL
   */
  private extractBlogName(url: string): string {
    try {
      const urlObj = new URL(url);
      
      // Extract meaningful name from domain
      let name = urlObj.hostname
        .replace(/^www\./, '')
        .replace(/\.github\.io$/, '')
        .replace(/\.com$/, '')
        .replace(/\.org$/, '')
        .replace(/\.ai$/, '')
        .replace(/\.dev$/, '');
      
      // Handle special cases
      if (name.includes('blog.')) {
        name = name.replace('blog.', '') + ' Blog';
      }
      
      // Convert to title case
      name = name
        .split(/[\.-]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      return name || 'Unknown Blog';
      
    } catch (error) {
      return 'Unknown Blog';
    }
  }

  /**
   * Generate a unique source ID
   */
  private generateSourceId(blogName: string, rssUrl: string): string {
    const id = blogName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Add URL hash to ensure uniqueness
    const urlHash = Buffer.from(rssUrl).toString('base64').slice(0, 6);
    return `${id}-${urlHash}`.toLowerCase();
  }

  /**
   * Categorize blog based on URL patterns
   */
  private categorizeBlog(url: string): string {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('research') || urlLower.includes('arxiv') || urlLower.includes('bair')) {
      return 'ai-research';
    }
    if (urlLower.includes('anthropic') || urlLower.includes('openai') || urlLower.includes('deepmind')) {
      return 'ai-research';
    }
    if (urlLower.includes('blog') || urlLower.includes('dev.to')) {
      return 'ai-engineering';
    }
    if (urlLower.includes('huggingface') || urlLower.includes('langchain') || urlLower.includes('pinecone')) {
      return 'ai-tools';
    }
    if (urlLower.includes('substack') || urlLower.includes('medium')) {
      return 'ai-commentary';
    }
    if (urlLower.includes('alignment') || urlLower.includes('safety')) {
      return 'ai-safety';
    }
    
    return 'ai-general';
  }

  /**
   * Assign priority based on blog reputation and quality
   */
  private assignPriority(url: string): number {
    const urlLower = url.toLowerCase();
    
    // High priority (9-10)
    const highPriority = [
      'openai.com',
      'anthropic.com',
      'deepmind.com',
      'karpathy',
      'lilianweng',
      'simonwillison',
      'colah.github.io'
    ];
    
    // Medium priority (7-8)  
    const mediumPriority = [
      'huggingface.co',
      'google.com',
      'meta.com',
      'distill.pub',
      'thegradient.pub',
      'bair.berkeley.edu'
    ];
    
    // Lower priority (5-6)
    const lowerPriority = [
      'substack.com',
      'medium.com',
      'dev.to'
    ];
    
    if (highPriority.some(pattern => urlLower.includes(pattern))) {
      return 10;
    }
    if (mediumPriority.some(pattern => urlLower.includes(pattern))) {
      return 8;
    }
    if (lowerPriority.some(pattern => urlLower.includes(pattern))) {
      return 6;
    }
    
    return 7; // Default priority
  }
}