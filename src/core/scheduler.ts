import { ContentAggregator } from '../aggregators/content-aggregator.js';
import { createProviderFromEnv } from '../ai-providers/provider-factory.js';
import { AIProvider, UserPreferences } from '../ai-providers/ai-provider.js';
import { HTMLFormatter, CuratedArticle } from '../formatters/html-formatter.js';
import { MarkdownFormatter } from '../formatters/markdown-formatter.js';
import { GitHubPublisher, PublishOptions } from '../publishers/github-publisher.js';
import { ArchiveGenerator } from '../utils/archive-generator.js';
import { logger } from './logger.js';
import { newsletterConfig } from './config.js';
import { Article } from '../utils/types.js';

export class NewsletterScheduler {
  private contentAggregator: ContentAggregator;
  private aiProvider: AIProvider;
  private htmlFormatter: HTMLFormatter;
  private markdownFormatter: MarkdownFormatter;
  private githubPublisher: GitHubPublisher;
  private archiveGenerator: ArchiveGenerator;

  constructor() {
    this.contentAggregator = new ContentAggregator();
    this.aiProvider = createProviderFromEnv();
    this.htmlFormatter = new HTMLFormatter();
    this.markdownFormatter = new MarkdownFormatter();
    this.githubPublisher = new GitHubPublisher(newsletterConfig.github.token || '');
    this.archiveGenerator = new ArchiveGenerator();
  }

  async generateDailyNewsletter(): Promise<void> {
    const startTime = Date.now();
    logger.info('🚀 Starting daily newsletter generation');

    try {
      // Step 1: Aggregate content from all sources
      logger.info('📰 Aggregating content from sources...');
      const rawArticles = await this.contentAggregator.aggregateContent();
      
      if (rawArticles.length === 0) {
        logger.warn('⚠️ No articles found from any source');
        throw new Error('No articles available for curation');
      }

      logger.info(`✅ Found ${rawArticles.length} articles from ${this.getUniqueSourceCount(rawArticles)} sources`);

      // Step 2: Use AI to curate and select the best articles
      logger.info(`🤖 ${this.aiProvider.name} is curating articles...`);
      const userPreferences: UserPreferences = {
        topics: {
          'technology': {
            interest_score: 0.9,
            keywords: ['AI', 'software', 'programming', 'tech', 'development', 'innovation'],
            subtopics: { 'artificial-intelligence': 0.95, 'software-development': 0.85, 'cybersecurity': 0.8 }
          },
          'business': {
            interest_score: 0.8,
            keywords: ['startup', 'finance', 'economy', 'market', 'investment', 'leadership'],
            subtopics: { 'startups': 0.9, 'finance': 0.75, 'management': 0.7 }
          },
          'science': {
            interest_score: 0.7,
            keywords: ['research', 'study', 'discovery', 'breakthrough', 'innovation'],
            subtopics: { 'research': 0.8, 'medical': 0.7, 'space': 0.6 }
          }
        },
        content_preferences: {
          article_length: { short: 0.3, medium: 0.5, long: 0.2 },
          content_types: { 'analysis': 0.9, 'news': 0.8, 'tutorial': 0.7, 'opinion': 0.6 }
        },
        reading_patterns: {
          preferred_categories_order: ['highlights', 'technology', 'business', 'science', 'general'],
          max_articles_per_category: 4,
          diversity_vs_focus: 0.7
        }
      };

      const curationResult = await this.aiProvider.curate(
        rawArticles,
        userPreferences,
        newsletterConfig.newsletter.maxArticles
      );

      const curatedArticles = curationResult.articles;
      
      if (curatedArticles.length === 0) {
        logger.warn('⚠️ No articles passed curation criteria');
        throw new Error('No articles met the quality threshold');
      }

      logger.info(`✅ ${this.aiProvider.name} selected ${curatedArticles.length} high-quality articles`);
      
      // Log AI provider usage stats
      if (curationResult.processingTimeMs) {
        logger.info(`⚡ Curation completed in ${curationResult.processingTimeMs}ms`);
      }
      logger.info(`🎯 Curation method: ${curationResult.curationMethod}`);
      logger.info(`📊 Quality metrics: avg score ${curationResult.qualityMetrics.averageScore.toFixed(1)}, ${curationResult.qualityMetrics.sourcesDiversity} sources`);
      
      // Log usage stats from provider
      const usageStats = this.aiProvider.getUsageStats();
      if (usageStats.estimatedCost > 0) {
        logger.info(`💰 Estimated cost: $${usageStats.estimatedCost.toFixed(4)}`);
      }

      // Step 3: Format as beautiful Markdown newsletter
      logger.info('🎨 Formatting newsletter Markdown...');
      const newsletterMarkdown = this.markdownFormatter.formatNewsletter(curatedArticles);
      logger.info('✅ Newsletter Markdown generated');

      // Step 4: Publish to GitHub Pages (or save locally)
      let publicURL = 'Not published (local mode)';
      let privateURL = 'Not published (local mode)';

      if (newsletterConfig.github.token && newsletterConfig.github.repo) {
        logger.info('🌐 Publishing to GitHub Pages...');
        const publishOptions: PublishOptions = {
          owner: newsletterConfig.github.username || '',
          repo: this.extractRepoName(newsletterConfig.github.repo || ''),
          branch: newsletterConfig.github.branch,
          directory: 'newsletter' // Optional: organize in subdirectory
        };

        const result = await this.githubPublisher.publishNewsletter(
          newsletterHTML,
          new Date(),
          publishOptions
        );
        
        publicURL = result.publicURL;
        privateURL = result.privateURL;

        logger.info(`✅ Newsletter published successfully!`);
        logger.info(`📄 Public URL: ${publicURL}`);
        logger.info(`🔐 Private URL: ${privateURL}`);
      } else {
        // Save locally instead
        logger.info('💾 Saving newsletter locally (GitHub credentials not configured)...');
        await this.saveNewsletterLocally(newsletterMarkdown);
        logger.info('✅ Newsletter saved locally!');
        logger.info('📄 Location: ./output/README.md');
      }

      // Step 5: Send notification (if configured)
      if (process.env.USER_EMAIL) {
        await this.sendNotification(publicURL, privateURL, curatedArticles);
      }

      // Step 6: Update archive (optional, only if GitHub is configured)
      if (newsletterConfig.github.token && newsletterConfig.github.repo) {
        const publishOptions: PublishOptions = {
          owner: newsletterConfig.github.username || '',
          repo: this.extractRepoName(newsletterConfig.github.repo || ''),
          branch: newsletterConfig.github.branch,
          directory: 'newsletter'
        };
        await this.githubPublisher.createArchiveIndex(publishOptions);
      }

      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      logger.info(`🎉 Newsletter generation completed successfully in ${duration}s`);
      logger.info(`📊 Final stats: ${curatedArticles.length} articles, ${this.getUniqueSourceCount(curatedArticles)} sources`);

      // Log some interesting insights
      this.logGenerationInsights(curatedArticles);

    } catch (error: any) {
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      logger.error(`❌ Newsletter generation failed after ${duration}s:`, error.message);
      
      if (newsletterConfig.local.debugMode) {
        logger.error('Stack trace:', error.stack);
      }
      
      throw error;
    }
  }

