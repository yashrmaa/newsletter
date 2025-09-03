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
      const newsletterMarkdown = this.markdownFormatter.formatNewsletter(curatedArticles as any);
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
          newsletterMarkdown,
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
        logger.info('📄 Location: ./docs/README.md');
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
    
    // Create docs directory for GitHub Pages
    const docsDir = './docs';
    try {
      await fs.mkdir(docsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Save newsletter as README.md (main page for GitHub)
    const filePath = path.join(docsDir, 'README.md');
    await fs.writeFile(filePath, markdown, 'utf8');
    
    // Also save as index.md with Jekyll front matter for proper rendering
    const indexMarkdown = `---
layout: default
title: Today's Newsletter
permalink: /index.html
---

${markdown}`;
    await fs.writeFile(path.join(docsDir, 'index.md'), indexMarkdown, 'utf8');
    
    // Also save with timestamp for archive with Jekyll front matter
    const date = new Date();
    const timestamp = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const displayDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
    
    const timestampedMarkdown = `---
layout: default
title: "Daily Brief - ${displayDate}"
date: ${timestamp}
permalink: /${timestamp}.html
---

${markdown}`;
    
    const timestampedPath = path.join(docsDir, `${timestamp}.md`);
    await fs.writeFile(timestampedPath, timestampedMarkdown, 'utf8');
    
    // Generate updated archive index (as Markdown)
    logger.info('📚 Generating archive index...');
    await this.generateMarkdownArchive();
    
    // Generate index.html for GitHub Pages - DISABLED: Using Jekyll instead
    // logger.info('🌐 Generating index.html for GitHub Pages...');
    // await this.generateIndexHTML();
  }

  private async generateMarkdownArchive(): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      // Scan for newsletter files
      const docsDir = './docs';
      const files = await fs.readdir(docsDir);
      
      // Filter for dated markdown files (YYYY-MM-DD.md)
      const newsletterFiles = files.filter(file => 
        file.match(/^\d{4}-\d{2}-\d{2}\.md$/)
      ).sort().reverse(); // Newest first
      
      // Generate archive index
      const today = new Date();
      const archiveMarkdown = `---
layout: default
title: Newsletter Archive
permalink: /archive.html
---

# 📰 Yash's Daily Brief - Newsletter Archive

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
  
  const htmlFile = file.replace('.md', '.html');
  return `### ${isToday ? '🌟 ' : ''}[${displayDate}](./${htmlFile}) ${isToday ? '← Today' : ''}

- **File**: \`${file}\`
- **Date**: ${displayDate}${isToday ? ' (Current)' : ''}
`;
}).join('\n') : '📝 No newsletters yet. Check back daily for new AI insights!'}

---

## 📊 Archive Stats

- **📚 Total Newsletters**: ${newsletterFiles.length}
- **🗓️ Archive Period**: ${newsletterFiles.length > 0 ? `${newsletterFiles[newsletterFiles.length - 1].replace('.md', '')} to ${newsletterFiles[0].replace('.md', '')}` : 'Starting soon'}
- **📅 Schedule**: Daily at 6 AM Pacific
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

      // Save archive index to archive.md (not index.md which should be the homepage)
      const archivePath = path.join(docsDir, 'archive.md');
      await fs.writeFile(archivePath, archiveMarkdown, 'utf8');
      
      logger.info(`✅ Archive index generated with ${newsletterFiles.length} newsletters`);
      
    } catch (error: any) {
      logger.error('Error generating Markdown archive:', error.message);
    }
  }

  private async generateIndexHTML(): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      const docsDir = './docs';
      
      // Create a simple HTML page that shows the README.md content
      const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yash's Daily Brief - AI Newsletter</title>
    <meta name="description" content="Daily AI newsletter curated from expert tech blogs and research">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
            background: #fff;
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px;
        }
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        .nav-links {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin: 2rem 0;
            flex-wrap: wrap;
        }
        .nav-link {
            display: inline-block;
            padding: 1rem 2rem;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: background 0.3s;
        }
        .nav-link:hover {
            background: #5a6fd8;
        }
        .nav-link.primary {
            background: #28a745;
        }
        .nav-link.primary:hover {
            background: #218838;
        }
        .info {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            margin: 2rem 0;
        }
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding-top: 2rem;
            border-top: 1px solid #e9ecef;
            color: #6c757d;
            font-size: 0.9rem;
        }
        @media (max-width: 600px) {
            .header h1 {
                font-size: 2rem;
            }
            .nav-links {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>☕ Yash's Daily Brief</h1>
        <p>Daily AI newsletter curated from expert tech blogs and research</p>
    </div>

    <div class="nav-links">
        <a href="README.md" class="nav-link primary">📰 Read Today's Newsletter</a>
        <a href="index.md" class="nav-link">📚 Newsletter Archive</a>
    </div>

    <div class="info">
        <h3>🤖 About This Newsletter</h3>
        <p>This newsletter is automatically generated daily at 6 AM Pacific, curating the best content from AI researchers, company blogs, and tech thought leaders. No clickbait, no fluff - just high-signal insights from the AI community.</p>
        
        <p><strong>📚 Content Sources:</strong> We monitor 28+ high-quality sources including Andrej Karpathy, Lilian Weng, OpenAI, Anthropic, DeepMind, Hugging Face, and many more AI experts.</p>
        
        <p><strong>🤖 AI Curation:</strong> Intelligent content selection with quality scoring and trending detection ensures you get the most relevant and valuable insights.</p>
    </div>

    <div class="info">
        <h3>⚙️ How It Works</h3>
        <ul>
            <li><strong>Daily Generation:</strong> 6:00 AM Pacific Time</li>
            <li><strong>Content Sources:</strong> 28+ expert AI blogs and research sites</li>
            <li><strong>AI Curation:</strong> Smart selection with quality scoring</li>
            <li><strong>Format:</strong> Clean Markdown rendered by GitHub</li>
            <li><strong>Archive:</strong> All previous newsletters saved and indexed</li>
        </ul>
    </div>

    <div class="footer">
        <p>🤖 Built with TypeScript • Automated with GitHub Actions • Deployed on GitHub Pages</p>
        <p>Generated automatically • No manual intervention required</p>
    </div>

    <script>
        // Auto-redirect to README.md after 3 seconds for better UX
        setTimeout(() => {
            if (!window.location.hash) {
                window.location.href = 'README.md';
            }
        }, 3000);
    </script>
</body>
</html>`;

      const indexPath = path.join(docsDir, 'index.html');
      await fs.writeFile(indexPath, indexHTML, 'utf8');
      
      logger.info('✅ Index.html generated for GitHub Pages compatibility');
      
    } catch (error: any) {
      logger.error('Error generating index.html:', error.message);
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