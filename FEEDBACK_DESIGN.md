# 👍👎 Simple Feedback System Design

## What You Asked For
A simple thumbs up/down system where:
- Each article has 👍👎 buttons
- Feedback is saved locally
- System learns from your preferences
- Articles from disliked sources get ranked lower or dropped

## How It Will Work

### 1. UI Design
```html
[Article Title]
[Source] • [Date]
[Content preview...]

[👍] [👎]  ← Simple inline buttons next to each article
```

### 2. Data Storage Structure
```json
// feedback-data.json
{
  "articleFeedback": {
    "article-id-123": {
      "rating": "like",  // or "dislike"
      "timestamp": "2025-09-02T..."
    }
  },
  "sourceScores": {
    "amazon-aws": -3,     // Disliked 3 times
    "ai-alignment": 5,    // Liked 5 times
    "gary-marcus": -2     // Disliked 2 times
  },
  "topicScores": {
    "llm": 3,
    "safety": -1,
    "cloud": -4
  }
}
```

### 3. Preference Learning Algorithm
```typescript
function processFeedback(articleId: string, rating: 'like' | 'dislike') {
  const article = getArticle(articleId);
  
  // Update source score
  if (rating === 'dislike') {
    sourceScores[article.source] -= 1;
    
    // Drop source if too many dislikes
    if (sourceScores[article.source] <= -5) {
      excludedSources.add(article.source);
    }
  } else {
    sourceScores[article.source] += 1;
  }
  
  // Update topic scores
  article.tags.forEach(tag => {
    topicScores[tag] += (rating === 'like' ? 1 : -1);
  });
  
  savePreferences();
}
```

### 4. Article Ranking/Filtering
```typescript
function rankArticles(articles: Article[]) {
  return articles
    // Filter out excluded sources
    .filter(a => !excludedSources.has(a.source.id))
    
    // Score each article
    .map(article => ({
      ...article,
      score: calculateScore(article)
    }))
    
    // Sort by score
    .sort((a, b) => b.score - a.score)
    
    // Take top N
    .slice(0, maxArticles);
}

function calculateScore(article: Article) {
  let score = article.baseScore;
  
  // Apply source preference
  score += (sourceScores[article.source.id] || 0) * 2;
  
  // Apply topic preferences
  article.tags.forEach(tag => {
    score += (topicScores[tag] || 0) * 0.5;
  });
  
  return score;
}
```

## Implementation Plan

### Phase 1: Basic Feedback UI
1. Add 👍👎 buttons to HTML template
2. Style buttons (active state, hover effects)
3. Click handlers to record feedback

### Phase 2: Local Storage
1. Save feedback to `data/feedback-data.json`
2. Track source scores
3. Track topic preferences

### Phase 3: Preference Application
1. Load feedback data during generation
2. Filter excluded sources
3. Re-rank articles based on preferences
4. Show "Personalized for you" indicator

### Phase 4: Feedback Analytics
1. Show stats: "You've liked 10 AI Alignment articles"
2. Display preference summary
3. Allow preference reset

## Example User Flow

1. **Day 1**: Newsletter shows AWS article
   - User clicks 👎
   - AWS score: -1

2. **Day 2**: Newsletter shows another AWS article
   - User clicks 👎
   - AWS score: -2

3. **Day 3-5**: User dislikes 3 more AWS articles
   - AWS score: -5
   - AWS is now excluded from future newsletters

4. **Day 6**: No AWS articles appear
   - Newsletter says: "Filtered 2 AWS articles based on your preferences"

## Benefits Over Giscus/GitHub Issues

1. **Instant**: No GitHub login required
2. **Simple**: Just thumbs up/down
3. **Local**: Privacy-preserving, no external dependencies
4. **Smart**: Actually learns and adapts
5. **Transparent**: Shows why articles were filtered

## Files to Create/Modify

```
src/
  core/
    feedback-manager.ts      # New: Manages feedback data
    preference-engine.ts     # New: Calculates scores
  
data/
  feedback-data.json        # New: Stores all feedback
  user-preferences.json     # Modified: Add learned preferences

templates/
  newsletter/base.hbs       # Modified: Add thumbs buttons

src/
  core/scheduler.ts         # Modified: Apply preferences during curation
```

## Visual Mockup

```
┌─────────────────────────────────────────────┐
│ How To Become A Mechanistic Interpretability │
│ AI Alignment Forum • Sept 2 • 87 min read    │
│                                               │
│ Applications for MATS stream are open...     │
│                                               │
│ [👍 Like] [👎 Dislike]                       │
│                                               │
│ ⭐ Personalized: Similar to articles you liked│
└─────────────────────────────────────────────┘
```

Ready to implement this?