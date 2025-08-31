# 🚀 Complete Setup Guide

This guide will get your personalized AI newsletter running in about 15 minutes.

## Prerequisites

- GitHub account
- Anthropic API key (get from [console.anthropic.com](https://console.anthropic.com))
- Optional: News API key from [newsapi.org](https://newsapi.org) (free tier available)

## Step 1: Repository Setup

### 1.1 Create Your Repositories

You need two repositories:

**Option A: Separate repositories (Recommended)**
1. **Code repo**: Fork or clone this repository
2. **Pages repo**: Create `username.github.io` or any repository with GitHub Pages enabled

**Option B: Single repository**
1. Clone this repository
2. Enable GitHub Pages in Settings → Pages → Source: GitHub Actions

### 1.2 Enable GitHub Pages

For your pages repository:
1. Go to Settings → Pages
2. Set Source to "GitHub Actions" (not "Deploy from branch")
3. Save settings

## Step 2: API Keys Setup

### 2.1 Get Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create account or sign in
3. Go to API keys section
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### 2.2 Get GitHub Personal Access Token

1. Go to GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Set expiration to "No expiration"
4. Select scopes:
   - [x] `repo` (Full control of private repositories)
   - [x] `workflow` (Update GitHub Action workflows)
   - [x] `write:packages` (Write packages to GitHub Package Registry)
5. Generate token and copy it (starts with `ghp_`)

### 2.3 Optional: Get News API Key

1. Go to [newsapi.org](https://newsapi.org)
2. Register for free account
3. Get your API key from dashboard
4. Free tier: 1000 requests/month (sufficient for daily newsletter)

## Step 3: Configure GitHub Secrets

In your **code repository** (not pages repository):

1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add these secrets one by one:

### Required Secrets

```
ANTHROPIC_API_KEY
Value: sk-ant-your-key-here

GITHUB_TOKEN  
Value: ghp_your-token-here

GITHUB_PAGES_REPO
Value: username/repository-name
# Example: "john/john.github.io" or "jane/newsletter-site"

FEEDBACK_SECRET
Value: any-random-secure-string-at-least-20-chars
# Example: "my-secure-newsletter-secret-2024"
```

### Optional Secrets

```
NEWS_API_KEY
Value: your-newsapi-key

USER_EMAIL
Value: your-email@gmail.com
# For future email notifications

GMAIL_USER
Value: your-gmail@gmail.com

GMAIL_APP_PASSWORD
Value: your-gmail-app-password
# Get from Google Account → Security → App passwords
```

## Step 4: Customize Your Preferences

### 4.1 Edit User Preferences

Edit `data/preferences/user-preferences.json` in your code repository:

```json
{
  "topics": {
    "technology": {
      "interest_score": 0.9,
      "keywords": ["ai", "machine learning", "startups", "crypto", "programming"]
    },
    "business": {
      "interest_score": 0.7,
      "keywords": ["markets", "economy", "investing", "entrepreneurship"]
    },
    "science": {
      "interest_score": 0.6,
      "keywords": ["research", "climate", "space", "medicine"]
    },
    "politics": {
      "interest_score": 0.3,
      "keywords": ["policy", "election", "government"]
    }
  },
  "content_preferences": {
    "article_length": {
      "short": 0.3,
      "medium": 0.6,
      "long": 0.1
    }
  },
  "reading_patterns": {
    "preferred_categories_order": ["technology", "business", "science", "general"],
    "max_articles_per_category": 4
  }
}
```

### 4.2 Customize Content Sources

Edit `config/sources/news-sources.json` to adjust sources:

```json
{
  "rss_sources": [
    {
      "id": "reuters",
      "name": "Reuters",
      "url": "https://feeds.reuters.com/reuters/topNews",
      "category": "general",
      "priority": 9
    }
  ],
  "tech_sources": [
    {
      "id": "techcrunch",
      "name": "TechCrunch", 
      "url": "https://techcrunch.com/feed/",
      "category": "technology",
      "priority": 8
    }
  ]
}
```

## Step 5: Deploy and Test

### 5.1 Commit and Push Changes

```bash
# In your local code repository
git add .
git commit -m "Initial newsletter setup with personalized preferences"
git push origin main
```

### 5.2 Test Manual Generation

1. Go to your code repository on GitHub
2. Click Actions tab
3. Click "Manual Newsletter Generation" workflow
4. Click "Run workflow" → "Run workflow"
5. Wait for completion (2-5 minutes)

### 5.3 Check Results

1. **Success**: Green checkmark in GitHub Actions
2. **Logs**: Click on the workflow run to see detailed logs
3. **Newsletter**: Visit your Pages URL, should be:
   - Format: `https://username.github.io/repo-name/newsletter/YYYY/MM/DD/`
   - Example: `https://john.github.io/john.github.io/newsletter/2024/08/30/`

### 5.4 Troubleshooting First Run

**If the workflow fails:**

1. **Check API Keys**: Ensure all secrets are set correctly
2. **Repository Permissions**: Verify GitHub token has repo access
3. **Pages Configuration**: Ensure GitHub Pages is enabled
4. **Debug Logs**: Check the "Manual Newsletter Generation" workflow logs

**Common issues:**
- "401 Unauthorized" → Check GitHub token permissions
- "Repository not found" → Check GITHUB_PAGES_REPO format
- "No articles found" → RSS sources may be down, try again later

## Step 6: Enable Daily Automation

### 6.1 Verify Daily Schedule

The workflow in `.github/workflows/daily-newsletter.yml` is set to run at:
```yaml
schedule:
  - cron: '0 15 * * *'  # 7 AM PST = 15:00 UTC
```

### 6.2 Adjust Timezone (Optional)

To change the generation time:
1. Edit `.github/workflows/daily-newsletter.yml`
2. Modify the cron expression:
   - `0 14 * * *` = 6 AM PST
   - `0 16 * * *` = 8 AM PST
   - Use [crontab.guru](https://crontab.guru) to calculate times

### 6.3 Test Daily Run

Wait for tomorrow morning, or trigger manually to verify the daily schedule works.

## Step 7: Access Your Newsletter

### 7.1 Public URL

Your newsletter is available at:
```
https://USERNAME.github.io/REPO-NAME/newsletter/YYYY/MM/DD/
```

### 7.2 Private URL (With Feedback)

Currently logged in GitHub Actions. Future versions will email you the private URL with feedback controls.

### 7.3 Bookmark or Subscribe

- Bookmark your Pages repository to check for daily updates
- Star your code repository to track your personal AI newsletter
- The main index page shows the latest newsletter

## Next Steps

### Immediate (Week 1)
- ✅ Monitor daily generation for a few days
- ✅ Adjust preferences based on article quality
- ✅ Fine-tune content sources

### Short-term (Week 2-3)
- [ ] Implement feedback system for better curation
- [ ] Add email notifications with private URLs
- [ ] Enhance mobile design and reading experience

### Long-term (Month 2+)
- [ ] Add social sources (Twitter, Reddit, HN)
- [ ] Implement preference learning from feedback
- [ ] Create reading analytics and insights

## Support

### Getting Help

1. **Check Issues**: Look at repository issues for common problems
2. **GitHub Actions Logs**: Most helpful for debugging
3. **Community**: Create an issue for questions

### Monitoring

- **GitHub Actions**: Check weekly for any failed runs
- **API Quotas**: Monitor Anthropic and News API usage
- **Content Quality**: Adjust preferences if articles aren't relevant

---

**🎉 Congratulations!** 

You now have a personalized AI newsletter that will be waiting for you every morning with coffee-worthy content curated specifically for your interests!