import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Article, NewsletterData } from '../utils/types.js';
import { logger } from '../core/logger.js';
import { format, formatDistanceToNow } from 'date-fns';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface CuratedArticle extends Article {
  selectionReason: string;
  selectionScore: number;
  targetSection: string;
  claudeSummary?: string;
}

export class HTMLFormatter {
  private template: HandlebarsTemplateDelegate;

  constructor() {
    this.registerHelpers();
    this.template = this.loadTemplate();
  }

  private registerHelpers() {
    // Format date helper
    Handlebars.registerHelper('formatDate', (date: Date) => {
      try {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return format(parsedDate, 'EEEE, MMMM do, yyyy');
        }
      } catch (error) {
        // Return fallback for invalid dates
      }
      return format(new Date(), 'EEEE, MMMM do, yyyy');
    });

    // Time ago helper
    Handlebars.registerHelper('timeAgo', (date: Date) => {
      try {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return formatDistanceToNow(parsedDate, { addSuffix: true });
        }
      } catch (error) {
        // Return fallback for invalid dates
      }
      return 'unknown time ago';
    });

    // Format generation time helper
    Handlebars.registerHelper('formatGenerationTime', (date: Date) => {
      try {
        const parsedDate = new Date(date);
        if (!isNaN(parsedDate.getTime())) {
          return format(parsedDate, 'h:mm a \'on\' MMM d, yyyy');
        }
      } catch (error) {
        // Return fallback for invalid dates
      }
      return format(new Date(), 'h:mm a \'on\' MMM d, yyyy');
    });

    // Truncate text helper
    Handlebars.registerHelper('truncate', (text: string, length: number) => {
      if (!text || text.length <= length) return text;
      return text.substring(0, length).trim() + '...';
    });

    // Category icon helper
    Handlebars.registerHelper('categoryIcon', (category: string) => {
      const icons: { [key: string]: string } = {
        technology: '💻',
        business: '📈',
        science: '🔬',
        general: '📰',
        politics: '🏛️',
        health: '🏥',
        sports: '⚽',
        entertainment: '🎭',
      };
      return icons[category] || '📰';
    });
  }

  private loadTemplate(): HandlebarsTemplateDelegate {
    try {
      const templatePath = join(__dirname, '../../templates/newsletter/base.hbs');
      const templateContent = readFileSync(templatePath, 'utf-8');
      return Handlebars.compile(templateContent);
    } catch (error) {
      logger.error('Error loading template:', error);
      throw new Error('Failed to load newsletter template');
    }
  }

  formatNewsletter(articles: CuratedArticle[]): string {
    logger.info(`Formatting newsletter with ${articles.length} articles`);

    const newsletterData = this.prepareNewsletterData(articles);
    
    try {
      const html = this.template(newsletterData);
      logger.info('Newsletter HTML generated successfully');
      return html;
    } catch (error: any) {
      logger.error('Error formatting newsletter:', error);
      logger.error('Template data:', JSON.stringify(newsletterData, null, 2));
      throw new Error(`Failed to format newsletter HTML: ${error.message}`);
    }
  }

  private prepareNewsletterData(articles: CuratedArticle[]) {
    // Separate highlights and regular articles
    const highlights = articles.filter(a => a.targetSection === 'highlights').slice(0, 3);
    const regularArticles = articles.filter(a => a.targetSection !== 'highlights');
    
    // Group articles by category
    const categories = this.groupArticlesByCategory(regularArticles);
    
    // Prepare template data
    const data = {
      formattedDate: format(new Date(), 'EEEE, MMMM do, yyyy'),
      highlights: highlights.map(article => this.prepareArticleData(article)),
      categories: categories,
      totalArticles: articles.length,
      totalSources: this.countUniqueSources(articles),
      generationTime: format(new Date(), 'h:mm a \'on\' MMM d, yyyy'),
    };

    return data;
  }

  private prepareArticleData(article: CuratedArticle) {
    // Safely handle potentially invalid dates
    let timeAgo = 'unknown time ago';
    try {
      const publishDate = new Date(article.publishedAt);
      if (!isNaN(publishDate.getTime())) {
        timeAgo = formatDistanceToNow(publishDate, { addSuffix: true });
      }
    } catch (error) {
      logger.warn(`Invalid date for article ${article.id}: ${article.publishedAt}`);
    }

    return {
      id: article.id,
      title: article.title,
      url: article.url,
      excerpt: this.truncateExcerpt(article.excerpt || ''),
      source: article.source,
      publishedAt: article.publishedAt, // Add the actual publication date
      timeAgo: timeAgo,
      readTime: article.readTime || 5, // Default read time
      claudeSummary: (article as any).aiSummary || (article as any).claudeSummary || article.summary, // AI-generated summary
      selectionReason: article.selectionReason,
      tags: Array.isArray(article.tags) ? article.tags : [],
    };
  }

  private groupArticlesByCategory(articles: CuratedArticle[]) {
    const categoryMap = new Map<string, CuratedArticle[]>();
    
    // Define category order and icons
    const categoryOrder = ['technology', 'business', 'science', 'general', 'politics'];
    const categoryNames: { [key: string]: string } = {
      technology: 'Technology',
      business: 'Business',
      science: 'Science',
      general: 'General News',
      politics: 'Politics',
    };
    const categoryIcons: { [key: string]: string } = {
      technology: '💻',
      business: '📈',
      science: '🔬',
      general: '📰',
      politics: '🏛️',
    };

    // Group articles by category
    articles.forEach(article => {
      const category = article.category || 'general';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(article);
    });

    // Sort articles within each category by selection score
    categoryMap.forEach((articles) => {
      articles.sort((a, b) => b.selectionScore - a.selectionScore);
    });

    // Build ordered categories array
    const categories = [];
    
    for (const category of categoryOrder) {
      const articles = categoryMap.get(category);
      if (articles && articles.length > 0) {
        categories.push({
          name: categoryNames[category] || category,
          icon: categoryIcons[category] || '📰',
          articles: articles.map(article => this.prepareArticleData(article)),
        });
      }
    }

    // Add any remaining categories not in the predefined order
    for (const [category, articles] of categoryMap) {
      if (!categoryOrder.includes(category) && articles.length > 0) {
        categories.push({
          name: categoryNames[category] || category,
          icon: categoryIcons[category] || '📰',
          articles: articles.map(article => this.prepareArticleData(article)),
        });
      }
    }

    return categories;
  }

  private truncateExcerpt(excerpt: string, maxLength: number = 200): string {
    if (!excerpt || excerpt.length <= maxLength) return excerpt;
    
    // Find the last complete sentence within the limit
    const truncated = excerpt.substring(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclamation = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    
    const lastSentence = Math.max(lastPeriod, lastExclamation, lastQuestion);
    
    if (lastSentence > maxLength * 0.5) {
      return excerpt.substring(0, lastSentence + 1);
    }
    
    // If no good sentence break, truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 0 ? excerpt.substring(0, lastSpace) + '...' : truncated + '...';
  }

  private countUniqueSources(articles: CuratedArticle[]): number {
    const sources = new Set(articles.map(article => article.source.id));
    return sources.size;
  }
}