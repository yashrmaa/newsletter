# Personal Newsletter Generator Agent - Project Specification

## Project Overview & Goal

**What we're building**: An autonomous AI agent that wakes up every morning, explores the internet for interesting news content, curates and personalizes articles based on your preferences, and publishes a beautiful newsletter to your personal website—all without any manual intervention.

**The Vision**: You wake up, grab your coffee, and visit your personal newsletter site on your phone. The system has already discovered, analyzed, and curated 12-15 high-quality articles tailored specifically to your interests. The site loads instantly, looks beautiful on mobile, and includes content you never would have found manually. Over time, it learns from your feedback and becomes an increasingly better curator of information for you.

**Key Differentiators**:
- **Flexible AI Integration**: Choose from free rule-based curation to premium Claude AI based on your budget
- **Web Discovery**: Explores beyond traditional sources to find trending topics and new valuable content
- **Dual-Layer System**: Public newsletter (clean, no clutter) + Private feedback layer (only visible to you)
- **Mobile-First Reading**: Optimized typography and design for the best phone reading experience
- **Learning Engine**: Gets smarter about your preferences every day through feedback
- **Autonomous Operation**: Runs completely automatically via GitHub Actions—no daily maintenance required

**Target User**: Knowledge workers, executives, researchers, or anyone who wants to stay informed but doesn't have time to manually curate quality content from dozens of sources.

## Architecture: GitHub Actions Cloud Deployment

### Core System Architecture
```
GitHub Actions (Cloud Runner)
├── Content Aggregation Pipeline
├── AI Curation Engine (Free/Budget/Premium)
├── Mobile-Optimized Newsletter Generator  
├── Private Feedback System
├── Supabase Database (preferences, analytics)
├── GitHub Pages Publishing
└── Multi-Channel Notification System
```

### Three-Tier AI Integration Strategy

#### Tier 1: Free Version ($0/month)
- **Curation Method**: Rule-based algorithm + trending topic analysis
- **Effectiveness**: 70% of AI-powered versions
- **Features**: Smart keyword matching, source credibility scoring, trending detection
- **Best For**: Testing the concept, budget-conscious users, proving value before upgrading

#### Tier 2: Budget AI ($3-7/month) 
- **AI Model**: OpenAI GPT-4o Mini
- **Effectiveness**: 90% of premium Claude quality at 1/3 the cost
- **Features**: AI reasoning, personalization, content summaries, discovery
- **Best For**: Most users - excellent value proposition

#### Tier 3: Premium AI ($8-15/month)
- **AI Model**: Claude 3 Haiku/Sonnet
- **Effectiveness**: 100% - maximum quality curation and reasoning  
- **Features**: Superior personalization, nuanced content analysis, best writing quality
- **Best For**: Users who want the absolute best curation experience

## Implementation Plan

### Phase 1: Core GitHub Actions Setup (Week 1)
```bash
# Day 1-2: Infrastructure Foundation
- Set up GitHub Actions workflow with daily scheduling
- Configure Supabase database for preferences and feedback
- Set up GitHub Secrets management for API keys
- Create basic project structure with TypeScript

# Day 3-4: Content Aggregation Pipeline
- Implement RSS feed aggregation for 15+ trusted sources
- Create web scraping capabilities for dynamic content
- Add trending topic detection (Google Trends, Hacker News, Reddit)
- Set up rate limiting and caching systems

# Day 5-7: Newsletter Generation & Publishing
- Create mobile-first HTML template with responsive CSS
- Implement GitHub Pages publishing pipeline
- Set up email notification system with private URLs
- Test end-to-end workflow in GitHub Actions
```

### Phase 2: Multi-Tier AI Integration (Week 2)
```bash
# Day 8-10: AI Provider Framework
- Create flexible AI provider system supporting all three tiers
- Implement Free Tier: rule-based curation with trending analysis
- Add Budget Tier: OpenAI GPT-4o Mini integration
- Add Premium Tier: Claude API integration

# Day 11-12: Content Curation Logic
- Build intelligent article scoring and selection
- Implement preference learning system
- Create content quality assessment
- Add deduplication and source diversity

# Day 13-14: Private Feedback System
- Implement URL-based authentication for feedback controls
- Create client-side feedback collection
- Set up preference learning loop
- Build private analytics dashboard
```

### Phase 3: Advanced Features & Polish (Week 3-4)
```bash
# Day 15-17: Enhanced User Experience
- Implement Progressive Web App features
- Add dark mode and accessibility features
- Create focus mode and reading time estimation
- Optimize mobile performance and loading speed

# Day 18-19: Smart Discovery & Learning
- Add intelligent source discovery
- Implement A/B testing for content selection
- Create advanced personalization algorithms
- Set up cost monitoring and optimization

# Day 20-21: Production Hardening
- Add comprehensive error handling and retry logic
- Implement monitoring and alerting systems
- Create backup and recovery procedures
- Perform end-to-end testing and optimization
```