  private extractRepoName(fullRepo: string): string {
    // Handle both "username/repo" and full GitHub URLs
    if (fullRepo.includes('/')) {
      return fullRepo.split('/').pop() || fullRepo;
    }
    return fullRepo;
  }

  private getUniqueSourceCount(articles: any[]): number {
    const sources = new Set(articles.map(article => article.source.id));
    return sources.size;
  }

  private async sendNotification(
    publicURL: string, 
    privateURL: string, 
    articles: CuratedArticle[]
  ): Promise<void> {
    // Placeholder for email notification
    // This will be implemented when we add the feedback system
    logger.info('📧 Email notification would be sent here');
    logger.info(`📱 Notification would include: ${privateURL}`);
  }

  private async saveNewsletterLocally(markdown: string): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Create output directory
    const outputDir = './output';
    try {
      await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Save newsletter as README.md (main page for GitHub)
    const filePath = path.join(outputDir, 'README.md');
    await fs.writeFile(filePath, markdown, 'utf8');
    
    // Also save with timestamp for archive
    const date = new Date();
    const timestamp = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timestampedPath = path.join(outputDir, `${timestamp}.md`);
    await fs.writeFile(timestampedPath, markdown, 'utf8');
    
    // Generate updated archive index (as Markdown)
    logger.info('📚 Generating archive index...');
    await this.generateMarkdownArchive();
  }

  private async generateMarkdownArchive(): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      // Scan for newsletter files
      const outputDir = './output';
      const files = await fs.readdir(outputDir);
      
      // Filter for dated markdown files (YYYY-MM-DD.md)
      const newsletterFiles = files.filter(file => 
        file.match(/^\d{4}-\d{2}-\d{2}\.md$/)
      ).sort().reverse(); // Newest first
      
