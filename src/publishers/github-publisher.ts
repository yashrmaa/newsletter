import { Octokit } from '@octokit/rest';
import { logger } from '../core/logger.js';
import { format } from 'date-fns';
import crypto from 'crypto';

export interface PublishOptions {
  owner: string;
  repo: string;
  branch?: string;
  directory?: string;
}

export class GitHubPublisher {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async publishNewsletter(
    html: string,
    date: Date,
    options: PublishOptions
  ): Promise<{ publicURL: string; privateURL: string }> {
    logger.info('Publishing newsletter to GitHub Pages');

    const dateStr = format(date, 'yyyy/MM/dd');
    const fileName = 'index.html';
    const filePath = options.directory 
      ? `${options.directory}/${dateStr}/${fileName}`
      : `${dateStr}/${fileName}`;

    try {
      // Check if file already exists
      let sha: string | undefined;
      try {
        const { data: existingFile } = await this.octokit.rest.repos.getContent({
          owner: options.owner,
          repo: options.repo,
          path: filePath,
          ref: options.branch || 'main',
        });

        if ('sha' in existingFile) {
          sha = existingFile.sha;
          logger.info(`File exists, updating with SHA: ${sha}`);
        }
      } catch (error: any) {
        if (error.status !== 404) {
          logger.warn('Error checking for existing file:', error.message);
        }
      }

      // Create or update the file
      const response = await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: options.owner,
        repo: options.repo,
        path: filePath,
        message: `Add newsletter for ${format(date, 'MMMM d, yyyy')}`,
        content: Buffer.from(html).toString('base64'),
        branch: options.branch || 'main',
        sha,
      });

      logger.info(`Successfully published to ${filePath}`);

      // Generate URLs
      const baseURL = `https://${options.owner}.github.io/${options.repo}`;
      const publicURL = `${baseURL}/${dateStr}/`;
      const privateURL = this.generatePrivateURL(publicURL, date);

      // Also update the main index page with the latest newsletter link
      await this.updateMainIndex(options, date, publicURL);