## Technical Specifications

### GitHub Actions Workflow Configuration
```yaml
# .github/workflows/daily-newsletter.yml
name: Generate Daily Newsletter

on:
  schedule:
    - cron: '0 14 * * *'  # 7:00 AM PST daily
  workflow_dispatch:  # Allow manual triggers

env:
  NODE_VERSION: '18'
  TIMEOUT_MINUTES: 20

jobs:
  generate-newsletter:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Generate newsletter
        env:
          # AI Provider Configuration (choose one)
          LLM_PROVIDER: ${{ secrets.LLM_PROVIDER }}
          CLAUDE_API_KEY: ${{ secrets.CLAUDE_API_KEY }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          
          # Required for all tiers
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NEWS_API_KEY: ${{ secrets.NEWS_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          USER_EMAIL: ${{ secrets.USER_EMAIL }}
          GMAIL_USER: ${{ secrets.GMAIL_USER }}
          GMAIL_APP_PASSWORD: ${{ secrets.GMAIL_APP_PASSWORD }}
          FEEDBACK_SECRET: ${{ secrets.FEEDBACK_SECRET }}
          MONTHLY_BUDGET_LIMIT: ${{ secrets.MONTHLY_BUDGET_LIMIT }}
        run: npm run generate-newsletter
        
      - name: Commit and push newsletter
        run: |
          git config --local user.email "newsletter-agent@github-actions"
          git config --local user.name "Newsletter Agent"
          git add .
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "Daily newsletter - $(date +'%Y-%m-%d %H:%M UTC')"
            git push
          fi
```

### Multi-Tier AI Configuration
```typescript
// src/config/ai-providers.ts
export interface AIProvider {
  name: string;
  costPerMonth: string;
  effectiveness: string;
  curate(articles: Article[], preferences: UserPreferences): Promise<CuratedNewsletter>;
}

export class FreeRuleBasedProvider implements AIProvider {
  name = "Rule-Based Curation";
  costPerMonth = "$0";
  effectiveness = "70%";
  
  async curate(articles: Article[], preferences: UserPreferences): Promise<CuratedNewsletter> {
    // Implement keyword matching, source scoring, trending analysis
    const scored = articles.map(article => ({
      ...article,
      score: this.calculateScore(article, preferences)
    }));
    
    return this.selectTopArticles(scored, preferences);
  }
}

export class OpenAIProvider implements AIProvider {
  name = "OpenAI GPT-4o Mini";
  costPerMonth = "$3-7";
  effectiveness = "90%";
  
  async curate(articles: Article[], preferences: UserPreferences): Promise<CuratedNewsletter> {
    // Implement OpenAI-powered curation
    const prompt = this.buildCurationPrompt(articles, preferences);
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.3
    });
    
    return this.parseAIResponse(response);
  }
}

export class ClaudeProvider implements AIProvider {
  name = "Claude 3 Haiku";
  costPerMonth = "$8-15";
  effectiveness = "100%";
  
  async curate(articles: Article[], preferences: UserPreferences): Promise<CuratedNewsletter> {
    // Implement Claude-powered curation with superior reasoning
    const prompt = this.buildAdvancedCurationPrompt(articles, preferences);
    const response = await this.anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }]
    });
    
    return this.parseClaudeResponse(response);
  }
}

// Factory function
export function createAIProvider(provider: string): AIProvider {
  switch (provider) {
    case 'free':
      return new FreeRuleBasedProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'claude':
      return new ClaudeProvider();
    default:
      throw new Error(`Unknown AI provider: ${provider}`);
  }
}
```

