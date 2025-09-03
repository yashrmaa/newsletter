import { formatDistanceToNow, format } from 'date-fns';
import { logger } from '../core/logger.js';

export interface CuratedArticle {
  id: string;
  title: string;
  url: string;
  excerpt?: string;
  summary?: string;
  aiSummary?: string;
  claudeSummary?: string;
  source: {
    id: string;
    name: string;
    url: string;
  };
  publishedAt: Date;
  readTime?: number;
  selectionReason: string;
  tags: string[];
  targetSection?: string;
}

export class MarkdownFormatter {
  /**
   * Format curated articles into a beautiful Markdown newsletter
   */
  formatNewsletter(articles: CuratedArticle[]): string {
    try {
      logger.info(`Formatting newsletter with ${articles.length} articles`);

      const today = new Date();
      const formattedDate = format(today, 'EEEE, MMMM do, yyyy');
      // Format time in Pacific timezone
      const pacificTime = today.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const generationTime = `${pacificTime} Pacific`;

      // Group articles by category
      const groupedArticles = this.groupArticlesByCategory(articles);
      
      // Prepare newsletter data
      const newsletterData = {
        formattedDate,
        generationTime,
        totalArticles: articles.length,
        totalSources: this.getUniqueSourceCount(articles),
        categories: groupedArticles,
        highlights: articles.slice(0, 3), // Top 3 articles as highlights
      };

      // Generate markdown
      const markdown = this.generateMarkdown(newsletterData);
      logger.info('Newsletter Markdown generated successfully');
      return markdown;

    } catch (error: any) {
      logger.error('Error formatting newsletter:', error);
      logger.error('Article data:', JSON.stringify(articles.slice(0, 2), null, 2));
      throw new Error(`Failed to format newsletter Markdown: ${error.message}`);
    }
  }

  /**
   * Generate the complete Markdown content
   */
  private generateMarkdown(data: any): string {
    return `# ☕ Yash's Daily Brief

> Daily AI newsletter curated from expert tech blogs and research

**${data.formattedDate}**

---

## 🔥 Today's Highlights

${data.highlights.map((article: any) => this.formatArticleMarkdown(article, true)).join('\n\n---\n\n')}

---

## 📰 All Articles

${data.categories.map((category: any) => this.formatCategoryMarkdown(category)).join('\n\n')}

---

## 📊 Newsletter Stats

- **📚 Articles**: ${data.totalArticles} curated articles
- **📡 Sources**: ${data.totalSources} expert sources
- **🤖 Curation**: AI-powered with quality scoring
- **⏰ Generated**: ${data.generationTime}

---

## 🎯 About This Newsletter

This newsletter is automatically generated daily, curating the best content from AI researchers, company blogs, and tech thought leaders. No clickbait, no fluff - just high-signal insights from the AI community.

### 📚 Content Sources

We monitor 28+ high-quality sources including:

- **🧠 Researchers**: Andrej Karpathy, Lilian Weng, Chris Olah, Simon Willison
- **🏢 Companies**: OpenAI, Anthropic, DeepMind, Google AI, Meta AI
- **🔧 Platforms**: Hugging Face, LangChain, Pinecone, Weights & Biases
- **📝 Publications**: The Gradient, Distill, AI Alignment Forum, BAIR Blog

---

*Curated by Yash with AI • Generated at ${data.generationTime}*

**🤖 Built with**: TypeScript • GitHub Actions • AI Curation  
**📅 Schedule**: Daily at 6 AM Pacific  
**🌐 Archive**: [All Newsletters](./archive.html)
`;
  }

  /**
   * Format a single article in Markdown
   */
  private formatArticleMarkdown(article: CuratedArticle, isHighlight: boolean = false): string {
    const timeAgo = this.safeTimeAgo(article.publishedAt);
    const publishDate = this.safeFormatDate(article.publishedAt);
    const summary = this.getArticleSummary(article);
    
    let markdown = '';
    
    if (isHighlight) {
      markdown += `### 🌟 [${article.title}](${article.url})\n\n`;
    } else {
      markdown += `### [${article.title}](${article.url})\n\n`;
    }

    // Article metadata
    markdown += `**${article.source.name}** • ${publishDate} • ${timeAgo}`;
    if (article.readTime) {
      markdown += ` • ${article.readTime} min read`;
    }
    markdown += '\n\n';

    // Article excerpt
    if (article.excerpt) {
      markdown += `${this.cleanExcerpt(article.excerpt)}\n\n`;
    }

    // AI summary if available
    if (summary) {
      markdown += `> **Why this matters**: ${summary}\n\n`;
    }

    return markdown.trim();
  }

  /**
   * Format a category section in Markdown
   */
  private formatCategoryMarkdown(category: any): string {
    const emoji = this.getCategoryEmoji(category.name);
    let markdown = `## ${emoji} ${this.formatCategoryName(category.name)}\n\n`;
    
    markdown += category.articles.map((article: CuratedArticle) => 
      this.formatArticleMarkdown(article, false)
    ).join('\n\n---\n\n');

    return markdown;
  }

  /**
   * Get category emoji
   */
  private getCategoryEmoji(category: string): string {
    const emojiMap: Record<string, string> = {
      'ai-research': '🧠',
      'ai-tools': '🔧',
      'ai-commentary': '💬',
      'ai-safety': '🛡️',
      'ai-engineering': '⚙️',
      'ai-education': '📚',
      'ai-analysis': '📊',
      'general': '📰',
    };
    return emojiMap[category] || '📰';
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Group articles by category
   */
  private groupArticlesByCategory(articles: CuratedArticle[]) {
    const categoryMap = new Map<string, CuratedArticle[]>();

    articles.forEach(article => {
      const category = article.targetSection || 'general';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(article);
    });

    // Convert to array format
    return Array.from(categoryMap.entries()).map(([name, articles]) => ({
      name,
      articles: articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    }));
  }

  /**
   * Get unique source count
   */
  private getUniqueSourceCount(articles: CuratedArticle[]): number {
    const uniqueSources = new Set(articles.map(article => article.source.id));
    return uniqueSources.size;
  }

  /**
   * Get article summary (AI-generated or fallback)
   */
  private getArticleSummary(article: CuratedArticle): string {
    return (article as any).aiSummary || 
           (article as any).claudeSummary || 
           article.summary || 
           '';
  }

  /**
   * Clean and truncate excerpt
   */
  private cleanExcerpt(excerpt: string, maxLength: number = 200): string {
    return excerpt
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, maxLength) + (excerpt.length > maxLength ? '...' : '');
  }

  /**
   * Safely format date
   */
  private safeFormatDate(date: Date): string {
    try {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return format(parsedDate, 'MMMM do, yyyy');
      }
    } catch (error) {
      // Return fallback for invalid dates
    }
    return format(new Date(), 'MMMM do, yyyy');
  }

  /**
   * Safely calculate time ago
   */
  private safeTimeAgo(date: Date): string {
    try {
      const parsedDate = new Date(date);
      if (!isNaN(parsedDate.getTime())) {
        return formatDistanceToNow(parsedDate, { addSuffix: true });
      }
    } catch (error) {
      // Return fallback for invalid dates
    }
    return 'recently';
  }
}