      return { publicURL, privateURL };

    } catch (error: any) {
      logger.error('Error publishing to GitHub:', error);
      throw new Error(`Failed to publish newsletter: ${error.message}`);
    }
  }

  private generatePrivateURL(publicURL: string, date: Date): string {
    const dateString = format(date, 'yyyy-MM-dd');
    const secret = process.env.FEEDBACK_SECRET || 'default-secret';
    
    const token = crypto
      .createHash('sha256')
      .update(`${dateString}-${secret}`)
      .digest('hex')
      .substring(0, 16);

    return `${publicURL}?auth=${token}`;
  }

  private async updateMainIndex(
    options: PublishOptions,
    date: Date,
    latestNewsletterURL: string
  ): Promise<void> {
    try {
      const mainIndexPath = options.directory ? `${options.directory}/index.html` : 'index.html';
      
      // Generate a simple index page
      const indexHTML = this.generateMainIndexHTML(date, latestNewsletterURL, options.owner);
      
      let sha: string | undefined;
      try {
        const { data: existingFile } = await this.octokit.rest.repos.getContent({
          owner: options.owner,
          repo: options.repo,
          path: mainIndexPath,
          ref: options.branch || 'main',
        });

        if ('sha' in existingFile) {
          sha = existingFile.sha;
        }
      } catch (error: any) {
        if (error.status !== 404) {
          logger.warn('Error checking for existing main index:', error.message);
        }
      }

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: options.owner,
        repo: options.repo,
        path: mainIndexPath,
        message: `Update main page with newsletter from ${format(date, 'MMMM d, yyyy')}`,
        content: Buffer.from(indexHTML).toString('base64'),
        branch: options.branch || 'main',
        sha,
      });

      logger.info('Updated main index page');
    } catch (error: any) {
      logger.error('Error updating main index:', error.message);
      // Don't throw error here as main newsletter publish was successful
    }
  }

  private generateMainIndexHTML(date: Date, latestNewsletterURL: string, owner: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Brief Newsletter</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 2rem auto;
            padding: 0 1rem;
            background: #f8fafc;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #2563eb;
            margin-bottom: 1rem;
            text-align: center;
        }
        .latest-newsletter {
            background: #eff6ff;
            padding: 1.5rem;
            border-radius: 8px;
            border-left: 4px solid #2563eb;
            margin: 2rem 0;
            text-align: center;
        }
        .cta-button {
            display: inline-block;
            background: #2563eb;
            color: white;
            padding: 0.75rem 1.5rem;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        .cta-button:hover {
            background: #1d4ed8;
        }
        .meta {
            text-align: center;
            color: #666;
            font-size: 0.875rem;
            margin-top: 2rem;
        }
        @media (prefers-color-scheme: dark) {
            body { background: #0f172a; color: #e2e8f0; }
            .container { background: #1e293b; }
            .latest-newsletter { background: #1e3a8a; color: #e2e8f0; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>☕ Your Daily Brief</h1>
        <p>Your personalized newsletter, curated daily by Claude AI</p>
        
        <div class="latest-newsletter">
            <h2 style="margin-top: 0;">Latest Newsletter</h2>
            <p><strong>${format(date, 'EEEE, MMMM d, yyyy')}</strong></p>
            <p>Fresh insights and articles selected just for you</p>
            <a href="${latestNewsletterURL}" class="cta-button">Read Today's Newsletter</a>
        </div>
        
        <div class="meta">
            <p>Automatically generated every morning at 6 AM<br>
            Powered by Claude AI • Published via GitHub Actions</p>
        </div>
    </div>
</body>
</html>`;
  }

  async createArchiveIndex(options: PublishOptions): Promise<void> {
    logger.info('Creating newsletter archive index');
    
    try {
      // Get list of all newsletters
      const newsletters = await this.getAllNewsletters(options);
      
      const archiveHTML = this.generateArchiveHTML(newsletters, options.owner);
      const archivePath = options.directory ? `${options.directory}/archive.html` : 'archive.html';
      
      let sha: string | undefined;
      try {
        const { data: existingFile } = await this.octokit.rest.repos.getContent({
          owner: options.owner,
          repo: options.repo,
          path: archivePath,
          ref: options.branch || 'main',
        });

        if ('sha' in existingFile) {
          sha = existingFile.sha;
        }
      } catch (error: any) {
        if (error.status !== 404) {
          logger.warn('Error checking for existing archive:', error.message);
        }
      }

      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner: options.owner,
        repo: options.repo,
        path: archivePath,
        message: 'Update newsletter archive',
        content: Buffer.from(archiveHTML).toString('base64'),
        branch: options.branch || 'main',
        sha,
      });

      logger.info('Archive index updated');
    } catch (error: any) {
      logger.error('Error creating archive index:', error.message);
    }
  }

  private async getAllNewsletters(options: PublishOptions): Promise<Array<{ date: string; path: string }>> {
    try {
      const newsletters: Array<{ date: string; path: string }> = [];
      
      // This is a simplified version - in production, you'd want to recursively
      // scan the directory structure or maintain a newsletters index
      const basePath = options.directory || '';
      
      // For now, return empty array - can be enhanced later
      return newsletters;
    } catch (error) {
      logger.error('Error getting newsletter list:', error);
      return [];
    }
  }

  private generateArchiveHTML(newsletters: Array<{ date: string; path: string }>, owner: string): string {
    const newslettersList = newsletters.length > 0 
      ? newsletters.map(n => `<li><a href="/${n.path}/">${n.date}</a></li>`).join('')
      : '<li>No newsletters yet - check back tomorrow!</li>';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Newsletter Archive - Daily Brief</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        .header { text-align: center; margin-bottom: 3rem; }
        .archive-list { list-style: none; padding: 0; }
        .archive-list li { 
            padding: 1rem; 
            border-bottom: 1px solid #eee; 
            transition: background-color 0.2s;
        }
        .archive-list li:hover { background: #f8fafc; }
        .archive-list a { text-decoration: none; color: #2563eb; font-weight: 500; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Newsletter Archive</h1>
        <p>All your previous Daily Brief newsletters</p>
    </div>
    <ul class="archive-list">
        ${newslettersList}
    </ul>
</body>
</html>`;
  }
}