### Content Source Configuration
```typescript
interface ContentSource {
  id: string;
  name: string;
  type: 'rss' | 'api' | 'scraper' | 'social';
  url: string;
  categories: string[];
  priority: number; // 1-10, affects curation weight
  credibility_score: number; // Learned over time from feedback
  rateLimiting: {
    requests: number;
    timeWindow: string;
  };
}

const DEFAULT_SOURCES: ContentSource[] = [
  // Tier 1: High-Priority Trusted Sources
  { id: 'reuters', name: 'Reuters', type: 'rss', url: 'https://feeds.reuters.com/reuters/topNews', categories: ['world', 'politics'], priority: 9, credibility_score: 0.95 },
  { id: 'ap', name: 'Associated Press', type: 'rss', url: 'https://feeds.apnews.com/rss/apf-topnews', categories: ['world', 'politics'], priority: 9, credibility_score: 0.94 },
  { id: 'bbc', name: 'BBC News', type: 'rss', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', categories: ['world'], priority: 8, credibility_score: 0.92 },
  
  // Tier 2: Business & Finance
  { id: 'wsj', name: 'Wall Street Journal', type: 'rss', url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml', categories: ['business'], priority: 8, credibility_score: 0.90 },
  { id: 'bloomberg', name: 'Bloomberg', type: 'rss', url: 'https://feeds.bloomberg.com/politics/news.rss', categories: ['business', 'politics'], priority: 7, credibility_score: 0.89 },
  
  // Tier 3: Technology
  { id: 'techcrunch', name: 'TechCrunch', type: 'rss', url: 'https://techcrunch.com/feed/', categories: ['technology'], priority: 7, credibility_score: 0.82 },
  { id: 'ars', name: 'Ars Technica', type: 'rss', url: 'http://feeds.arstechnica.com/arstechnica/index/', categories: ['technology'], priority: 6, credibility_score: 0.88 },
  
  // Tier 4: Discovery Sources
  { id: 'hackernews', name: 'Hacker News', type: 'api', url: 'https://hacker-news.firebaseio.com/v0/', categories: ['technology'], priority: 5, credibility_score: 0.75 },
  { id: 'reddit', name: 'Reddit', type: 'api', url: 'https://www.reddit.com/r/worldnews/.json', categories: ['world'], priority: 4, credibility_score: 0.65 }
];
```

### Mobile-First Newsletter Design
```css
/* Mobile-optimized typography and layout */
:root {
  --font-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-reading: 'Charter', 'Georgia', serif;
  --reading-width: min(65ch, calc(100vw - 2rem));
  --line-height-reading: clamp(1.5, 1.4 + 0.2vw, 1.7);
}

.newsletter-layout {
  max-width: var(--reading-width);
  margin: 0 auto;
  padding: 1rem;
  font-size: clamp(1rem, 0.9rem + 0.5vw, 1.2rem);
  line-height: var(--line-height-reading);
}

.article-card {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.article-title {
  font-size: clamp(1.125rem, 1rem + 0.5vw, 1.375rem);
  font-weight: 600;
  line-height: 1.3;
  margin-bottom: 0.75rem;
}

.article-meta {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.article-excerpt {
  font-family: var(--font-reading);
  color: #374151;
  line-height: 1.6;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .newsletter-layout {
    background: #0f172a;
    color: #e2e8f0;
  }
  
  .article-excerpt {
    color: #d1d5db;
  }
}
```

### Private Feedback System
```typescript
// Client-side feedback authentication
class FeedbackAuth {
  private isAuthenticated = false;
  
  constructor() {
    this.checkAuthentication();
  }
  
  private async checkAuthentication(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('auth');
    
    if (token && await this.validateToken(token)) {
      this.isAuthenticated = true;
      this.enableFeedbackControls();
      // Clean URL for better UX
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }
  
  private async validateToken(token: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const expectedToken = await this.generateExpectedToken(today);
    return token === expectedToken;
  }
  
  private enableFeedbackControls(): void {
    document.querySelectorAll('.feedback-controls').forEach(el => {
      el.classList.remove('hidden');
      el.classList.add('visible');
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => new FeedbackAuth());
```

## GitHub Secrets Configuration

### Required Secrets (All Tiers)
```bash
# Core Infrastructure
GITHUB_TOKEN=your_github_personal_access_token
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
NEWS_API_KEY=your_news_api_key

# Notification System
USER_EMAIL=your-email@gmail.com
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password

# Security & Budget
FEEDBACK_SECRET=your_random_secure_string
MONTHLY_BUDGET_LIMIT=15.00  # Set based on your chosen tier

# AI Provider (Choose One)
LLM_PROVIDER=free          # For free tier
LLM_PROVIDER=openai        # For budget tier  
LLM_PROVIDER=claude        # For premium tier

# API Keys (Based on chosen provider)
OPENAI_API_KEY=your_openai_key     # Only if using budget tier
CLAUDE_API_KEY=your_claude_key     # Only if using premium tier
```

### Tier Selection Guide
```typescript
// Configuration examples for each tier
const TIER_CONFIGS = {
  free: {
    LLM_PROVIDER: 'free',
    MONTHLY_BUDGET_LIMIT: '0.00',
    features: ['Rule-based curation', 'Trending analysis', 'Source scoring']
  },
  
  budget: {
    LLM_PROVIDER: 'openai',
    MONTHLY_BUDGET_LIMIT: '10.00',
    features: ['AI curation', 'Personalization', 'Content summaries', 'Discovery']
  },
  
  premium: {
    LLM_PROVIDER: 'claude',
    MONTHLY_BUDGET_LIMIT: '15.00', 
    features: ['Advanced reasoning', 'Superior writing', 'Complex preferences', 'Best discovery']
  }
};
```

