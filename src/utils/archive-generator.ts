import { writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { logger } from '../core/logger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface NewsletterEntry {
  date: string;
  displayDate: string;
  fileName: string;
  filePath: string;
  size: string;
  isToday: boolean;
}

export class ArchiveGenerator {
  private outputDir: string;

  constructor() {
    this.outputDir = join(__dirname, '../../output');
  }

  /**
   * Generate the archive index page with all newsletters
   */
  generateArchiveIndex(): void {
    logger.info('📚 Generating archive index...');

    try {
      // Ensure output directory exists
      if (!existsSync(this.outputDir)) {
        mkdirSync(this.outputDir, { recursive: true });
      }

      // Scan for newsletter files
      const newsletters = this.scanNewsletterFiles();
      
      // Generate HTML
      const html = this.generateIndexHTML(newsletters);
      
      // Write index.html
      const indexPath = join(this.outputDir, 'index.html');
      writeFileSync(indexPath, html, 'utf-8');
      
      logger.info(`✅ Archive index generated with ${newsletters.length} newsletters`);
      logger.info(`📄 Index saved to: ${indexPath}`);

    } catch (error: any) {
      logger.error('Error generating archive index:', error.message);
    }
  }

  /**
   * Scan output directory for newsletter files
   */
  private scanNewsletterFiles(): NewsletterEntry[] {
    const newsletters: NewsletterEntry[] = [];
    
    try {
      const files = readdirSync(this.outputDir);
      const today = new Date().toISOString().split('T')[0];

      for (const file of files) {
        if (file.endsWith('.html') && file !== 'index.html') {
          const filePath = join(this.outputDir, file);
          const stats = statSync(filePath);
          
          // Extract date from filename (newsletter-YYYY-MM-DD.html or newsletter.html)
          let date: string;
          let displayDate: string;
          let isToday = false;

          if (file === 'newsletter.html') {
            // Current newsletter
            date = today;
            displayDate = this.formatDate(new Date());
            isToday = true;
          } else if (file.startsWith('newsletter-') && file.match(/\d{4}-\d{2}-\d{2}/)) {
            // Archived newsletter with date
            const match = file.match(/(\d{4}-\d{2}-\d{2})/);
            date = match ? match[1] : today;
            displayDate = this.formatDate(new Date(date));
            isToday = date === today;
          } else {
            // Other HTML files, use file modification date
            date = stats.mtime.toISOString().split('T')[0];
            displayDate = this.formatDate(stats.mtime);
          }

          newsletters.push({
            date,
            displayDate,
            fileName: file,
            filePath: file, // Relative path for links
            size: this.formatFileSize(stats.size),
            isToday
          });
        }
      }

      // Sort by date (newest first)
      newsletters.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (error: any) {
      logger.error('Error scanning newsletter files:', error.message);
    }

    return newsletters;
  }

  /**
   * Generate the HTML for the archive index page
   */
  private generateIndexHTML(newsletters: NewsletterEntry[]): string {
    const todaysNewsletter = newsletters.find(n => n.isToday);
    const archivedNewsletters = newsletters.filter(n => !n.isToday);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Yash's Daily Brief - Newsletter Archive</title>
    <meta name="description" content="Archive of Yash's daily AI newsletter curated from expert tech blogs and research">
    <meta name="robots" content="index, follow">
    
    <style>
        :root {
            --color-primary: #1a1a1a;
            --color-secondary: #666666;
            --color-accent: #2563eb;
            --color-background: #ffffff;
            --color-surface: #f8fafc;
            --color-border: #e2e8f0;
            --color-success: #059669;
            --font-primary: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: var(--font-primary);
            line-height: 1.6;
            color: var(--color-primary);
            background: var(--color-background);
            -webkit-font-smoothing: antialiased;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 1rem;
        }
        
        header {
            background: var(--color-surface);
            border-bottom: 1px solid var(--color-border);
            padding: 2rem 0;
            margin-bottom: 2rem;
        }
        
        .header-content {
            text-align: center;
        }
        
        .header-content h1 {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--color-accent);
            margin-bottom: 0.5rem;
        }
        
        .header-content p {
            font-size: 1.1rem;
            color: var(--color-secondary);
        }
        
        .stats {
            display: flex;
            justify-content: center;
            gap: 2rem;
            margin-top: 1.5rem;
            font-size: 0.9rem;
            color: var(--color-secondary);
        }
        
        .current-newsletter {
            background: linear-gradient(135deg, var(--color-accent), #3b82f6);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 3rem;
            text-align: center;
        }
        
        .current-newsletter h2 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
        }
        
        .current-newsletter p {
            margin-bottom: 1.5rem;
            opacity: 0.9;
        }
        
        .current-newsletter a {
            display: inline-block;
            background: rgba(255, 255, 255, 0.2);
            color: white;
            text-decoration: none;
            padding: 1rem 2rem;
            border-radius: 8px;
            font-weight: 600;
            transition: background 0.2s;
            backdrop-filter: blur(10px);
        }
        
        .current-newsletter a:hover {
            background: rgba(255, 255, 255, 0.3);
        }
        
        .archive-section h2 {
            font-size: 1.5rem;
            margin-bottom: 1.5rem;
            color: var(--color-primary);
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .newsletter-list {
            background: white;
            border-radius: 12px;
            border: 1px solid var(--color-border);
            overflow: hidden;
        }
        
        .newsletter-item {
            display: flex;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid var(--color-border);
            transition: background-color 0.2s;
            text-decoration: none;
            color: inherit;
        }
        
        .newsletter-item:hover {
            background: var(--color-surface);
        }
        
        .newsletter-item:last-child {
            border-bottom: none;
        }
        
        .newsletter-date {
            flex: 0 0 180px;
            font-weight: 600;
            color: var(--color-accent);
        }
        
        .newsletter-info {
            flex: 1;
            padding-left: 1rem;
        }
        
        .newsletter-title {
            font-size: 1.1rem;
            font-weight: 500;
            margin-bottom: 0.25rem;
        }
        
        .newsletter-meta {
            font-size: 0.875rem;
            color: var(--color-secondary);
        }
        
        .newsletter-size {
            flex: 0 0 80px;
            text-align: right;
            font-size: 0.875rem;
            color: var(--color-secondary);
        }
        
        .empty-state {
            text-align: center;
            padding: 3rem 1rem;
            color: var(--color-secondary);
        }
        
        .empty-state p {
            font-size: 1.1rem;
            margin-bottom: 1rem;
        }
        
        .footer {
            margin-top: 4rem;
            padding: 2rem 0;
            border-top: 1px solid var(--color-border);
            text-align: center;
            font-size: 0.875rem;
            color: var(--color-secondary);
        }
        
        /* Dark mode */
        @media (prefers-color-scheme: dark) {
            :root {
                --color-primary: #ffffff;
                --color-secondary: #94a3b8;
                --color-background: #0f172a;
                --color-surface: #1e293b;
                --color-border: #334155;
            }
            
            .newsletter-list {
                background: var(--color-surface);
            }
        }
        
        /* Mobile responsive */
        @media (max-width: 768px) {
            .header-content h1 {
                font-size: 2rem;
            }
            
            .stats {
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .newsletter-item {
                flex-direction: column;
                align-items: flex-start;
                padding: 1rem;
            }
            
            .newsletter-date {
                flex: none;
                margin-bottom: 0.5rem;
            }
            
            .newsletter-info {
                padding-left: 0;
                width: 100%;
            }
            
            .newsletter-size {
                flex: none;
                text-align: left;
                margin-top: 0.5rem;
            }
        }
    </style>
</head>

<body>
    <header>
        <div class="container">
            <div class="header-content">
                <h1>☕ Yash's Daily Brief</h1>
                <p>Daily AI newsletter curated from expert tech blogs and research</p>
                <div class="stats">
                    <span>📊 ${newsletters.length} newsletters published</span>
                    <span>🕒 Generated daily at 6 AM Pacific</span>
                    <span>🤖 AI-curated content</span>
                </div>
            </div>
        </div>
    </header>

    <main>
        <div class="container">
            ${todaysNewsletter ? `
            <div class="current-newsletter">
                <h2>📰 Today's Newsletter</h2>
                <p>${todaysNewsletter.displayDate}</p>
                <a href="${todaysNewsletter.filePath}">Read Today's Brief →</a>
            </div>
            ` : ''}

            <div class="archive-section">
                <h2>📚 Newsletter Archive</h2>
                
                ${archivedNewsletters.length > 0 ? `
                <div class="newsletter-list">
                    ${archivedNewsletters.map(newsletter => `
                    <a href="${newsletter.filePath}" class="newsletter-item">
                        <div class="newsletter-date">${newsletter.displayDate}</div>
                        <div class="newsletter-info">
                            <div class="newsletter-title">Daily AI Brief</div>
                            <div class="newsletter-meta">Expert-curated AI content</div>
                        </div>
                        <div class="newsletter-size">${newsletter.size}</div>
                    </a>
                    `).join('')}
                </div>
                ` : `
                <div class="empty-state">
                    <p>🔄 Building your newsletter archive...</p>
                    <p>Check back daily for new AI insights!</p>
                </div>
                `}
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p>
                🤖 Automated with AI • Built with TypeScript • Deployed on GitHub Pages<br>
                Generated at ${new Date().toLocaleString('en-US', { 
                  timeZone: 'America/Los_Angeles',
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZoneName: 'short'
                })}
            </p>
        </div>
    </footer>
</body>
</html>`;
  }

  /**
   * Format date for display
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}