      // Generate archive index
      const today = new Date();
      const archiveMarkdown = `# 📰 Yash's Daily Brief - Newsletter Archive

> Daily AI newsletter curated from expert tech blogs and research

**Archive of all newsletters • Generated on ${today.toLocaleDateString('en-US', {
  weekday: 'long',
  year: 'numeric', 
  month: 'long',
  day: 'numeric'
})}**

---

## 📅 Recent Newsletters

${newsletterFiles.length > 0 ? newsletterFiles.map(file => {
  const date = file.replace('.md', '');
  const displayDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  });
  const isToday = date === today.toISOString().split('T')[0];
  
  return `### ${isToday ? '🌟 ' : ''}[${displayDate}](./${file}) ${isToday ? '← Today' : ''}

- **File**: \`${file}\`
- **Date**: ${displayDate}${isToday ? ' (Current)' : ''}
`;
}).join('\n') : '📝 No newsletters yet. Check back daily for new AI insights!'}

---

## 📊 Archive Stats

- **📚 Total Newsletters**: ${newsletterFiles.length}
- **🗓️ Archive Period**: ${newsletterFiles.length > 0 ? `${newsletterFiles[newsletterFiles.length - 1].replace('.md', '')} to ${newsletterFiles[0].replace('.md', '')}` : 'Starting soon'}
- **📅 Schedule**: Daily at 7 AM Pacific
- **🤖 Curation**: AI-powered content selection

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

*🤖 Built with TypeScript • Automated with GitHub Actions • Curated by AI*

**📧 Questions?** This newsletter is automatically generated. For technical issues, check the [repository](https://github.com/yashvardhan90/newsletter).
`;

      // Save archive index
      const indexPath = path.join(outputDir, 'index.md');
      await fs.writeFile(indexPath, archiveMarkdown, 'utf8');
      
      logger.info(`✅ Archive index generated with ${newsletterFiles.length} newsletters`);
      
    } catch (error: any) {
      logger.error('Error generating Markdown archive:', error.message);
    }
  }

  private logGenerationInsights(articles: CuratedArticle[]): void {
    // Category distribution
    const categoryCount = articles.reduce((acc, article) => {
      const category = article.targetSection || 'general';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    logger.info('📊 Category distribution:', categoryCount);

    // Top sources
    const sourceCount = articles.reduce((acc, article) => {
      acc[article.source.name] = (acc[article.source.name] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    const topSources = Object.entries(sourceCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([source, count]) => `${source} (${count})`);

    logger.info('🏆 Top sources:', topSources.join(', '));

    // Average selection score
    const avgScore = articles.reduce((sum, article) => sum + article.selectionScore, 0) / articles.length;
    logger.info(`⭐ Average selection score: ${avgScore.toFixed(1)}/10`);
  }

  async healthCheck(): Promise<{ status: string; details: any }> {
    logger.info('🔍 Running health check...');
    
    const checks = {
      aiProvider: false,
      githubAPI: false,
      contentSources: false,
      configuration: false
    };

    try {
      // Check AI Provider
      const usageStats = this.aiProvider.getUsageStats();
      const isWithinBudget = this.aiProvider.isWithinBudget();
      checks.aiProvider = isWithinBudget;

      // Check GitHub API (optional for local mode)
      if (newsletterConfig.github.token && newsletterConfig.github.repo) {
        checks.githubAPI = true;
      } else {
        // GitHub is optional for local mode, so mark as true
        checks.githubAPI = true;
        logger.info('📝 Running in local mode (GitHub publishing disabled)');
      }

      // Check content sources
      const sources = this.contentAggregator.getSources();
      if (sources.length > 0) {
        checks.contentSources = true;
      }

      // Check basic configuration
      if (newsletterConfig.newsletter.maxArticles > 0) {
        checks.configuration = true;
      }

      const allHealthy = Object.values(checks).every(check => check);
      const status = allHealthy ? 'healthy' : 'unhealthy';

      logger.info(`💚 Health check completed: ${status}`);

      const providerStats = this.aiProvider.getUsageStats();
      
      return {
        status,
        details: {
          checks,
          aiProvider: {
            name: this.aiProvider.name,
            costPerMonth: this.aiProvider.costPerMonth,
            effectiveness: this.aiProvider.effectiveness,
            features: this.aiProvider.features,
            usageStats: providerStats
          },
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0'
        }
      };
    } catch (error: any) {
      logger.error('❌ Health check failed:', error.message);
      return {
        status: 'error',
        details: {
          checks,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}