## File Structure
```
newsletter-agent/
├── .github/
│   └── workflows/
│       ├── daily-newsletter.yml      # Main workflow
│       ├── weekly-cleanup.yml        # Maintenance
│       └── manual-trigger.yml        # Manual runs
├── src/
│   ├── ai-providers/
│   │   ├── free-provider.ts          # Rule-based curation
│   │   ├── openai-provider.ts        # Budget AI tier
│   │   ├── claude-provider.ts        # Premium AI tier
│   │   └── provider-factory.ts       # Provider selection
│   ├── aggregators/
│   │   ├── rss-aggregator.ts
│   │   ├── api-aggregator.ts
│   │   └── trend-detector.ts
│   ├── curators/
│   │   ├── content-scorer.ts
│   │   ├── deduplicator.ts
│   │   └── preference-engine.ts
│   ├── formatters/
│   │   ├── newsletter-generator.ts
│   │   ├── mobile-optimizer.ts
│   │   └── email-formatter.ts
│   ├── publishers/
│   │   ├── github-publisher.ts
│   │   └── notification-sender.ts
│   ├── feedback/
│   │   ├── auth-manager.ts
│   │   ├── feedback-collector.ts
│   │   └── analytics-engine.ts
│   └── config/
│       ├── sources.ts
│       ├── environment.ts
│       └── ai-providers.ts
├── templates/
│   ├── newsletter.hbs
│   ├── email.hbs
│   └── components/
├── static/
│   ├── css/
│   ├── js/
│   └── icons/
├── scripts/
│   ├── setup-supabase.sh
│   └── setup-github-secrets.sh
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    ├── setup-guide.md
    ├── tier-comparison.md
    └── troubleshooting.md
```

## Success Criteria

### Week 1 Goals
- [ ] GitHub Actions workflow running daily at 7 AM
- [ ] Content aggregation from 15+ sources working
- [ ] Basic newsletter generation and GitHub Pages publishing
- [ ] Email notifications with private URLs delivered
- [ ] Free tier rule-based curation functional

### Week 2 Goals  
- [ ] All three AI tiers implemented and selectable
- [ ] Private feedback system working invisibly to public
- [ ] Preference learning and content personalization active
- [ ] Mobile-responsive design loading under 2 seconds
- [ ] Cost monitoring and budget controls active

### Week 3-4 Goals
- [ ] Advanced discovery features finding new sources weekly
- [ ] Progressive Web App features working offline
- [ ] A/B testing showing measurable curation improvements  
- [ ] 95%+ uptime with comprehensive error handling
- [ ] User feedback showing >80% content relevance

## Migration Notes: Changes Required

### What Was Built in Previous Version
The existing codebase includes:
- Basic GitHub Actions workflow setup
- Content aggregation pipeline with RSS feeds
- Simple AI integration (likely single provider)
- Basic newsletter HTML generation
- GitHub Pages publishing mechanism
- Email notification system

### Changes Needed for Multi-Tier Implementation

#### 1. AI Provider Abstraction (Priority: High)
```typescript
// CHANGE: Replace single AI integration with provider pattern
// OLD: Direct Claude/OpenAI calls in curation logic
// NEW: Abstract AIProvider interface with three implementations
```

#### 2. Configuration Management (Priority: High)
```typescript
// CHANGE: Update environment configuration for tier selection
// ADD: LLM_PROVIDER environment variable
// ADD: Tier-specific feature flags and budget controls
// UPDATE: GitHub Secrets documentation
```

#### 3. Free Tier Implementation (Priority: Medium)
```typescript
// ADD: Complete rule-based curation algorithm
// ADD: Trending topic analysis without AI
// ADD: Keyword matching and source scoring
// ADD: Content quality assessment heuristics
```

#### 4. Budget and Cost Monitoring (Priority: Medium)
```typescript
// ADD: API usage tracking and cost estimation
// ADD: Budget limit enforcement and alerts
// ADD: Monthly usage reporting
```

#### 5. Enhanced Mobile Design (Priority: Medium)
```css
/* UPDATE: Existing newsletter template with mobile-first approach */
/* ADD: Progressive Web App manifest and service worker */
/* IMPROVE: Typography and reading experience optimizations */
```

#### 6. Documentation Updates (Priority: Low)
```markdown
# UPDATE: README with three-tier setup instructions
# ADD: Tier comparison guide for users
# ADD: Migration guide for existing deployments
```

### Implementation Priority Order
1. **AI Provider Abstraction** - Core architectural change enabling tier selection
2. **Free Tier Implementation** - Allows $0 cost option for users
3. **Configuration Management** - Enables easy tier switching
4. **Enhanced Mobile Design** - Improves user experience significantly
5. **Cost Monitoring** - Prevents budget overruns
6. **Documentation** - Supports user onboarding and maintenance

This updated specification removes all MacBook complexity and focuses purely on the GitHub Actions deployment with flexible AI pricing tiers, making it much more accessible while maintaining all the advanced features.