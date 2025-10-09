# 📝 Newsletter Feedback System

## How Users Give Feedback

The newsletter provides **two ways** for readers to give feedback on articles:

### 1. 💬 **GitHub Issues** (Primary Method)
Each article has a "Give Feedback" button that:
- Opens a pre-filled GitHub issue
- Includes the article title and source
- Has a rating template (Love it / Helpful / Not relevant)
- Tagged with `feedback` label for easy tracking

**User Flow:**
1. Reader clicks "💬 Give Feedback" under an article
2. GitHub issue opens with pre-filled template
3. User selects rating and adds comments
4. Submits issue
5. System processes feedback in next newsletter generation

### 2. 💭 **GitHub Discussions** (Community Discussion)
For longer discussions about articles:
- Opens GitHub Discussions
- Creates a thread for the specific article
- Allows community interaction

## How The Feedback System Works

### Architecture

```
User Feedback → GitHub Issues/Discussions → GitHub API → Newsletter Generator
                                                ↓
                                    User Preferences Updated
                                                ↓
                                    Next Newsletter Curated
```

### Components

1. **Frontend (Template)**
   - `templates/newsletter/base.hbs` - Feedback UI for each article
   - Pre-filled GitHub Issue links with article metadata
   - Visual feedback buttons with hover effects

2. **Backend Processing**
   - `src/core/feedback-giscus.ts` - Fetches feedback from GitHub
   - `src/core/feedback.ts` - Processes feedback and updates preferences
   - `src/core/preferences.ts` - Manages user preference learning

3. **Data Flow**
   ```typescript
   // 1. During newsletter generation
   const previousArticles = loadCuratedArticles();
   const feedback = await fetchGitHubFeedback(previousArticles);
   
   // 2. Update preferences based on feedback
   updateUserPreferences(feedback);
   
   // 3. Use updated preferences for curation
   const newArticles = await curateWithPreferences(articles, preferences);
   ```

## Setting Up Feedback Collection

### Step 1: Enable GitHub Features
```bash
# Your repository needs:
1. Issues enabled (for feedback)
2. Discussions enabled (for community discussion)
```

### Step 2: Configure Environment
```bash
# .env file
GITHUB_TOKEN=your_github_token
GITHUB_REPO=yashrmaa/newsletter
GITHUB_USERNAME=yashrmaa
```

### Step 3: Create Feedback Labels
In your GitHub repository:
1. Go to Issues → Labels
2. Create label: `feedback` (color: #0E8A16)
3. Optional: Create sub-labels like `feedback-positive`, `feedback-negative`

### Step 4: Monitor Feedback
```bash
# View all feedback
gh issue list --label feedback

# View feedback for specific article
gh issue list --label feedback --search "article-id"
```

## Feedback Processing Algorithm

```javascript
// Simplified feedback processing
function processFeedback(article, feedback) {
  const score = calculateScore(feedback);
  
  if (score > 0.7) {
    // Positive feedback
    preferences.increasePriority(article.source);
    preferences.boostTopics(article.tags);
  } else if (score < 0.3) {
    // Negative feedback
    preferences.decreasePriority(article.source);
    preferences.reduceTopics(article.tags);
  }
  
  return preferences;
}
```

## Example Feedback Issue

When a user clicks "Give Feedback", they see:

```markdown
Title: Feedback: How To Become A Mechanistic Interpretability Researcher

Article: How To Become A Mechanistic Interpretability Researcher
Source: AI Alignment Forum

**Your Feedback:**

**Rating:** [ ] Love it [ ] Helpful [ ] Not relevant

**Comments:**
[User writes their feedback here]
```

## Benefits of This Approach

1. **No Additional Infrastructure** - Uses GitHub's existing systems
2. **Public Transparency** - All feedback is visible
3. **Community Engagement** - Discussions allow reader interaction
4. **Simple Integration** - Works with GitHub API
5. **Spam Protection** - GitHub's built-in spam filters

## Future Enhancements

### Phase 1 (Current)
- ✅ GitHub Issues for feedback
- ✅ Pre-filled templates
- ✅ Basic preference learning

### Phase 2 (Planned)
- [ ] Giscus widget integration (inline comments)
- [ ] Reaction counters on articles
- [ ] Weekly feedback summary

### Phase 3 (Future)
- [ ] Machine learning on feedback patterns
- [ ] Personalized newsletters per user
- [ ] A/B testing different article selections

## Testing Feedback Locally

1. Generate newsletter:
   ```bash
   npm run generate
   ```

2. Open HTML output:
   ```bash
   open ./output/newsletter.html
   ```

3. Click feedback buttons to test GitHub integration

4. Check that issues are created with correct labels

## Troubleshooting

**Issue: Feedback buttons don't work**
- Check GitHub repository exists
- Verify Issues are enabled in repo settings

**Issue: Feedback not influencing curation**
- Check `GITHUB_TOKEN` is set in `.env`
- Verify token has `repo` scope
- Check `data/curated-articles.json` is being created

**Issue: No feedback being fetched**
- Run `gh issue list --label feedback` to verify issues exist
- Check GitHub API rate limits
- Verify `GiscusFeedbackFetcher` is initialized correctly